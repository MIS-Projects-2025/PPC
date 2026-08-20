<?php

namespace App\Services;

use App\Models\CustomerDataWip;
use App\Models\LoadingPlanEntry;
use App\Models\LotQuantity;
use App\Models\PpcPackageMaster;
use Carbon\Carbon;
use Carbon\CarbonInterface;
//TODO: distinguish Collection from Eloquence and Support
use Illuminate\Support\Collection;

class LoadingPlanService
{
    protected string $previousDate;
    protected LotScheduleCalculator $calc;
    protected array $selectedPackages;
    protected Collection $splitsByParent;
    protected Collection $splitsByChild;
    protected Collection $mergesByTarget;
    protected Collection $mergesBySource;
    public readonly Collection $todayWipRows;
    public readonly Collection $todayLeakedWipRows;
    public readonly Collection $todayLeakedPlannedLotEntries;
    public readonly Collection $todayPlannedLotEntries;

    // should WipRows be the source of truth everywhere, even in lot previous?
    // I'd say yes.

    // new wip of the lotid will overwrite every wip details from previous.
    // all of it's loading plan entries data remains untouched.

    // but all calculated values will update.
    // capactiyUPH for instance needs to be updated base on the new qty.
    // the split and merge of the lot remains untouched because it has different scheduled_date (yesterday)
    // splitting or merging that lot again will create new entries on both.
    // basically LotQuantity is the only thing to be changed, because it is dependent on WIP, mainly the qty of it.

    // main goal: the previous planned lot will reflect anything new from imported Wip.
    // that includes lot_status, qty, well... anything.

    // lot quantity is tied to specific date.
    // imported wip should be standalone tho. since it's a new lot to be planned.
    // 

    // TODO: how do I implement this really?
    // $snapshotUpdates = []; //TODO: how to implement this properly?
    // if ($entry && !$entry->finalized_at) { //TODO: how to implement this properly?
    //     $diff = [];
    //     if ($capacityUph !== $entry->capacity_uph_snapshot) $diff['capacity_uph_snapshot'] = $capacityUph;
    //     if ($accuTime !== $entry->accu_time)                 $diff['accu_time']             = $accuTime;

    //     if (!empty($diff)) {
    //         $snapshotUpdates[$entry->id] = $diff;
    //     }
    // }

    // if (!empty($snapshotUpdates)) {
    //     app()->terminating(function () use ($snapshotUpdates) {
    //         (new \App\Jobs\RefreshLoadingPlanSnapshots($snapshotUpdates))->handle();
    //     });
    // }

    // TODO: i don't get this yet. A split should inherit the WIP fields form the root lot, but i don't know what this root lot is.
    // here's the implementation of the buildSplitMeta function in LotSplitService:
    // public static function buildSplitMeta(
    //     ?string $lotId,
    //     ?Collection $splitsByParent = null,
    //     ?Collection $splitsByChild = null
    // ): ?array {
    //     if (! $lotId || ! $splitsByParent || ! $splitsByChild) {
    //         return null;
    //     }

    //     $isParent = $splitsByParent->has($lotId);
    //     $childSplit = $splitsByChild->get($lotId);

    //     if (! $isParent && ! $childSplit) {
    //         return null;
    //     }

    //     $rootLotId = $childSplit
    //         ? $childSplit->root_lot_id
    //         : $splitsByParent->get($lotId)?->first()?->root_lot_id;

    //     return [
    //         'isParent'  => $isParent,
    //         'isChild'   => $childSplit !== null,
    //         'rootLotId' => $rootLotId,
    //         'splitId'   => $childSplit?->id,
    //     ];
    // }
    // $splitInfo = LotSplitService::buildSplitMeta($entry->lot_id, $splitsByParent, $splitsByChild);

    // // Split children inherit display-only WIP fields from the root lot —
    // // these describe the physical lot, not the qty fragment, so no
    // // separate storage/sync needed, just a lookup at render time.
    // // For a leaked lot no longer in today's WIP import (completed the
    // // line), rootWip stays null and these fields render blank — expected.
    // $rootWip = null;
    // if ($splitInfo && $splitInfo['rootLotId']) {
    //     $rootWip = $wipRows->firstWhere('Lot_Id', $splitInfo['rootLotId']);
    // }

    public function __construct(
        protected CarbonInterface|string|null $date = null,
        protected ?string $selectedLocation = null,
        ?string $previousDate = null,
    ) {
        $dateObj = match (true) {
            $this->date instanceof CarbonInterface => $this->date,
            is_string($this->date) => Carbon::parse($this->date),
            default => now(),
        };

        $this->date = $dateObj->toDateString();
        $this->previousDate = $previousDate ?? $dateObj->copy()->subDay()->toDateString();

        $this->calc = new LotScheduleCalculator([
            'dates' => [$this->previousDate, $this->date],
            'lotIds' => [],
        ]);
    }

    public function initWipAndEntries()
    {
        //TODO: do you need loadPackageList here?
        $this->selectedPackages = PpcPackageMaster::query()
            ->activeTelford()
            ->when($this->selectedLocation !== null, fn($q) => $q->where('default_pl', $this->selectedLocation))
            ->pluck('package')
            ->map(fn($p) => trim((string) $p))
            ->all();
        // var_dump("LOG ~ LoadingPlanService.php:124 ~ LoadingPlanService ~ __construct ~ selectedPackages:", $this->selectedPackages);

        $this->initSplitsAndMerges();

        $this->todayWipRows = $this->getWipRowsForToday($this->selectedPackages);
        $this->todayLeakedPlannedLotEntries = LoadingPlanEntryService::getTodayLeaked($this->previousDate, $this->selectedPackages);
        $this->todayLeakedWipRows = $this->getLatestWipRowsForLeakedLot($this->todayLeakedPlannedLotEntries->pluck('lot_id')->all());
        $this->todayPlannedLotEntries = LoadingPlanEntryService::getToday($this->date, $this->selectedPackages);
    }

    public function initEntries()
    {
        // continue https://claude.ai/chat/3c9e2acb-60ed-4c84-a2e5-0ed671e78269 //jbvhert2002
        // var_dump("LOG ~ LoadingPlanService.php:143 ~ LoadingPlanService ~ initEntries ~ todayPlannedLotEntries:", $this->todayPlannedLotEntries);
        // var_dump("LOG ~ LoadingPlanService.php:146 ~ LoadingPlanService ~ initEntries ~ todayWipRows:", $this->todayWipRows);

        $todayPlannedLotIds = $this->todayPlannedLotEntries->pluck('lot_id')->all();

        // var_dump("LOG ~ LoadingPlanService.php:145 ~ LoadingPlanService ~ initEntries ~ todayPlannedLotIds:", $todayPlannedLotIds);
        // var_dump("WIP Keys Count:", count($this->todayWipRows->keys()));
        // var_dump("Planned Lot IDs Count:", count($todayPlannedLotIds));
        // var_dump("Matching Lot IDs:", array_intersect($this->todayWipRows->keys()->all(), $todayPlannedLotIds));
        // $unassignedTodayWip  = $this->todayWipRows->except($todayPlannedLotIds);
        // Ensure todayWipRows is keyed by lot ID
        $unassignedTodayWip = $this->todayWipRows
            ->toBase()
            ->except($todayPlannedLotIds);

        // var_dump("LOG ~ LoadingPlanService.php:149 ~ LoadingPlanService ~ initEntries ~ unassignedTodayWip:", $unassignedTodayWip);


        $filterLocation = fn($entry) => $entry->machineModel?->location === null
            || $entry->machineModel?->location === $this->selectedLocation;

        $todayPlannedBlockEntries = $this->todayPlannedLotEntries->where('entry_type', 'block')->filter($filterLocation);
        $todayLeakedPlannedBlockEntries = $this->todayLeakedPlannedLotEntries->where('entry_type', 'block')->filter($filterLocation);

        // 3. Separate WIP-backed vs Manual Lot Entries via O(1) Lookups
        $todayWipPlannedEntries = $this->todayPlannedLotEntries
            ->where('entry_type', 'lot')
            ->filter(fn($entry) => $this->todayWipRows->has($entry->lot_id));

        $todayManualPlannedEntries = $this->todayPlannedLotEntries
            ->where('entry_type', 'lot')
            ->reject(fn($entry) => $this->todayWipRows->has($entry->lot_id));

        $todayLeakedWipPlannedEntries = $this->todayLeakedPlannedLotEntries
            ->where('entry_type', 'lot')
            ->filter(fn($entry) => $this->todayLeakedWipRows->has($entry->lot_id));

        $todayLeakedManualPlannedEntries = $this->todayLeakedPlannedLotEntries
            ->where('entry_type', 'lot')
            ->reject(fn($entry) => $this->todayLeakedWipRows->has($entry->lot_id));

        $buildLotPayload = function (
            ?LoadingPlanEntry $entry = null,
            ?CustomerDataWip $wip = null,
            ?LotQuantity $quantity = null
        ) {

            // dump([
            //     'quantity' => $quantity?->toArray(),
            //     'wip'      => $wip?->toArray(),
            //     'entry'    => $entry?->toArray(),
            // ]);

            $resolvedQuantity = $quantity ?? $entry?->lotQuantity;

            return $this->createPlannedLot(
                wipRow: $wip,
                entry: $entry,
                quantity: $resolvedQuantity
            );
        };

        // unassigned from today planned entries, nothing on leaked. I don't know if unassigned leaked is still needed, probably not.
        // unassigned can still have lot quantities (user edit it and unassigned it again) it's lot quantities never got deleted (assuming)
        $unassignedLotIds = $unassignedTodayWip->keys()->all(); // or ->pluck('Lot_Id')->all()
        $unassignedTodayWipLotQuantities = LotQuantity::with('packageListEntry')
            ->whereIn('lot_id', $unassignedLotIds)
            ->where('scheduled_date', $this->date)
            ->get()
            ->keyBy('lot_id');

        $unassignedResults = $unassignedTodayWip->map(function ($wip) use ($buildLotPayload, $unassignedTodayWipLotQuantities) {
            return $buildLotPayload(
                entry: null,
                wip: $wip,
                quantity: $unassignedTodayWipLotQuantities->get($wip->Lot_Id)
            );
        });

        // var_dump("LOG ~ LoadingPlanService.php:207 ~ LoadingPlanService ~ initEntries ~ unassignedResults:", $unassignedResults);

        // 5. Transform All Groups via createPlannedLot
        $lotResults = $todayWipPlannedEntries
            ->map(fn($entry) => $buildLotPayload($entry, $this->todayWipRows->get($entry->lot_id)));

        $leakedLotResults = $todayLeakedWipPlannedEntries
            ->map(fn($entry) => $buildLotPayload($entry, $this->todayLeakedWipRows->get($entry->lot_id)));

        $manualLotResults = $todayLeakedManualPlannedEntries
            ->concat($todayManualPlannedEntries)
            ->map(fn($entry) => $buildLotPayload($entry, null));

        $blockResults = $todayPlannedBlockEntries
            ->concat($todayLeakedPlannedBlockEntries)
            ->map(fn($entry) => $buildLotPayload($entry, null));

        // 6. Merge All Streams and Apply Machine/Sequence Sorting
        $result =
            $lotResults
            ->concat($leakedLotResults)
            ->concat($unassignedResults)
            ->concat($manualLotResults)
            ->concat($blockResults);

        return self::sortEntriesByMachineAndSequence($result);
    }

    /**
     * Fetch the latest CustomerDataWip record for each leaked lot ID, keyed by Lot_Id.
     * If a lot ID is not found in CustomerDataWip, it is silently ignored.
     *
     * @param array<int, string> $leakedLotIds
     * @return Collection<string, CustomerDataWip>
     */
    private function getLatestWipRowsForLeakedLot(array $leakedLotIds): Collection
    {
        if (empty($leakedLotIds)) {
            return collect();
        }

        return CustomerDataWip::query()
            ->forDate([$this->date, $this->previousDate])
            ->tapeReelStations()
            ->excludingPostTnr()
            ->whereIn('Lot_Id', $leakedLotIds)
            ->orderByDesc('import_date')
            ->get()
            ->groupBy('Lot_Id')
            ->map(fn($group) => $group->first()); // Keyed by Lot_Id (no ->values() call)
    }

    /**
     * Fetch today's CustomerDataWip records, keyed by Lot_Id.
     *
     * @param array<int, string> $allowedPackages
     * @return Collection<string, CustomerDataWip>
     */
    private function getWipRowsForToday(array $allowedPackages): Collection
    {
        if (empty($allowedPackages)) {
            return collect();
        }

        return CustomerDataWip::query()
            ->forDate($this->date)
            ->tapeReelStations()
            ->excludingPostTnr()
            ->whereIn('Package_Name', $allowedPackages)
            ->get()
            ->keyBy('Lot_Id'); // Explicitly keys collection by Lot_Id
    }

    public function initSplitsAndMerges(): void
    {
        $activeSplits = \App\Models\LotSplit::active()
            ->whereIn('scheduled_date', [$this->date, $this->previousDate])
            ->get();

        $this->splitsByParent = $activeSplits->groupBy('parent_lot_id');
        $this->splitsByChild = $activeSplits->keyBy('child_lot_id');

        $activeMerges = \App\Models\LotMerge::active()
            ->whereIn('scheduled_date', [$this->date, $this->previousDate])
            ->get();

        $this->mergesByTarget = $activeMerges->groupBy('target_lot_id');
        $this->mergesBySource = $activeMerges->keyBy('source_lot_id');
    }

    /**
     * Sort entries by machine name (natural order, nulls last) and sequence_order ascending.
     *
     * @param Collection<int, array<string, mixed>> $entries
     * @return Collection<int, array<string, mixed>>
     */
    public static function sortEntriesByMachineAndSequence(Collection $entries): Collection
    {
        return $entries
            ->sort(function (array $a, array $b) {
                // 1. Null machines go to the bottom
                if (($a['machine'] === null) !== ($b['machine'] === null)) {
                    return $a['machine'] === null ? 1 : -1;
                }

                // 2. Natural case-insensitive sort on machine name
                if ($a['machine'] !== $b['machine']) {
                    return strnatcasecmp($a['machine'] ?? '', $b['machine'] ?? '');
                }

                // 3. Chronological: scheduled_date first — a leaked lot (earlier
                // date) must sort before today's own rows regardless of what its
                // sequence_order happens to be, since sequence_order only orders
                // rows WITHIN one date, never across dates.
                $dateA = $a['scheduled_date'] ?? null;
                $dateB = $b['scheduled_date'] ?? null;

                if ($dateA !== $dateB) {
                    return ($dateA === null) <=> ($dateB === null) ?: ($dateA <=> $dateB);
                }

                // 4. Same date — ascending sequence_order (missing/null goes last)
                $seqA = $a['sequence_order'] ?? PHP_FLOAT_MAX;
                $seqB = $b['sequence_order'] ?? PHP_FLOAT_MAX;

                if ($seqA == $seqB) {
                    return 0;
                }

                return ($seqA < $seqB) ? -1 : 1;
            })
            ->values();
    }

    public function createPlannedLot(
        // TODO: review entry and wipRow should be the partname base on scheduled_date
        // if it is the case where planned lot values retained wip details on that date.
        // but if the business logic is that planned lot needs to be updated with what wip
        // tells it, then entry and wipRow variable is not necessarily have the same
        // scheduled_date and import_date
        ?CustomerDataWip $wipRow,
        ?LoadingPlanEntry $entry,
        ?LotQuantity $quantity = null,
    ): array {
        $effectiveQty = $quantity?->effectiveQty() ?? $wipRow?->Qty ?? 0;
        $doable = $quantity?->commit;
        $doableStatus = $quantity?->recipe_status ?? 'unknown';
        $capacityUph = $quantity?->capacity_uph_snapshot;

        $doableRecipeSource = ($quantity && $quantity->recipe_source_id) ? [
            'id'          => $quantity->recipe_source_id,
            'devicename'  => $quantity->part_name,
            'recipe'      => $quantity->recipe_used,
            'packageType' => $quantity->packageListEntry?->package_type,
        ] : null;

        $isBlocked = $entry?->entry_type === 'block';

        // $accuTime = ($isBlocked || $entry?->finalized_at)
        //     ? $entry?->accu_time
        //     : $this->calc->accuTime($doable, $capacityUph);

        $accuTime = $entry?->accu_time ? $entry?->accu_time : $this->calc->accuTime($doable, $capacityUph);

        $machine = $entry?->finalized_at ? $entry->machine_snapshot : $entry?->getMachineName();

        // LoadingPlanFormulas handles null $wipRow safely internally
        $formulas = LoadingPlanFormulas::make($wipRow); // TODO: refactor other places that uses this

        $lotId = $wipRow?->Lot_Id ?? $entry?->lot_id ?? null;

        $startTime = $entry?->time_start ? Carbon::parse($entry->time_start) : null;
        $endTime   = $entry?->time_end   ? Carbon::parse($entry->time_end)   : null;

        $scheduledDate = $entry?->scheduled_date?->toDateString() ?? null;
        $isLeaked = $scheduledDate === $this->previousDate;

        return [
            // Entry Metadata
            'entry_id'                   => $entry?->id,
            'entry_type'                 => $entry?->entry_type,
            'is_block'                   => $isBlocked,
            'is_leaked'                  => $isLeaked,
            'block_label'                => $entry?->block_label,
            'machine'                    => $machine,
            'scheduled_date'             => $scheduledDate,

            // Lot & WIP Identifiers/Specs
            'id'                         => $wipRow?->customer_data_id ?? $entry?->id,
            'part_name'                  => $wipRow?->Part_Name ?? $quantity?->part_name ?? '',
            'lead_count'                 => $wipRow?->Lead_Count ?? null,
            'package_name'               => $wipRow?->Package_Name ?? $entry?->package_name ?? null,
            'lot_id'                     => $lotId,
            'station'                    => $wipRow?->Station ?? null,
            'lot_type'                   => $wipRow?->Lot_Type ?? null,
            'prod_area'                  => $wipRow?->Prod_Area ?? null,
            'lot_status'                 => $wipRow?->Lot_Status ?? null,
            'focus_group'                => $wipRow?->Focus_Group ?? null,
            'stage'                      => $wipRow?->Stage ?? null,
            'lot_entry_time_days'        => $wipRow?->Lot_Entry_Time_Days ?? null,
            'cr3'                        => $wipRow?->CR3 ?? null,
            'be_osl_days'                => $wipRow?->BE_OSL_Days ?? null,
            'body_size'                  => $wipRow?->Body_Size ?? null,
            'ramp_time'                  => $wipRow?->Ramp_Time ?? null,
            'backend_leadtime'           => $wipRow?->Backend_Leadtime ?? null,
            'date_loaded'                => transform($wipRow?->Date_Loaded, fn($date) => Carbon::parse($date)->format('n/j/Y g:i:s A')),
            'be_starttime'               => transform($wipRow?->BE_Starttime, fn($date) => Carbon::parse($date)->format('n/j/Y g:i:s A')),

            // Execution & Timing
            'status'                     => $entry?->status ?? null,
            'sequence_order'             => $entry?->sequence_order,
            'item'                       => $entry?->sequence_order,
            'time_start'                 => $startTime?->format('H:i'),
            'time_end'                   => $endTime?->format('H:i'),

            // Day offset relative to today (-1 = yesterday, 0 = today, +1 = tomorrow)
            // 'time_start_day_offset'      => $startTime ? (int) Carbon::parse($this->date)->diffInDays($startTime->copy()->startOfDay(), false) : null,
            // 'time_end_day_offset'        => $endTime   ? (int) Carbon::parse($this->date)->diffInDays($endTime->copy()->startOfDay(), false)   : null,

            'remarks'                    => $entry?->remarks ?? null,
            'tag'                        => $entry?->tag ?? null,
            'lock_version'               => $entry?->lock_version ?? null,

            // Capacity & Recipe Metadata
            'accu_time'                  => $accuTime,
            'doable_recipe_source'       => $doableRecipeSource,
            'qty'                        => $effectiveQty,
            'doable'                     => $doable,
            'doable_status'              => $doableStatus,
            'capacity_uph'               => $capacityUph,

            // Formula Calculated Metrics
            'ct'                         => $formulas->ct,
            'osl'                        => $formulas->osl,
            'cycle_time_exceed'          => $formulas->cycleTimeExceed,
            'cycle_time_exceed_residual' => $formulas->cycleTimeExceedResidual,
            'is_bake_highlight'          => $formulas->isBakeHighlight,

            // Split & Merge Metadata
            'split_info' => LotSplitService::buildSplitMeta($lotId, $this->splitsByParent ?? null, $this->splitsByChild ?? null, $scheduledDate),
            'merge_info' => LotMergeService::buildMergeMeta($lotId, $this->mergesByTarget ?? null, $this->mergesBySource ?? null, $scheduledDate),
        ];
    }

    /**
     * Attaches qty/doable/capacity + inherited WIP display fields (Lead_Count,
     * Body_Size, CR3, etc.) onto a lot entry for API response purposes.
     * Split children have no WIP row of their own, so these are pulled from
     * the root lot's CustomerDataWip row rather than stored/duplicated.
     *
     * Mutates $entry in place and returns the LotQuantity row it looked up,
     * so callers can reuse it if they need anything else off it.
     */
    public function enrichEntryForResponse(LoadingPlanEntry $entry, string $rootLotId): LoadingPlanEntry
    {
        $entryDate = $entry->scheduled_date->toDateString();

        $quantity = LotQuantity::where('lot_id', $entry->lot_id)
            ->where('scheduled_date', $entryDate)
            ->first();

        $rootWip = CustomerDataWip::query()
            ->where('Lot_Id', $rootLotId)
            ->orderByDesc('import_date')
            ->first();

        $data = $this->createPlannedLot($rootWip, $entry, $quantity);

        foreach ($data as $key => $value) {
            // TODO: now that the shape of the entry has changed
            $entry->setAttribute($key, $value);
        }

        return $entry;
    }
}
