<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\LoadingPlanEntry;
use App\Models\QdnMachine;
use App\Models\LotQuantity;
use App\Models\MachineDayStart;
use App\Models\SchedulerRun;
use App\Models\LotBucketItem;
use App\Models\LoadingPlanBucket;
use App\Models\PpcPackageMaster;
use App\Models\CustomerDataWip;
use App\Models\MachineCapacity;
use App\Services\SchedulerService;
use App\Services\PackageLocation;
use App\Services\LoadingPlanPackageCoverage;
use App\Support\Probe;
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
        [$props, $mark] = $this->buildLoadingPlanProps($request, withBaseTimes: true);

        $props['schedulerHistory'] = Inertia::defer(
            fn() => SchedulerRun::query()
                ->where('date', $request->get('date', ShiftDay::current()))
                ->latest()->limit(20)->get()
        );
        $props['readOnly'] = false;

        return Inertia::render('Deemo', $props);
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

    public function schedulePickup(Request $request, SchedulerService $scheduler)
    {
        $validated = $request->validate([
            'date' => 'required|date',
            'pickups' => 'required|array|min:1',
            'pickups.*.lotId' => 'required|string',
            'pickups.*.partname' => 'required|string',
            'pickups.*.qty' => 'required|integer|min:1',
            'pickups.*.package' => 'nullable|string',
            'pickups.*.isExpedite' => 'boolean',
        ]);

        // resolvePickupLots() reads part_name/lot_id/package_name/qty/is_expedite —
        // translate the modal's camelCase keys to that shape here
        $pickup = collect($validated['pickups'])->map(fn($row) => [
            'part_name'    => $row['partname'],
            'lot_id'       => $row['lotId'],
            'qty'          => $row['qty'],
            'package_name' => $row['package'] ?? null,
            'is_expedite'  => $row['isExpedite'] ?? false,
        ]);

        $result = $scheduler->rebuildForPickupArrival($pickup, Carbon::parse($validated['date']));

        return response()->json($result);
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
    private function buildLoadingPlanProps(Request $request, bool $withBaseTimes = false): array
    {
        $isPartial = $request->header('X-Inertia-Partial-Data') !== null
            && $request->header('X-Inertia-Partial-Component') === 'Deemo';

        Probe::start('buildLoadingPlanProps ' . ($isPartial ? 'PARTIAL' : 'FULL'));
        $mark = fn($label) => Probe::mark($label);

        $date             = $request->get('date', ShiftDay::current());
        $selectedLocation = $request->get('location', 'PL1');
        $previousDate     = Carbon::parse($date)->subDay()->toDateString();

        // Needed by both the full load and the deferred follow-up
        $svc = new LoadingPlanService($date, $selectedLocation, $previousDate);
        $svc->initWip();
        $mark('initWip');

        $wipRows = $svc->todayWipRows->concat($svc->todayLeakedWipRows);

        $partnameIntegrity  = new LoadingPlanPartnameIntegrity();
        $packageListPromise = null;
        $getPackageList = function () use ($partnameIntegrity, $wipRows, &$packageListPromise) {
            return $packageListPromise ??= $partnameIntegrity->lookupPackageList($wipRows);
        };

        $deferred = [
            'partnameMismatches' => Inertia::defer(
                fn() =>
                $partnameIntegrity->findMismatches($wipRows, $getPackageList())
            ),
            'unknownPackages' => Inertia::defer(
                fn() => (new LoadingPlanPackageCoverage())->findUnknownPackages($date)
            ),
            'recipeMismatches' => Inertia::defer(function () use ($partnameIntegrity, $wipRows, $getPackageList, $date, $previousDate) {
                $entryLotIds = LoadingPlanEntry::whereIn('scheduled_date', [$date, $previousDate])
                    ->where('entry_type', 'lot')
                    ->pluck('lot_id');
                $relevantLotIds = $wipRows->pluck('Lot_Id')->merge($entryLotIds)->filter()->unique();
                $lotQuantities = LotQuantity::whereIn('scheduled_date', [$date, $previousDate])
                    ->where('rework_seq', 0)
                    ->whereIn('lot_id', $relevantLotIds)
                    ->get()
                    ->keyBy('lot_id');

                return $partnameIntegrity->findRecipeIssues($wipRows, $getPackageList(), $lotQuantities);
            }),
            'machineCapacity' => Inertia::defer(
                fn() =>
                MachineCapacity::with('machine')
                    ->asOf($date)
                    ->get()
                    ->keyBy(fn($item) => $item->machine?->machine_num)
                    ->map(fn($item) => [
                        'capacity'       => $item->capacity,
                        'effective_from' => $item->effective_from,
                    ])
            ),
        ];

        // Deferred follow-up: nothing below is requested, so skip it all.
        if ($isPartial) {
            return [$deferred, $mark];
        }

        // ── Full load only ──────────────────────────────────────────────
        $packageLineMap = PackageLocation::map();
        $mark('packageLineMap');

        $activeMachines = $this->getActiveMachines();
        $mark('activeMachines');

        $svc->initPlanned();
        $mark('initPlanned');

        $result = $this->attachBuckets($svc->initEntries(), $date);
        $mark('initEntries + attachBuckets');

        $groups   = app(PackageGroups::class);
        $groupMap = $groups->reverseMap();

        $packages = $result
            ->filter(fn($row) => !$row['is_block'] && ($row['station'] ?? null) !== CustomerDataWip::RES_STATION)
            ->pluck('package_name')
            ->filter()->unique()
            ->filter(fn($pkg) => $packageLineMap->get($pkg) === $selectedLocation)
            ->map(fn($pkg) => $groupMap[$pkg] ?? $pkg)
            ->unique()->sort()->values();
        $mark('packages list');

        $machineNameById = QdnMachine::pluck('machine_num', 'id');

        $props = [
            'data'              => $result,
            'date'              => $date,
            'machines'          => $activeMachines,
            'packageGroupNames' => $packages,
            'packageGroups'     => $groups->grouped(),
            'selectedLocation'  => $selectedLocation,
            'status'            => $wipRows->isEmpty() ? 'not_imported' : 'ok',
            'buckets'           => LoadingPlanBucket::where('location', $selectedLocation)
                ->orderBy('sort_order')
                ->get()
                ->map(fn($b) => [
                    'id'         => $b->id,
                    'label'      => $b->label,
                    'sort_order' => $b->sort_order,
                    'machine'    => $b->machine_id ? ($machineNameById[$b->machine_id] ?? null) : null,
                ])
                ->values(),
        ] + $deferred;

        if ($withBaseTimes) {
            $props['baseTimes'] = $this->getBaseTimes($activeMachines, $date);
            $mark('baseTimes');
        }

        return [$props, $mark];
    }

    private function getActiveMachines()
    {
        return Cache::remember('lp:active-machines:v2', 60, function () {
            $factoryRank = function (?string $f): int {
                return preg_match('/F\s*(\d+)/i', (string) $f, $m) ? (int) $m[1] : 99;
            };

            return QdnMachine::active()
                ->select('id', 'machine_num', 'machine_platform', 'location', 'factory')
                ->get()
                ->map(fn($m) => [
                    'name'     => $m->machine_num,
                    'platform' => match (strtoupper($m->machine_platform)) {
                        'GRAVITY' => 'G6L',
                        'TRAY'    => 'Vitrox',
                        'TURRET'  => 'HSI',
                        default   => $m->machine_platform,
                    },
                    'location' => $m->location,
                    'factory'  => $m->factory,
                    'id'       => $m->id,
                ])
                ->sort(
                    fn($a, $b) =>
                    [$factoryRank($a['factory']), 0] <=> [$factoryRank($b['factory']), 0]
                        ?: strnatcasecmp($a['name'], $b['name'])
                )
                ->values();
        });
    }

    private function getBaseTimes($activeMachines, string $date): array
    {
        return Cache::remember("lp:base-times:{$date}", 30, function () use ($activeMachines, $date) {
            $targetDate = Carbon::parse($date)->toDateString();
            $prevDate   = Carbon::parse($targetDate)->subDay()->toDateString();
            $ids        = $activeMachines->pluck('id');

            $leaked = LoadingPlanEntry::whereIn('machine_id', $ids)
                ->where('scheduled_date', $prevDate)
                ->where('time_end', '>=', $targetDate)
                ->whereNotNull('time_start')
                ->orderBy('sequence_order')
                ->get()->groupBy('machine_id')->map->first();

            $dayStarts = MachineDayStart::whereIn('machine_id', $ids)
                ->where('scheduled_date', $targetDate)
                ->pluck('day_start_time', 'machine_id');

            return $activeMachines->mapWithKeys(function ($m) use ($leaked, $dayStarts, $targetDate) {
                if ($l = $leaked->get($m['id'])) {
                    return [$m['name'] => $l->time_start->format('Y-m-d H:i:s')];
                }
                // Still 1 query per machine. Send me findFirstRemainingRow and I'll batch it.
                $first = LoadingPlanEntryService::findFirstRemainingRow($m['id'], $targetDate);
                if ($first?->time_start) {
                    return [$m['name'] => $first->time_start->format('Y-m-d H:i:s')];
                }
                return [$m['name'] => $targetDate . ' ' . ($dayStarts[$m['id']] ?? '00:00:00')];
            })->all();
        });
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

    private function attachBuckets($rows, string $date)
    {
        $items = LotBucketItem::where('scheduled_date', $date)->get()->keyBy('lot_id');

        return $rows->map(function ($row) use ($items) {
            $item = (!($row['is_leaked'] ?? false) && $row['lot_id'] && !($row['rework_seq'] ?? 0))
                ? $items->get($row['lot_id'])
                : null;
            $row['bucket_id'] = $item?->bucket_id;
            $row['bucket_position'] = $item?->position;
            return $row;
        });
    }

    public function runScheduler(Request $request)
    {
        $date = $request->get('date', ShiftDay::current());
        $previousDate = Carbon::parse($date)->subDay()->toDateString();
        $isVisitingYesterday = $date === ShiftDay::yesterday();

        if ($isVisitingYesterday) {
            return back()->with('error', 'Cannot run scheduler on a past date.');
        }

        $lockKey = "scheduler-run-lock:{$date}";
        $lock = Cache::lock($lockKey, 60); // hold for max 60s

        if (!$lock->get()) {
            return back()->with('error', 'Scheduler is already running for this location/date.');
        }

        try {
            $loadingPlanService = new LoadingPlanService($date, null, $previousDate);
            $loadingPlanService->initWipAndEntries();
            $result = $loadingPlanService->initEntries();
            $result = $this->attachBuckets($result, $date);

            $unassignedRows = $result->filter(
                fn($row) => !$row['is_block']
                    && $row['bucket_id'] === null   // <- new
                    && ($row['entry_id'] === null || $row['machine'] === null)
            )->values();

            $unassignedWipOnly = $unassignedRows->filter(
                fn($row) => $row['entry_id'] === null
                    && ($row['station'] ?? null) !== CustomerDataWip::RES_STATION
            );

            $unassignedWipOnly = $unassignedRows->filter(
                fn($row) => ($row['station'] ?? null) !== CustomerDataWip::RES_STATION
                    && !($row['is_leaked'] ?? false)
                    && (int) ($row['rework_seq'] ?? 0) === 0
            );

            $unassignedLotIds = $unassignedWipOnly->pluck('lot_id')->filter()->all();

            $wipRowsToSchedule = $loadingPlanService->todayWipRows->toBase()->only($unassignedLotIds);

            $expediteByLot = $unassignedWipOnly->pluck('is_manual_expedite', 'lot_id');

            $pickup = $wipRowsToSchedule
                ->map(function ($wip) use ($loadingPlanService, $expediteByLot) {
                    $payload = $loadingPlanService->mapWipToPickupPayload($wip);
                    $payload['is_expedite'] = (bool) ($expediteByLot[$wip->Lot_Id] ?? false);
                    return $payload;
                })
                ->values()
                ->all();

            if (empty($pickup)) {
                SchedulerRun::create([
                    // 'location'   => $selectedLocation,
                    'location'   => "All",
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
                // 'location'          => $selectedLocation,
                'location'          => "All",
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
                // 'location' => $selectedLocation,
                'location'          => "All",
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
