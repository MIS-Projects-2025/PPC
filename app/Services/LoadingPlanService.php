<?php

namespace App\Services;

use App\Models\CustomerDataWip;
use App\Models\LoadingPlanEntry;
use App\Models\LotQuantity;
use App\Models\PpcPackageMaster;

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
        protected CarbonInterface|string $date,
        protected string $selectedLocation,
        ?string $previousDate = null,
    ) {
        $dateObj = $this->date instanceof CarbonInterface
            ? $this->date
            : Carbon::parse($this->date);

        $this->date = $dateObj->toDateString();
        $this->previousDate = $previousDate ?? $dateObj->subDay()->toDateString();
        $this->calc = new LotScheduleCalculator([
            'dates' => [$this->previousDate, $this->date],
            'lotIds' => [],
        ]);

        $this->selectedPackages = PpcPackageMaster::query()
            ->activeTelford()
            ->where('default_pl', $this->selectedLocation)
            ->pluck('package')
            ->map(fn($p) => trim((string) $p))
            ->all();

        $this->initSplitsAndMerges();
    }

    public function initEntries()
    {
        // continue https://claude.ai/chat/3c9e2acb-60ed-4c84-a2e5-0ed671e78269

        $todayPlannedLotEntries = LoadingPlanEntryService::getToday($this->date, $this->selectedPackages);
        $todayLeakedPlannedLotEntries = LoadingPlanEntryService::getTodayLeaked($this->previousDate, $this->selectedPackages);

        $todayWipRows = $this->getWipRowsForToday($this->selectedPackages);
        $todayLeakedWipRows = $this->getLatestWipRowsForLeakedLot($todayLeakedPlannedLotEntries->pluck('lot_id')->all());

        $todayPlannedLotIds = $todayPlannedLotEntries->pluck('lot_id')->filter()->all();
        $unassignedTodayWip  = $todayWipRows->except($todayPlannedLotIds);

        $filterLocation = fn($entry) => $entry->machineModel?->location === null
            || $entry->machineModel?->location === $this->selectedLocation;

        $todayPlannedBlockEntries = $todayPlannedLotEntries->where('entry_type', 'block')->filter($filterLocation);
        $todayLeakedPlannedBlockEntries = $todayLeakedPlannedLotEntries->where('entry_type', 'block')->filter($filterLocation);

        // 3. Separate WIP-backed vs Manual Lot Entries via O(1) Lookups
        $todayWipPlannedEntries = $todayPlannedLotEntries
            ->where('entry_type', 'lot')
            ->filter(fn($entry) => $todayWipRows->has($entry->lot_id));

        $todayManualPlannedEntries = $todayPlannedLotEntries
            ->where('entry_type', 'lot')
            ->reject(fn($entry) => $todayWipRows->has($entry->lot_id));

        $todayLeakedWipPlannedEntries = $todayLeakedPlannedLotEntries
            ->where('entry_type', 'lot')
            ->filter(fn($entry) => $todayLeakedWipRows->has($entry->lot_id));

        $todayLeakedManualPlannedEntries = $todayLeakedPlannedLotEntries
            ->where('entry_type', 'lot')
            ->reject(fn($entry) => $todayLeakedWipRows->has($entry->lot_id));

        $buildLotPayload = function (
            ?LoadingPlanEntry $entry = null,
            ?CustomerDataWip $wip = null,
            ?LotQuantity $quantity = null
        ) {
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

        // 5. Transform All Groups via createPlannedLot
        $lotResults = $todayWipPlannedEntries
            ->map(fn($entry) => $buildLotPayload($entry, $todayWipRows->get($entry->lot_id)));

        $leakedLotResults = $todayLeakedWipPlannedEntries
            ->map(fn($entry) => $buildLotPayload($entry, $todayLeakedWipRows->get($entry->lot_id)));

        $manualLotResults = $todayLeakedManualPlannedEntries
            ->concat($todayManualPlannedEntries)
            ->map(fn($entry) => $buildLotPayload($entry, null));

        $blockResults = $todayPlannedBlockEntries
            ->concat($todayLeakedPlannedBlockEntries)
            ->map(fn($entry) => $buildLotPayload($entry, null));

        // 6. Merge All Streams and Apply Machine/Sequence Sorting
        $result = $lotResults
            ->concat($unassignedResults)
            ->concat($manualLotResults)
            ->concat($leakedLotResults)
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

    private function initSplitsAndMerges(): void
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
     * Sort entries by machine name (natural order, nulls last) and sequenceOrder ascending.
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

                // 3. Ascending order by sequenceOrder (missing/null sequences go last)
                $seqA = $a['sequenceOrder'] ?? PHP_FLOAT_MAX;
                $seqB = $b['sequenceOrder'] ?? PHP_FLOAT_MAX;

                if ($seqA == $seqB) {
                    return 0;
                }

                return ($seqA < $seqB) ? -1 : 1;
            })
            ->values();
    }

    public function createPlannedLot(
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

        $accuTime = $entry?->finalized_at
            ? $entry->accu_time
            : $this->calc->accuTime($doable, $capacityUph);

        $machine = $entry?->finalized_at ? $entry->machine_snapshot : $entry?->getMachineName();

        // LoadingPlanFormulas handles null $wipRow safely internally
        $formulas = LoadingPlanFormulas::make($wipRow); // TODO: refactor other places that uses this

        $lotId = $wipRow?->Lot_Id ?? $entry?->lot_id ?? null;

        return [
            'entryId'             => $entry?->id,
            'entryType'           => $entry?->entry_type,
            'isBlock'             => $entry?->entry_type === 'block',
            'isLeaked'            => $entry?->scheduled_date === $this->previousDate,
            'machine'             => $machine,

            'id'                  => $wipRow?->customer_data_id ?? $entry?->id,
            'Part_Name'           => $wipRow?->Part_Name ?? $quantity?->part_name ?? '',
            'Lead_Count'          => $wipRow?->Lead_Count ?? null,
            'Package_Name'        => $wipRow?->Package_Name ?? $entry?->package_name ?? null,
            'Lot_Id'              => $lotId,
            'Station'             => $wipRow?->Station ?? null,
            'Lot_Type'            => $wipRow?->Lot_Type ?? null,
            'Prod_Area'           => $wipRow?->Prod_Area ?? null,
            'Lot_Status'          => $wipRow?->Lot_Status ?? null,
            'Focus_Group'         => $wipRow?->Focus_Group ?? null,
            'Stage'               => $wipRow?->Stage ?? null,
            'Lot_Entry_Time_Days' => $wipRow?->Lot_Entry_Time_Days ?? null,
            'CR3'                 => $wipRow?->CR3 ?? null,
            'BE_OSL_Days'         => $wipRow?->BE_OSL_Days ?? null,
            'Body_Size'           => $wipRow?->Body_Size ?? null,
            'Ramp_Time'           => $wipRow?->Ramp_Time ?? null,
            'Backend_Leadtime'    => $wipRow?->Backend_Leadtime ?? null,
            'Date_Loaded'         => $wipRow?->Date_Loaded?->format('n/j/Y g:i:s A'),
            'BE_Starttime'        => $wipRow?->BE_Starttime?->format('n/j/Y g:i:s A'),

            'status'              => $entry?->status ?? null,
            'sequenceOrder'       => $entry?->sequence_order,
            'item'                => $entry?->sequence_order,
            'timeStart'           => $entry?->time_start ?? null,
            'timeEnd'             => $entry?->time_end ?? null,
            'Remarks'             => $entry?->remarks ?? null,
            'tag'                 => $entry?->tag ?? null,
            'lockVersion'         => $entry?->lock_version ?? null,

            'accuTime'            => $accuTime,
            'doableRecipeSource'  => $doableRecipeSource,

            'Qty'                 => $effectiveQty,
            'Doable'              => $doable,
            'doableStatus'        => $doableStatus,
            'Capacity_UPH'        => $capacityUph,

            'CT'                      => $formulas->ct,
            'OSL'                     => $formulas->osl,
            'cycleTimeExceed'         => $formulas->cycleTimeExceed,
            'cycleTimeExceedResidual' => $formulas->cycleTimeExceedResidual,
            'isBakeHighlight'         => $formulas->isBakeHighlight,

            'splitInfo'           => LotSplitService::buildSplitMeta($lotId, $this->splitsByParent, $this->splitsByChild),
            'mergeInfo'           => LotMergeService::buildMergeMeta($lotId, $this->mergesByTarget, $this->mergesBySource),
        ];
    }
}
