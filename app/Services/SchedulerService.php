<?php

namespace App\Services\Scheduling;

use App\Models\CustomerDataWip;
use App\Models\LoadingPlanEntry;
use App\Models\MachineCapacity;
use App\Models\MachineSetupState;
use App\Models\MachineCapabilityPartRule;
use App\Models\MachineTransitionRule;
use App\Models\MachineTransitionRuleException;
use App\Services\LoadingPlanFormulas;
use App\Models\PartName;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

/**
 * NOTE ON $this->ref: reference data is now an instance property, set
 * fresh at the top of every public entry point (handlePickup,
 * rebuildForPickupArrival). This is only safe if this service is
 * resolved FRESH per request/job — if it's ever bound as a singleton
 * in a long-running worker, $this->ref could leak stale data across
 * unrelated batches processed by the same instance. Confirm the
 * container binding is not singleton before relying on this.
 */
class SchedulerService
{
    /**
     * Focus_Group -> Factory. NULL means non-TSPI (excluded from scheduling).
     * NOTE: DLT here maps to 'F1' — every prior confirmation had it as
     * null ("Removed, not TSPI"). Flagging in case this is a typo.
     */
    private const FOCUS_GROUP_FACTORY_MAP = [
        'AER' => 'F1',
        'COM' => 'F1',
        'HPC' => 'F1',
        'HPCA' => 'F1',
        'HPCC' => 'F1',
        'HPCS' => 'F1',
        'INT' => 'F1',
        'MIC' => 'F1',
        'MIC_WL' => 'F1',
        'MPD' => 'F1',
        'RFC' => 'F1',
        'STR' => 'F1',
        'CV' => 'F2',
        'LT' => 'F2',
        'LTCL' => 'F2',
        'LTI' => 'F2',
        'CV1' => null,
        'SOF' => null,
        'WLT' => null,
        'DLT' => 'F1', // confirmed
    ];

    /** Preloaded reference data for the batch currently being processed. */
    private array $ref = [];

    /**
     * Loads reference data scoped to what THIS batch could possibly
     * need. setup_states filtered first (factory + package_name in the
     * batch, always including NULL-package/RES-type states); part_rules
     * and transition_rules filtered FROM that result.
     */
    protected function preloadReferenceData(Collection $pickupLots): array
    {
        $factories = $pickupLots
            ->map(fn($lot) => $this->resolveFactory($lot->Focus_Group))
            ->filter()
            ->unique()
            ->values();

        $packageNames = $pickupLots->pluck('Package_Name')->filter()->unique()->values();
        $partNames = $pickupLots->pluck('Part_Name')->filter()->unique()->values();

        $setupStates = MachineSetupState::query()
            ->select([
                'setup_state_id',
                'machine_id',
                'factory',
                'focus_group',
                'package_name',
                'body_size',
                'thickness',
                'leadcount_include',
                'leadcount_min',
                'leadcount_max',
                'leadcount_exclude',
                'process_type',
            ])
            ->whereIn('factory', $factories)
            ->where(function ($q) use ($packageNames) {
                $q->whereNull('package_name')->orWhereIn('package_name', $packageNames);
            })
            ->get();

        $relevantStateIds = $setupStates->pluck('setup_state_id');
        $relevantMachineIds = $setupStates->pluck('machine_id')->unique();

        $this->ref = [
            'setup_states' => $setupStates,
            'part_name_override_states' => $this->resolvePartNameOverrideStates($partNames),
            'transition_rules_by_machine' => MachineTransitionRule::query()
                ->whereIn('machine_id', $relevantMachineIds)
                ->get()
                ->groupBy('machine_id'),
            // scoped by the SAME part_names as dedicated_parts above —
            // an exception only ever applies to a part_name actually in
            // this batch, so no need to load the whole table
            'transition_exceptions_by_machine_part' => MachineTransitionRuleException::query()
                ->whereIn('machine_id', $relevantMachineIds)
                ->whereIn('part_name', $partNames)
                ->get()
                ->groupBy(fn($e) => "{$e->machine_id}|{$e->part_name}"),
        ];

        return $this->ref;
    }

    /** In-memory equivalent of the old SQL WHERE chain against machine_setup_states. */
    protected function matchesLotCapability(
        MachineSetupState $state,
        string $factory,
        string $focusGroup,
        ?string $packageName,
        ?string $bodySize2d,
        ?float $thickness,
        ?int $leadCount,
        string $rampProcessType
    ): bool {
        if ($state->factory !== $factory) {
            return false;
        }
        if ($state->focus_group !== null && $state->focus_group !== $focusGroup) {
            return false;
        }
        if ($state->package_name !== null && $state->package_name !== $packageName) {
            return false;
        }
        if ($state->body_size !== null && $state->body_size !== $bodySize2d) {
            return false;
        }
        if ($state->thickness !== null) {
            if ($thickness === null || round((float) $state->thickness, 2) !== round($thickness, 2)) {
                return false;
            }
        }
        if ($state->leadcount_include !== null) {
            if ($leadCount === null) {
                return false;
            }
            $included = array_map('trim', explode(',', $state->leadcount_include));
            return in_array((string) $leadCount, $included, true);
        }
        if ($state->leadcount_min !== null) {
            if ($leadCount === null || $leadCount < $state->leadcount_min) {
                return false;
            }
        }
        if ($state->leadcount_max !== null) {
            if ($leadCount === null || $leadCount > $state->leadcount_max) {
                return false;
            }
        }
        if ($state->leadcount_exclude !== null) {
            if ($leadCount === null) {
                return false;
            }
            $excluded = array_map('trim', explode(',', $state->leadcount_exclude));
            if (in_array((string) $leadCount, $excluded, true)) {
                return false;
            }
        }
        if ($state->process_type !== 'both' && $state->process_type !== $rampProcessType) {
            return false;
        }

        return true;
    }

    /**
     * Entry point. Resolves candidate machines, loads every not-yet-
     * started plan entry on those machines, plus capability/capacity
     * context needed to rank placements.
     *
     * @param  Collection|array<int|string>  $pickup  raw pickup payloads
     * @param  Carbon  $targetDate  production-day (6am–4am) window
     */
    public function handlePickup($pickup, Carbon $targetDate): array
    {
        [$pickupLots, $unmatchedPartNames] = $this->resolvePickupLots($pickup);

        if ($pickupLots->isEmpty()) {
            return [
                'pickup_lots' => $pickupLots,
                'unmatched_part_names' => $unmatchedPartNames,
                'candidate_machine_ids' => collect(),
                'open_entries_by_machine' => collect(),
                'anchor_state_by_machine' => collect(),
                'remaining_capacity_by_machine' => collect(),
                'reference_data' => [],
            ];
        }

        $ref = $this->preloadReferenceData($pickupLots);
        $candidateMachineIds = $this->getCandidateMachineIds($pickupLots);
        $openEntriesByMachine = $this->getUnprocessedPlannedEntries($candidateMachineIds);
        $anchorStateByMachine = $this->getAnchorStates($candidateMachineIds);
        $remainingCapacityByMachine = $this->getRemainingCapacityByMachine($candidateMachineIds, $targetDate);

        return [
            'pickup_lots' => $pickupLots,
            'unmatched_part_names' => $unmatchedPartNames,
            'candidate_machine_ids' => $candidateMachineIds,
            'open_entries_by_machine' => $openEntriesByMachine,
            'anchor_state_by_machine' => $anchorStateByMachine,
            'remaining_capacity_by_machine' => $remainingCapacityByMachine,
            'reference_data' => $ref,
        ];
    }

    /**
     * Normalize `pickup` into Collection<object>, enriched via PartName
     * lookup by part_name. CR3 is intentionally omitted — pickup lots
     * are assumed never RES (confirmed: safe to assume, since pickups
     * can't be verified as residual either way).
     *
     * @return array{0: Collection<object>, 1: Collection<string>}
     */
    protected function resolvePickupLots($pickup): array
    {
        $pickup = $pickup instanceof Collection ? $pickup : collect($pickup);

        if ($pickup->isEmpty()) {
            return [collect(), collect()];
        }

        $resolved = collect();
        $unmatched = collect();

        foreach ($pickup as $item) {
            $item = (array) $item;
            $partName = $item['part_name'] ?? null;

            $packageInfo = PartName::findByPartName($partName);

            if (!$packageInfo) {
                $unmatched->push($partName ?? '(missing part_name)');
                continue;
            }

            $resolved->push((object) [
                'Part_Name'    => $partName,
                'Package_Name' => $item['package_name'] ?? null,
                'Qty'          => $item['qty'] ?? null,
                'Lead_Count'   => $item['lead_count'] ?? null,
                'Body_Size'    => $item['body_size'] ?? null,
                // real PartName columns are devicename/focus_grp/allocation —
                // fixed from focus_group/ramp_time, which don't exist on that model
                'Focus_Group'  => $packageInfo->focus_grp,
                'Ramp_Time'    => $packageInfo->allocation,
                'CR3'          => null, // pickups assumed never RES
                'isExpedite'   => $item['is_expedite'] ?? false,
                'aboveCT'      => false, // pickups have no CT history to compute this from
                'CT'           => null,  // no sortable CT value for pickups either
            ]);
        }

        return [$resolved, $unmatched];
    }

    /**
     * @return Collection<int>  distinct machine_ids
     */
    public function getCandidateMachineIds(Collection $lots): Collection
    {
        $machineIds = collect();

        foreach ($lots as $lot) {
            $factory = $this->resolveFactory($lot->Focus_Group);

            if ($factory === null) {
                continue;
            }

            [$bodySize2d, $thickness] = $this->parseBodySize($lot->Body_Size);
            $rampProcessType = $this->resolveRampProcessType($lot->Ramp_Time);

            $eligible = $this->resolveCandidateStates(
                $lot->Part_Name,
                $factory,
                $lot->Focus_Group,
                $lot->Package_Name,
                $bodySize2d,
                $thickness,
                $lot->Lead_Count,
                $rampProcessType
            );

            $machineIds = $machineIds->merge($eligible->pluck('machine_id'));
        }

        return $machineIds->unique()->values();
    }

    public function getUnprocessedPlannedEntries(Collection $machineIds): Collection
    {
        if ($machineIds->isEmpty()) {
            return collect();
        }

        return LoadingPlanEntry::query()
            ->whereIn('machine_id', $machineIds)
            ->open()
            ->orderBy('machine_id')
            ->orderBy('sequence_order')
            ->get()
            ->groupBy('machine_id');
    }

    public function getAnchorStates(Collection $machineIds): Collection
    {
        if ($machineIds->isEmpty()) {
            return collect();
        }

        $latestStarted = LoadingPlanEntry::query()
            ->whereIn('machine_id', $machineIds)
            ->frozen()
            ->orderBy('machine_id')
            ->orderByDesc('time_start')
            ->get(['machine_id', 'resulting_setup_state_id'])
            ->groupBy('machine_id')
            ->map(fn($rows) => $rows->first()->resulting_setup_state_id);

        return $machineIds->mapWithKeys(fn($id) => [$id => $latestStarted->get($id)]);
    }

    protected function resolveFactory(?string $focusGroup): ?string
    {
        if (!$focusGroup) {
            return null;
        }

        return self::FOCUS_GROUP_FACTORY_MAP[$focusGroup] ?? null;
    }

    /**
     * Remaining capacity per candidate machine for the target production
     * day: 06:00 targetDate through 04:00 next day (04:00–06:00 gap
     * deliberately excluded).
     */
    public function getRemainingCapacityByMachine(Collection $machineIds, Carbon $targetDate): Collection
    {
        if ($machineIds->isEmpty()) {
            return collect();
        }

        $windowStart = $targetDate->copy()->setTime(6, 0, 0);
        $windowEnd = $targetDate->copy()->addDay()->setTime(4, 0, 0);

        $committedByMachine = LoadingPlanEntry::query()
            ->whereIn('machine_id', $machineIds)
            ->where('entry_type', 'lot')
            ->whereBetween('time_start', [$windowStart, $windowEnd])
            ->join('lot_quantities', function ($join) {
                $join->on('lot_quantities.lot_id', '=', 'loading_plan_entries.lot_id')
                    ->on('lot_quantities.scheduled_date', '=', 'loading_plan_entries.scheduled_date');
            })
            ->groupBy('loading_plan_entries.machine_id')
            ->pluck(DB::raw('SUM(lot_quantities.commit) as total_commit'), 'loading_plan_entries.machine_id');

        return $machineIds->mapWithKeys(function ($machineId) use ($committedByMachine, $targetDate) {
            $capacityRow = MachineCapacity::effectiveFor($machineId, $targetDate);

            if (!$capacityRow) {
                return [$machineId => null];
            }

            $committed = (int) ($committedByMachine[$machineId] ?? 0);

            return [$machineId => $capacityRow->capacity - $committed];
        });
    }

    /** commit = intdiv(qty, recipe). */
    public function estimateCommit(object $lot): ?int
    {
        $packageInfo = PartName::findByPartName($lot->Part_Name);

        if (!$packageInfo || !$packageInfo->recipe || !$lot->Qty) {
            return null;
        }

        return intdiv((int) $lot->Qty, (int) $packageInfo->recipe);
    }

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

    /** Any value containing "TAPE" -> taping. "TUBE" -> tubing. REEL/other -> 'both' (unmodeled, no setup list yet). */
    protected function resolveRampProcessType(?string $rampTime): string
    {
        if (!$rampTime) {
            return 'both';
        }

        if (stripos($rampTime, 'TAPE') !== false) {
            return 'taping';
        }

        if ($rampTime === 'TUBE') {
            return 'tubing';
        }

        return 'both';
    }

    /**
     * Part names with a rule row get *exclusive* routing: whichever
     * setup_state(s) their rule(s) name, structural fields ignored
     * entirely. Part names with no rule are untouched by this table.
     * Table is small — fetching all rows and matching in-memory is fine.
     */
    protected function resolvePartNameOverrideStates(Collection $partNames): Collection
    {
        if ($partNames->isEmpty()) {
            return collect();
        }

        $rules = MachineCapabilityPartRule::all();

        $stateIds = $rules->pluck('setup_state_id')->unique();
        $states = MachineSetupState::query()->whereIn('setup_state_id', $stateIds)->get()->keyBy('setup_state_id');

        return $partNames->mapWithKeys(function ($partName) use ($rules, $states) {
            $matched = $rules->filter(fn($rule) => match ($rule->match_type) {
                'exact', 'dedicated_list' => $rule->match_value === $partName,
                'contains' => str_contains($partName, $rule->match_value),
                default => false,
            });

            $entries = $matched
                ->map(fn($rule) => (object) [
                    'state' => $states->get($rule->setup_state_id),
                    'is_dedicated' => $rule->match_type === 'dedicated_list',
                ])
                ->filter(fn($e) => $e->state !== null)
                ->values();

            return [$partName => $entries];
        });
    }

    /** Candidate states for a lot: override states if the part has any rule, else normal structural match. */
    protected function resolveCandidateStates(
        string $partName,
        string $factory,
        string $focusGroup,
        ?string $packageName,
        ?string $bodySize2d,
        ?float $thickness,
        ?int $leadCount,
        string $rampProcessType
    ): Collection {
        $overrides = $this->ref['part_name_override_states']->get($partName, collect());

        if ($overrides->isNotEmpty()) {
            return $overrides->pluck('state')->filter(fn($state) => $state->factory === $factory)->values();
        }

        return $this->ref['setup_states']->filter(fn($state) => $this->matchesLotCapability(
            $state,
            $factory,
            $focusGroup,
            $packageName,
            $bodySize2d,
            $thickness,
            $leadCount,
            $rampProcessType
        ));
    }

    protected function isDedicatedListMatch(string $partName, int $setupStateId): bool
    {
        return $this->ref['part_name_override_states']
            ->get($partName, collect())
            ->contains(fn($o) => $o->is_dedicated && $o->state->setup_state_id === $setupStateId);
    }

    /**
     * Cost/rule to move from $fromStateId to $toStateId on a machine,
     * for a specific part_name. Exceptions (machine_transition_rule_
     * exceptions) are checked FIRST — they override the general
     * machine_transition_rules for that one part_name only, e.g. "no
     * setup on leadcount change" for a specific set of parts even
     * though the general rule for that machine says otherwise.
     */
    protected function transitionCost(int $machineId, ?int $fromStateId, int $toStateId, ?string $partName = null): array
    {
        if ($fromStateId === $toStateId) {
            return ['operation_type' => 'none', 'duration' => 0, 'rule_id' => null];
        }

        if ($partName) {
            $exceptions = $this->ref['transition_exceptions_by_machine_part'][$machineId . '|' . $partName] ?? collect();

            $exception = $exceptions->first(fn($e) => $e->to_state_id === $toStateId && $e->from_state_id === $fromStateId)
                ?? $exceptions->first(fn($e) => $e->to_state_id === $toStateId && $e->from_state_id === null);

            if ($exception) {
                return [
                    'operation_type' => $exception->operation_type,
                    'duration' => $exception->est_duration_minutes ?? 0,
                    'rule_id' => null, // exceptions aren't machine_transition_rules rows
                ];
            }
        }

        $machineRules = $this->ref['transition_rules_by_machine']->get($machineId, collect());

        $rule = $machineRules->first(fn($r) => $r->to_state_id === $toStateId && $r->from_state_id === $fromStateId)
            ?? $machineRules->first(fn($r) => $r->to_state_id === $toStateId && $r->from_state_id === null);

        return [
            'operation_type' => $rule->operation_type ?? 'setup',
            'duration' => $rule->est_duration_minutes ?? 240,
            'rule_id' => $rule->rule_id ?? null,
        ];
    }

    /**
     * Rank every viable (machine, setup_state, insertion position) for
     * ONE lot. Pure decision logic, no DB writes.
     *
     * @return array{
     *     machine_id: int, resulting_setup_state_id: int, operation_type: string,
     *     est_duration_minutes: int, matched_rule_id: int|null,
     *     insert_after_entry_id: int|null, insert_before_entry_id: int|null,
     * }|null
     */
    public function rankCandidatesForLot(
        object $lot,
        Collection $openEntriesByMachine,
        Collection $anchorStateByMachine,
        Collection $remainingCapacityByMachine
    ): ?array {
        $factory = $this->resolveFactory($lot->Focus_Group);

        if ($factory === null) {
            return null;
        }

        $estimatedCommit = $this->estimateCommit($lot);

        [$bodySize2d, $thickness] = $this->parseBodySize($lot->Body_Size);
        $rampProcessType = $this->resolveRampProcessType($lot->Ramp_Time);

        $candidateStates = $this->resolveCandidateStates(
            $lot->Part_Name,
            $factory,
            $lot->Focus_Group,
            $lot->Package_Name,
            $bodySize2d,
            $thickness,
            $lot->Lead_Count,
            $rampProcessType
        );

        $best = null;

        foreach ($candidateStates as $state) {
            $remainingCapacity = $remainingCapacityByMachine[$state->machine_id] ?? null;

            if ($remainingCapacity === null) {
                continue;
            }
            if ($estimatedCommit !== null && $remainingCapacity < $estimatedCommit) {
                continue;
            }

            $isCr3Dedicated = ($lot->CR3 === 'RES')
                && $this->isDedicatedListMatch($lot->Part_Name, $state->setup_state_id);

            $openLots = ($openEntriesByMachine[$state->machine_id] ?? collect())
                ->where('entry_type', 'lot')
                ->values();

            $anchorState = $anchorStateByMachine[$state->machine_id] ?? null;

            $positions = $openLots->isEmpty()
                ? [[null, null]]
                : collect(range(0, $openLots->count()))->map(function ($i) use ($openLots) {
                    $pred = $i === 0 ? null : $openLots[$i - 1];
                    $succ = $i === $openLots->count() ? null : $openLots[$i];
                    return [$pred, $succ];
                })->all();

            foreach ($positions as [$predEntry, $succEntry]) {
                $predStateId = $predEntry->resulting_setup_state_id ?? $anchorState;
                $succStateId = $succEntry->resulting_setup_state_id ?? null;

                $entryCost = $this->transitionCost($state->machine_id, $predStateId, $state->setup_state_id, $lot->Part_Name);

                if ($succStateId !== null) {
                    $exitCost = $this->transitionCost($state->machine_id, $state->setup_state_id, $succStateId, $lot->Part_Name);
                    $bridgeCost = $this->transitionCost($state->machine_id, $predStateId, $succStateId, $lot->Part_Name);
                    $marginalDuration = $entryCost['duration'] + $exitCost['duration'] - $bridgeCost['duration'];
                } else {
                    $marginalDuration = $entryCost['duration'];
                }

                $candidate = [
                    'machine_id' => $state->machine_id,
                    'resulting_setup_state_id' => $state->setup_state_id,
                    'operation_type' => $entryCost['operation_type'],
                    'est_duration_minutes' => $entryCost['duration'],
                    'matched_rule_id' => $entryCost['rule_id'],
                    'insert_after_entry_id' => $predEntry->id ?? null,
                    'insert_before_entry_id' => $succEntry->id ?? null,
                    '_marginal_duration' => $marginalDuration,
                    '_is_free' => $marginalDuration === 0,
                    '_is_cr3_dedicated' => $isCr3Dedicated,
                    '_remaining_capacity' => $remainingCapacity,
                ];

                if ($best === null || $this->isBetterCandidate($candidate, $best)) {
                    $best = $candidate;
                }
            }
        }

        if ($best === null) {
            return null;
        }

        unset($best['_marginal_duration'], $best['_is_free'], $best['_is_cr3_dedicated'], $best['_remaining_capacity']);

        return $best;
    }

    protected function isBetterCandidate(array $candidate, array $incumbent): bool
    {
        if ($candidate['_is_free'] !== $incumbent['_is_free']) {
            return $candidate['_is_free'];
        }
        if ($candidate['_is_cr3_dedicated'] !== $incumbent['_is_cr3_dedicated']) {
            return $candidate['_is_cr3_dedicated'];
        }
        if ($candidate['_marginal_duration'] !== $incumbent['_marginal_duration']) {
            return $candidate['_marginal_duration'] < $incumbent['_marginal_duration'];
        }
        return $candidate['_remaining_capacity'] > $incumbent['_remaining_capacity'];
    }

    protected function findBridgingBlock(
        Collection $rawOpenEntries,
        ?LoadingPlanEntry $predEntry,
        ?LoadingPlanEntry $succEntry
    ): ?LoadingPlanEntry {
        if ($succEntry === null) {
            return null;
        }

        $lowerBound = $predEntry->sequence_order ?? -INF;

        return $rawOpenEntries
            ->where('entry_type', 'block')
            ->first(fn($e) => $e->sequence_order > $lowerBound && $e->sequence_order < $succEntry->sequence_order);
    }

    protected function reconcileStaleBridge(
        int $machineId,
        LoadingPlanEntry $newLotEntry,
        int $newLotStateId,
        ?LoadingPlanEntry $succEntry,
        Collection $rawOpenEntries,
        ?LoadingPlanEntry $predEntry
    ): void {
        $staleBlock = $this->findBridgingBlock($rawOpenEntries, $predEntry, $succEntry);

        if ($staleBlock === null || $succEntry === null || $succEntry->resulting_setup_state_id === null) {
            return;
        }

        $trueCost = $this->transitionCost($machineId, $newLotStateId, $succEntry->resulting_setup_state_id, $newLotEntry->part_name);

        if ($trueCost['operation_type'] === 'none') {
            $staleBlock->delete();
            return;
        }

        $staleBlock->update([
            'block_label' => $this->describeOperation($trueCost, $newLotStateId, $succEntry->resulting_setup_state_id),
            'accu_time' => $trueCost['duration'],
            'operation_type' => $trueCost['operation_type'],
            'matched_rule_id' => $trueCost['rule_id'],
            'resulting_setup_state_id' => $succEntry->resulting_setup_state_id,
        ]);
    }

    protected function describeOperation(array $cost, int $fromStateId, int $toStateId): string
    {
        return ucfirst($cost['operation_type']) . ": state {$fromStateId} -> {$toStateId}";
    }

    protected function applyPlacement(object $lot, array $choice, string $date): array
    {
        $machineId = $choice['machine_id'];
        $afterId = $choice['insert_after_entry_id'];
        $beforeId = $choice['insert_before_entry_id'];

        $rawOpenEntries = LoadingPlanEntry::query()
            ->where('machine_id', $machineId)
            ->open()
            ->orderBy('sequence_order')
            ->get();

        $predEntry = $afterId ? $rawOpenEntries->firstWhere('id', $afterId) : null;
        $succEntry = $beforeId ? $rawOpenEntries->firstWhere('id', $beforeId) : null;

        if ($choice['operation_type'] !== 'none') {
            $blockResult = $this->addBlock(
                $machineId,
                $date,
                $this->describeOperation($choice, 0, $choice['resulting_setup_state_id']),
                $choice['est_duration_minutes'],
                null,
                $afterId
            );

            $afterId = $blockResult['entry_id'];
        }

        $generatedLotId = $lot->Lot_Id
            ?? ('PICKUP-' . now()->format('YmdHis') . '-' . strtoupper(\Illuminate\Support\Str::random(4)));

        $lotResult = $this->createManualLot(
            $machineId,
            $date,
            [
                'lot_id' => $generatedLotId,
                'package_name' => $lot->Package_Name,
                'part_name' => $lot->Part_Name,
                'qty' => $lot->Qty,
                'resulting_setup_state_id' => $choice['resulting_setup_state_id'],
                'matched_rule_id' => $choice['matched_rule_id'],
            ],
            $beforeId,
            $afterId
        );

        $newLotEntry = LoadingPlanEntry::findOrFail($lotResult['entry_id']);

        $this->reconcileStaleBridge(
            $machineId,
            $newLotEntry,
            $choice['resulting_setup_state_id'],
            $succEntry,
            $rawOpenEntries,
            $predEntry
        );

        return $lotResult;
    }

    /**
     * @param  Collection<object>|array  $pickup
     */
    public function commitPickupBatch($pickup, Carbon $targetDate): array
    {
        $gathered = $this->handlePickup($pickup, $targetDate);

        $results = [
            'placed' => [],
            'unassigned' => collect(),
            'unmatched_part_names' => $gathered['unmatched_part_names'],
        ];

        if ($gathered['pickup_lots']->isEmpty()) {
            return $results;
        }

        $dateString = $targetDate->toDateString();

        return DB::transaction(function () use ($gathered, $dateString, &$results) {
            $openEntriesByMachine = $gathered['open_entries_by_machine'];
            $anchorStateByMachine = $gathered['anchor_state_by_machine'];
            $remainingCapacityByMachine = $gathered['remaining_capacity_by_machine'];

            $orderedLots = $gathered['pickup_lots']
                ->map(function ($lot) use ($openEntriesByMachine, $anchorStateByMachine, $remainingCapacityByMachine) {
                    $preview = $this->rankCandidatesForLot(
                        $lot,
                        $openEntriesByMachine,
                        $anchorStateByMachine,
                        $remainingCapacityByMachine
                    );
                    return [
                        'lot' => $lot,
                        'has_free_option' => $preview !== null && $preview['operation_type'] === 'none',
                    ];
                })
                ->sortByDesc('has_free_option')
                ->pluck('lot');

            foreach ($orderedLots as $lot) {
                $choice = $this->rankCandidatesForLot(
                    $lot,
                    $openEntriesByMachine,
                    $anchorStateByMachine,
                    $remainingCapacityByMachine
                );

                if ($choice === null) {
                    $results['unassigned']->push($lot);
                    continue;
                }

                $results['placed'][] = $this->applyPlacement($lot, $choice, $dateString);

                $machineId = $choice['machine_id'];
                $anchorStateByMachine[$machineId] = $choice['resulting_setup_state_id'];

                $commit = $this->estimateCommit($lot) ?? 0;
                $remainingCapacityByMachine[$machineId] =
                    ($remainingCapacityByMachine[$machineId] ?? 0) - $commit;

                $openEntriesByMachine[$machineId] = LoadingPlanEntry::query()
                    ->where('machine_id', $machineId)
                    ->open()
                    ->orderBy('sequence_order')
                    ->get();
            }

            return $results;
        });
    }

    /** Tier 1 = expedite. Tier 2 = above CT. Tier 3 = everything else. */
    protected function priorityTier($item): int
    {
        if ($item->isExpedite ?? false) {
            return 1;
        }
        if ($item->aboveCT ?? false) {
            return 2;
        }
        return 3;
    }

    protected function hydrateLotFromEntry(LoadingPlanEntry $entry, ?CustomerDataWip $wip): ?object
    {
        $lotQty = $entry->lotQuantity;

        if (!$wip) {
            return null;
        }

        $formulas = LoadingPlanFormulas::make($wip);

        return (object) [
            'Lot_Id' => $entry->lot_id,
            'Part_Name' => $lotQty->part_name ?? $wip->Part_Name,
            'Package_Name' => $entry->package_name ?? $wip->Package_Name,
            'Qty' => $lotQty?->effectiveQty() ?? $wip->Qty,
            'Lead_Count' => $wip->Lead_Count,
            'Body_Size' => $wip->Body_Size,
            'Focus_Group' => $wip->Focus_Group,
            'Ramp_Time' => $wip->Ramp_Time,
            'CR3' => $wip->CR3,
            'isExpedite' => (strcasecmp($entry->tag ?? '', 'expedite') === 0),
            'aboveCT' => $formulas->cycleTimeExceedOverall,
            'CT' => $formulas->ct ?? null,
        ];
    }

    /**
     * Places a tier in FIXED priority order: sorted by CT descending
     * (nulls last — e.g. an expedite pickup with no computable CT sorts
     * after expedite WIP lots that have one). No dynamic reordering —
     * unlike tier 3, these are never reshuffled to save configuration
     * time, per the stated priority hierarchy.
     */
    protected function placeTierByPriority(
        Collection $items,
        Collection &$openEntriesByMachine,
        Collection &$anchorStateByMachine,
        Collection &$remainingCapacityByMachine,
        string $dateString,
        array &$results
    ): void {
        $ordered = $items->sortByDesc(fn($item) => $item->CT ?? -INF)->values();

        foreach ($ordered as $lot) {
            $choice = $this->rankCandidatesForLot(
                $lot,
                $openEntriesByMachine,
                $anchorStateByMachine,
                $remainingCapacityByMachine
            );

            if ($choice === null) {
                $results['unassigned']->push($lot);
                continue;
            }

            $results['placed'][] = $this->applyPlacement($lot, $choice, $dateString);

            $machineId = $choice['machine_id'];
            $anchorStateByMachine[$machineId] = $choice['resulting_setup_state_id'];

            $commit = $this->estimateCommit($lot) ?? 0;
            $remainingCapacityByMachine[$machineId] =
                ($remainingCapacityByMachine[$machineId] ?? 0) - $commit;

            $openEntriesByMachine[$machineId] = LoadingPlanEntry::query()
                ->where('machine_id', $machineId)
                ->open()
                ->orderBy('sequence_order')
                ->get();
        }
    }

    /**
     * Places tier 3 via greedy-cheapest-next: re-previews all remaining
     * items every round, places whichever is cheapest right now. This
     * is where "minimize configuration" actually happens — tiers 1/2
     * are placed by fixed CT order instead, never cost-reordered.
     *
     * NOTE: O(n^2) in tier size.
     */
    protected function greedyPlaceTier(
        Collection $items,
        Collection &$openEntriesByMachine,
        Collection &$anchorStateByMachine,
        Collection &$remainingCapacityByMachine,
        string $dateString,
        array &$results
    ): void {
        $remaining = $items->values();

        while ($remaining->isNotEmpty()) {
            $bestIdx = null;
            $bestChoice = null;
            $bestCost = null;

            foreach ($remaining as $idx => $lot) {
                $choice = $this->rankCandidatesForLot(
                    $lot,
                    $openEntriesByMachine,
                    $anchorStateByMachine,
                    $remainingCapacityByMachine
                );

                if ($choice === null) {
                    continue;
                }

                $cost = $choice['operation_type'] === 'none' ? 0 : $choice['est_duration_minutes'];

                if ($bestCost === null || $cost < $bestCost) {
                    $bestCost = $cost;
                    $bestIdx = $idx;
                    $bestChoice = $choice;
                }
            }

            if ($bestIdx === null) {
                foreach ($remaining as $lot) {
                    $results['unassigned']->push($lot);
                }
                return;
            }

            $lot = $remaining[$bestIdx];
            $results['placed'][] = $this->applyPlacement($lot, $bestChoice, $dateString);

            $machineId = $bestChoice['machine_id'];
            $anchorStateByMachine[$machineId] = $bestChoice['resulting_setup_state_id'];

            $commit = $this->estimateCommit($lot) ?? 0;
            $remainingCapacityByMachine[$machineId] =
                ($remainingCapacityByMachine[$machineId] ?? 0) - $commit;

            $openEntriesByMachine[$machineId] = LoadingPlanEntry::query()
                ->where('machine_id', $machineId)
                ->open()
                ->orderBy('sequence_order')
                ->get();

            $remaining = $remaining->forget($bestIdx)->values();
        }
    }

    /**
     * Full rebuild triggered by a pickup arrival: pools every OPEN
     * entry on candidate machines with new pickup lots, wipes the open
     * window, replans from scratch. Frozen entries never touched.
     * Tier 1/2 placed by fixed CT-descending order; tier 3 by
     * greedy-cheapest-next.
     *
     * NOTE: no reoptimization_runs/audit trail — accepted as-is per
     * current instructions, open entries are deleted outright.
     *
     * @param  Collection|array  $pickup
     */
    public function rebuildForPickupArrival($pickup, Carbon $targetDate): array
    {
        [$pickupLots, $unmatchedPartNames] = $this->resolvePickupLots($pickup);

        $results = ['placed' => [], 'unassigned' => collect(), 'unmatched_part_names' => $unmatchedPartNames];

        $this->preloadReferenceData($pickupLots);
        $candidateMachineIds = $this->getCandidateMachineIds($pickupLots);

        if ($candidateMachineIds->isEmpty() && $pickupLots->isEmpty()) {
            return $results;
        }

        $dateString = $targetDate->toDateString();

        return DB::transaction(function () use ($candidateMachineIds, $pickupLots, $dateString, $targetDate, &$results) {
            $entries = LoadingPlanEntry::query()
                ->with(['lotQuantity', 'activeLotSplit'])
                ->whereIn('machine_id', $candidateMachineIds)
                ->open()
                ->where('entry_type', 'lot')
                ->get();

            // resolveRootLotId() cached here so it's computed once per
            // entry, not twice (once for the WIP batch-query, once during
            // hydration) — both passes reuse this map
            $rootLotIdByEntry = $entries->mapWithKeys(fn($e) => [$e->id => $e->resolveRootLotId()]);

            $entriesByDate = $entries->groupBy(fn($e) => $e->scheduled_date->toDateString());

            $wips = CustomerDataWip::query()
                ->where(function ($query) use ($entriesByDate, $rootLotIdByEntry) {
                    foreach ($entriesByDate as $date => $dateEntries) {
                        $rootLotIds = $dateEntries->map(fn($e) => $rootLotIdByEntry[$e->id])->unique()->toArray();

                        $query->orWhere(function ($subQuery) use ($date, $rootLotIds) {
                            $subQuery->forDate($date)->whereIn('Lot_Id', $rootLotIds);
                        });
                    }
                })
                ->get();

            $wipLookup = [];
            foreach ($wips as $wip) {
                $dateStr = Carbon::parse($wip->import_date)->toDateString();
                $wipLookup["{$dateStr}:{$wip->Lot_Id}"] = $wip;
            }

            $existingLots = $entries->map(function ($entry) use ($wipLookup, $rootLotIdByEntry) {
                $rootLotId = $rootLotIdByEntry[$entry->id];
                $dateStr = $entry->scheduled_date->toDateString();
                $wip = $wipLookup["{$dateStr}:{$rootLotId}"] ?? null;

                return $this->hydrateLotFromEntry($entry, $wip);
            })->filter()->values();

            LoadingPlanEntry::query()->whereIn('machine_id', $candidateMachineIds)->open()->delete();

            $anchorStateByMachine = $this->getAnchorStates($candidateMachineIds);
            $remainingCapacityByMachine = $this->getRemainingCapacityByMachine($candidateMachineIds, $targetDate);
            $openEntriesByMachine = collect();

            $pool = $existingLots->merge($pickupLots);
            $tiers = $pool->groupBy(fn($lot) => $this->priorityTier($lot));

            $this->placeTierByPriority(
                $tiers->get(1, collect()),
                $openEntriesByMachine,
                $anchorStateByMachine,
                $remainingCapacityByMachine,
                $dateString,
                $results
            );
            $this->placeTierByPriority(
                $tiers->get(2, collect()),
                $openEntriesByMachine,
                $anchorStateByMachine,
                $remainingCapacityByMachine,
                $dateString,
                $results
            );
            $this->greedyPlaceTier(
                $tiers->get(3, collect()),
                $openEntriesByMachine,
                $anchorStateByMachine,
                $remainingCapacityByMachine,
                $dateString,
                $results
            );

            return $results;
        });
    }
}
