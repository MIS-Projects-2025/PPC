<?php

namespace App\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Concurrency;
use App\Models\MachineCapacity;
use App\Models\PpcPackageMaster;
use App\Models\LoadingPlanEntry;
use App\Models\MachineDedicatedParts;

class DisseminationService
{
    /** @var array<string,int> machine_id => remaining open capacity */
    private array $openCapacity = [];

    /** @var array<string,object> machine_id => machine row */
    private array $machines = [];

    /** @var array<string,int[]> part_name => [machine_id, ...] */
    private array $dedicatedPartsIndex = [];

    /** @var array<int, array<int, object>> package_id => list of capability configs */
    private array $configsByPackageId = [];

    public function __construct(private string $location)
    {
        [$this->machines, $this->openCapacity] = $this->loadMachinesAndCapacity();
        $this->configsByPackageId = $this->loadCapabilityConfigs();
    }

    // public function __construct()
    // {
    //     // 🚀 1. Run initialization tasks concurrently (dedicated parts removed from here)
    //     [
    //         [$this->machines, $this->openCapacity],
    //         $this->configsByPackageId
    //     ] = Concurrency::run([
    //         fn() => $this->loadMachinesAndCapacity(),
    //         fn() => $this->loadCapabilityConfigs(),
    //     ]);
    // }

    /**
     * Disseminate lots across available machines.
     *
     * @param Collection<int, object>|array<int, object> $lots
     * @return array{
     *     assignments: array<int, array>,
     *     unassigned: array<int, array>,
     *     machine_load: array<int, array>
     * }
     */
    public function disseminate(Collection|array $lots): array
    {
        // 🚀 Cast array items to objects if they are arrays
        $lotsCollection = collect($lots)->map(fn($item) => is_array($item) ? (object) $item : $item);

        // 2. Extract unique Package_Name values from the lots
        $packageNames = $lotsCollection->pluck('package_name')->filter()->unique()->values()->all();

        // 3. Batch load package IDs from ppc_package_master [package_name => id]
        $packageMap = PpcPackageMaster::whereIn('package', $packageNames)
            ->pluck('id', 'package')
            ->all();

        $lotsCollection->transform(function ($lot) use ($packageMap) {
            $lot->package_id = $lot->package_id ?? ($packageMap[$lot->package_name] ?? null);
            return $lot;
        });

        // 🚀 Extract unique part names
        $partNames = $lotsCollection->pluck('part_name')->filter()->unique()->values()->all();
        $this->dedicatedPartsIndex = $this->loadDedicatedPartsForNames($partNames);

        // Now object property access works seamlessly
        $lots = $lotsCollection->sortByDesc(fn($lot) => (int) ($lot->qty ?? 0));

        $assignments = [];
        $unassigned = [];

        foreach ($lots as $lot) {
            $candidates = $this->candidateMachinesForLot($lot);

            if (empty($candidates)) {
                $unassigned[] = [
                    // 'customer_data_id' => $lot->customer_data_id,
                    'lot_id' => $lot->lot_id,
                    'reason' => "No machine matches this lot's constraints.",
                ];
                continue;
            }

            $bestMachineId = null;
            $bestRemaining = null;
            foreach ($candidates as $machineId) {
                $remaining = $this->openCapacity[$machineId] ?? 0;
                if ($bestRemaining === null || $remaining > $bestRemaining) {
                    $bestRemaining = $remaining;
                    $bestMachineId = $machineId;
                }
            }

            $qty = (int) $lot->qty;
            $overCapacity = $bestRemaining !== null && $qty > $bestRemaining;

            $this->openCapacity[$bestMachineId] = ($this->openCapacity[$bestMachineId] ?? 0) - $qty;

            $assignments[] = [
                // 'customer_data_id' => $lot->customer_data_id,
                'lot_id' => $lot->lot_id,
                'machine_id' => $bestMachineId,
                'machine_code' => $this->machines[$bestMachineId]->machine_num ?? (string) $bestMachineId,
                'reason' => $overCapacity
                    ? 'Best available candidate, but exceeds remaining capacity — flag for manual review.'
                    : 'Capable machine with the most remaining open capacity.',
            ];
        }

        $machineLoad = [];
        foreach ($this->machines as $machineId => $machine) {
            $starting = $this->startingCapacity($machineId);
            $machineLoad[] = [
                'machine_id' => $machineId,
                'machine_code' => $machine->machine_num,
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

    private function candidateMachinesForLot(object $lot): array
    {
        // Direct O(1) part lookup
        if (isset($this->dedicatedPartsIndex[$lot->part_name])) {
            return $this->dedicatedPartsIndex[$lot->part_name];
        }

        $relevantEntries = $this->configsByPackageId[$lot->package_id] ?? [];
        if (empty($relevantEntries)) {
            return [];
        }

        $candidates = [];

        foreach ($relevantEntries as $entry) {
            $config = $entry->config;
            $pkg = $entry->package;

            if (! $this->factoryMatches($pkg->required_factory, $lot)) {
                continue;
            }

            if (! $this->leadcountMatches($config->leadcounts, $lot->lead_count)) {
                continue;
            }

            if (! $this->dimensionMatches($pkg->dimensions, $lot->body_size)) {
                continue;
            }

            if (! $this->processTypeMatches($config->process_type, $lot->canonical_process_type ?? null)) {
                continue;
            }

            $candidates[$config->machine_id] = true;
        }

        return array_keys($candidates);
    }

    private function factoryMatches(?string $requiredFactory, object $lot): bool
    {
        if ($requiredFactory === null) return true;

        return match ($requiredFactory) {
            'F1' => (bool) ($lot->f1_focus_group_flag ?? false),
            'F2' => (bool) ($lot->f2_focus_group_flag ?? false),
            default => false,
        };
    }

    private function leadcountMatches(Collection $leadcountRules, int $leadcount): bool
    {
        if ($leadcountRules->isEmpty()) return true;

        $mode = $leadcountRules->first()->mode;
        $values = $leadcountRules->pluck('leadcount')->all();

        return $mode === 'include'
            ? in_array($leadcount, $values, true)
            : ! in_array($leadcount, $values, true);
    }

    private function dimensionMatches(Collection $dimensionRules, ?string $canonicalBodySize): bool
    {
        if ($dimensionRules->isEmpty()) return true;

        return $canonicalBodySize !== null
            && $dimensionRules->pluck('body_size')->contains($canonicalBodySize);
    }

    private function processTypeMatches(?string $configProcessType, ?string $lotProcessType): bool
    {
        if ($configProcessType === null || $configProcessType === 'both') return true;

        return $configProcessType === $lotProcessType;
    }

    private function startingCapacity(int $machineId): int
    {
        return $this->machines[$machineId]->capacity ?? 0;
    }

    private function loadMachinesAndCapacity(): array
    {
        $machines = [];
        $openCapacity = [];

        $capacities = MachineCapacity::query()
            ->current()
            ->whereHas('machine', fn($q) => $q->active()->where('location', $this->location))
            ->with(['machine' => fn($q) => $q->active()->where('location', $this->location)])
            ->get();

        $entries = LoadingPlanEntry::query()
            ->today()
            ->entryType('lot')
            ->with(['lotQuantity' => fn($q) => $q->whereDate('scheduled_date', now()->toDateString())])
            ->get();

        $committed = $entries->groupBy('machine_id')->map(function ($group) {
            return $group->sum(fn($entry) => $entry->qty_override ?? ($entry->lotQuantity?->effectiveQty() ?? 0));
        });

        foreach ($capacities as $capacityRow) {
            $machine = $capacityRow->machine;
            if (! $machine) continue; // eager-load constraint can leave this null if machine failed the location/active filter

            $machines[$machine->id] = $machine;
            $openCapacity[$machine->id] = (int) $capacityRow->capacity - (int) ($committed[$machine->id] ?? 0);
        }

        return [$machines, $openCapacity];
    }

    private function loadDedicatedPartsForNames(array $partNames): array
    {
        if (empty($partNames)) {
            return [];
        }

        $machineIds = array_keys($this->machines); // already location-filtered

        $dedicatedPartsIndex = [];

        $rows = MachineDedicatedParts::select('part_name', 'machine_id')
            ->whereIn('part_name', $partNames)
            ->whereIn('machine_id', $machineIds)
            ->get();

        foreach ($rows as $row) {
            $dedicatedPartsIndex[$row->part_name][] = $row->machine_id;
        }

        return $dedicatedPartsIndex;
    }

    private function loadCapabilityConfigs(): array
    {
        $machineIds = array_keys($this->machines); // already location-filtered

        $configs = DB::table('machine_capability_configs')
            ->whereIn('machine_id', $machineIds)
            ->get();

        $capabilityIds = $configs->pluck('capability_id');

        $packages = DB::table('machine_capability_packages')
            ->whereIn('capability_id', $capabilityIds)
            ->get()
            ->groupBy('capability_id');

        $leadcounts = DB::table('machine_capability_leadcounts')
            ->whereIn('capability_id', $capabilityIds)
            ->get()
            ->groupBy('capability_id');

        $packageIds = $packages->flatten(1)->pluck('id');

        $dimensions = DB::table('machine_capability_dimensions')
            ->whereIn('capability_package_id', $packageIds)
            ->get()
            ->groupBy('capability_package_id');

        $configsByPackageId = [];

        foreach ($configs as $config) {
            $configPackages = $packages[$config->capability_id] ?? collect();
            $config->leadcounts = $leadcounts[$config->capability_id] ?? collect();

            foreach ($configPackages as $pkg) {
                $pkg->dimensions = $dimensions[$pkg->id] ?? collect();

                $configsByPackageId[$pkg->package_id][] = (object) [
                    'config' => $config,
                    'package' => $pkg,
                ];
            }
        }

        return $configsByPackageId;
    }

    public static function buildFrontendPayload(
        array $disseminationResult,
        bool $saveFailed,
        ?string $saveError
    ): array {
        $machines = $saveFailed
            ? []
            : collect($disseminationResult['machine_load'])->map(function ($m) use ($disseminationResult) {
                $lots = collect($disseminationResult['assignments'])
                    ->filter(fn($a) => $a['machine_id'] === $m['machine_id'])
                    ->map(fn($a) => [
                        'lot_id' => $a['lot_id'],
                        'qty' => $a['qty'] ?? null,
                        'status' => 'saved',
                        'flag' => $a['flag'] ?? null, // set flag directly in DisseminationService rather than string-matching reason
                        'reason' => $a['reason'],
                    ])
                    ->values();

                return [
                    'machine_id' => $m['machine_id'],
                    'machine_code' => $m['machine_code'],
                    'starting_capacity' => $m['starting_capacity'],
                    'remaining_capacity' => $m['remaining_capacity'],
                    'lots' => $lots,
                ];
            })->values();

        $unplaced = collect($disseminationResult['unassigned'])->map(fn($u) => [
            'lot_id' => $u['lot_id'],
            'qty' => $u['qty'] ?? null,
            'reason_code' => 'no_capable_machine',
            'message' => $u['reason'],
        ]);

        return [
            'date' => $disseminationResult['date'] ?? null,
            'auto_dissemination_saved' => ! $saveFailed,
            'auto_dissemination_error' => $saveError,
            'machines' => $machines,
            'unplaced' => $unplaced,
            'summary' => [
                'total_lots' => count($disseminationResult['assignments']) + count($disseminationResult['unassigned']),
                'saved' => $saveFailed ? 0 : count($disseminationResult['assignments']),
            ],
        ];
    }
}
