<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\LoadingPlanEntry;
use App\Models\QdnMachine;
use App\Models\LotQuantity;
use App\Models\PpcPackageMaster;
use App\Models\MachineCapacity;
use App\Services\LoadingPlanPackageCoverage;
use App\Services\LoadingPlanPartnameIntegrity;
use App\Services\PackageGroups;
use Illuminate\Support\Facades\Log;
use App\Helpers\ShiftDay;
use App\Services\BakeLotService;
use App\Services\DisseminationService;
use App\Services\LoadingPlanEntryService;
use App\Services\LoadingPlanService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\App;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;

class LoadingPlanController extends Controller
{

    public function deemo()
    {
        return Inertia::render('Deemo', []);
    }

    public function index(Request $request)
    {
        $t0 = microtime(true);
        $mark = function ($label) use (&$t0) {
            $now = microtime(true);
            Log::info("[TIMING] {$label}: " . round(($now - $t0) * 1000) . "ms");
            $t0 = $now;
        };

        $date = $request->get('date', ShiftDay::current());
        $isVisitingYesterday = $date === ShiftDay::yesterday();

        $selectedLocation = $request->get('location', 'PL1');
        $previousDate = Carbon::parse($date)->subDay()->toDateString();

        $packageLineMap = Cache::remember('package-line-map', now()->addMinutes(10), function () {
            return PpcPackageMaster::query()
                ->where('is_telford', 1)
                ->where('is_active', 1)
                ->get()
                ->mapWithKeys(fn($row) => [trim($row->package) => $row->default_pl]);
        });
        $mark('packageLineMap');

        $machinesCacheKey = "loading-plan:machines-base-times:{$selectedLocation}:{$date}";

        [$activeMachines, $baseTimes] = Cache::remember($machinesCacheKey, now()->addSeconds(30), function () use ($selectedLocation, $date) {
            $machines = QdnMachine::active()
                ->where('location', $selectedLocation)
                ->select('id', 'machine_num', 'machine_platform', 'location')
                ->get();

            $baseTimes = $machines
                ->mapWithKeys(function ($machine) use ($date) {
                    $targetDate = Carbon::parse($date)->toDateString();

                    $leakedPredecessor = LoadingPlanEntry::where('machine_id', $machine->id)
                        ->where('scheduled_date', Carbon::parse($targetDate)->subDay()->toDateString())
                        ->where('time_end', '>=', $targetDate)
                        ->whereNotNull('time_start')
                        ->orderBy('sequence_order', 'asc')
                        ->first();

                    if ($leakedPredecessor && $leakedPredecessor->time_start !== null) {
                        return [$machine->machine_num => $leakedPredecessor->time_start->format('Y-m-d H:i:s')];
                    }

                    $firstRow = LoadingPlanEntryService::findFirstRemainingRow($machine->id, $targetDate);

                    if ($firstRow && $firstRow->time_start !== null) {
                        return [$machine->machine_num => $firstRow->time_start->format('Y-m-d H:i:s')];
                    }

                    return [$machine->machine_num => null];
                })
                ->filter()
                ->all();

            $activeMachines = $machines
                ->map(fn($machine) => [
                    'name' => $machine->machine_num,
                    'platform' => match (strtoupper($machine->machine_platform)) {
                        'GRAVITY' => 'G6L',
                        'TRAY' => 'Vitrox',
                        'TURRET' => 'HSI',
                        default => $machine->machine_platform,
                    },
                    'location' => $machine->location,
                ])
                ->values();

            return [$activeMachines, $baseTimes];
        });
        $mark('activeMachines+baseTimes (cache block)');

        $loadingPlanService = new LoadingPlanService($date, $selectedLocation, $previousDate);
        $loadingPlanService->initWipAndEntries();
        $mark('initWipAndEntries');

        $result = $loadingPlanService->initEntries();
        $mark('initEntries (1st call)');

        $unassignedRows = $result->filter(function ($row) {
            if ($row['is_block']) {
                return false;
            }
            return $row['entry_id'] === null || $row['machine'] === null;
        })->values();

        $unassignedWipOnly = $unassignedRows->filter(fn($row) => $row['entry_id'] === null);
        $unassignedLotIds = $unassignedWipOnly->pluck('lot_id')->filter()->all();

        $wipRowsToSchedule = $loadingPlanService->todayWipRows
            ->toBase()
            ->only($unassignedLotIds);

        $pickup = $wipRowsToSchedule
            ->map(fn($wip) => $loadingPlanService->mapWipToPickupPayload($wip))
            ->values()
            ->all();
        $mark('build pickup payload (count=' . count($pickup) . ')');

        Log::info("pickup", ['pickup' => $pickup]);

        $schedulerResult = null;

        if (!empty($pickup) && !$isVisitingYesterday) {
            $schedulerService = app(\App\Services\SchedulerService::class);
            $schedulerResult = $schedulerService->rebuildForPickupArrival($pickup, Carbon::parse($date));
            $mark('rebuildForPickupArrival');

            if ($schedulerResult['unmatched_part_names']->isNotEmpty()) {
                Log::warning('Scheduler: unmatched part names', $schedulerResult['unmatched_part_names']->all());
            }
            if ($schedulerResult['unassigned']->isNotEmpty()) {
                Log::info('Scheduler: lots left unassigned', ['count' => $schedulerResult['unassigned']->count()]);
            }

            $result = $loadingPlanService->initEntries();
            $mark('initEntries (2nd call, post-scheduler rebuild)');
        }

        $packages = $result
            ->filter(fn($row) => !$row['is_block'])
            ->pluck('package_name')
            ->filter()->unique()
            ->filter(fn($pkg) => $packageLineMap->get($pkg) === $selectedLocation)
            ->map(fn($pkg) => PackageGroups::groupOf($pkg))
            ->unique()->sort()->values();
        $mark('build packages list');

        $wipRows = $loadingPlanService->todayWipRows
            ->concat($loadingPlanService->todayLeakedWipRows);
        $status = $wipRows->isEmpty() ? 'not_imported' : 'ok';

        $partnameIntegrity = new LoadingPlanPartnameIntegrity();
        $packageListPromise = null;
        $getPackageList = function () use ($partnameIntegrity, $wipRows, &$packageListPromise) {
            return $packageListPromise ??= $partnameIntegrity->lookupPackageList($wipRows);
        };

        $bakeLots = (new BakeLotService())->getActiveBake();
        $mark('getActiveBake');

        Log::info('Request memory peak', ['mb' => memory_get_peak_usage(true) / 1048576]);

        $response = Inertia::render('Deemo', [
            'data'              => $result,
            'date'              => $date,
            'machines'          => $activeMachines,
            'baseTimes'         => $baseTimes,
            'packageGroupNames' => $packages,
            'packageGroups'     => PackageGroups::GROUPS,
            'selectedLocation'  => $selectedLocation,
            'status'            => $status,
            'bakeLots'          => $bakeLots,

            'partnameMismatches' => Inertia::defer(function () use ($partnameIntegrity, $wipRows, $getPackageList) {
                return $partnameIntegrity->findMismatches($wipRows, $getPackageList());
            }),
            'unknownPackages' => Inertia::defer(function () use ($date) {
                return (new LoadingPlanPackageCoverage())->findUnknownPackages($date);
            }),
            'recipeMismatches' => Inertia::defer(function () use ($partnameIntegrity, $wipRows, $getPackageList, $date, $previousDate) {
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

        $mark('Inertia::render (build response, excludes deferred props)');

        return $response;
    }

    // public function index(Request $request)
    // {
    //     $date = $request->get('date', ShiftDay::current());
    //     $selectedLocation = $request->get('location', 'PL1');
    //     $previousDate = Carbon::parse($date)->subDay()->toDateString();

    //     $packageLineMap = Cache::remember('package-line-map', now()->addMinutes(10), function () {
    //         return PpcPackageMaster::query()
    //             ->where('is_telford', 1)
    //             ->where('is_active', 1)
    //             ->get()
    //             ->mapWithKeys(fn($row) => [trim($row->package) => $row->default_pl]);
    //     });

    //     $machinesCacheKey = "loading-plan:machines-base-times:{$selectedLocation}:{$date}";

    //     [$activeMachines, $baseTimes] = Cache::remember($machinesCacheKey, now()->addSeconds(30), function () use ($selectedLocation, $date) {
    //         $machines = QdnMachine::active()
    //             ->where('location', $selectedLocation)
    //             ->select('id', 'machine_num', 'machine_platform', 'location')
    //             ->get();

    //         $baseTimes = $machines
    //             ->mapWithKeys(function ($machine) use ($date) {
    //                 $targetDate = Carbon::parse($date)->toDateString();

    //                 $leakedPredecessor = LoadingPlanEntry::where('machine_id', $machine->id)
    //                     ->where('scheduled_date', Carbon::parse($targetDate)->subDay()->toDateString())
    //                     ->where('time_end', '>=', $targetDate)
    //                     ->whereNotNull('time_start')
    //                     ->orderBy('sequence_order', 'asc')
    //                     ->first();

    //                 if ($leakedPredecessor && $leakedPredecessor->time_start !== null) {
    //                     return [$machine->machine_num => $leakedPredecessor->time_start->format('Y-m-d H:i:s')];
    //                 }

    //                 $firstRow = LoadingPlanEntryService::findFirstRemainingRow($machine->id, $targetDate);

    //                 if ($firstRow && $firstRow->time_start !== null) {
    //                     return [$machine->machine_num => $firstRow->time_start->format('Y-m-d H:i:s')];
    //                 }

    //                 return [$machine->machine_num => null];
    //             })
    //             ->filter()
    //             ->all();

    //         $activeMachines = $machines
    //             ->map(fn($machine) => [
    //                 'name' => $machine->machine_num,
    //                 'platform' => match (strtoupper($machine->machine_platform)) {
    //                     'GRAVITY' => 'G6L',
    //                     'TRAY' => 'Vitrox',
    //                     'TURRET' => 'HSI',
    //                     default => $machine->machine_platform,
    //                 },
    //                 'location' => $machine->location,
    //             ])
    //             ->values();

    //         return [$activeMachines, $baseTimes];
    //     });

    //     // dd(["baseTimes" => $baseTimes]);



    //     $loadingPlanService = new LoadingPlanService($date, $selectedLocation, $previousDate);
    //     $loadingPlanService->initWipAndEntries();
    //     $result = $loadingPlanService->initEntries();

    //     $unassignedRows = $result->filter(function ($row) {
    //         if ($row['is_block']) {
    //             return false;
    //         }

    //         return $row['entry_id'] === null || $row['machine'] === null;
    //     })->values();

    //     // dump("LOG ~ LoadingPlanController.php:99 ~ LoadingPlanController ~ index ~ unassignedRows:", $unassignedRows);

    //     $unassignedWipOnly = $unassignedRows->filter(fn($row) => $row['entry_id'] === null);

    //     $unassignedLotIds = $unassignedWipOnly->pluck('lot_id')->filter()->all();
    //     // dump($unassignedLotIds);
    //     // dump($loadingPlanService->todayWipRows);

    //     $wipRowsToSchedule = $loadingPlanService->todayWipRows
    //         ->toBase()
    //         ->only($unassignedLotIds);


    //     $pickup = $wipRowsToSchedule
    //         ->map(fn($wip) => $loadingPlanService->mapWipToPickupPayload($wip))
    //         ->values()
    //         ->all();

    //     Log::info("pickup", ['pickup' => $pickup]);
    //     // dump($pickup);

    //     $schedulerResult = null;

    //     if (!empty($pickup)) {
    //         $schedulerService = app(\App\Services\SchedulerService::class);
    //         $schedulerResult = $schedulerService->rebuildForPickupArrival($pickup, Carbon::parse($date));

    //         if ($schedulerResult['unmatched_part_names']->isNotEmpty()) {
    //             Log::warning('Scheduler: unmatched part names', $schedulerResult['unmatched_part_names']->all());
    //         }
    //         if ($schedulerResult['unassigned']->isNotEmpty()) {
    //             Log::info('Scheduler: lots left unassigned', ['count' => $schedulerResult['unassigned']->count()]);
    //         }

    //         // rebuildForPickupArrival deleted and recreated every open entry on
    //         // the affected machines, so $result needs a full rebuild from DB —
    //         // no partial merge makes sense here
    //         $result = $loadingPlanService->initEntries();
    //     }

    //     // $disseminationService = App::make(\App\Services\DisseminationService::class, ['location' => $selectedLocation]);
    //     // $disseminationResult = $disseminationService->disseminate($unassignedRows);

    //     // $assignments = collect($disseminationResult['assignments'])
    //     //     ->map(fn($a) => ['lot_id' => $a['lot_id'], 'machine' => $a['machine_code']])
    //     //     ->all();

    //     // $saveFailed = false;
    //     // $saveError = null;

    //     // if (! empty($assignments)) {
    //     //     try {
    //     //         // 2. Perform transfer and get transformed updated payload array items
    //     //         $updatedEntries = (new LoadingPlanEntryService)->bulkTransferMulti($assignments, date: $date);

    //     //         if ($updatedEntries->isNotEmpty()) {
    //     //             // 3. Key both collections by lot_id
    //     //             $resultKeyed = $result->keyBy('lot_id');
    //     //             $updatedKeyed = $updatedEntries->keyBy('lot_id');

    //     //             // 4. Overwrite original entries with updated ones
    //     //             $merged = $resultKeyed->merge($updatedKeyed);

    //     //             // 5. Re-sort using your static helper method
    //     //             $result = LoadingPlanService::sortEntriesByMachineAndSequence($merged);
    //     //         }
    //     //     } catch (\Throwable $e) {
    //     //         report($e);
    //     //         $saveFailed = true;
    //     //         $saveError = 'Auto-dissemination could not be saved. You can still plan manually.';
    //     //     }
    //     // }

    //     // $disseminationSummary = DisseminationService::buildFrontendPayload(
    //     //     $disseminationResult,
    //     //     $saveFailed,
    //     //     $saveError,
    //     // );

    //     // Log::info('Dissemination result', $disseminationResult);
    //     // Log::info('Dissemination summary', $disseminationSummary);

    //     $packages = $result
    //         ->filter(fn($row) => !$row['is_block'])
    //         ->pluck('package_name')
    //         ->filter()->unique()
    //         ->filter(fn($pkg) => $packageLineMap->get($pkg) === $selectedLocation)
    //         ->map(fn($pkg) => PackageGroups::groupOf($pkg))
    //         ->unique()->sort()->values();

    //     $wipRows = $loadingPlanService->todayWipRows
    //         ->concat($loadingPlanService->todayLeakedWipRows);
    //     $status = $wipRows->isEmpty() ? 'not_imported' : 'ok';

    //     $partnameIntegrity = new LoadingPlanPartnameIntegrity();
    //     $packageListPromise = null;
    //     $getPackageList = function () use ($partnameIntegrity, $wipRows, &$packageListPromise) {
    //         return $packageListPromise ??= $partnameIntegrity->lookupPackageList($wipRows);
    //     };

    //     $bakeLots = (new BakeLotService())->getActiveBake();

    //     Log::info('Request memory peak', ['mb' => memory_get_peak_usage(true) / 1048576]);
    //     return Inertia::render('Deemo', [
    //         'data'              => $result,
    //         'date'              => $date,
    //         'machines'          => $activeMachines,
    //         'baseTimes'         => $baseTimes,
    //         'packageGroupNames' => $packages,
    //         'packageGroups'     => PackageGroups::GROUPS,
    //         'selectedLocation'  => $selectedLocation,
    //         'status'            => $status,
    //         'bakeLots'          => $bakeLots,
    //         // 'disseminationSummary' => $disseminationSummary, // deprecated. going to use SchedulerService instead

    //         'partnameMismatches' => Inertia::defer(function () use ($partnameIntegrity, $wipRows, $getPackageList) {
    //             return $partnameIntegrity->findMismatches($wipRows, $getPackageList());
    //         }),
    //         'unknownPackages' => Inertia::defer(function () use ($date) {
    //             return (new LoadingPlanPackageCoverage())->findUnknownPackages($date);
    //         }),
    //         'recipeMismatches' => Inertia::defer(function () use ($partnameIntegrity, $wipRows, $getPackageList, $date, $previousDate) {
    //             // scoped the same way buildPlanRows() does, since this needs its own lookup independently
    //             $entryLotIds = LoadingPlanEntry::whereIn('scheduled_date', [$date, $previousDate])
    //                 ->where('entry_type', 'lot')
    //                 ->pluck('lot_id');
    //             $relevantLotIds = $wipRows->pluck('Lot_Id')->merge($entryLotIds)->filter()->unique();
    //             $lotQuantities = LotQuantity::whereIn('scheduled_date', [$date, $previousDate])
    //                 ->whereIn('lot_id', $relevantLotIds)
    //                 ->get()
    //                 ->keyBy('lot_id');

    //             return $partnameIntegrity->findRecipeIssues($wipRows, $getPackageList(), $lotQuantities);
    //         }),
    //         'machineCapacity' => Inertia::defer(function () use ($date) {
    //             return MachineCapacity::with('machine')
    //                 ->asOf($date)
    //                 ->get()
    //                 ->keyBy(fn($item) => $item->machine?->machine_num)
    //                 ->map(fn($item) => [
    //                     'capacity' => $item->capacity,
    //                     'effective_from' => $item->effective_from,
    //                 ]);
    //         })
    //     ]);
    // }

    public function byMachine(Request $request)
    {
        // very very stale stale — unchanged

        // $data = $request->validate([
        //     'date'       => 'required|date',
        //     'machines'   => 'required|array|min:1',
        //     'machines.*' => 'string',
        //     'location'   => 'sometimes|array',
        //     'location.*' => 'string',
        // ]);

        // $selectedLocation = $request->get('location', 'PL1');

        // $packageLineMap = PpcPackageMaster::query()
        //     ->where('is_telford', 1)->where('is_active', 1)
        //     ->pluck('default_pl', 'package');

        // $wipRows = $this->getWipRows($data['date'], $selectedLocation);
        // $calc = new LotScheduleCalculator();

        // $result = $this->buildPlanRows($data['date'], $data['date'], $selectedLocation, $packageLineMap, $wipRows, $calc, collect());

        // $filtered = $result->whereIn('machine', $data['machines'])->values();

        // $status = match (true) {
        //     $wipRows->isEmpty()  => 'not_imported',
        //     $filtered->isEmpty() => 'no_match',
        //     default              => 'ok',
        // };

        // return Inertia::render('LoadingPlanTableByMachine', [
        //     'data'             => $filtered,
        //     'date'             => $data['date'],
        //     'status'           => $status,
        //     'machines'         => $data['machines'],
        //     'selectedLocation' => $selectedLocation,
        // ]);
    }
}
