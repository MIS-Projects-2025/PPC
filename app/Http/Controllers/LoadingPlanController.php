<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\LoadingPlanEntry;
use App\Models\CustomerDataWip;
use App\Models\QdnMachine;
use App\Models\LotQuantity;
use App\Models\PpcPackageMaster;
use App\Models\MachineCapacity;
use App\Services\LotScheduleCalculator;
use App\Services\LoadingPlanPackageCoverage;
use App\Services\LoadingPlanPartnameIntegrity;
use App\Services\PackageGroups;
use App\Services\LotMergeService;
use App\Services\LoadingPlanFormulas;
use Illuminate\Support\Facades\Log;
use App\Helpers\ShiftDay;
use App\Services\DisseminationService;
use App\Services\LoadingPlanEntryService;
use App\Services\LotSplitService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\App;
use Carbon\Carbon;

class LoadingPlanController extends Controller
{
    public function index(Request $request)
    {
        $date = $request->get('date', ShiftDay::current());
        $selectedLocation = $request->get('location', 'PL1');
        $previousDate = Carbon::parse($date)->subDay()->toDateString();

        $packageLineMap = PpcPackageMaster::query()
            ->where('is_telford', 1)
            ->where('is_active', 1)
            ->get()
            ->mapWithKeys(fn($row) => [trim($row->package) => $row->default_pl]);

        $activeMachines = QdnMachine::active()
            ->where('location', $selectedLocation)
            ->select('id', 'machine_num', 'machine_platform', 'location')
            ->get();

        $machineDayStarts = DB::table('machine_day_starts')
            ->whereIn('machine_id', $activeMachines->pluck('id'))
            ->where('scheduled_date', $date)
            ->get()
            ->keyBy('machine_id');

        $machinesNeedingFallback = $activeMachines
            ->pluck('id')
            ->diff($machineDayStarts->keys());

        $leakedPredecessorEnds = LoadingPlanEntry::whereIn('machine_id', $machinesNeedingFallback)
            ->where('scheduled_date', '<', $date)
            ->whereNotNull('time_end')
            ->orderBy('scheduled_date', 'desc')
            ->orderBy('sequence_order', 'desc')
            ->get()
            ->unique('machine_id') // first row per machine after the above ordering = most recent
            ->keyBy('machine_id');

        $baseTimes = $activeMachines
            ->mapWithKeys(function ($machine) use ($machineDayStarts, $leakedPredecessorEnds) {
                $anchor = $machineDayStarts->get($machine->id)?->day_start_time
                    ?? $leakedPredecessorEnds->get($machine->id)?->time_end?->format('H:i:s');

                return [$machine->machine_num => $anchor];
            })
            ->filter() // still drop machines with genuinely nothing — brand new, no history at all
            ->all();

        $activeMachines = $activeMachines
            ->map(fn($machine) => [
                'name' => $machine->machine_num,
                'platform' => match (strtoupper($machine->machine_platform)) {
                    'GRAVITY' => 'G6L',
                    'TRAY' => 'Vitrox',
                    'TURRET' => 'HSI',
                    default => $machine->machine_platform,
                },
                'location' => $machine->location,
                'dayStartTime' => $machineDayStarts->get($machine->id)?->day_start_time,
            ])
            ->values();

        Log::debug('Active machines resolved', [
            'location' => $selectedLocation,
            'count' => $activeMachines->count(),
            'machines' => $activeMachines->toArray(),
        ]);

        $wipRows = $this->getWipRows($date, $selectedLocation);
        // var_dump("🚀 ~ LoadingPlanController ~ index ~ wipRows:", $wipRows);

        $allEntries = $this->getEntriesIncludingLeaked($date, $previousDate);
        // var_dump("🚀 ~ LoadingPlanController ~ index ~ allentries:", $allEntries);

        $lotEntries = $allEntries->where('entry_type', 'lot')->keyBy('lot_id');

        $relevantLotIds = $wipRows->pluck('Lot_Id')
            ->merge($lotEntries->keys())
            ->filter()
            ->unique()
            ->values()
            ->all();

        $calc = new LotScheduleCalculator([$date, $previousDate], $relevantLotIds);

        $result = $this->buildPlanRows($date, $previousDate, $selectedLocation, $packageLineMap, $wipRows, $calc, $allEntries);
        // var_dump("🚀 ~ LoadingPlanController ~ index ~ $result:", $result);

        $unassignedRows = $result->filter(function ($row) {
            if ($row['isBlock']) {
                return false;
            }

            return $row['entryId'] === null || $row['machine'] === null;
        })->values();

        $disseminationService = App::make(\App\Services\DisseminationService::class, ['location' => $selectedLocation]);
        $disseminationResult = $disseminationService->disseminate($unassignedRows);

        $assignments = collect($disseminationResult['assignments'])
            ->map(fn($a) => ['lot_id' => $a['lot_id'], 'machine' => $a['machine_code']])
            ->all();

        $saveFailed = false;
        $saveError = null;

        if (! empty($assignments)) {
            try {
                (new LoadingPlanEntryService)->bulkTransferMulti($assignments, blockEntryIds: [], date: $date);
            } catch (\Throwable $e) {
                report($e);
                $saveFailed = true;
                $saveError = 'Auto-dissemination could not be saved. You can still plan manually.';
            }
        }

        $disseminationSummary = DisseminationService::buildFrontendPayload(
            $disseminationResult,
            $saveFailed,
            $saveError,
        );

        Log::info('Dissemination result', $disseminationResult);
        Log::info('Dissemination summary', $disseminationSummary);

        $packages = $result
            ->filter(fn($row) => !$row['isBlock'])
            ->pluck('Package_Name')
            ->filter()->unique()
            ->filter(fn($pkg) => $packageLineMap->get($pkg) === $selectedLocation)
            ->map(fn($pkg) => PackageGroups::groupOf($pkg))
            ->unique()->sort()->values();

        $status = $wipRows->isEmpty() ? 'not_imported' : 'ok';

        $partnameIntegrity = new LoadingPlanPartnameIntegrity();
        $packageListPromise = null;
        $getPackageList = function () use ($partnameIntegrity, $wipRows, &$packageListPromise) {
            return $packageListPromise ??= $partnameIntegrity->lookupPackageList($wipRows);
        };

        Log::info('Request memory peak', ['mb' => memory_get_peak_usage(true) / 1048576]);
        return Inertia::render('LoadingPlanTable', [
            'data'             => $result,
            'date'             => $date,
            'machines'         => $activeMachines,
            'baseTimes'        => $baseTimes,
            'packageGroupNames' => $packages,
            'packageGroups'    => PackageGroups::GROUPS,
            'selectedLocation' => $selectedLocation,
            'status'           => $status,

            'disseminationSummary' => $disseminationSummary,

            'partnameMismatches' => Inertia::defer(function () use ($partnameIntegrity, $wipRows, $getPackageList) {
                return $partnameIntegrity->findMismatches($wipRows, $getPackageList());
            }),
            'unknownPackages' => Inertia::defer(function () use ($date) {
                return (new LoadingPlanPackageCoverage())->findUnknownPackages($date);
            }),
            'recipeMismatches' => Inertia::defer(function () use ($partnameIntegrity, $wipRows, $getPackageList, $calc, $date, $previousDate) {
                // scoped the same way buildPlanRows() does, since this needs its own lookup independently
                $entryLotIds = LoadingPlanEntry::whereIn('scheduled_date', [$date, $previousDate])
                    ->where('entry_type', 'lot')
                    ->pluck('lot_id');
                $relevantLotIds = $wipRows->pluck('Lot_Id')->merge($entryLotIds)->filter()->unique();
                $lotQuantities = LotQuantity::whereIn('scheduled_date', [$date, $previousDate])
                    ->whereIn('lot_id', $relevantLotIds)
                    ->get()
                    ->keyBy('lot_id');

                return $partnameIntegrity->findRecipeIssues($wipRows, $getPackageList(), $lotQuantities);
            }),
            'machineCapacity' => Inertia::defer(function () use ($date) {
                return MachineCapacity::with('machine')
                    ->asOf($date)
                    ->get()
                    ->keyBy(fn($item) => $item->machine?->machine_num)
                    ->map(fn($item) => [
                        'capacity' => $item->capacity,
                        'effective_from' => $item->effective_from,
                    ]);
            })
        ]);
    }

    public function byMachine(Request $request)
    {
        // stale — unchanged
        $data = $request->validate([
            'date'       => 'required|date',
            'machines'   => 'required|array|min:1',
            'machines.*' => 'string',
            'location'   => 'sometimes|array',
            'location.*' => 'string',
        ]);

        $selectedLocation = $request->get('location', 'PL1');

        $packageLineMap = PpcPackageMaster::query()
            ->where('is_telford', 1)->where('is_active', 1)
            ->pluck('default_pl', 'package');

        $wipRows = $this->getWipRows($data['date'], $selectedLocation);
        $calc = new LotScheduleCalculator();

        $result = $this->buildPlanRows($data['date'], $data['date'], $selectedLocation, $packageLineMap, $wipRows, $calc, collect());

        $filtered = $result->whereIn('machine', $data['machines'])->values();

        $status = match (true) {
            $wipRows->isEmpty()  => 'not_imported',
            $filtered->isEmpty() => 'no_match',
            default              => 'ok',
        };

        return Inertia::render('LoadingPlanTableByMachine', [
            'data'             => $filtered,
            'date'             => $data['date'],
            'status'           => $status,
            'machines'         => $data['machines'],
            'selectedLocation' => $selectedLocation,
        ]);
    }

    private function getWipRows(string $date, string $selectedLocation)
    {
        $packages = PpcPackageMaster::query()
            ->where('is_telford', 1)
            ->where('is_active', 1)
            ->where('default_pl', $selectedLocation)
            ->pluck('package')
            ->map(fn($p) => trim($p));

        return CustomerDataWip::query()
            ->forDate($date)
            ->tapeReelStations()
            ->excludingPostTnr()
            ->whereIn('Package_Name', $packages)
            ->get();
    }

    /**
     * Today's plan entries, plus any entry from the previous scheduled_date
     * whose cumulative accu_time on its machine (ordered by sequence_order)
     * exceeds 1440 minutes — meaning it spilled past midnight and is still
     * physically running today. Bounded to one day of lookback: planning
     * restarts fresh at the daily CustomerDataWip import, so a queue never
     * accumulates enough accu_time to cross a second midnight under normal
     * operation. If that import is ever skipped or delayed past 10 AM, a
     * lot could leak two days deep and this query would miss it silently.
     */
    private function getEntriesIncludingLeaked(string $date, string $previousDate): Collection
    {
        $today = LoadingPlanEntry::with('machineModel')
            ->where('scheduled_date', $date)
            ->get();

        $leakedCalc = DB::table('loading_plan_entries')
            ->select('id')
            ->selectRaw('SUM(accu_time) OVER (PARTITION BY machine_id ORDER BY sequence_order) AS running_total')
            ->where('scheduled_date', $previousDate)
            ->whereNotNull('machine_id');

        $leakedIds = DB::query()
            ->fromSub($leakedCalc, 'leaked_calc')
            ->where('running_total', '>', 1440)
            ->pluck('id');

        // var_dump("🚀 ~ LoadingPlanController ~ getEntriesIncludingLeaked ~ f:", $leakedIds);
        if ($leakedIds->isEmpty()) {
            return $today;
        }

        $leaked = LoadingPlanEntry::with('machineModel')->whereIn('id', $leakedIds)->get();

        return $today->concat($leaked);
    }

    private function buildPlanRows(
        string $date,
        string $previousDate,
        string $selectedLocation,
        $packageLineMap,
        $wipRows,
        LotScheduleCalculator $calc,
        Collection $allEntries,
    ): \Illuminate\Support\Collection {
        $activeSplits = \App\Models\LotSplit::active()
            ->whereIn('scheduled_date', [$date, $previousDate])
            ->get();

        $splitsByParent = $activeSplits->groupBy('parent_lot_id');
        $splitsByChild = $activeSplits->keyBy('child_lot_id');

        $lotEntries = $allEntries->where('entry_type', 'lot')->keyBy('lot_id');

        $blockEntries = $allEntries->where('entry_type', 'block');
        $blockEntries = $blockEntries->filter(function ($entry) use ($selectedLocation) {
            $location = $entry->machineModel?->location;
            return $location === null || $location === $selectedLocation;
        });

        $activeMerges = \App\Models\LotMerge::active()
            ->whereIn('scheduled_date', [$date, $previousDate])
            ->get();
        $mergesByTarget = $activeMerges->groupBy('target_lot_id');
        $mergesBySource = $activeMerges->keyBy('source_lot_id');

        // Scope lot_quantities to only the lots actually in play for this page —
        // WIP rows already filtered by package/location, plus any manual/split
        // lots that exist as loading_plan_entries but aren't in wipRows, plus
        // leaked lots whose LotQuantity row is dated the previous scheduled_date.
        $relevantLotIds = $wipRows->pluck('Lot_Id')
            ->merge($lotEntries->keys())
            ->filter()
            ->unique();

        $lotQuantities = LotQuantity::whereIn('scheduled_date', [$date, $previousDate])
            ->whereIn('lot_id', $relevantLotIds)
            ->get()
            ->keyBy('lot_id');

        $packageListById = DB::table('qdn_db.package_list')
            ->whereIn('id', $lotQuantities->pluck('recipe_source_id')->filter()->unique())
            ->get()
            ->keyBy('id');

        $snapshotUpdates = [];

        $lotResults = $wipRows->map(function ($wip) use ($date, $lotQuantities, $packageListById, $lotEntries, $calc, &$snapshotUpdates, $splitsByParent, $splitsByChild, $mergesByTarget, $mergesBySource) {
            $entry = $lotEntries->get($wip->Lot_Id);
            $quantity = $lotQuantities->get($wip->Lot_Id);

            $machine = $entry?->finalized_at
                ? $entry->machine_snapshot
                : $entry?->getMachineName();

            $effectiveQty = $quantity?->effectiveQty() ?? $wip->Qty;
            $doable = $quantity?->commit;
            $doableStatus = $quantity?->recipe_status ?? 'unknown';
            $capacityUph = $quantity?->capacity_uph_snapshot;
            $doableRecipeSource = ($quantity && $quantity->recipe_source_id) ? [
                'id'          => $quantity->recipe_source_id,
                'devicename'  => $quantity->part_name,
                'recipe'      => $quantity->recipe_used,
                'packageType' => $packageListById->get($quantity->recipe_source_id)?->package_type,
            ] : null;

            $capacityUph = $entry?->finalized_at
                ? $entry->capacity_uph_snapshot
                : $calc->capacityUph($machine, $effectiveQty);

            $accuTime = $entry?->finalized_at
                ? $entry->accu_time
                : $calc->accuTime($doable, $capacityUph);

            if ($entry && !$entry->finalized_at) {
                $diff = [];
                if ($capacityUph !== $entry->capacity_uph_snapshot) $diff['capacity_uph_snapshot'] = $capacityUph;
                if ($accuTime !== $entry->accu_time)                 $diff['accu_time']             = $accuTime;

                if (!empty($diff)) {
                    $snapshotUpdates[$entry->id] = $diff;
                }
            }

            $ct = LoadingPlanFormulas::computeCT($wip->Date_Loaded, $wip->BE_Starttime);
            $osl = LoadingPlanFormulas::computeOSL($ct, $wip->Backend_Leadtime);

            $cycleTimeExceedResidual = ($wip->CR3 == "RES") && ($wip->Lot_Entry_Time_Days > 2);
            $cycleTimeExceed = $ct > 2;

            $bakeStationList = ["GTBKLDBE_T", "GTIQA_T", "GTLPI_T", "GTTRANS_T", "GTBRAND_T"];

            $isBakeHighlight = ($wip->Bake == "For Bake")
                && in_array($wip->Station, $bakeStationList)
                && $wip->Bake_Count == 0;

            return [
                'id'                  => $wip->customer_data_id,
                'entryId'             => $entry->id ?? null,
                'entryType'           => 'lot',
                'machine'             => $machine,
                'sequenceOrder'       => $entry->sequence_order ?? null,
                'item'                => $entry->sequence_order ?? null,
                'Part_Name'           => $wip->Part_Name,
                'Lead_Count'          => $wip->Lead_Count,
                'Package_Name'        => $wip->Package_Name,
                'Lot_Id'              => $wip->Lot_Id,
                'status'              => $entry->status ?? null,
                'Station'             => $wip->Station,
                'Qty'                 => $effectiveQty,
                'Lot_Type'            => $wip->Lot_Type,
                'Prod_Area'           => $wip->Prod_Area,
                'Lot_Status'          => $wip->Lot_Status,
                'Focus_Group'         => $wip->Focus_Group,
                'Stage'               => $wip->Stage,
                'Lot_Entry_Time_Days' => $wip->Lot_Entry_Time_Days,
                'CR3'                 => $wip->CR3,
                'BE_OSL_Days'         => $wip->BE_OSL_Days,
                'Body_Size'           => $wip->Body_Size,
                'Ramp_Time'           => $wip->Ramp_Time,
                'Date_Loaded'         => optional($wip->Date_Loaded)->format('n/j/Y g:i:s A'),
                'BE_Starttime'        => optional($wip->BE_Starttime)->format('n/j/Y g:i:s A'),
                'Backend_Leadtime'    => $wip->Backend_Leadtime,
                'Doable'              => $doable,
                'doableStatus'        => $doableStatus,
                'doableRecipeSource'  => $doableRecipeSource,
                'Capacity_UPH'        => $capacityUph,
                'accuTime'            => $accuTime,
                'timeStart'           => $entry->time_start ?? null,
                'timeEnd'             => $entry->time_end ?? null,
                'CT'                  => $ct,
                'OSL'                 => $osl,
                'Remarks'             => $entry->remarks ?? null,
                'tag'                 => $entry->tag ?? null,
                'lockVersion'         => $entry->lock_version ?? null,
                'isBlock'             => false,
                'cycleTimeExceedResidual' => $cycleTimeExceedResidual,
                'isLeaked'            => $entry && $entry->scheduled_date !== $date,
                'cycleTimeExceed'     => $cycleTimeExceed,
                'isBakeHighlight'     => $isBakeHighlight,
                'splitInfo'           => LotSplitService::buildSplitMeta($wip->Lot_Id, $splitsByParent, $splitsByChild),
                'mergeInfo'           => LotMergeService::buildMergeMeta($wip->Lot_Id, $mergesByTarget, $mergesBySource),
            ];
        });

        if (!empty($snapshotUpdates)) {
            app()->terminating(function () use ($snapshotUpdates) {
                (new \App\Jobs\RefreshLoadingPlanSnapshots($snapshotUpdates))->handle();
            });
        }

        $wipLotIds = $wipRows->pluck('Lot_Id')->all();

        // $manualLotEntries = $lotEntries->reject(function ($entry, $lotId) use ($wipLotIds, $selectedLocation, $packageLineMap) {
        //     if (in_array($lotId, $wipLotIds)) return true;
        //     return $packageLineMap->get($entry->package_name) !== $selectedLocation;
        // });
        $manualLotEntries = $lotEntries->reject(function ($entry, $lotId) use ($wipLotIds, $selectedLocation, $packageLineMap) {
            if (in_array($lotId, $wipLotIds)) return true;

            $mapped = $packageLineMap->get($entry->package_name);
            if ($mapped !== $selectedLocation) {
                // \Log::info('rejected', [
                //     'lot_id' => $lotId,
                //     'package_name' => $entry->package_name,
                //     'mapped_location' => $mapped,
                //     'selected_location' => $selectedLocation,
                // ]);
                return true;
            }
            return false;
        });
        // var_dump($lotEntries->map(fn($e) => ['lot_id' => $e->lot_id, 'package_name' => $e->package_name]));

        $manualLotResults = $manualLotEntries->map(function ($entry) use ($date, $packageListById, $lotQuantities, $calc, $splitsByParent, $splitsByChild, $wipRows, $mergesByTarget, $mergesBySource) {
            $machine = $entry->finalized_at ? $entry->machine_snapshot : $entry->getMachineName();

            $quantity = $lotQuantities->get($entry->lot_id);
            $effectiveQty = $quantity?->effectiveQty();

            $doable = $quantity?->commit;
            $doableStatus = $quantity?->recipe_status ?? 'unknown';
            $capacityUph = $quantity?->capacity_uph_snapshot;
            $doableRecipeSource = ($quantity && $quantity->recipe_source_id) ? [
                'id'          => $quantity->recipe_source_id,
                'devicename'  => $quantity->part_name,
                'recipe'      => $quantity->recipe_used,
                'packageType' => $packageListById->get($quantity->recipe_source_id)?->package_type,
            ] : null;

            $splitInfo = LotSplitService::buildSplitMeta($entry->lot_id, $splitsByParent, $splitsByChild);

            // Split children inherit display-only WIP fields from the root lot —
            // these describe the physical lot, not the qty fragment, so no
            // separate storage/sync needed, just a lookup at render time.
            // For a leaked lot no longer in today's WIP import (completed the
            // line), rootWip stays null and these fields render blank — expected.
            $rootWip = null;
            if ($splitInfo && $splitInfo['rootLotId']) {
                $rootWip = $wipRows->firstWhere('Lot_Id', $splitInfo['rootLotId']);
            }

            return [
                'id'                  => null,
                'entryId'             => $entry->id,
                'entryType'           => 'lot',
                'machine'             => $machine,
                'sequenceOrder'       => $entry->sequence_order,
                'item'                => $entry->sequence_order,
                'Part_Name'           => $quantity?->part_name ?? '',
                'Lead_Count'          => $rootWip->Lead_Count ?? null,
                'Package_Name'        => $entry->package_name,
                'Lot_Id'              => $entry->lot_id,
                'status'              => $entry->status ?? null,
                'Station'             => $rootWip->Station ?? null,
                'Qty'                 => $effectiveQty,
                'Lot_Type'            => $rootWip->Lot_Type ?? null,
                'Prod_Area'           => $rootWip->Prod_Area ?? null,
                'Lot_Status'          => $rootWip->Lot_Status ?? null,
                'Focus_Group'         => $rootWip->Focus_Group ?? null,
                'Stage'               => $rootWip->Stage ?? null,
                'Lot_Entry_Time_Days' => $rootWip->Lot_Entry_Time_Days ?? null,
                'CR3'                 => $rootWip->CR3 ?? null,
                'BE_OSL_Days'         => $rootWip->BE_OSL_Days ?? null,
                'Body_Size'           => $rootWip->Body_Size ?? null,
                'Ramp_Time'           => $rootWip->Ramp_Time ?? null,
                'Date_Loaded'         => optional($rootWip->Date_Loaded ?? null)->format('n/j/Y g:i:s A'),
                'BE_Starttime'        => optional($rootWip->BE_Starttime ?? null)->format('n/j/Y g:i:s A'),
                'Backend_Leadtime'    => $rootWip->Backend_Leadtime ?? null,
                'Doable'              => $doable,
                'doableStatus'        => $doableStatus,
                'doableRecipeSource'  => $doableRecipeSource,
                'Capacity_UPH'        => $capacityUph,
                'accuTime'            => $entry->accu_time,
                'timeStart'           => $entry->time_start ?? null,
                'timeEnd'             => $entry->time_end ?? null,
                'Remarks'             => $entry->remarks ?? null,
                'tag'                 => $entry->tag ?? null,
                'lockVersion'         => $entry->lock_version,
                'isBlock'             => false,
                'isManual'            => true,
                'isLeaked'            => $entry && $entry->scheduled_date !== $date,
                'splitInfo'           => LotSplitService::buildSplitMeta($entry->lot_id, $splitsByParent, $splitsByChild),
                'mergeInfo'           => LotMergeService::buildMergeMeta($entry->lot_id, $mergesByTarget, $mergesBySource),
            ];
        })->values();

        $blockResults = $blockEntries->map(function ($entry) {
            $machine = $entry->finalized_at ? $entry->machine_snapshot : $entry->getMachineName();

            return [
                'id'                  => null,
                'entryId'             => $entry->id,
                'entryType'           => 'block',
                'machine'             => $machine,
                'sequenceOrder'       => $entry->sequence_order,
                'item'                => $entry->sequence_order,
                'Part_Name'           => null,
                'Lead_Count'          => null,
                'Package_Name'        => null,
                'Lot_Id'              => null,
                'status'              => null,
                'Station'             => null,
                'Qty'                 => null,
                'Lot_Type'            => null,
                'Prod_Area'           => null,
                'Lot_Status'          => null,
                'Focus_Group'         => null,
                'Stage'               => null,
                'Lot_Entry_Time_Days' => null,
                'CR3'                 => null,
                'BE_OSL_Days'         => null,
                'Body_Size'           => null,
                'Ramp_Time'           => null,
                'Date_Loaded'         => null,
                'BE_Starttime'        => null,
                'Backend_Leadtime'    => null,
                'Doable'              => null,
                'doableStatus'        => null,
                'doableRecipeSource'  => null,
                'Capacity_UPH'        => null,
                'accuTime'            => $entry->accu_time,
                'timeStart'           => $entry->time_start ?? null,
                'timeEnd'             => $entry->time_end ?? null,
                'Remarks'             => null,
                'tag'                 => null,
                'lockVersion'         => $entry->lock_version,
                'isBlock'             => true,
                'blockLabel'          => $entry->block_label,
            ];
        });

        $result = $lotResults->concat($manualLotResults)->concat($blockResults)
            ->sort(function ($a, $b) {
                if (($a['machine'] === null) !== ($b['machine'] === null)) {
                    return $a['machine'] === null ? 1 : -1;
                }

                if ($a['machine'] !== $b['machine']) {
                    return strnatcasecmp($a['machine'] ?? '', $b['machine'] ?? '');
                }

                $seqA = $a['sequenceOrder'] ?? PHP_FLOAT_MAX;
                $seqB = $b['sequenceOrder'] ?? PHP_FLOAT_MAX;

                if ($seqA == $seqB) {
                    return 0;
                }
                return ($seqA < $seqB) ? -1 : 1;
            })
            ->values();

        return $result;
    }
}
