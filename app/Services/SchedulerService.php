<?php

namespace App\Services\Scheduling;

use App\Models\Lot;
use App\Models\LoadingPlanEntry;
use App\Models\MachineSetupState;
use App\Models\MachineCapabilityPartRule;
use App\Models\MachineDedicatedPart;
use App\Models\FocusGroupFactoryMap;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

/**
 * Assumes the following Eloquent models already exist, mapped to the
 * tables designed earlier in this conversation:
 *
 *   Lot                        -> lots (daily CSV import)
 *   Machine                    -> machines
 *   MachineCapacity            -> machine_capacity
 *   MachineSetupState          -> machine_setup_states
 *   MachineSetupGroup          -> machine_setup_groups
 *   MachineTransitionRule      -> machine_transition_rules
 *   MachineCapabilityPartRule  -> machine_capability_part_rules
 *   MachineDedicatedPart       -> machine_dedicated_parts
 *   FocusGroupFactoryMap       -> focus_group_factory_map
 *   LoadingPlanEntry           -> loading_plan_entries
 *   ReoptimizationRun          -> reoptimization_runs
 */
class SchedulerService
{
    /**
     * Entry point. Call this with the newly-arrived group of lots
     * ("pickup"). Resolves candidate machines, then loads every
     * not-yet-started plan entry on those machines (the "open window")
     * so a rebuild pass has everything it needs to work with.
     *
     * NOTE: this method stops at data-gathering. The actual
     * rebuild/reassignment algorithm (clustering + insert) is a
     * separate piece we haven't built yet — see return shape below.
     *
     * @param  Collection<Lot>|array<int|string>  $pickup  Lot models, or lot_ids to look up
     * @return array{
     *     pickup_lots: Collection<Lot>,
     *     candidate_machine_ids: Collection<int>,
     *     open_entries_by_machine: Collection<int, Collection<LoadingPlanEntry>>,
     *     anchor_state_by_machine: Collection<int, int|null>,
     * }
     */
    public function handlePickup($pickup): array
    {
        $pickupLots = $this->resolvePickupLots($pickup);

        if ($pickupLots->isEmpty()) {
            return [
                'pickup_lots' => $pickupLots,
                'candidate_machine_ids' => collect(),
                'open_entries_by_machine' => collect(),
                'anchor_state_by_machine' => collect(),
            ];
        }

        // Which machines could conceivably run ANY of the pickup lots.
        // Scoping to these (rather than literally every machine in the
        // plant) is what keeps each rebuild pass bounded in size.
        $candidateMachineIds = $this->getCandidateMachineIds($pickupLots);

        // The open window: every not-yet-started entry on those machines,
        // grouped per machine. This is the pool a rebuild pass is allowed
        // to touch — frozen (already-started) entries are excluded here
        // by definition.
        $openEntriesByMachine = $this->getUnprocessedPlannedEntries($candidateMachineIds);

        // Each machine's fixed starting point: the resulting state of its
        // most recently STARTED entry. A rebuild must plan forward from
        // this, it cannot rewrite it.
        $anchorStateByMachine = $this->getAnchorStates($candidateMachineIds);

        return [
            'pickup_lots' => $pickupLots,
            'candidate_machine_ids' => $candidateMachineIds,
            'open_entries_by_machine' => $openEntriesByMachine,
            'anchor_state_by_machine' => $anchorStateByMachine,
        ];
    }

    /**
     * Normalize the `pickup` param into a Collection of Lot models.
     * Accepts either Lot models/collections or raw lot_id values.
     */
    protected function resolvePickupLots($pickup): Collection
    {
        $pickup = $pickup instanceof Collection ? $pickup : collect($pickup);

        if ($pickup->isEmpty()) {
            return collect();
        }

        if ($pickup->first() instanceof Lot) {
            return $pickup->values();
        }

        // treat as lot_id list
        return Lot::whereIn('lot_id', $pickup->all())->get();
    }

    /**
     * For the given lots, return every machine_id capable of running
     * AT LEAST ONE of them — a pure capability lookup, independent of
     * anything currently scheduled. Mirrors the candidate_states logic
     * from the per-lot decision query.
     *
     * @param  Collection<Lot>  $lots
     * @return Collection<int>  distinct machine_ids
     */
    public function getCandidateMachineIds(Collection $lots): Collection
    {
        $machineIds = collect();

        foreach ($lots as $lot) {
            $factory = $this->resolveFactory($lot->Focus_Group);

            if ($factory === null) {
                // non-TSPI focus group, or unmapped — not schedulable
                continue;
            }

            [$bodySize2d, $thickness] = $this->parseBodySize($lot->Body_Size);
            $rampProcessType = $this->resolveRampProcessType($lot->Ramp_Time);

            $query = MachineSetupState::query()
                ->where('factory', $factory)
                ->where('package_name', $lot->Package_Name)
                ->where(function ($q) use ($bodySize2d) {
                    $q->whereNull('body_size')->orWhere('body_size', $bodySize2d);
                })
                ->where(function ($q) use ($thickness) {
                    $q->whereNull('thickness')->orWhere('thickness', $thickness);
                })
                ->where(function ($q) use ($lot) {
                    $q->whereNull('leadcount_min')->orWhere('leadcount_min', '<=', $lot->Lead_Count);
                })
                ->where(function ($q) use ($lot) {
                    $q->whereNull('leadcount_max')->orWhere('leadcount_max', '>=', $lot->Lead_Count);
                })
                ->where(function ($q) use ($lot) {
                    $q->whereNull('leadcount_exclude')
                      ->orWhereRaw('FIND_IN_SET(?, leadcount_exclude) = 0', [$lot->Lead_Count]);
                })
                ->where(function ($q) use ($rampProcessType) {
                    $q->where('process_type', 'both')->orWhere('process_type', $rampProcessType);
                });

            $states = $query->get(['setup_state_id', 'machine_id']);

            // apply part-name gating: state is eligible if it has no part
            // rules at all, OR the lot's part_name satisfies one of them
            $eligible = $states->filter(function ($state) use ($lot) {
                return $this->lotSatisfiesPartRules($state->setup_state_id, $state->machine_id, $lot->Part_Name);
            });

            $machineIds = $machineIds->merge($eligible->pluck('machine_id'));
        }

        return $machineIds->unique()->values();
    }

    /**
     * Every not-yet-started entry (lot or block) on the given machines.
     * "Not yet started" = frozen boundary: time_start is null, or in
     * the future relative to now.
     *
     * @param  Collection<int>  $machineIds
     * @return Collection<int, Collection<LoadingPlanEntry>>  keyed by machine_id
     */
    public function getUnprocessedPlannedEntries(Collection $machineIds): Collection
    {
        if ($machineIds->isEmpty()) {
            return collect();
        }

        $now = Carbon::now();

        return LoadingPlanEntry::query()
            ->whereIn('machine_id', $machineIds)
            ->whereNotIn('status', ['cancelled', 'rejected'])
            ->where(function ($q) use ($now) {
                $q->whereNull('time_start')->orWhere('time_start', '>', $now);
            })
            ->orderBy('machine_id')
            ->orderBy('sequence_order')
            ->get()
            ->groupBy('machine_id');
    }

    /**
     * Each machine's anchor state: the resulting_setup_state_id of its
     * most recent entry that HAS started (time_start <= now). Null if
     * the machine has no started history yet.
     *
     * @param  Collection<int>  $machineIds
     * @return Collection<int, int|null>  machine_id => resulting_setup_state_id
     */
    public function getAnchorStates(Collection $machineIds): Collection
    {
        if ($machineIds->isEmpty()) {
            return collect();
        }

        $now = Carbon::now();

        $latestStarted = LoadingPlanEntry::query()
            ->whereIn('machine_id', $machineIds)
            ->whereNotIn('status', ['cancelled', 'rejected'])
            ->whereNotNull('time_start')
            ->where('time_start', '<=', $now)
            ->orderBy('machine_id')
            ->orderByDesc('time_start')
            ->get(['machine_id', 'resulting_setup_state_id'])
            ->groupBy('machine_id')
            ->map(fn ($rows) => $rows->first()->resulting_setup_state_id);

        return $machineIds->mapWithKeys(fn ($id) => [$id => $latestStarted->get($id)]);
    }

    /**
     * Resolve Factory from a lot's Focus_Group via the mapping table.
     * Returns null for unmapped or non-TSPI focus groups.
     */
    protected function resolveFactory(?string $focusGroup): ?string
    {
        if (!$focusGroup) {
            return null;
        }

        $map = FocusGroupFactoryMap::query()->find($focusGroup);

        if (!$map || !$map->is_tspi) {
            return null;
        }

        return $map->factory;
    }

    /**
     * Split "4X4X0.75" -> ['4X4', 0.75]; "7X11" -> ['7X11', null].
     *
     * @return array{0: string, 1: float|null}
     */
    protected function parseBodySize(?string $bodySize): array
    {
        if (!$bodySize) {
            return [$bodySize, null];
        }

        $parts = explode('X', $bodySize);

        if (count($parts) === 3) {
            return [$parts[0] . 'X' . $parts[1], (float) $parts[2]];
        }

        return [$bodySize, null];
    }

    /**
     * Map Ramp_Time to taping/tubing. ASSUMPTION — confirm/correct:
     * REEL*/PCKTTAPE* => taping, TUBE => tubing, anything else => 'both'
     * (treated as matching either process_type).
     */
    protected function resolveRampProcessType(?string $rampTime): string
    {
        if (!$rampTime) {
            return 'both';
        }

        if (str_starts_with($rampTime, 'REEL') || str_starts_with($rampTime, 'PCKTTAPE')) {
            return 'taping';
        }

        if ($rampTime === 'TUBE') {
            return 'tubing';
        }

        return 'both';
    }

    /**
     * True if this setup_state has no part-name gating at all, or if
     * the given part_name satisfies at least one of its gating rules.
     */
    protected function lotSatisfiesPartRules(int $setupStateId, int $machineId, ?string $partName): bool
    {
        $rules = MachineCapabilityPartRule::query()
            ->where('setup_state_id', $setupStateId)
            ->get();

        if ($rules->isEmpty()) {
            return true; // open to any part
        }

        if (!$partName) {
            return false; // gated, but lot has no part_name to check
        }

        foreach ($rules as $rule) {
            $match = match ($rule->match_type) {
                'exact' => $rule->match_value === $partName,
                'contains' => str_contains($partName, $rule->match_value),
                'dedicated_list' => MachineDedicatedPart::query()
                    ->where('machine_id', $machineId)
                    ->where('part_name', $partName)
                    ->exists(),
                default => false,
            };

            if ($match) {
                return true;
            }
        }

        return false;
    }
}