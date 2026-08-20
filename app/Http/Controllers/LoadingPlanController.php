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
use App\Services\DisseminationService;
use App\Services\LoadingPlanEntryService;
use App\Services\LoadingPlanService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\App;
use Carbon\Carbon;

class LoadingPlanController extends Controller
{
    public function deemo()
    {
        return Inertia::render('Deemo', []);
    }

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

        $baseTimes = $activeMachines
            ->mapWithKeys(function ($machine) use ($date) {
                $targetDate = Carbon::parse($date)->toDateString();

                // 1. Check for a leaked predecessor from the previous day first
                $leakedPredecessor = LoadingPlanEntry::where('machine_id', $machine->id)
                    ->where('scheduled_date', Carbon::parse($targetDate)->subDay()->toDateString())
                    ->where('time_end', '>=', $targetDate)
                    ->whereNotNull('time_start')
                    ->orderBy('sequence_order', 'asc')
                    ->first();

                if ($leakedPredecessor && $leakedPredecessor->time_start !== null) {
                    return [$machine->machine_num => $leakedPredecessor->time_start->format('Y-m-d H:i:s')];
                }

                // 2. Fall back to the first remaining row of the current date
                $firstRow = LoadingPlanEntryService::findFirstRemainingRow($machine->id, $targetDate);

                if ($firstRow && $firstRow->time_start !== null) {
                    return [$machine->machine_num => $firstRow->time_start->format('Y-m-d H:i:s')];
                }

                return [$machine->machine_num => null];
            })
            ->filter()
            ->all();

        // dd(["baseTimes" => $baseTimes]);

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
                // 'dayStartTime' => $machineDayStarts->get($machine->id)?->day_start_time,
            ])
            ->values();

        $loadingPlanService = new LoadingPlanService($date, $selectedLocation, $previousDate);
        $loadingPlanService->initWipAndEntries();
        $result = $loadingPlanService->initEntries();

        // var_dump("LOG ~ LoadingPlanController.php:90 ~ LoadingPlanController ~ index ~ previousDate:", $previousDate);

        // var_dump("LOG ~ LoadingPlanController.php:90 ~ LoadingPlanController ~ index ~ selectedLocation:", $selectedLocation);

        // var_dump("LOG ~ LoadingPlanController.php:90 ~ LoadingPlanController ~ index ~ date:", $date);
        // var_dump("🚀 RE S U L T", $result);

        $unassignedRows = $result->filter(function ($row) {
            if ($row['is_block']) {
                return false;
            }

            return $row['entry_id'] === null || $row['machine'] === null;
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
                // 2. Perform transfer and get transformed updated payload array items
                $updatedEntries = (new LoadingPlanEntryService)->bulkTransferMulti($assignments, date: $date);

                if ($updatedEntries->isNotEmpty()) {
                    // 3. Key both collections by lot_id
                    $resultKeyed = $result->keyBy('lot_id');
                    $updatedKeyed = $updatedEntries->keyBy('lot_id');

                    // 4. Overwrite original entries with updated ones
                    $merged = $resultKeyed->merge($updatedKeyed);

                    // 5. Re-sort using your static helper method
                    $result = LoadingPlanService::sortEntriesByMachineAndSequence($merged);
                }
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
            ->filter(fn($row) => !$row['is_block'])
            ->pluck('package_name')
            ->filter()->unique()
            ->filter(fn($pkg) => $packageLineMap->get($pkg) === $selectedLocation)
            ->map(fn($pkg) => PackageGroups::groupOf($pkg))
            ->unique()->sort()->values();

        $wipRows = $loadingPlanService->todayWipRows
            ->concat($loadingPlanService->todayLeakedWipRows);
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
            'recipeMismatches' => Inertia::defer(function () use ($partnameIntegrity, $wipRows, $getPackageList, $date, $previousDate) {
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
