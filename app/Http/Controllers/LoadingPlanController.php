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
}
