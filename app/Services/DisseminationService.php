<?php

namespace App\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use App\Models\MachineCapacity;
use App\Models\LoadingPlanEntry;

class DisseminationService
{
    // when is this going to be used?
    // every time a lot is created and a decision needs to be made about which machine to assign it to,
    // this service will be used to determine the best candidate machine based on the 
    // lot's attributes and the machines' capabilities and remaining capacities.

    /** @var array<string,int> machine_id => remaining open capacity (mutated as lots are assigned) */
    private array $openCapacity = [];

    /** @var array<string,object> machine_id => machine row (code etc.) */
    private array $machines = [];

    /** @var array<int,int[]> part_name => [machine_id, ...] from machine_dedicated_parts */
    private array $dedicatedPartsIndex = [];

    /** @var Collection capability configs joined with their packages/leadcounts/dimensions, pre-loaded */
    private Collection $configs;

    public function __construct()
    {
        $this->loadMachinesAndCapacity();
        $this->loadDedicatedParts();
        $this->loadCapabilityConfigs();
    }

    /**
     * @param  Collection|array  $lots  rows from the `lots` table (or any collection of
     *                                   objects with the same shape) needing assignment
     * @return array{
     *     assignments: array<int, array{customer_data_id:mixed, lot_id:string, machine_id:int, machine_code:string, reason:string}>,
     *     unassigned: array<int, array{customer_data_id:mixed, lot_id:string, reason:string}>,
     *     machine_load: array<int, array{machine_id:int, machine_code:string, starting_capacity:int, remaining_capacity:int}>
     * }
     */
    public function disseminate(Collection|array $lots): array
    {
        $lots = collect($lots);

        $assignments = [];
        $unassigned = [];

        // Larger qty first: placing big lots while capacity is fully open
        // avoids a large lot having nowhere to fit after smaller lots have
        // already nibbled away at every machine's remaining capacity.
        $lots = $lots->sortByDesc(fn($lot) => (int) $lot->Qty);

        foreach ($lots as $lot) {
            $candidates = $this->candidateMachinesForLot($lot);

            if (empty($candidates)) {
                $unassigned[] = [
                    'customer_data_id' => $lot->customer_data_id,
                    'lot_id' => $lot->Lot_Id,
                    'reason' => 'No machine matches this lot\'s part/package/leadcount/size/process constraints.',
                ];
                continue;
            }

            // Greedy spread: pick whichever candidate currently has the
            // most remaining open capacity.
            $bestMachineId = null;
            $bestRemaining = null;
            foreach ($candidates as $machineId) {
                $remaining = $this->openCapacity[$machineId] ?? 0;
                if ($bestRemaining === null || $remaining > $bestRemaining) {
                    $bestRemaining = $remaining;
                    $bestMachineId = $machineId;
                }
            }

            $qty = (int) $lot->Qty;
            $overCapacity = $bestRemaining !== null && $qty > $bestRemaining;

            $this->openCapacity[$bestMachineId] = ($this->openCapacity[$bestMachineId] ?? 0) - $qty;

            $assignments[] = [
                'customer_data_id' => $lot->customer_data_id,
                'lot_id' => $lot->Lot_Id,
                'machine_id' => $bestMachineId,
                'machine_code' => $this->machines[$bestMachineId]->machine_code ?? (string) $bestMachineId,
                'reason' => $overCapacity
                    ? 'Best available candidate, but exceeds its remaining open capacity — flag for manual review.'
                    : 'Capable machine with the most remaining open capacity among candidates.',
            ];
        }

        $machineLoad = [];
        foreach ($this->machines as $machineId => $machine) {
            $starting = $this->startingCapacity($machineId);
            $machineLoad[] = [
                'machine_id' => $machineId,
                'machine_code' => $machine->machine_code,
                'starting_capacity' => $starting,
                'remaining_capacity' => $this->openCapacity[$machineId] ?? $starting,
            ];
        }

        return [
            'assignments' => $assignments,
            'unassigned' => $unassigned,
            'machine_load' => $machineLoad,
        ];
    }

    /**
     * Resolve the list of candidate machine_ids for a single lot.
     * Part-pin check ALWAYS takes priority and, if it matches, is the
     * only candidate set returned — no fallback to the config tables.
     */
    private function candidateMachinesForLot(object $lot): array
    {
        if (isset($this->dedicatedPartsIndex[$lot->Part_Name])) {
            return $this->dedicatedPartsIndex[$lot->Part_Name];
        }

        $candidates = [];

        foreach ($this->configs as $config) {
            foreach ($config->packages as $pkg) {
                if ($pkg->package_id !== $lot->package_id) {
                    continue;
                }

                if (! $this->factoryMatches($pkg->required_factory, $lot)) {
                    continue;
                }

                if (! $this->leadcountMatches($config->leadcounts, $lot->Lead_Count)) {
                    continue;
                }

                if (! $this->dimensionMatches($pkg->dimensions, $lot->canonical_body_size)) {
                    continue;
                }

                if (! $this->processTypeMatches($config->process_type, $lot->canonical_process_type ?? null)) {
                    continue;
                }

                $candidates[$config->machine_id] = true;
                break; // this config already matched via one of its packages; no need to check its other packages
            }
        }

        return array_keys($candidates);
    }

    private function factoryMatches(?string $requiredFactory, object $lot): bool
    {
        if ($requiredFactory === null) {
            return true;
        }

        // Assumption: F1/F2 scoping resolved from the lot's focus-group
        // flags. Adjust if factory scoping is actually derived differently.
        return match ($requiredFactory) {
            'F1' => (bool) ($lot->f1_focus_group_flag ?? false),
            'F2' => (bool) ($lot->f2_focus_group_flag ?? false),
            default => false,
        };
    }

    private function leadcountMatches(Collection $leadcountRules, int $leadcount): bool
    {
        if ($leadcountRules->isEmpty()) {
            return true; // no rows = unrestricted
        }

        $mode = $leadcountRules->first()->mode; // a config shouldn't mix modes
        $values = $leadcountRules->pluck('leadcount')->all();

        return $mode === 'include'
            ? in_array($leadcount, $values, true)
            : ! in_array($leadcount, $values, true);
    }

    private function dimensionMatches(Collection $dimensionRules, ?string $canonicalBodySize): bool
    {
        if ($dimensionRules->isEmpty()) {
            return true; // no rows = unrestricted for this package
        }

        return $canonicalBodySize !== null
            && $dimensionRules->pluck('body_size')->contains($canonicalBodySize);
    }

    private function processTypeMatches(?string $configProcessType, ?string $lotProcessType): bool
    {
        if ($configProcessType === null || $configProcessType === 'both') {
            return true;
        }

        return $configProcessType === $lotProcessType;
    }

    private function startingCapacity(int $machineId): int
    {
        // Recomputed from the loaded machine object; see loadMachinesAndCapacity().
        return $this->machines[$machineId]->capacity ?? 0;
    }

    private function loadMachinesAndCapacity(): void
    {
        $capacities = MachineCapacity::query()
            ->current()
            ->whereHas('machine', fn($q) => $q->active())
            ->with(['machine' => fn($q) => $q->active()])
            ->get();

        $entries = LoadingPlanEntry::query()
            ->today()
            ->entryType('lot')
            ->with('lotQuantity')
            ->get();

        $committed = $entries->groupBy('machine_id')->map(function ($group) {
            return $group->sum(function ($entry) {
                return $entry->qty_override ?? ($entry->lotQuantity?->effectiveQty() ?? 0);
            });
        });

        foreach ($capacities as $capacityRow) {
            $machine = $capacityRow->machine;
            $this->machines[$machine->id] = $machine;
            $this->openCapacity[$machine->id] = (int) $capacityRow->capacity - (int) ($committed[$machine->id] ?? 0);
        }
    }

    private function loadDedicatedParts(): void
    {
        $rows = DB::table('machine_dedicated_parts')->get();

        foreach ($rows as $row) {
            $this->dedicatedPartsIndex[$row->part_name][] = $row->machine_id;
        }
    }

    private function loadCapabilityConfigs(): void
    {
        $configs = DB::table('machine_capability_configs')->get();
        $packages = DB::table('machine_capability_packages')->get()->groupBy('capability_id');
        $leadcounts = DB::table('machine_capability_leadcounts')->get()->groupBy('capability_id');
        $dimensions = DB::table('machine_capability_dimensions')->get()->groupBy('capability_package_id');

        $this->configs = $configs->map(function ($config) use ($packages, $leadcounts, $dimensions) {
            $config->packages = ($packages[$config->capability_id] ?? collect())->map(function ($pkg) use ($dimensions) {
                $pkg->dimensions = $dimensions[$pkg->id] ?? collect();
                return $pkg;
            });
            $config->leadcounts = $leadcounts[$config->capability_id] ?? collect();
            return $config;
        });
    }
}
