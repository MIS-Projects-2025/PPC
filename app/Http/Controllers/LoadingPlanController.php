<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\LoadingPlanEntry;
use App\Models\QdnMachine;
use App\Models\LotQuantity;
use App\Models\MachineDayStart;
use App\Models\SchedulerRun;
use App\Models\PpcPackageMaster;
use App\Models\MachineCapacity;
use App\Services\SchedulerService;
use App\Services\LoadingPlanPackageCoverage;
use App\Services\LoadingPlanPartnameIntegrity;
use App\Services\PackageGroups;
use Illuminate\Support\Facades\Log;
use App\Helpers\ShiftDay;
use App\Services\BakeLotService;
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

    /**
     * Editable page. Same shared data prep as readOnly(), plus the two
     * things only the editable UI needs: `baseTimes` (client-side
     * schedule recompute on edit/drag/split/merge) and `schedulerHistory`
     * (the Scheduler modal).
     */
    public function index(Request $request)
    {
        [$props, $mark] = $this->buildLoadingPlanProps($request);

        $selectedLocation = $props['selectedLocation'];
        $date = $props['date'];

        $machinesCacheKey = "loading-plan:machines-base-times:{$selectedLocation}:{$date}";
        [, $baseTimes] = Cache::remember($machinesCacheKey, now()->addSeconds(30), function () use ($selectedLocation, $date) {
            return $this->computeActiveMachinesAndBaseTimes($selectedLocation, $date);
        });
        $mark('baseTimes (cache block)');

        $props['baseTimes'] = $baseTimes;
        $props['schedulerHistory'] = Inertia::defer(
            fn() => SchedulerRun::query()
                ->where('location', $selectedLocation)
                ->where('date', $date)
                ->latest()
                ->limit(20)
                ->get()
        );
        $props['readOnly'] = false;

        $response = Inertia::render('Deemo', $props);
        $mark('Inertia::render (build response, excludes deferred props)');

        return $response;
    }

    /**
     * Read-only page: free navigation across date / PL1↔PL6 / package /
     * machine / oven, zero write paths. Same shared data prep as index(),
     * minus `baseTimes` (no client-side recompute happens here) and
     * `schedulerHistory` (no Scheduler UI at all in this mode).
     */
    public function readOnly(Request $request)
    {
        [$props, $mark] = $this->buildLoadingPlanProps($request);
        $props['readOnly'] = true;

        $response = Inertia::render('Deemo', $props);
        $mark('Inertia::render (build response, excludes deferred props)');

        return $response;
    }

    /**
     * Shared read path for both index() and readOnly(): resolves date /
     * location, builds the package list, active machines, bake lots, and
     * the three deferred integrity props. Returns [$props, $mark] where
     * $mark is the same timing-logger closure index() used to have
     * inline, so both callers can keep timing their own extra work
     * (baseTimes for index(), nothing extra for readOnly()).
     *
     * NOT included here on purpose (added by index() only): baseTimes,
     * schedulerHistory. NOT included at all (dropped when Deemo.jsx moved
     * to a single readOnly-prop component, since these were always
     * function props from a hypothetical parent, not real Inertia props —
     * they never came from the server): onLotTransfer, onReorder.
     */
    private function buildLoadingPlanProps(Request $request): array
    {
        $t0 = microtime(true);
        $mark = function ($label) use (&$t0) {
            $now = microtime(true);
            Log::info("[TIMING] {$label}: " . round(($now - $t0) * 1000) . "ms");
            $t0 = $now;
        };

        $date = $request->get('date', ShiftDay::current());
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

        [$activeMachines] = $this->computeActiveMachinesAndBaseTimes($selectedLocation, $date);
        $mark('activeMachines');

        $loadingPlanService = new LoadingPlanService($date, $selectedLocation, $previousDate);
        $loadingPlanService->initWipAndEntries();
        $mark('initWipAndEntries');

        $result = $loadingPlanService->initEntries();
        $mark('initEntries (1st call)');

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

        $props = [
            'data'              => $result,
            'date'              => $date,
            'machines'          => $activeMachines,
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
            }),
        ];

        return [$props, $mark];
    }

    public function transferCandidates(Request $request, SchedulerService $scheduler)
    {
        $validated = $request->validate([
            'lot_ids'   => ['required', 'array', 'min:1'],
            'lot_ids.*' => ['string'],
            'date'      => ['required', 'date'],
        ]);

        $targetDate = Carbon::parse($validated['date']);
        $lots = $scheduler->hydrateLotsForTransfer(collect($validated['lot_ids']), $validated['date']);

        $compatibility = $scheduler->evaluateTransferCompatibility($lots);
        $allMachineIds = $compatibility->keys();

        $committedByMachine = $scheduler->getCommittedDoableByMachine($allMachineIds, $targetDate);
        $capacityByMachine = $allMachineIds->mapWithKeys(
            fn($id) => [$id => MachineCapacity::effectiveFor($id, $targetDate)?->capacity]
        );
        $machineNumById = QdnMachine::whereIn('id', $allMachineIds)->pluck('machine_num', 'id');

        $addedDoable = $lots->sum(fn($lot) => $scheduler->estimateCommit($lot) ?? 0);

        $result = $compatibility->map(function ($c, $machineId) use ($committedByMachine, $capacityByMachine, $machineNumById, $addedDoable) {
            $isFull = $c['incompatible_lot_ids']->isEmpty();
            $capacity = $capacityByMachine[$machineId];
            $current = $committedByMachine[$machineId];
            $projected = $current + $addedDoable;
            $exceeds = $capacity !== null && $projected > $capacity;

            $tier = match (true) {
                $isFull && !$exceeds  => 1, // full + open
                $isFull && $exceeds   => 2, // full + exceed
                !$isFull && !$exceeds => 3, // partial + open
                !$isFull && $exceeds  => 4, // partial + exceed
            };

            return [
                'machine_id'           => $machineId,
                'machine'              => $machineNumById[$machineId],
                'tier'                 => $tier,
                'compatible_lot_ids'   => $c['compatible_lot_ids'],
                'incompatible_lot_ids' => $c['incompatible_lot_ids'],
                'current_doable'       => $current,
                'projected_doable'     => $projected,
                'capacity'             => $capacity,
            ];
        })->values();

        $consideredIds = $result->pluck('machine_id');
        $allActiveMachines = QdnMachine::active()->pluck('id', 'machine_num'); // adjust to your actual active-machines scope
        $incompatibleRest = $allActiveMachines->reject(fn($id) => $consideredIds->contains($id))
            ->map(fn($id, $num) => [
                'machine_id'           => $id,
                'machine'              => $num,
                'tier'                 => 5,
                'compatible_lot_ids'   => collect(),
                'incompatible_lot_ids' => $lots->pluck('Lot_Id'),
                'current_doable'       => null, // deliberately unknown, not 0 — no bar shown
                'projected_doable'     => null,
                'capacity'             => null,
            ])->values();

        return response()->json($result->concat($incompatibleRest)->sortBy('tier')->values());
    }

    /**
     * Unchanged from the original index() — factored out only so
     * readOnly() doesn't need to duplicate it (readOnly() doesn't call
     * this at all, since it has no use for baseTimes; index() still
     * calls it, wrapped in its own Cache::remember exactly as before).
     */
    private function computeActiveMachinesAndBaseTimes(string $selectedLocation, string $date): array
    {
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

                // No existing rows to derive a start from — fall back to this
                // machine's configured day-start for this date, defaulting to
                // midnight if no row exists in machine_day_starts either.
                $dayStart = MachineDayStart::where('machine_id', $machine->id)
                    ->where('scheduled_date', $targetDate)
                    ->value('day_start_time');

                return [$machine->machine_num => $targetDate . ' ' . ($dayStart ?? '00:00:00')];
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
    }

    public function runScheduler(Request $request)
    {
        $date = $request->get('date', ShiftDay::current());
        $selectedLocation = $request->get('location', 'PL1');
        $previousDate = Carbon::parse($date)->subDay()->toDateString();
        $isVisitingYesterday = $date === ShiftDay::yesterday();

        if ($isVisitingYesterday) {
            return back()->with('error', 'Cannot run scheduler on a past date.');
        }

        $lockKey = "scheduler-run-lock:{$selectedLocation}:{$date}";
        $lock = Cache::lock($lockKey, 60); // hold for max 60s

        if (!$lock->get()) {
            return back()->with('error', 'Scheduler is already running for this location/date.');
        }

        try {
            $loadingPlanService = new LoadingPlanService($date, $selectedLocation, $previousDate);
            $loadingPlanService->initWipAndEntries();
            $result = $loadingPlanService->initEntries();

            $unassignedRows = $result->filter(
                fn($row) =>
                !$row['is_block'] && ($row['entry_id'] === null || $row['machine'] === null)
            )->values();

            $unassignedWipOnly = $unassignedRows->filter(fn($row) => $row['entry_id'] === null);
            $unassignedLotIds = $unassignedWipOnly->pluck('lot_id')->filter()->all();

            $wipRowsToSchedule = $loadingPlanService->todayWipRows->toBase()->only($unassignedLotIds);
            $pickup = $wipRowsToSchedule
                ->map(fn($wip) => $loadingPlanService->mapWipToPickupPayload($wip))
                ->values()
                ->all();

            if (empty($pickup)) {
                SchedulerRun::create([
                    'location'   => $selectedLocation,
                    'date'       => $date,
                    // 'user_id'    => auth()->id(),
                    'user_id'    => null,
                    'status'     => 'skipped',
                    'note'       => 'No unassigned pickup rows to schedule.',
                ]);
                return back()->with('success', 'Nothing to schedule.');
            }

            $schedulerService = app(\App\Services\SchedulerService::class);
            $schedulerResult = $schedulerService->rebuildForPickupArrival($pickup, Carbon::parse($date));

            SchedulerRun::create([
                'location'          => $selectedLocation,
                'date'              => $date,
                // 'user_id'           => auth()->id(),
                'user_id'           => null,
                'status'            => 'ok',
                'pickup_count'      => count($pickup),
                'assigned_count'    => count($pickup) - $schedulerResult['unassigned']->count(),
                'unassigned_count'  => $schedulerResult['unassigned']->count(),
                'unmatched_parts'   => $schedulerResult['unmatched_part_names']->values()->all(),
            ]);

            if ($schedulerResult['unmatched_part_names']->isNotEmpty()) {
                Log::warning('Scheduler: unmatched part names', $schedulerResult['unmatched_part_names']->all());
            }

            return back()->with('success', 'Scheduler run complete.');
        } catch (\Throwable $e) {
            SchedulerRun::create([
                'location' => $selectedLocation,
                'date'     => $date,
                // 'user_id'  => auth()->id(),
                'user_id'           => null,
                'status'   => 'error',
                'note'     => $e->getMessage(),
            ]);
            Log::error('Scheduler run failed', ['exception' => $e]);
            return back()->with('error', 'Scheduler run failed. Check logs.');
        } finally {
            $lock->release();
        }
    }
}
