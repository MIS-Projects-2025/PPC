<?php

namespace App\Services;

use App\Models\CustomerDataWip;
use App\Models\LoadingPlanEntry;
use App\Models\MachineCapacity;
use App\Models\MachineSetupState;
use App\Models\MachineCapabilityPartRule;
use App\Models\MachineTransitionRule;
use App\Models\MachineTransitionRuleException;
use App\Models\MachineAutoPartRule;
use App\Models\LotSplit;
use App\Models\MachineFocusGroupRule;
use App\Models\PackageGroupLoadingPlan;
use App\Models\MachineTransitionAxisRule;
use App\Models\MachinePartExclusion;
use App\Services\LoadingPlanFormulas;
use App\Services\FocusGroupFactoryService;
use App\Services\LoadingPlanEntryService;
use App\Models\PartName;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Exception;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

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
    public function __construct(
        protected FocusGroupFactoryService $focusGroupFactoryService,
        protected LoadingPlanEntryService $loadingPlanEntryService
    ) {}

    /** Preloaded reference data for the batch currently being processed. */
    private array $ref = [];
    private array $plan = [];
    private $fakeEntryId = -1;

    protected ?LotScheduleCalculator $calc = null;

    /**
     * Scopes the shared calculator's package-list load to exactly the part
     * names this batch needs, instead of loadPackageList()'s fallback of
     * loading the whole ~20k-row package_list table. Call once per batch
     * entry point — before any estimateCommit() calls for lots in that batch.
     */
    public function preloadPackageList(iterable $lots): void
    {
        $partNames = collect($lots)
            ->map(fn($lot) => $lot->Part_Name ?? null)
            ->filter()
            ->unique()
            ->values()
            ->all();

        $this->calc = app(LotScheduleCalculator::class);
        $this->calc->loadPackageList($partNames);
    }

    protected function calculator(): LotScheduleCalculator
    {
        if ($this->calc === null) {
            // No preloadPackageList() call happened for this batch — falls
            // back to an unscoped load. Shouldn't happen on the normal
            // paths; logged so a missing preload call gets noticed instead
            // of silently eating the full-table cost again.
            Log::warning('SchedulerService::calculator() built without preloadPackageList() — loading package_list unscoped.');
            $this->calc = app(LotScheduleCalculator::class);
            $this->calc->loadPackageList();
        }
        return $this->calc;
    }

    /**
     * Pure compatibility check for a batch of lots against all candidate
     * machines — no capacity, no queue position, no transition cost.
     * $lots must be shaped like resolvePickupLots()/hydrateLotFromEntry()
     * output (Part_Name, Focus_Group, Package_Name, Body_Size, Lead_Count,
     * Ramp_Time, Lot_Type, is_auto_part, CR3).
     *
     * @return Collection<int, array{compatible_lot_ids: Collection, incompatible_lot_ids: Collection}>
     *         keyed by machine_id. Only machines that are a candidate for at
     *         least one lot appear here — the caller fills in "0 for 0" for
     *         every other active machine (fully incompatible).
     */
    public function evaluateTransferCompatibility(Collection $lots): Collection
    {
        $this->preloadReferenceData($lots);
        $this->preloadPackageList($lots);

        $candidateMachineIdsByLot = $lots->mapWithKeys(
            fn($lot) => [$lot->Lot_Id => $this->candidateMachineIdsForLot($lot)]
        );

        $allMachineIds = $candidateMachineIdsByLot->flatten()->unique()->values();

        return $allMachineIds->mapWithKeys(function ($machineId) use ($candidateMachineIdsByLot) {
            [$compatible, $incompatible] = $candidateMachineIdsByLot->partition(
                fn($ids) => $ids->contains($machineId)
            );

            return [$machineId => [
                'compatible_lot_ids'   => $compatible->keys()->values(),
                'incompatible_lot_ids' => $incompatible->keys()->values(),
            ]];
        });
    }

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
                'lot_type',
                'process_type',
            ])
            ->whereIn('factory', $factories)
            ->where(function ($q) use ($packageNames) {
                $q->whereNull('package_name')->orWhereIn('package_name', $packageNames);
            })
            ->get();

        $relevantStateIds = $setupStates->pluck('setup_state_id');
        $relevantMachineIds = $setupStates->pluck('machine_id')->unique();

        /*
        * States that are the DESTINATION of a machine_capability_part_rules
        * override must not also sit in the general structural-matching pool.
        * Design intent: such a state is meant to be reachable ONLY via the
        * override branch in resolveCandidateStates(), for parts whose name
        * matches the linked rule. Many of these rows have NULL structural
        * columns (package_name/body_size/leadcount/etc.) by design, since
        * the rule -- not the structural fields -- is what's supposed to
        * restrict them. Left in the general pool, an all-NULL row with
        * process_type='both' matches almost any lot on that factory,
        * silently becoming a wildcard for every OTHER part too.
        *
        * Excluding them here does not affect the override branch itself --
        * resolvePartNameOverrideStates() below re-fetches override states
        * via its own independent query, so ADG884-family parts (etc.)
        * still resolve to these states through the override path. This
        * exclusion only removes them from the fallback every non-matching
        * part uses.
        */
        $overrideOnlyStateIds = MachineCapabilityPartRule::query()
            ->pluck('setup_state_id')
            ->unique();

        $generalSetupStates = $setupStates->whereNotIn('setup_state_id', $overrideOnlyStateIds)->values();

        $this->ref = [
            'setup_states_by_id' => $setupStates->keyBy('setup_state_id'),
            'package_group_by_name' => PackageGroupLoadingPlan::all()->pluck('group_name', 'package_name'),
            'transition_axis_rules_by_machine' => MachineTransitionAxisRule::query()
                ->whereIn('machine_id', $relevantMachineIds)->get()->groupBy('machine_id'),
            // 'setup_states' => $setupStates,
            'setup_states' => $generalSetupStates,
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
            'auto_part_rules_by_machine' => MachineAutoPartRule::query()
                ->whereIn('machine_id', $relevantMachineIds)
                ->get()
                ->groupBy('machine_id'),

            'focus_group_rules_by_machine' => MachineFocusGroupRule::query()
                ->whereIn('machine_id', $relevantMachineIds)
                ->get()
                ->groupBy('machine_id'),

            'part_exclusions_by_part' => MachinePartExclusion::query()
                ->whereIn('part_name', $partNames)
                ->get()
                ->groupBy('part_name'),
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
        ?string $rampProcessType,
        ?string $lotType
    ): bool {
        if ($state->factory !== $factory) {
            return false;
        }
        if ($state->focus_group !== null && $state->focus_group !== $focusGroup) {
            return false;
        }
        if ($state->package_name !== null) {
            $isLiteralMatch = $state->package_name === $packageName;
            $isGroupMatch = $this->ref['package_group_by_name']->get($packageName) === $state->package_name;

            if (!$isLiteralMatch && !$isGroupMatch) {
                return false;
            }
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
        if ($rampProcessType === null) {
            return false; // unrecognized ramp_time -- reject outright, even against 'both' states
        }
        if ($state->process_type !== 'both' && $state->process_type !== $rampProcessType) {
            return false;
        }
        if ($state->lot_type !== null) {
            if ($lotType === null || $state->lot_type !== $lotType) {
                return false;
            }
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
            // Log::info("item");
            // Log::info($item);
            $item = (array) $item;
            $partName = $item['part_name'] ?? null;

            $packageInfo = PartName::findByPartName($partName);

            if (!$packageInfo) {
                $unmatched->push($partName ?? '(missing part_name)');
                continue;
            }

            if (!$item['lot_id']) {
                throw new Exception("The lot to be scheduled does not have lot_id");
            }

            $resolved->push((object) [
                'Part_Name'    => $partName,
                'Lot_Id'       => $item['lot_id'],
                'Package_Name' => $item['package_name'] ?? null,
                'Qty'          => $item['qty'] ?? null,
                'Lead_Count'   => $item['lead_count'] ?? null,
                'Body_Size'    => $item['body_size'] ?? null,
                // real PartName columns are devicename/focus_grp/allocation —
                // fixed from focus_group/ramp_time, which don't exist on that model
                'Focus_Group'  => $packageInfo->focus_grp,
                'Ramp_Time'    => $packageInfo->allocation,
                'is_auto_part' => (bool) $packageInfo->is_auto_part,
                'CR3'          => null, // pickups assumed never RES
                'Lot_Type'     => null, // pickups assumed never LC — no CustomerDataWip link to check
                'isExpedite'   => $item['is_expedite'] ?? false,
                'aboveCT'      => false, // pickups have no CT history to compute this from
                'CT'           => null,  // no sortable CT value for pickups either
            ]);
        }

        return [$resolved, $unmatched];
    }

    /**
     * Everything about a lot that's fixed for the whole tier-3 run —
     * independent of schedule state, so safe to compute exactly once
     * instead of re-deriving on every invalidated re-rank.
     */
    protected function buildLotContext(object $lot): ?object
    {
        $factory = $this->resolveFactory($lot->Focus_Group);
        if ($factory === null) {
            return null;
        }

        [$bodySize2d, $thickness] = $this->parseBodySize($lot->Body_Size);
        $rampProcessType = $this->resolveRampProcessType($lot->Ramp_Time);

        $candidateStates = $this->resolveCandidateStates(
            $lot->Part_Name,
            $factory,
            $lot->Focus_Group,
            $lot->Package_Name,
            $bodySize2d,
            $thickness,
            $lot->is_auto_part,
            $lot->Lead_Count,
            $rampProcessType,
            $lot->Lot_Type
        );

        return (object) [
            'candidateStates' => $candidateStates,
            'candidateMachineIds' => $candidateStates->pluck('machine_id')->unique()->values(),
            'estimatedCommit' => $this->estimateCommit($lot),
            'isCr3Dedicated' => $lot->CR3 === 'RES', // resolved per-state below
        ];
    }

    // /**
    //  * @return Collection<int>  distinct machine_ids
    //  */
    // public function getCandidateMachineIds(Collection $lots): Collection
    // {
    //     $machineIds = collect();

    //     foreach ($lots as $lot) {
    //         $factory = $this->resolveFactory($lot->Focus_Group);

    //         if ($factory === null) {
    //             continue;
    //         }

    //         [$bodySize2d, $thickness] = $this->parseBodySize($lot->Body_Size);
    //         $rampProcessType = $this->resolveRampProcessType($lot->Ramp_Time);

    //         $eligible = $this->resolveCandidateStates(
    //             $lot->Part_Name,
    //             $factory,
    //             $lot->Focus_Group,
    //             $lot->Package_Name,
    //             $bodySize2d,
    //             $thickness,
    //             $lot->is_auto_part,
    //             $lot->Lead_Count,
    //             $rampProcessType
    //         );

    //         $machineIds = $machineIds->merge($eligible->pluck('machine_id'));
    //     }

    //     return $machineIds->unique()->values();
    // }

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

        return $this->focusGroupFactoryService->resolveFactory($focusGroup);
    }

    /**
     * Remaining capacity per candidate machine for the target production
     * day: 06:00 targetDate through 04:00 next day (04:00–06:00 gap
     * deliberately excluded).
     */
    public function getRemainingCapacityByMachine(Collection $machineIds, Carbon $targetDate): Collection
    {
        $committedByMachine = $this->getCommittedDoableByMachine($machineIds, $targetDate);

        return $machineIds->mapWithKeys(function ($machineId) use ($committedByMachine, $targetDate) {
            $capacityRow = MachineCapacity::effectiveFor($machineId, $targetDate);
            return $capacityRow
                ? [$machineId => $capacityRow->capacity - $committedByMachine[$machineId]]
                : [$machineId => null];
        });
    }

    /** commit = intdiv(qty, recipe). */
    public function estimateCommit(object $lot): ?int
    {
        if (!$lot->Qty) {
            return null;
        }

        return $this->calculator()->computeMetrics(
            $lot->Part_Name,
            (int) $lot->Qty,
            null // machineName — not needed for commit, only for capacity_uph_snapshot/accu_time
        )['commit'];
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
    protected function resolveRampProcessType(?string $rampTime): ?string
    {
        if (!$rampTime) {
            return null;
        }

        $rampTime = strtoupper(trim($rampTime));

        $trayValues = ['TRAY', 'WAFFLE_TRAY'];
        $tubeValues = ['TUBE'];
        $tapeValues = [
            'PCKTTAPE13',
            'PCKTTAPE7',
            '500REEL',
            '500RL7',
            'MINIREEL',
            'R2',
            'R250',
            'REEL',
            'REEL_7',
            'REEL13',
            'REEL250',
            'REELS',
            'REEL500',
            'REEL7',
            'RL',
        ];

        if (in_array($rampTime, $trayValues, true)) return 'tray';
        if (in_array($rampTime, $tubeValues, true)) return 'tubing';
        if (in_array($rampTime, $tapeValues, true)) return 'taping';

        return null; // unmapped -- fail safe, not 'both'
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

    protected function passesNewRestrictions(int $machineId, string $factory, ?string $packageName, ?string $focusGroup, ?bool $isAutoPart, ?string $partName): bool
    {
        // machine_part_exclusions — pure negative, checked first
        if (
            $partName && $this->ref['part_exclusions_by_part']->get($partName, collect())
            ->contains(fn($e) => $e->machine_id === $machineId)
        ) {
            return false;
        }

        // machine_focus_group_rules
        $fgRules = $this->ref['focus_group_rules_by_machine']->get($machineId, collect())
            ->where('focus_group', $focusGroup);
        if ($fgRules->contains(fn($r) => $r->rule_type === 'exclude')) {
            return false;
        }

        // machine_auto_part_rules — only relevant when the lot IS auto
        if ($isAutoPart) {
            $allAutoRulesForPackage = $this->ref['auto_part_rules_by_machine']
                ->flatten(1)
                ->filter(fn($r) => $r->package_name === null || $r->package_name === $packageName);

            $includeOnlyMachineIds = $allAutoRulesForPackage
                ->where('rule_type', 'include_only')
                ->pluck('machine_id');

            // GLOBAL check: if ANY include_only rule exists for this
            // package (on any machine, not just this one), this machine
            // is only valid if it's IN that set
            if ($includeOnlyMachineIds->isNotEmpty() && !$includeOnlyMachineIds->contains($machineId)) {
                return false;
            }

            // exclude check unchanged, still per-machine
            $excludedHere = $allAutoRulesForPackage
                ->where('machine_id', $machineId)
                ->where('rule_type', 'exclude')
                ->isNotEmpty();
            if ($excludedHere) {
                return false;
            }
        }

        return true;
    }

    /** Candidate states for a lot: override states if the part has any rule, else normal structural match. */
    protected function resolveCandidateStates(
        string $partName,
        string $factory,
        string $focusGroup,
        ?string $packageName,
        ?string $bodySize2d,
        ?float $thickness,
        ?bool $isAutoPart,
        ?int $leadCount,
        ?string $rampProcessType,
        ?string $lotType
    ): Collection {
        $overrides = $this->ref['part_name_override_states']->get($partName, collect());

        if ($overrides->isNotEmpty()) {
            return $overrides->pluck('state')
                ->filter(fn($state) => $state->factory === $factory)
                ->filter(fn($state) => $this->passesNewRestrictions($state->machine_id, $factory, $packageName, $focusGroup, $isAutoPart, $partName))
                ->values();
        }

        return $this->ref['setup_states']->filter(fn($state) => $this->matchesLotCapability(
            $state,
            $factory,
            $focusGroup,
            $packageName,
            $bodySize2d,
            $thickness,
            $leadCount,
            $rampProcessType,
            $lotType
        ))->filter(fn($state) => $this->passesNewRestrictions($state->machine_id, $factory, $packageName, $focusGroup, $isAutoPart, $partName));;
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
     *
     * Machines with axis rules (machine_transition_axis_rules) are
     * costed by diffing factory/package_group/leadcount/body_size live
     * instead of a materialized pairwise row; cost = MAX of whichever
     * axes differ. Machines with no axis rules fall through unchanged to
     * the existing pairwise/wildcard machine_transition_rules lookup.
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

        $axisRules = $this->ref['transition_axis_rules_by_machine']->get($machineId, collect());

        if ($axisRules->isNotEmpty() && $fromStateId !== null) {
            $fromState = $this->ref['setup_states_by_id']->get($fromStateId);
            $toState = $this->ref['setup_states_by_id']->get($toStateId);

            if ($fromState && $toState) {
                $groupOf = fn($pkg) => $this->ref['package_group_by_name']->get($pkg, $pkg);

                $applicable = collect();
                if ($fromState->factory !== $toState->factory) {
                    $applicable->push($axisRules->firstWhere('axis', 'factory'));
                }
                if ($groupOf($fromState->package_name) !== $groupOf($toState->package_name)) {
                    $applicable->push($axisRules->firstWhere('axis', 'package_group'));
                }
                if (
                    $fromState->leadcount_min !== $toState->leadcount_min
                    || $fromState->leadcount_max !== $toState->leadcount_max
                ) {
                    $applicable->push($axisRules->firstWhere('axis', 'leadcount'));
                }
                if ($fromState->body_size !== $toState->body_size) {
                    $applicable->push($axisRules->firstWhere('axis', 'body_size'));
                }
                if ($fromState->process_type !== $toState->process_type) {
                    $applicable->push($axisRules->firstWhere('axis', 'process_type'));
                }

                $applicable = $applicable->filter();

                if ($applicable->isNotEmpty()) {
                    $winner = $applicable->sortByDesc('est_duration_minutes')->first();
                    return [
                        'operation_type' => $winner->operation_type,
                        'duration' => $winner->est_duration_minutes,
                        'rule_id' => null, // axis-derived, no single machine_transition_rules row
                    ];
                }
                // no axis differed but states are genuinely different ->
                // fall through to pairwise/default below, don't assume free
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
     * Same scoring logic as rankCandidatesForLot, but takes a
     * precomputed $ctx (skips resolveCandidateStates entirely) and,
     * when $appendOnly is true, only evaluates inserting at the end of
     * each machine's open-lot queue — no mid-queue positions, no
     * exit/bridge transitionCost calls. Used by greedyPlaceTier, where
     * mid-queue insertion isn't required and the position sweep was the
     * other half of the per-call cost.
     */
    protected function rankWithContext(
        object $lot,
        object $ctx,
        Collection $openEntriesByMachine,
        Collection $anchorStateByMachine,
        Collection $remainingCapacityByMachine,
        bool $appendOnly = false
    ): ?array {
        $best = null;

        foreach ($ctx->candidateStates as $state) {
            $remainingCapacity = $remainingCapacityByMachine[$state->machine_id] ?? null;

            if ($remainingCapacity === null) {
                continue;
            }
            if ($ctx->estimatedCommit !== null && $remainingCapacity < $ctx->estimatedCommit) {
                continue;
            }

            $isCr3Dedicated = $ctx->isCr3Dedicated
                && $this->isDedicatedListMatch($lot->Part_Name, $state->setup_state_id);

            if ($appendOnly) {
                // no queue scan: the predecessor state is always the anchor
                $predStateId = $anchorStateByMachine[$state->machine_id] ?? null;
                $entryCost = $this->transitionCost(
                    $state->machine_id,
                    $predStateId,
                    $state->setup_state_id,
                    $lot->Part_Name
                );

                $candidate = [
                    'machine_id' => $state->machine_id,
                    'resulting_setup_state_id' => $state->setup_state_id,
                    'operation_type' => $entryCost['operation_type'],
                    'est_duration_minutes' => $entryCost['duration'],
                    'matched_rule_id' => $entryCost['rule_id'],
                    'insert_after_entry_id' => null,
                    'insert_before_entry_id' => null,
                    '_marginal_duration' => $entryCost['duration'],
                    '_is_free' => $entryCost['duration'] === 0,
                    '_is_cr3_dedicated' => $isCr3Dedicated,
                    '_remaining_capacity' => $remainingCapacity,
                ];

                if ($best === null || $this->isBetterCandidate($candidate, $best)) {
                    $best = $candidate;
                }
                continue;
            }

            $openLots = ($openEntriesByMachine[$state->machine_id] ?? collect())
                ->where('entry_type', 'lot')
                ->values();

            $anchorState = $anchorStateByMachine[$state->machine_id] ?? null;

            $positions = $appendOnly
                ? [[$openLots->last(), null]]           // only "append at end"
                : ($openLots->isEmpty()
                    ? [[null, null]]
                    : collect(range(0, $openLots->count()))->map(function ($i) use ($openLots) {
                        $pred = $i === 0 ? null : $openLots[$i - 1];
                        $succ = $i === $openLots->count() ? null : $openLots[$i];
                        return [$pred, $succ];
                    })->all());

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
            $lot->is_auto_part,
            $lot->Lead_Count,
            $rampProcessType,
            $lot->Lot_Type,
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
            $blockResult = $this->loadingPlanEntryService->addBlock(
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

        $lotResult = $this->loadingPlanEntryService->createManualLot(
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
        $this->preloadPackageList($gathered['pickup_lots']);

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

    /**
     * Hydrates a lot for transfer-compatibility purposes, regardless of
     * whether it originated from WIP (has a CustomerDataWip row) or from a
     * pickup (only ever had PartName-derived fields + the entry itself).
     * WIP path is unchanged from hydrateLotFromEntry(). Pickup path mirrors
     * resolvePickupLots(), reading qty/lot_id/package_name off the entry
     * instead of a raw pickup payload, and reading Focus_Group/Ramp_Time/
     * is_auto_part/Lead_Count/Body_Size off PartName like every pickup lot
     * already does.
     */
    protected function hydrateLotForTransfer(LoadingPlanEntry $entry, ?CustomerDataWip $wip): ?object
    {
        if ($wip) {
            return $this->hydrateLotFromEntry($entry, $wip);
        }

        $partInfo = PartName::findByPartName($entry->part_name);

        if (!$partInfo) {
            // will not sched
            return null; // genuinely unresolvable — no WIP, no PartName match
        }

        $lotQty = $entry->lotQuantity;

        return (object) [
            'Lot_Id'       => $entry->lot_id,
            'Part_Name'    => $entry->part_name,
            'Package_Name' => $entry->package_name ?? $partInfo->package_type,
            'Qty'          => $lotQty?->effectiveQty() ?? null,
            'Lead_Count'   => is_numeric($partInfo->lead_count) ? (int) $partInfo->lead_count : null,
            'Body_Size'    => $partInfo->dimensions,
            'Focus_Group'  => $partInfo->focus_grp,
            'Ramp_Time'    => $partInfo->allocation,
            'is_auto_part' => (bool) $partInfo->is_auto_part,
            'CR3'          => null, // same assumption resolvePickupLots makes
            'Lot_Type'     => null, // no CustomerDataWip link to check, same as pickups
            'isExpedite'   => (strcasecmp($entry->tag ?? '', 'expedite') === 0),
            'aboveCT'      => false,
            'CT'           => null,
        ];
    }

    public function getCommittedDoableByMachine(Collection $machineIds, Carbon $targetDate): Collection
    {
        if ($machineIds->isEmpty()) {
            return collect();
        }

        $windowStart = $targetDate->copy()->setTime(6, 0, 0);
        $windowEnd = $targetDate->copy()->addDay()->setTime(4, 0, 0);

        $committed = LoadingPlanEntry::query()
            ->whereIn('machine_id', $machineIds)
            ->where('entry_type', 'lot')
            ->whereBetween('time_start', [$windowStart, $windowEnd])
            ->join('lot_quantities', function ($join) {
                $join->on('lot_quantities.lot_id', '=', 'loading_plan_entries.lot_id')
                    ->on('lot_quantities.scheduled_date', '=', 'loading_plan_entries.scheduled_date');
            })
            ->groupBy('loading_plan_entries.machine_id')
            ->pluck(DB::raw('SUM(lot_quantities.commit) as total_commit'), 'loading_plan_entries.machine_id');

        return $machineIds->mapWithKeys(fn($id) => [$id => (int) ($committed[$id] ?? 0)]);
    }

    /**
     * WIP-only hydration path — for lots that haven't been placed onto the
     * plan yet (no LoadingPlanEntry at all, e.g. "Unassigned"). Mirrors the
     * WIP-derived fields hydrateLotFromEntry()/createPlannedLot() use, minus
     * anything that only exists once a lot has an entry (tag, entry_type).
     */
    protected function hydrateLotFromWip(CustomerDataWip $wip): object
    {
        return (object) [
            'Lot_Id'       => $wip->Lot_Id,
            'Part_Name'    => $wip->Part_Name,
            'Package_Name' => $wip->Package_Name,
            'Qty'          => $wip->Qty,
            'Lead_Count'   => $wip->Lead_Count,
            'Body_Size'    => $wip->Body_Size,
            'Focus_Group'  => $wip->Focus_Group,
            'Ramp_Time'    => $wip->Ramp_Time,
            'is_auto_part' => $wip->Auto_Part === 'Y',
            'CR3'          => $wip->CR3,
            'Lot_Type'     => $wip->Lot_Type,
            'isExpedite'   => false, // no entry -> no tag to read
            'aboveCT'      => false,
            'CT'           => null,
        ];
    }

    public function hydrateLotsForTransfer(Collection $lotIds, string $date): Collection
    {
        $entries = LoadingPlanEntry::query()
            ->with('lotQuantity')
            ->whereIn('lot_id', $lotIds)
            ->whereDate('scheduled_date', $date)
            ->where('entry_type', 'lot')
            ->get();

        Log::info($entries);

        $rootLotIdByEntry = $entries->mapWithKeys(fn($e) => [$e->id => $e->resolveRootLotId()]);
        $rootLotIds = $rootLotIdByEntry->values()->unique();

        $wips = CustomerDataWip::query()
            ->forDate($date)
            ->whereIn('Lot_Id', $rootLotIds)
            ->get()->keyBy('Lot_Id');

        $entryLots = $entries
            ->map(fn($entry) => $this->hydrateLotForTransfer($entry, $wips->get($rootLotIdByEntry[$entry->id])))
            ->filter();

        // lot_ids that had no LoadingPlanEntry at all — unassigned lots
        $unhandledLotIds = $lotIds->diff($entries->pluck('lot_id')->unique());

        $unassignedWips = CustomerDataWip::query()
            ->forDate($date)
            ->whereIn('Lot_Id', $unhandledLotIds)
            ->get();

        $wipOnlyLots = $unassignedWips->map(fn($wip) => $this->hydrateLotFromWip($wip));

        return $entryLots->concat($wipOnlyLots)->values();
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
            'is_auto_part' => $wip->Auto_Part === 'Y',
            'Ramp_Time' => $wip->Ramp_Time,
            'CR3' => $wip->CR3,
            'Lot_Type' => $wip->Lot_Type,
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
            $ctx = $this->buildLotContext($lot);

            if ($ctx === null) {
                $results['unassigned']->push($lot);
                continue;
            }

            $choice = $this->rankWithContext(
                $lot,
                $ctx,
                $openEntriesByMachine,
                $anchorStateByMachine,
                $remainingCapacityByMachine,
                appendOnly: true
            );

            if ($choice === null) {
                $results['unassigned']->push($lot);
                continue;
            }

            $machineId = $choice['machine_id'];

            // $results['placed'][] = $this->applyPlacement($lot, $choice, $dateString);
            if ($choice['operation_type'] !== 'none') {
                $this->plan[$machineId][] = [
                    'type' => 'block',
                    'label' => $this->describeOperation($choice, 0, $choice['resulting_setup_state_id']),
                    'duration' => $choice['est_duration_minutes'],
                ];
            }

            $this->plan[$machineId][] = [
                'type' => 'lot',
                'lot_id' => $lot->Lot_Id ?? ('PICKUP-' . now()->format('YmdHis') . '-' . strtoupper(Str::random(4))),
                'package_name' => $lot->Package_Name,
                'part_name' => $lot->Part_Name,
                'qty' => $lot->Qty,
            ];

            $anchorStateByMachine[$machineId] = $choice['resulting_setup_state_id'];
            $remainingCapacityByMachine[$machineId] = ($remainingCapacityByMachine[$machineId] ?? 0) - ($this->estimateCommit($lot) ?? 0);
            $openEntriesByMachine[$machineId] = ($openEntriesByMachine[$machineId] ?? collect())
                ->push((object) ['id' => --$this->fakeEntryId, 'entry_type' => 'lot', 'resulting_setup_state_id' => $choice['resulting_setup_state_id']]);
        }
    }

    public function candidateMachineIdsForLot(object $lot): Collection
    {
        $factory = $this->resolveFactory($lot->Focus_Group);
        if ($factory === null) {
            return collect();
        }

        [$bodySize2d, $thickness] = $this->parseBodySize($lot->Body_Size);
        $rampProcessType = $this->resolveRampProcessType($lot->Ramp_Time);

        return $this->resolveCandidateStates(
            $lot->Part_Name,
            $factory,
            $lot->Focus_Group,
            $lot->Package_Name,
            $bodySize2d,
            $thickness,
            $lot->is_auto_part,
            $lot->Lead_Count,
            $rampProcessType,
            $lot->Lot_Type
        )->pluck('machine_id')->unique()->values();
    }

    public function getCandidateMachineIds(Collection $lots): Collection
    {
        return $lots->flatMap(fn($lot) => $this->candidateMachineIdsForLot($lot))->unique()->values();
    }

    protected function greedyPlaceTier(
        Collection $items,
        Collection &$openEntriesByMachine,
        Collection &$anchorStateByMachine,
        Collection &$remainingCapacityByMachine,
        string $dateString,
        array &$results
    ): void {
        $startedAt = microtime(true);
        $remaining = $items->values();

        // --- one-time setup: build context + initial rank ONCE per lot ---
        $contextByIdx = [];
        $candidateMachinesByIdx = [];
        $cacheByIdx = [];

        foreach ($remaining as $idx => $lot) {
            $ctx = $this->buildLotContext($lot);

            if ($ctx === null) {
                $results['unassigned']->push($lot);
                continue;
            }

            $contextByIdx[$idx] = $ctx;
            $candidateMachinesByIdx[$idx] = $ctx->candidateMachineIds;

            $choice = $this->rankWithContext(
                $lot,
                $ctx,
                $openEntriesByMachine,
                $anchorStateByMachine,
                $remainingCapacityByMachine,
                appendOnly: true
            );

            if ($choice === null) {
                $results['unassigned']->push($lot);
                continue;
            }

            $cacheByIdx[$idx] = $choice;
        }

        $round = 0;
        $rankCalls = count($cacheByIdx);
        $placedCount = 0;

        while (!empty($cacheByIdx)) {
            $round++;
            $roundStartedAt = microtime(true);

            $bestIdx = null;
            $bestCost = null;
            foreach ($cacheByIdx as $idx => $choice) {
                $cost = $choice['operation_type'] === 'none' ? 0 : $choice['est_duration_minutes'];
                if ($bestCost === null || $cost < $bestCost) {
                    $bestCost = $cost;
                    $bestIdx = $idx;
                }
            }

            $lot = $remaining[$bestIdx];
            $bestChoice = $cacheByIdx[$bestIdx];
            $machineId = $bestChoice['machine_id'];

            // --- commit placement (unchanged) ---
            if ($bestChoice['operation_type'] !== 'none') {
                $this->plan[$machineId][] = [
                    'type' => 'block',
                    'label' => $this->describeOperation($bestChoice, 0, $bestChoice['resulting_setup_state_id']),
                    'duration' => $bestChoice['est_duration_minutes'],
                ];
            }
            $this->plan[$machineId][] = [
                'type' => 'lot',
                'lot_id' => $lot->Lot_Id ?? ('PICKUP-' . now()->format('YmdHis') . '-' . strtoupper(Str::random(4))),
                'package_name' => $lot->Package_Name,
                'part_name' => $lot->Part_Name,
                'qty' => $lot->Qty,
            ];
            $anchorStateByMachine[$machineId] = $bestChoice['resulting_setup_state_id'];
            $remainingCapacityByMachine[$machineId] =
                ($remainingCapacityByMachine[$machineId] ?? 0) - ($this->estimateCommit($lot) ?? 0);
            $openEntriesByMachine[$machineId] = ($openEntriesByMachine[$machineId] ?? collect())
                ->push((object) [
                    'id' => --$this->fakeEntryId,
                    'entry_type' => 'lot',
                    'resulting_setup_state_id' => $bestChoice['resulting_setup_state_id'],
                ]);

            unset($cacheByIdx[$bestIdx], $candidateMachinesByIdx[$bestIdx], $contextByIdx[$bestIdx]);
            $placedCount++;

            $anchorBefore  = $anchorStateByMachine[$machineId] ?? null;
            // ... commit placement, update anchor/capacity ...
            $anchorChanged = $anchorBefore !== $bestChoice['resulting_setup_state_id'];

            // --- invalidate only lots whose candidate set includes $machineId ---
            foreach ($candidateMachinesByIdx as $idx => $machineIds) {
                if (!$machineIds->contains($machineId)) {
                    continue;
                }

                if (!$anchorChanged && $cacheByIdx[$idx]['machine_id'] !== $machineId) {
                    continue; // exact: m only got worse, cached best is elsewhere
                }

                $choice = $this->rankWithContext(
                    $remaining[$idx],
                    $contextByIdx[$idx],
                    $openEntriesByMachine,
                    $anchorStateByMachine,
                    $remainingCapacityByMachine,
                    appendOnly: true
                );
                $rankCalls++;

                if ($choice === null) {
                    $results['unassigned']->push($remaining[$idx]);
                    unset($cacheByIdx[$idx], $candidateMachinesByIdx[$idx], $contextByIdx[$idx]);
                } else {
                    $cacheByIdx[$idx] = $choice;
                }
            }

            $roundDuration = microtime(true) - $roundStartedAt;
            if ($round % 25 === 0 || $roundDuration > 1.0) {
                \Log::info('greedyPlaceTier progress', [
                    'round' => $round,
                    'placed' => $placedCount,
                    'remaining' => count($cacheByIdx),
                    'machine_id' => $machineId,
                    'best_cost' => $bestCost,
                    'invalidated_this_round' => $rankCalls, // cumulative; diff between log lines = per-round count
                    'round_duration_seconds' => round($roundDuration, 4),
                    'total_duration_seconds' => round(microtime(true) - $startedAt, 4),
                ]);
            }
        }

        \Log::info('END: greedyPlaceTier', [
            'date' => $dateString,
            'rounds' => $round,
            'placed' => $placedCount,
            'total_rank_calls' => $rankCalls,
            'total_duration_seconds' => round(microtime(true) - $startedAt, 4),
        ]);
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
        log_entities($pickupLots);
        $results = ['placed' => [], 'unassigned' => collect(), 'unmatched_part_names' => $unmatchedPartNames];

        $this->preloadReferenceData($pickupLots);
        $candidateMachineIds = $this->getCandidateMachineIds($pickupLots);

        if ($candidateMachineIds->isEmpty() && $pickupLots->isEmpty()) {
            return $results;
        }

        $dateString = $targetDate->toDateString();

        return DB::transaction(function () use (
            $candidateMachineIds,
            $pickupLots,
            $dateString,
            $targetDate,
            &$results
        ) {
            $transactionStart = microtime(true);

            $logTimer = function (
                string $label,
                ?float $start = null,
                array $context = []
            ) {
                if ($start === null) {
                    Log::info("[LoadingPlanTimer] START: {$label}", $context);

                    return microtime(true);
                }

                $seconds = round(microtime(true) - $start, 4);

                Log::info("[LoadingPlanTimer] END: {$label}", array_merge(
                    $context,
                    [
                        'seconds' => $seconds,
                        'memory_mb' => round(
                            memory_get_usage(true) / 1024 / 1024,
                            2
                        ),
                        'peak_memory_mb' => round(
                            memory_get_peak_usage(true) / 1024 / 1024,
                            2
                        ),
                    ]
                ));

                return microtime(true);
            };

            Log::info('[LoadingPlanTimer] TRANSACTION START', [
                'candidate_machine_count' => count($candidateMachineIds),
                'candidate_machine_ids' => $candidateMachineIds,
                'pickup_lot_count' => $pickupLots->count(),
                'date_string' => $dateString,
                'target_date' => $targetDate,
            ]);

            /*
    |--------------------------------------------------------------------------
    | 1. Load open LoadingPlanEntry records
    |--------------------------------------------------------------------------
    */

            $start = $logTimer('LoadingPlanEntry::get');
            log_entities($candidateMachineIds);
            $entries = LoadingPlanEntry::query()
                ->with('lotQuantity')
                ->whereIn('machine_id', $candidateMachineIds)
                ->whereDate('scheduled_date', $targetDate)
                ->open()
                ->where('entry_type', 'lot')
                ->get();

            // dump($entries);

            $logTimer(
                'LoadingPlanEntry::get',
                $start,
                [
                    'entry_count' => $entries->count(),
                ]
            );

            /*
    |--------------------------------------------------------------------------
    | 2. Get unique child lot IDs
    |--------------------------------------------------------------------------
    */

            $start = $logTimer('Build entryLotIds');

            $entryLotIds = $entries
                ->pluck('lot_id')
                ->filter()
                ->unique()
                ->values();

            $logTimer(
                'Build entryLotIds',
                $start,
                [
                    'lot_id_count' => $entryLotIds->count(),
                ]
            );

            /*
    |--------------------------------------------------------------------------
    | 3. Load active LotSplits
    |--------------------------------------------------------------------------
    */

            $start = $logTimer('LotSplit::get');

            $activeLotSplits = LotSplit::query()
                ->active()
                ->whereIn('child_lot_id', $entryLotIds)
                ->get();

            $logTimer(
                'LotSplit::get',
                $start,
                [
                    'active_split_count' => $activeLotSplits->count(),
                ]
            );

            /*
    |--------------------------------------------------------------------------
    | 4. Key active LotSplits
    |--------------------------------------------------------------------------
    */

            $start = $logTimer('Key activeLotSplits');

            $activeLotSplits = $activeLotSplits->keyBy(function ($split) {
                return $split->child_lot_id
                    . '|'
                    . $split->scheduled_date->toDateString();
            });

            $logTimer(
                'Key activeLotSplits',
                $start,
                [
                    'keyed_split_count' => $activeLotSplits->count(),
                ]
            );

            /*
    |--------------------------------------------------------------------------
    | 5. Attach activeLotSplit to each entry
    |--------------------------------------------------------------------------
    */

            $start = $logTimer('Attach activeLotSplit relations');

            $entries->each(function ($entry) use ($activeLotSplits) {
                $key = $entry->lot_id
                    . '|'
                    . $entry->scheduled_date->toDateString();

                $entry->setRelation(
                    'activeLotSplit',
                    $activeLotSplits->get($key)
                );
            });

            $logTimer(
                'Attach activeLotSplit relations',
                $start,
                [
                    'entry_count' => $entries->count(),
                ]
            );

            /*
    |--------------------------------------------------------------------------
    | 6. Resolve root lot IDs
    |--------------------------------------------------------------------------
    */

            $start = $logTimer('Resolve rootLotIdByEntry');

            $rootLotIdByEntry = $entries->mapWithKeys(function ($e) {
                return [
                    $e->id => $e->resolveRootLotId(),
                ];
            });

            $logTimer(
                'Resolve rootLotIdByEntry',
                $start,
                [
                    'resolved_count' => $rootLotIdByEntry->count(),
                ]
            );

            /*
    |--------------------------------------------------------------------------
    | 7. Group entries by scheduled date
    |--------------------------------------------------------------------------
    */

            $start = $logTimer('Group entries by date');
            // dump($entries);

            $entriesByDate = $entries->groupBy(
                fn($e) => $e->scheduled_date->toDateString()
            );
            // dump($entriesByDate);

            $logTimer(
                'Group entries by date',
                $start,
                [
                    'date_group_count' => $entriesByDate->count(),
                    'dates' => $entriesByDate->keys()->values()->all(),
                ]
            );

            /*
    |--------------------------------------------------------------------------
    | 8. Load WIP records
    |--------------------------------------------------------------------------
    */

            $start = $logTimer('CustomerDataWip::get');

            // 1. Return/Short-circuit early if there are no date entries
            if (empty($entriesByDate) || $entriesByDate->isEmpty()) {
                $wips = collect();
            } else {
                // 2. Flatten and collect root lot IDs cleanly before querying
                $rootLotIdsByDate = [];
                foreach ($entriesByDate as $date => $dateEntries) {
                    $ids = $dateEntries
                        ->map(fn($e) => $rootLotIdByEntry[$e->id] ?? null)
                        ->filter()
                        ->unique()
                        ->values()
                        ->toArray();

                    if (!empty($ids)) {
                        $rootLotIdsByDate[$date] = $ids;
                    }
                }

                // 3. Only execute query if valid date-to-lot mappings exist
                if (empty($rootLotIdsByDate)) {
                    $wips = collect();
                } else {
                    $wips = CustomerDataWip::query()
                        ->where(function ($query) use ($rootLotIdsByDate) {
                            foreach ($rootLotIdsByDate as $date => $rootLotIds) {
                                $query->orWhere(function ($subQuery) use ($date, $rootLotIds) {
                                    $subQuery->forDate($date)
                                        ->whereIn('Lot_Id', $rootLotIds);
                                });
                            }
                        })
                        ->get();
                }
            }

            $logTimer(
                'CustomerDataWip::get',
                $start,
                [
                    // 'wip_count' => $wips->count(),
                    'test' => 'test',
                ]
            );

            /*
    |--------------------------------------------------------------------------
    | 9. Build WIP lookup
    |--------------------------------------------------------------------------
    */

            $start = $logTimer('Build wipLookup');

            $wipLookup = [];

            foreach ($wips as $wip) {
                $dateStr = Carbon::parse(
                    $wip->import_date
                )->toDateString();

                $wipLookup["{$dateStr}:{$wip->Lot_Id}"] = $wip;
            }

            $logTimer(
                'Build wipLookup',
                $start,
                [
                    'lookup_count' => count($wipLookup),
                ]
            );

            /*
    |--------------------------------------------------------------------------
    | 10. Hydrate existing lots
    |--------------------------------------------------------------------------
    */

            $start = $logTimer('Hydrate existing lots');

            $existingLots = $entries
                ->map(function ($entry) use (
                    $wipLookup,
                    $rootLotIdByEntry
                ) {
                    $rootLotId = $rootLotIdByEntry[$entry->id];

                    $dateStr = $entry
                        ->scheduled_date
                        ->toDateString();

                    $wip = $wipLookup["{$dateStr}:{$rootLotId}"] ?? null;

                    return $this->hydrateLotFromEntry(
                        $entry,
                        $wip
                    );
                })
                ->filter()
                ->values();

            // dump($existingLots);

            $logTimer(
                'Hydrate existing lots',
                $start,
                [
                    'existing_lot_count' => $existingLots->count(),
                ]
            );

            /*
    |--------------------------------------------------------------------------
    | 11. Delete existing open entries
    |--------------------------------------------------------------------------
    */

            $start = $logTimer('Delete existing open entries');

            $deletedCount = LoadingPlanEntry::whereIn('id', $entries->pluck('id'))->delete();

            $logTimer(
                'Delete existing open entries',
                $start,
                [
                    'deleted_count' => $deletedCount,
                ]
            );

            /*
    |--------------------------------------------------------------------------
    | 12. Get anchor states
    |--------------------------------------------------------------------------
    */

            $start = $logTimer('getAnchorStates');

            $anchorStateByMachine = $this->getAnchorStates(
                $candidateMachineIds
            );

            $logTimer(
                'getAnchorStates',
                $start,
                [
                    'machine_count' => count($anchorStateByMachine),
                ]
            );

            /*
    |--------------------------------------------------------------------------
    | 13. Get remaining capacity
    |--------------------------------------------------------------------------
    */

            $start = $logTimer('getRemainingCapacityByMachine');

            $remainingCapacityByMachine =
                $this->getRemainingCapacityByMachine(
                    $candidateMachineIds,
                    $targetDate
                );

            $logTimer(
                'getRemainingCapacityByMachine',
                $start,
                [
                    'machine_count' => count($remainingCapacityByMachine),
                ]
            );

            /*
    |--------------------------------------------------------------------------
    | 14. Prepare open entries collection
    |--------------------------------------------------------------------------
    */

            $start = $logTimer('Initialize openEntriesByMachine');

            $openEntriesByMachine = collect();

            $logTimer(
                'Initialize openEntriesByMachine',
                $start
            );

            /*
    |--------------------------------------------------------------------------
    | 15. Merge existing lots + pickup lots
    |--------------------------------------------------------------------------
    */

            $dupes = $entries->groupBy('lot_id')->filter(fn($g) => $g->count() > 1);
            Log::info('dup entries', $dupes->take(5)->map(fn($g) => $g->map(fn($e) => [
                'id' => $e->id,
                'machine' => $e->machine_id,
                'date' => $e->scheduled_date->toDateString(),
                'seq' => $e->sequence_order,
            ])->all())->all());
            Log::info('pickup/existing overlap', [
                'count' => $pickupLots->pluck('Lot_Id')->intersect($existingLots->pluck('Lot_Id'))->count(),
            ]);

            $start = $logTimer('Merge existingLots + pickupLots');

            // $pool = $existingLots->merge($pickupLots);
            // Log::info("existingLots");
            // Log::info($existingLots);

            // Log::info("pickupLots");
            // Log::info($pickupLots);

            $pool = $existingLots->concat($pickupLots)
                ->groupBy(fn($lot) => is_array($lot) ? $lot['Lot_Id'] : $lot->Lot_Id)
                ->map(function ($group, $lotId) {
                    if ($group->count() > 1) {
                        \Log::warning('Duplicate lot_id in rebuild pool — dropping extras', [
                            'lot_id' => $lotId,
                            'count'  => $group->count(),
                        ]);
                    }
                    return $group->first();
                })
                ->values();

            $this->preloadPackageList($pool);

            $logTimer(
                'Merge existingLots + pickupLots',
                $start,
                [
                    'existing_lots' => $existingLots->count(),
                    'pickup_lots' => $pickupLots->count(),
                    'pool_count' => $pool->count(),
                ]
            );

            /*
    |--------------------------------------------------------------------------
    | 16. Group by priority tier
    |--------------------------------------------------------------------------
    */

            $start = $logTimer('Group pool by priority tier');

            $tiers = $pool->groupBy(
                fn($lot) => $this->priorityTier($lot)
            );

            $logTimer(
                'Group pool by priority tier',
                $start,
                [
                    'tier_1_count' => $tiers->get(1, collect())->count(),
                    'tier_2_count' => $tiers->get(2, collect())->count(),
                    'tier_3_count' => $tiers->get(3, collect())->count(),
                    'tier_count' => $tiers->count(),
                ]
            );

            /*
    |--------------------------------------------------------------------------
    | 17. Place Tier 1
    |--------------------------------------------------------------------------
    */

            $tier1 = $tiers->get(1, collect());

            $start = $logTimer(
                'placeTierByPriority - Tier 1',
                null,
                [
                    'lot_count' => $tier1->count(),
                ]
            );

            $this->placeTierByPriority(
                $tier1,
                $openEntriesByMachine,
                $anchorStateByMachine,
                $remainingCapacityByMachine,
                $dateString,
                $results
            );

            $logTimer(
                'placeTierByPriority - Tier 1',
                $start,
                [
                    'lot_count' => $tier1->count(),
                ]
            );

            /*
    |--------------------------------------------------------------------------
    | 18. Place Tier 2
    |--------------------------------------------------------------------------
    */

            $tier2 = $tiers->get(2, collect());

            $start = $logTimer(
                'placeTierByPriority - Tier 2',
                null,
                [
                    'lot_count' => $tier2->count(),
                ]
            );

            $this->placeTierByPriority(
                $tier2,
                $openEntriesByMachine,
                $anchorStateByMachine,
                $remainingCapacityByMachine,
                $dateString,
                $results
            );

            $logTimer(
                'placeTierByPriority - Tier 2',
                $start,
                [
                    'lot_count' => $tier2->count(),
                ]
            );

            /*
    |--------------------------------------------------------------------------
    | 19. Greedy Tier 3
    |--------------------------------------------------------------------------
    */

            $tier3 = $tiers->get(3, collect());

            $start = $logTimer(
                'greedyPlaceTier - Tier 3',
                null,
                [
                    'lot_count' => $tier3->count(),
                ]
            );

            $this->greedyPlaceTier(
                $tier3,
                $openEntriesByMachine,
                $anchorStateByMachine,
                $remainingCapacityByMachine,
                $dateString,
                $results
            );

            $logTimer(
                'greedyPlaceTier - Tier 3',
                $start,
                [
                    'lot_count' => $tier3->count(),
                ]
            );

            /*
    |--------------------------------------------------------------------------
    | 20. Create LotScheduleCalculator
    |--------------------------------------------------------------------------
    */

            $start = $logTimer('Create LotScheduleCalculator');

            $calc = app(
                LotScheduleCalculator::class,
                [
                    'dates' => [$dateString],
                    'lotIds' => [],
                ]
            );

            $logTimer(
                'Create LotScheduleCalculator',
                $start
            );

            /*
    |--------------------------------------------------------------------------
    | 21. Bulk place plan
    |--------------------------------------------------------------------------
    */

            $start = $logTimer('bulkPlacePlan');
            Log::info("the plan");
            log_entities($this->plan);
            $freshEntries = $this
                ->loadingPlanEntryService
                ->bulkPlacePlan(
                    $this->plan,
                    $dateString,
                    $calc
                );

            $logTimer(
                'bulkPlacePlan',
                $start,
                [
                    'fresh_entry_count' => $freshEntries->count(),
                ]
            );

            /*
    |--------------------------------------------------------------------------
    | 22. Final result
    |--------------------------------------------------------------------------
    */

            $results['placed'] = $freshEntries->all();

            Log::info('[LoadingPlanTimer] TRANSACTION END', [
                'total_seconds' => round(
                    microtime(true) - $transactionStart,
                    4
                ),
                'memory_mb' => round(
                    memory_get_usage(true) / 1024 / 1024,
                    2
                ),
                'peak_memory_mb' => round(
                    memory_get_peak_usage(true) / 1024 / 1024,
                    2
                ),
                'result_count' => count($results['placed']),
            ]);

            return $results;
        });
    }
}
