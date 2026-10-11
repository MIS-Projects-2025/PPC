<?php

/*
|--------------------------------------------------------------------------
| Scheduler dry-run tester (no DB writes) — WIP edition
|--------------------------------------------------------------------------
| Each CSV row is treated as a real WIP lot (CustomerDataWip). It is run
| through the SAME hydrateLotFromEntry() the production rebuild uses, so:
|   - Lead_Count / Body_Size / Ramp_Time / Focus_Group / Lot_Type / CR3 /
|     Auto_Part come from the WIP columns (not PartName)
|   - CT, aboveCT, cycleTimeExceedResidual come from LoadingPlanFormulas
|
| Then it mirrors rebuildForPickupArrival(): tier 1/2 fixed CT order,
| tier 3 greedy-cheapest-next, LotPrioritySorter per machine. Stops BEFORE
| bulkPlacePlan. Whole run is wrapped in a transaction that is rolled back.
|
| PINNED lots = the current planned lot on a machine (max one per machine).
| They are looked up by lot_id in the SAME csv, are never moved/removed,
| and their setup state is the anchor the other lots are costed against.
|
| Timing: per-step laps are collected during simulate() and printed at the
| END of the output (and saved in the text file) so they never get buried
| under the long list of planned lots.
|
| Run:  php artisan tinker tests/testScheduler.php
*/

// ---------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------

$targetDate = \Carbon\Carbon::parse('2026-09-09');
$csvPath    = storage_path('app/ftproot/2026-10-07_08-30-01/daily_backend_wip.csv');

$limit = 300;   // max lots to schedule from the csv. null = all (slow!)
$limit = null;   // max lots to schedule from the csv. null = all (slow!)

// Only keep these packages. Empty array = no package filter.
$allowedPackages = [
    // 'SOIC_N',
    // 'QSOP',
    // 'SOIC_N_EP',
    // 'MINI_SO',
    // 'MINI_SO_EP'
];

// Pinned lot per machine: machine_id => [lot_id (must exist in the csv), optional setup_state_id]
$pinnedByNum = [
    '02AT468' => ['lot_id' => 'G166101.5'],
    '01SRM' => ['lot_id' => 'BD29570.4'],
    '21AT128' => ['lot_id' => 'BB53407.5'],
    '25AT128' => ['lot_id' => 'BD28898.2'],
    '42G6L' => ['lot_id' => 'BB53275.8'],
    '33G6L' => ['lot_id' => 'BD29507.2'],
    '47G6L' => ['lot_id' => 'BD29011.3'],
    '51AT28' => ['lot_id' => 'G165619.17'],
    '45AT28' => ['lot_id' => 'G165887.11'],
    '48AT28' => ['lot_id' => 'BD29158.3'],
    '05MV853A' => ['lot_id' => 'BD27879.2'],
    '04MV853A' => ['lot_id' => 'BB53610.5'],
    '29G6L' => ['lot_id' => 'BD29198.3'],
    '41G6L' => ['lot_id' => 'BD29189.2'],
    '07HSI' => ['lot_id' => 'BD29592.3'],
    '33HSI250' => ['lot_id' => 'BD29581.3'],
    '58AT28' => ['lot_id' => 'BD29445.2'],
    '14HSI' => ['lot_id' => 'BD29665.3'],
    '12HSI' => ['lot_id' => 'BB53424.4'],
    '20G6L' => ['lot_id' => 'BD28580.3'],
    '24G6L' => ['lot_id' => 'BD27972.5'],
    '26G6L' => ['lot_id' => 'BD27972.3'],
    '27G6L' => ['lot_id' => 'BD28209.3'],
    '28G6L' => ['lot_id' => 'BD27679.2'],
    '40G6L' => ['lot_id' => 'BD28935.2'],
    '43G6L' => ['lot_id' => 'BD29404.3'],
    '45G6L' => ['lot_id' => 'BD28471.2'],
    '62G6L' => ['lot_id' => 'BD29491.4'],
    '58G6L' => ['lot_id' => 'BD28716.2'],
    '04G6L' => ['lot_id' => 'BD29302.1'],
    '05G6L' => ['lot_id' => 'BC46812.8'],
    '07G6L' => ['lot_id' => 'BD28475.1'],
    '12G6L' => ['lot_id' => 'BD29408.3'],
    '21G6L' => ['lot_id' => 'BD29257.7'],
    '22G6L' => ['lot_id' => 'BB53507.3'],
    '38G6L' => ['lot_id' => 'BD28354.1'],
    '39G6L' => ['lot_id' => 'BD29498.2'],
    '57G6L' => ['lot_id' => 'BD24497.2'],
    '06G6L' => ['lot_id' => 'SM55522.1'],
    '02G6L' => ['lot_id' => 'BD29509.3'],
    '34G6L' => ['lot_id' => 'BD29643.2'],
    '29AT128' => ['lot_id' => 'BD29460.3'],
    '04STI' => ['lot_id' => 'BD28688.1'],
    '27AT28' => ['lot_id' => 'G165886.6'],
    '29AT28' => ['lot_id' => 'BD29409.2'],
    '44AT28' => ['lot_id' => 'BD29371.2'],
    '34AT28' => ['lot_id' => 'BD29244.2'],
    '52AT28' => ['lot_id' => 'BB53668.4'],
    '30G6L' => ['lot_id' => 'BD29448.2'],
    '51G6L' => ['lot_id' => 'BD28915.2'],
    'AT128040' => ['lot_id' => 'BD18764.3'],
    '08G6L' => ['lot_id' => 'BB50148.5'],
    '09G6L' => ['lot_id' => 'BD29040.3'],
    '36G6L' => ['lot_id' => 'BD29040.2'],
    '15AT128' => ['lot_id' => 'BD29341.2'],
    '10AT128' => ['lot_id' => 'BD29341.4'],
    '53G6L' => ['lot_id' => 'BD29236.2'],
    '32G6L' => ['lot_id' => 'BB50710.5'],
    '31G6L' => ['lot_id' => 'BD29365.4'],
    '50G6L' => ['lot_id' => 'BD29577.3'],
    '01MV853A' => ['lot_id' => 'BD28708.2'],
    '11AT128' => ['lot_id' => 'BC94240.2'],
    '49G6L' => ['lot_id' => 'BD28916.2'],
    '44G6L' => ['lot_id' => 'BD29100.2'],
];

// Same station rules as scopeLoadingPlanStations + scopeExcludingPostTnr
$allowedStations   = array_map('strtoupper', config('wip.tape_reel_stations'));
$postTnrStations   = ['GTTFVI_T', 'GTTOQA_T', 'GTTBOX_T'];

$machineIdColumn = 'id';   // adjust if the PK column is named differently (e.g. 'id')

// machine_num -> machine_id, from qdn_db.machine_list
$pinned = [];
if (!empty($pinnedByNum)) {
    $idByNum = [];
    $found = \DB::connection('qdn_db')->table('machine_list')
        ->whereIn('machine_num', array_keys($pinnedByNum))
        ->pluck($machineIdColumn, 'machine_num');
    foreach ($found as $num => $id) {
        $idByNum[strtoupper(trim($num))] = $id;
    }

    foreach ($pinnedByNum as $num => $cfg) {
        $key = strtoupper(trim($num));
        if (!isset($idByNum[$key])) {
            throw new \RuntimeException("Pinned machine_num '{$num}' not found in qdn_db.machine_list");
        }
        $pinned[$idByNum[$key]] = $cfg;
    }
}

// ---------------------------------------------------------------------
// CSV READER  (keeps the ORIGINAL column names — they match the WIP table)
// ---------------------------------------------------------------------

$readWipCsv = function (string $path, array $pinnedLotIds) use ($limit, $allowedPackages, $allowedStations, $postTnrStations): array {
    if (!is_readable($path)) {
        throw new \RuntimeException("CSV not readable: {$path}");
    }

    $fh = fopen($path, 'r');
    $header = fgetcsv($fh, 0, ',', '"', '\\');
    if (!$header) {
        throw new \RuntimeException("CSV is empty: {$path}");
    }
    $header = array_map(fn($h) => trim(preg_replace('/^\xEF\xBB\xBF/', '', (string) $h)), $header);

    foreach (['Part_Name', 'Lot_Id', 'Station', 'Package_Name', 'Qty'] as $required) {
        if (!in_array($required, $header, true)) {
            throw new \RuntimeException("CSV missing column '{$required}'. Headers: " . implode(' | ', $header));
        }
    }

    $allowedPackagesUpper = array_map(fn($p) => strtoupper(trim($p)), $allowedPackages);
    $pinnedLookup = array_flip($pinnedLotIds);

    $rows = [];
    $pinnedRows = [];
    $n = 0;
    $skippedByStation = 0;
    $skippedByPackage = 0;

    while (($data = fgetcsv($fh, 0, ',', '"', '\\')) !== false) {
        if (count(array_filter($data, fn($v) => trim((string) $v) !== '')) === 0) {
            continue; // blank line
        }

        $data  = array_pad(array_slice($data, 0, count($header)), count($header), null);
        $attrs = [];
        foreach ($header as $i => $h) {
            $v = is_string($data[$i]) ? trim($data[$i]) : $data[$i];
            $attrs[$h] = ($v === '') ? null : $v;
        }

        // pinned lots are kept regardless of filters/limit, and never enter the pool
        if (isset($pinnedLookup[$attrs['Lot_Id']])) {
            $pinnedRows[$attrs['Lot_Id']] = $attrs;
            continue;
        }

        $station = strtoupper((string) $attrs['Station']);
        if (in_array($station, $postTnrStations, true) || !in_array($station, $allowedStations, true)) {
            $skippedByStation++;
            continue;
        }

        if (
            !empty($allowedPackagesUpper)
            && !in_array(strtoupper((string) $attrs['Package_Name']), $allowedPackagesUpper, true)
        ) {
            $skippedByPackage++;
            continue;
        }

        if ($limit !== null && $n >= $limit) {
            if (count($pinnedRows) >= count($pinnedLotIds)) {
                break; // limit reached and every pinned lot found
            }
            continue;  // keep scanning only to find remaining pinned lots
        }

        $n++;
        $rows[] = $attrs;
    }
    fclose($fh);

    return [
        'rows' => $rows,
        'pinned_rows' => $pinnedRows,
        'skipped_station' => $skippedByStation,
        'skipped_package' => $skippedByPackage,
    ];
};

// ---------------------------------------------------------------------
// DRY-RUN SUBCLASS
// ---------------------------------------------------------------------
$startTime = microtime(true);
$sim = new class(
    app(\App\Services\FocusGroupFactoryService::class),
    app(\App\Services\LoadingPlanEntryService::class)
) extends \App\Services\SchedulerService {

    /**
     * csv row -> in-memory CustomerDataWip + fake entry -> the production
     * hydrateLotFromEntry() WIP branch (same fields, same CT formulas).
     */
    protected function hydrateWipRow(array $attrs): ?object
    {
        foreach (['Qty', 'Lead_Count'] as $k) {
            if (isset($attrs[$k]) && is_numeric($attrs[$k])) {
                $attrs[$k] = (int) $attrs[$k];
            }
        }
        if (isset($attrs['Lot_Entry_Time_Days']) && is_numeric($attrs['Lot_Entry_Time_Days'])) {
            $attrs['Lot_Entry_Time_Days'] = (float) $attrs['Lot_Entry_Time_Days'];
        }

        $wip = (new \App\Models\CustomerDataWip())->forceFill($attrs);

        $entry = (new \App\Models\LoadingPlanEntry())->forceFill([
            'lot_id'             => $wip->Lot_Id,
            'package_name'       => $wip->Package_Name,
            'is_pickup'          => false,
            'is_manual_expedite' => false,
        ]);
        $entry->setRelation('lotQuantity', null); // avoid a query per row

        return $this->hydrateLotFromEntry($entry, $wip);
    }

    public function simulate(array $wipRows, array $pinnedByMachine, array $pinnedWipRows, \Carbon\Carbon $targetDate): array
    {
        // Laps are collected (not echoed) so they can be shown at the very end.
        $timings = [];
        $simStart = microtime(true);
        $t = $simStart;
        $lap = function (string $label) use (&$t, &$timings) {
            $now = microtime(true);
            $timings[] = ['label' => $label, 'seconds' => $now - $t];
            $t = $now;
        };
        $finishTimings = function () use (&$timings, $simStart) {
            return [
                'laps'  => $timings,
                'total' => microtime(true) - $simStart,
            ];
        };

        $scope = \App\Services\SchedulerService::class;

        // $plan / $fakeEntryId are private on the parent -> scope-bound closures.
        $resetState = \Closure::bind(function () {
            $this->plan = [];
            $this->fakeEntryId = -1;
        }, $this, $scope);
        $readPlan = \Closure::bind(fn() => $this->plan, $this, $scope);

        $resetState();

        $dateString = $targetDate->toDateString();
        $warnings   = [];
        $stationByLot = [];

        // --- hydrate WIP lots ----------------------------------------------
        $lots = collect();
        foreach ($wipRows as $attrs) {
            $lot = $this->hydrateWipRow($attrs);
            if ($lot === null) {
                $warnings[] = "Could not hydrate lot {$attrs['Lot_Id']} — skipped.";
                continue;
            }
            $stationByLot[$lot->Lot_Id] = $attrs['Station'] ?? null;
            $lots->push($lot);
        }
        $lap('hydrate');

        // --- hydrate pinned lots -------------------------------------------
        $pinnedLots = collect();
        foreach ($pinnedByMachine as $machineId => $cfg) {
            $attrs = $pinnedWipRows[$cfg['lot_id']] ?? null;
            if ($attrs === null) {
                $warnings[] = "Pinned lot '{$cfg['lot_id']}' (machine {$machineId}) not found in the csv — skipped.";
                continue;
            }
            $lot = $this->hydrateWipRow($attrs);
            if ($lot === null) {
                $warnings[] = "Pinned lot '{$cfg['lot_id']}' could not be hydrated — skipped.";
                continue;
            }
            $stationByLot[$lot->Lot_Id] = $attrs['Station'] ?? null;
            $pinnedLots->put($machineId, $lot);
        }

        $all = $lots->concat($pinnedLots)->values();

        if ($all->isEmpty()) {
            return [
                'lots' => $lots,
                'warnings' => $warnings,
                'plan' => [],
                'pinned' => [],
                'doableByLot' => [],
                'unassigned' => collect(),
                'machineIds' => collect(),
                'stationByLot' => $stationByLot,
                'timings' => $finishTimings(),
            ];
        }

        // Reference data + package list scoped to everything in this run
        $this->preloadReferenceData($all);
        $this->preloadPackageList($all);
        $lap('preload');

        // Doable (= commit = intdiv(qty, recipe)) per lot. Same value that
        // estimateCommit() subtracts from remaining capacity.
        $doableByLot = [];
        foreach ($all as $lot) {
            $doableByLot[$lot->Lot_Id] = $this->estimateCommit($lot);
        }
        $lap('doable');

        $inferred = $this->inferAnchorStates($pinnedLots);
        // --- resolve each pinned lot's setup state --------------------------
        $pinned = [];
        foreach ($pinnedLots as $machineId => $lot) {
            // optional explicit override, otherwise let the scheduler decide
            $stateId = $pinnedByMachine[$machineId]['setup_state_id'] ?? $inferred[$machineId] ?? null;

            if ($stateId === null) {
                $warnings[] = "Pinned lot {$lot->Lot_Id} ({$lot->Part_Name}) on machine {$machineId}: "
                    . "scheduler could not infer a setup state — skipped.";
                continue;
            }

            $pinned[$machineId] = [
                'lot'      => $lot,
                'state_id' => (int) $stateId,
                'commit'   => $this->estimateCommit($lot) ?? 0,
            ];
        }
        $lap('pinned');

        // --- machines in play: candidates for the lots + pinned machines ----
        $machineIds = $this->getCandidateMachineIds($lots)
            ->merge(array_keys($pinned))
            ->unique()
            ->values();
        $lap('getCandidateMachineIds');

        $anchorStateByMachine       = $this->getAnchorStates($machineIds, $lots);
        $remainingCapacityByMachine = $this->getRemainingCapacityByMachine($machineIds, $targetDate);
        $openEntriesByMachine       = collect();
        $lap('anchor+capacity');

        $capacityByMachine = $machineIds->mapWithKeys(
            fn($id) => [$id => \App\Models\MachineCapacity::effectiveFor($id, $targetDate)?->capacity]
        )->all();
        $initialRemaining = $remainingCapacityByMachine->all();
        $pinnedCommit = [];


        $capacityByMachine = $machineIds->mapWithKeys(
            fn($id) => [$id => \App\Models\MachineCapacity::effectiveFor($id, $targetDate)?->capacity]
        )->all();
        $initialRemaining = $remainingCapacityByMachine->all();
        $pinnedCommit = [];

        // Pinned lot = the machine's current state, and it eats capacity.
        foreach ($pinned as $machineId => $p) {
            $pinnedCommit[$machineId] = $p['commit'];
            $anchorStateByMachine[$machineId] = $p['state_id'];

            if ($remainingCapacityByMachine[$machineId] !== null) {
                $remainingCapacityByMachine[$machineId] -= $p['commit'];
            }

            $openEntriesByMachine[$machineId] = collect([(object) [
                'id' => -1000 - (int) $machineId,
                'entry_type' => 'lot',
                'resulting_setup_state_id' => $p['state_id'],
            ]]);
        }
        $lap('pinned anchors');

        // --- same tier flow as rebuildForPickupArrival ----------------------
        $results = ['placed' => [], 'unassigned' => collect()];
        $tiers = $lots->groupBy(fn($lot) => $this->priorityTier($lot));
        $lap('tier grouping');

        $this->placeTierByPriority(
            $tiers->get(1, collect()),
            $openEntriesByMachine,
            $anchorStateByMachine,
            $remainingCapacityByMachine,
            $dateString,
            $results
        );
        $lap('tier1');

        $this->placeTierByPriority(
            $tiers->get(2, collect()),
            $openEntriesByMachine,
            $anchorStateByMachine,
            $remainingCapacityByMachine,
            $dateString,
            $results
        );
        $lap('tier2');

        $this->greedyPlaceTier(
            $tiers->get(3, collect()),
            $openEntriesByMachine,
            $anchorStateByMachine,
            $remainingCapacityByMachine,
            $dateString,
            $results
        );
        $lap('tier3');

        $capacityReport = [];
        foreach ($machineIds as $id) {
            $cap = $capacityByMachine[$id] ?? null;
            if ($cap === null) {
                $capacityReport[$id] = null;
                continue;
            }
            $initial = $initialRemaining[$id];
            $pinnedC = $pinnedCommit[$id] ?? 0;
            $final   = $remainingCapacityByMachine[$id];

            $capacityReport[$id] = [
                'capacity'     => $cap,
                'db_committed' => $cap - $initial,            // already on the machine today (DB)
                'pinned'       => $pinnedC,
                'planned'      => ($initial - $pinnedC) - $final,  // newly placed by this run
                'remaining'    => $final,
            ];
        }
        $lap('capacity report');

        $capacityReport = [];
        foreach ($machineIds as $id) {
            $cap = $capacityByMachine[$id] ?? null;
            if ($cap === null) {
                $capacityReport[$id] = null;
                continue;
            }
            $initial = $initialRemaining[$id];
            $pinnedC = $pinnedCommit[$id] ?? 0;
            $final   = $remainingCapacityByMachine[$id];

            $capacityReport[$id] = [
                'capacity'     => $cap,
                'db_committed' => $cap - $initial,            // already on the machine today (DB)
                'pinned'       => $pinnedC,
                'planned'      => ($initial - $pinnedC) - $final,  // newly placed by this run
                'remaining'    => $final,
            ];
        }

        // --- same final sort as production (pinned lots aren't in the plan) --
        $plan = $readPlan();
        foreach ($plan as $machineId => $rows) {
            foreach ($rows as $i => &$row) {
                if ($row['type'] === 'lot') {
                    $row['sort']['seq'] = $i;
                }
            }
            unset($row);

            $plan[$machineId] = \App\Services\LotPrioritySorter::sortSegments(
                collect($rows),
                fn($r) => $r['type'] === 'block'
            )->all();
        }
        $lap('final sort');

        return [
            'lots'         => $lots,
            'warnings'     => $warnings,
            'plan'         => $plan,
            'pinned'       => $pinned,
            'capacity'     => $capacityReport,
            'unassigned'   => $results['unassigned'],
            'doableByLot'  => $doableByLot,
            'machineIds'   => $machineIds,
            'stationByLot' => $stationByLot,
            'tierCounts'   => [1 => $tiers->get(1, collect())->count(), 2 => $tiers->get(2, collect())->count(), 3 => $tiers->get(3, collect())->count()],
            'timings'      => $finishTimings(),
        ];
    }
};

// ---------------------------------------------------------------------
// RUN
// ---------------------------------------------------------------------

$output = '';
$log = function (string $line = '') use (&$output) {
    $output .= $line . "\n";
    echo $line . "\n";
};

$csvReadStart = microtime(true);
$csv = $readWipCsv($csvPath, array_values(array_filter(array_map(fn($p) => $p['lot_id'] ?? null, $pinned))));
$csvReadSeconds = microtime(true) - $csvReadStart;

$log("CSV: {$csvPath}");
$log("Read " . count($csv['rows']) . " WIP lot(s) to schedule"
    . " (skipped by station: {$csv['skipped_station']}, by package: {$csv['skipped_package']})");
$log("Pinned machines: " . (empty($pinned) ? '(none)' : implode(', ', array_keys($pinned))));
$log("Target date: " . $targetDate->toDateString());
$log();

// Hard no-write guarantee: roll back whatever happens
\DB::beginTransaction();
try {
    $r = $sim->simulate($csv['rows'], $pinned, $csv['pinned_rows'], $targetDate);
} finally {
    \DB::rollBack();
}

foreach ($r['warnings'] as $w) {
    $log("WARNING: {$w}");
}
if (!empty($r['warnings'])) {
    $log();
}

if (isset($r['tierCounts'])) {
    $log("Tiers: expedite={$r['tierCounts'][1]}, aboveCT={$r['tierCounts'][2]}, other={$r['tierCounts'][3]}");
}
$log("Machines in play: " . $r['machineIds']->implode(', '));
$log();

// machine_id => machine_num (name) from qdn_db.machine_list
$machineNames = [];
try {
    $machineNames = \DB::connection('qdn_db')
        ->table('machine_list')
        ->whereIn($machineIdColumn, $r['machineIds']->all())
        ->pluck('machine_num', $machineIdColumn)
        ->all();
} catch (\Throwable $e) {
    $log("WARNING: could not load machine names from qdn_db.machine_list: " . $e->getMessage());
}
$machineLabel = fn($id) => isset($machineNames[$id]) ? "{$machineNames[$id]} (id {$id})" : "id {$id}";

// ---------------------------------------------------------------------
// SEQUENCE BY MACHINE
// ---------------------------------------------------------------------

$log(str_repeat('=', 60));
$log('SEQUENCE BY MACHINE');
$log(str_repeat('=', 60));

$lotsById = $r['lots']->keyBy('Lot_Id');
foreach ($r['pinned'] as $p) {
    $lotsById[$p['lot']->Lot_Id] = $p['lot'];
}

$cols = [
    '#',
    'Part_Name',
    'Lead_Count',
    'Package_Name',
    'Lot_Id',
    'Station',
    'Qty',
    'Doable',
    'Lot_Type',
    'Focus_Group',
    'Entry_Days',
    'CT',
    'Ramp_Time',
    'Body_Size'
];
$rightAligned = ['Lead_Count', 'Qty', 'Doable', 'Entry_Days', 'CT'];
$cell = fn($v) => ($v === null || $v === '') ? '-' : (is_float($v) ? (string) round($v, 2) : (string) $v);

$placedTotal = 0;
$machinesToShow = collect(array_keys($r['plan']))->merge(array_keys($r['pinned']))->unique()->sort()->values();

// pass 1: build rows so column widths are shared across ALL machines
$blocks = [];
$widths = array_map('strlen', $cols);
$track = function (array $cells) use (&$widths, $cell) {
    foreach ($cells as $i => $v) {
        $widths[$i] = max($widths[$i], strlen($cell($v)));
    }
};

$doableTotals = [];
foreach ($machinesToShow as $machineId) {
    $items = [];
    $doableTotals[$machineId] = ['pinned' => 0, 'planned' => 0];

    if (isset($r['pinned'][$machineId])) {
        $lot = $r['pinned'][$machineId]['lot'];
        $cells = [
            'PIN',
            $lot->Part_Name,
            $lot->Lead_Count,
            $lot->Package_Name,
            $lot->Lot_Id,
            $r['stationByLot'][$lot->Lot_Id] ?? null,
            $lot->Qty,
            $r['doableByLot'][$lot->Lot_Id] ?? null,
            $lot->Lot_Type,
            $lot->Focus_Group,
            $lot->Lot_Entry_Time_Days ?? null,
            $lot->CT ?? null,
            $lot->Ramp_Time,
            $lot->Body_Size
        ];
        $track($cells);
        $doableTotals[$machineId]['pinned'] += $r['doableByLot'][$lot->Lot_Id] ?? 0;
        $items[] = ['cells' => $cells, 'suffix' => ''];
    }

    $n = 0;
    foreach ($r['plan'][$machineId] ?? [] as $row) {
        if ($row['type'] === 'block') {
            $items[] = ['text' => sprintf("[BLOCK] %s (%dmin)", $row['label'], $row['duration'])];
            continue;
        }

        $n++;
        $placedTotal++;
        $lot = $lotsById[$row['lot_id']] ?? null;

        $cells = [
            $n . '.',
            $row['part_name'],
            $lot->Lead_Count ?? null,
            $row['package_name'],
            $row['lot_id'],
            $r['stationByLot'][$row['lot_id']] ?? null,
            $row['qty'],
            $r['doableByLot'][$row['lot_id']] ?? null,
            $lot->Lot_Type ?? null,
            $lot->Focus_Group ?? null,
            $row['sort']['entry_days'] ?? null,
            $row['sort']['ct'] ?? null,
            $lot->Ramp_Time ?? null,
            $lot->Body_Size ?? null,
        ];
        $track($cells);
        $doableTotals[$machineId]['planned'] += $r['doableByLot'][$row['lot_id']] ?? 0;

        $tags = '';
        if ($row['is_manual_expedite'])                          $tags .= '  [EXPEDITE]';
        if ($row['sort']['cycle_time_exceed'] ?? false)          $tags .= '  [>CT]';
        if ($row['sort']['cycle_time_exceed_residual'] ?? false) $tags .= '  [RES>CT]';
        if ($row['sort']['is_res'] ?? false)                     $tags .= '  [RES]';

        $items[] = ['cells' => $cells, 'suffix' => $tags];
    }

    $blocks[$machineId] = $items;
}

$pad = function (array $cells) use ($cols, $rightAligned, &$widths, $cell) {
    $out = [];
    foreach ($cells as $i => $v) {
        $out[] = in_array($cols[$i], $rightAligned, true)
            ? str_pad($cell($v), $widths[$i], ' ', STR_PAD_LEFT)
            : str_pad($cell($v), $widths[$i]);
    }
    return '  ' . rtrim(implode('  ', $out));
};

$capLine = function ($id) use ($r) {
    $c = $r['capacity'][$id] ?? null;
    if ($c === null) {
        return 'Capacity: n/a (no capacity row for this date)';
    }
    $used = $c['capacity'] - $c['remaining'];
    $pct  = $c['capacity'] > 0 ? round($used / $c['capacity'] * 100, 1) : 0;
    return sprintf(
        'Capacity: %d used of %d (%s%%) | DB committed %d, pinned %d, newly planned %d, remaining %d',
        $used,
        $c['capacity'],
        $pct,
        $c['db_committed'],
        $c['pinned'],
        $c['planned'],
        $c['remaining']
    );
};

// pass 2: print
foreach ($blocks as $machineId => $items) {
    $log("Machine " . $machineLabel($machineId) . ":");
    $log("  " . $capLine($machineId));
    $log($pad($cols));
    foreach ($items as $item) {
        $log(isset($item['text']) ? '  ' . $item['text'] : $pad($item['cells']) . $item['suffix']);
    }

    $dt  = $doableTotals[$machineId];
    $cap = $r['capacity'][$machineId] ?? null;
    $line = sprintf(
        '  Doable total: %d (pinned %d + planned %d)',
        $dt['pinned'] + $dt['planned'],
        $dt['pinned'],
        $dt['planned']
    );
    if ($cap !== null) {
        $line .= sprintf(
            ' | + DB committed %d = %d / %d capacity',
            $cap['db_committed'],
            $dt['pinned'] + $dt['planned'] + $cap['db_committed'],
            $cap['capacity']
        );
        if ($dt['pinned'] !== $cap['pinned'] || $dt['planned'] !== $cap['planned']) {
            $line .= '  [MISMATCH vs capacity report]';
        }
    }
    $log($line);
    $log();
}

// ---------------------------------------------------------------------
// SUMMARY
// ---------------------------------------------------------------------

$log(str_repeat('=', 60));
$log("SUMMARY: placed {$placedTotal} / " . $r['lots']->count()
    . " WIP lot(s); unassigned " . $r['unassigned']->count());

$log(str_repeat('=', 60));
$log('CAPACITY BY MACHINE (commit units)');
$log(str_repeat('=', 60));
$log(sprintf('  %-22s %9s %9s %7s %8s %9s %9s %7s', 'Machine', 'Capacity', 'DB commit', 'Pinned', 'Planned', 'Remaining', 'Used', 'Used%'));

foreach ($r['machineIds']->sort()->values() as $id) {
    $c = $r['capacity'][$id] ?? null;
    if ($c === null) {
        $log(sprintf('  %-22s %s', $machineLabel($id), 'n/a (no capacity row)'));
        continue;
    }
    $used = $c['capacity'] - $c['remaining'];
    $pct  = $c['capacity'] > 0 ? round($used / $c['capacity'] * 100, 1) : 0;
    $log(sprintf(
        '  %-22s %9d %9d %7d %8d %9d %9d %6s%%',
        $machineLabel($id),
        $c['capacity'],
        $c['db_committed'],
        $c['pinned'],
        $c['planned'],
        $c['remaining'],
        $used,
        $pct
    ));
}
$log();

if ($r['unassigned']->isNotEmpty()) {
    $log();
    $log("UNASSIGNED (no factory / no capable machine / no capacity):");
    foreach ($r['unassigned'] as $lot) {
        $log("  {$lot->Lot_Id}  {$lot->Part_Name}  pkg=" . ($lot->Package_Name ?? '-')
            . "  qty=" . ($lot->Qty ?? '-') . "  fg=" . ($lot->Focus_Group ?? '-')
            . "  ramp=" . ($lot->Ramp_Time ?? '-'));
    }
    $log();
}

// ---------------------------------------------------------------------
// TIMING (last thing printed, also saved to the text file)
// ---------------------------------------------------------------------

$totalElapsed = microtime(true) - $startTime;
$simTotal     = $r['timings']['total'];

$log(str_repeat('=', 60));
$log('TIMING');
$log(str_repeat('=', 60));
$log(sprintf('  %-28s %9s %7s', 'Step', 'Seconds', '% sim'));
foreach ($r['timings']['laps'] as $lapRow) {
    $pct = $simTotal > 0 ? ($lapRow['seconds'] / $simTotal * 100) : 0;
    $log(sprintf('  %-28s %9.3f %6.1f%%', $lapRow['label'], $lapRow['seconds'], $pct));
}
$log(str_repeat('-', 60));
$log(sprintf('  %-28s %9.3f', 'simulate() total', $simTotal));
$log(sprintf('  %-28s %9.3f', 'CSV read', $csvReadSeconds));
$log(sprintf('  %-28s %9.3f  (%.2f min)', 'Script total', $totalElapsed, $totalElapsed / 60));
$log();

// ---------------------------------------------------------------------
// WRITE FILE
// ---------------------------------------------------------------------

$csvName  = preg_replace(
    '/[^A-Za-z0-9_-]+/',
    '_',
    basename(dirname($csvPath)) . '_' . pathinfo($csvPath, PATHINFO_FILENAME)
);
$filename = "scheduler_test_{$csvName}_" . now()->format('Y-m-d_His') . '.txt';
$path = storage_path('app/' . $filename);
file_put_contents($path, $output);

echo "Test completed in " . number_format($totalElapsed, 4) . " seconds\n";
echo "Full output written to: {$path}\n";
