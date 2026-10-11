<?php

/*
|--------------------------------------------------------------------------
| Scheduler dry-run tester (no DB writes) — WIP edition
|--------------------------------------------------------------------------
| Each CSV row is treated as a real WIP lot (CustomerDataWip). It is run
| through the SAME hydrateLotFromEntry() the production rebuild uses.
|
| Then it mirrors rebuildForPickupArrival(): tier 1/2 fixed CT order,
| tier 3 greedy-cheapest-next, LotPrioritySorter per machine. Stops BEFORE
| bulkPlacePlan. Whole run is wrapped in a transaction that is rolled back.
|
| PINS (max one per machine) are plain entries in $pinnedByNum:
|
|   'MACHINE_NUM' => 'LOT_ID'
|       Lot is looked up in the csv. State is inferred from that lot
|       (same inferStateFromLot() production uses). Pinned lot eats capacity.
|
|   'MACHINE_NUM' => [package_name, lead_count, factory, body_size, process_type]
|       Positional, every slot nullable (null = don't filter on it).
|       Picks the first best machine_setup_state of THAT machine that matches
|       (most constrained state wins, same rule as inferStateFromLot()).
|       No lot, so it eats no capacity. process_type: taping | tubing | tray
|       (a raw Ramp_Time like 'REEL13' also works).
|
| Run:  php artisan tinker tests/testScheduler.php
*/

// ---------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------

$targetDate = \Carbon\Carbon::parse('2026-09-01');
$csvPath    = storage_path('app/ftproot/2026-10-07_08-30-01/daily_backend_wip.csv');

$limit = null;   // max lots to schedule from the csv. null = all (slow!)

// Only keep these packages. Empty array = no package filter.
$allowedPackages = [
    // 'SOIC_N',
];

$pinnedByNum = [
    // --- by lot id ---
    // '02AT468'  => 'G166101.5',
    // '01SRM'    => 'BD29570.4',
    // '21AT128'  => 'BB53407.5',
    // '25AT128'  => 'BD28898.2',
    // '42G6L'    => 'BB53275.8',
    // '33G6L'    => 'BD29507.2',
    // '47G6L'    => 'BD29011.3',
    // '51AT28'   => 'G165619.17',
    // '45AT28'   => 'G165887.11',
    // '48AT28'   => 'BD29158.3',
    // '05MV853A' => 'BD27879.2',
    // '04MV853A' => 'BB53610.5',
    // '29G6L'    => 'BD29198.3',
    // '41G6L'    => 'BD29189.2',
    // '07HSI'    => 'BD29592.3',
    // '33HSI250' => 'BD29581.3',
    // '58AT28'   => 'BD29445.2',
    // '14HSI'    => 'BD29665.3',
    // '12HSI'    => 'BB53424.4',
    // '20G6L'    => 'BD28580.3',
    // '24G6L'    => 'BD27972.5',
    // '26G6L'    => 'BD27972.3',
    // '27G6L'    => 'BD28209.3',
    // '28G6L'    => 'BD27679.2',
    // '40G6L'    => 'BD28935.2',
    // '43G6L'    => 'BD29404.3',
    // '45G6L'    => 'BD28471.2',
    // '62G6L'    => 'BD29491.4',
    // '58G6L'    => 'BD28716.2',
    // '04G6L'    => 'BD29302.1',
    // '05G6L'    => 'BC46812.8',
    // '07G6L'    => 'BD28475.1',
    // '12G6L'    => 'BD29408.3',
    // '21G6L'    => 'BD29257.7',
    // '22G6L'    => 'BB53507.3',
    // '38G6L'    => 'BD28354.1',
    // '39G6L'    => 'BD29498.2',
    // '57G6L'    => 'BD24497.2',
    // '06G6L'    => 'SM55522.1',
    // '02G6L'    => 'BD29509.3',
    // '34G6L'    => 'BD29643.2',
    // '29AT128'  => 'BD29460.3',
    // '04STI'    => 'BD28688.1',
    // '01VITROX' => 'BD28052.2',
    // '07HSI400T' => 'BD28165.1',
    // '27AT28'   => 'G165886.6',
    // '29AT28'   => 'BD29409.2',
    // '44AT28'   => 'BD29371.2',
    // '34AT28'   => 'BD29244.2',
    // '52AT28'   => 'BB53668.4',
    // '30G6L'    => 'BD29448.2',
    // '51G6L'    => 'BD28915.2',
    // 'AT128040' => 'BD18764.3',
    // '08G6L'    => 'BB50148.5',
    // '09G6L'    => 'BD29040.3',
    // '36G6L'    => 'BD29040.2',
    // '15AT128'  => 'BD29341.2',
    // '10AT128'  => 'BD29341.4',
    // '53G6L'    => 'BD29236.2',
    // '32G6L'    => 'BB50710.5',
    // '31G6L'    => 'BD29365.4',
    // '50G6L'    => 'BD29577.3',
    // '01MV853A' => 'BD28708.2',
    // '11AT128'  => 'BC94240.2',
    // '49G6L'    => 'BD28916.2',
    // '44G6L'    => 'BD29100.2',
    // '48G6L'    => 'G160102.27',
    // '24HEXA'   => 'BD28880.1',
    // '66VITROX' => ["LFCSP_SS", 32, 'F1', null, 'taping'],


    // --- by state spec: [package_name, lead_count, factory, body_size, process_type] ---
    // 'XXXXX' => ['SOIC_N', 8, null, '5X4', 'taping'],
    // 'YYYYY' => [null, null, 'FACTORY_NAME', null, null],
];

// Same station rules as scopeLoadingPlanStations + scopeExcludingPostTnr
$allowedStations = array_map('strtoupper', config('wip.tape_reel_stations'));
$postTnrStations = ['GTTFVI_T', 'GTTOQA_T', 'GTTBOX_T'];

$machineIdColumn = 'id';   // PK column of qdn_db.machine_list

// machine_num -> machine_id, normalised into $pins:
//   machine_id => ['lot_id' => string|null, 'spec' => array|null]
$pins = [];
if (!empty($pinnedByNum)) {
    $idByNum = [];
    $found = \DB::connection('qdn_db')->table('machine_list')
        ->whereIn('machine_num', array_keys($pinnedByNum))
        ->pluck($machineIdColumn, 'machine_num');
    foreach ($found as $num => $id) {
        $idByNum[strtoupper(trim($num))] = $id;
    }

    foreach ($pinnedByNum as $num => $def) {
        $key = strtoupper(trim($num));
        if (!isset($idByNum[$key])) {
            throw new \RuntimeException("Pinned machine_num '{$num}' not found in qdn_db.machine_list");
        }

        $pins[$idByNum[$key]] = is_array($def)
            ? ['lot_id' => null, 'spec' => array_pad(array_slice(array_values($def), 0, 5), 5, null)]
            : ['lot_id' => trim((string) $def), 'spec' => null];
    }
}
$pinnedLotIds = array_values(array_filter(array_column($pins, 'lot_id')));

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
            'Lot_Status'         => $wip->Lot_Status,
            'Stage'              => $wip->Stage,
            'Stage_Start_Time'   => $wip->Stage_Start_Time,
            'Auto_Part'          => $wip->Auto_Part,
            'Bake'               => $wip->Bake,
            'Bake_Count'         => $wip->Bake_Count,
            'is_pickup'          => false,
            'is_manual_expedite' => false,
        ]);
        $entry->setRelation('lotQuantity', null); // avoid a query per row

        return $this->hydrateLotFromEntry($entry, $wip);
    }

    /**
     * Spec pin -> first best machine_setup_state of $machineId.
     * $spec = [package_name, lead_count, factory, body_size, process_type], all nullable
     * (null = no filter on that slot). Matching mirrors matchesLotCapability();
     * "best" = most constrained state, same as inferStateFromLot().
     * Override-only states (machine_capability_part_rules targets) are excluded,
     * same as the production general pool.
     */
    protected function resolveSpecState(int $machineId, array $spec, ?string &$why = null): ?\App\Models\MachineSetupState
    {
        [$pkg, $lead, $factory, $body, $proc] = $spec;

        $n = fn($v) => $v === null ? null : mb_strtolower(trim((string) $v));
        $nb = function ($v) use ($n) {
            if ($v === null) return null;
            $parts = explode('X', mb_strtoupper(trim((string) $v)));
            if (count($parts) !== 2 || !is_numeric($parts[0]) || !is_numeric($parts[1])) {
                return $n($v);
            }
            usort($parts, fn($a, $b) => (float) $a <=> (float) $b);
            return implode('X', $parts);
        };

        $lead = ($lead === null || $lead === '') ? null : (int) $lead;

        $procNorm = null;
        if ($proc !== null) {
            $procNorm = in_array($n($proc), ['taping', 'tubing', 'tray', 'both'], true)
                ? $n($proc)
                : $this->resolveRampProcessType((string) $proc);
            if ($procNorm === null) {
                $why = "unrecognised process_type '{$proc}'";
                return null;
            }
        }

        [$body2d, $thk] = $this->parseBodySize($body);
        $normPkg  = $n($pkg);
        $pkgGroup = $normPkg === null ? null : \App\Models\PackageGroupLoadingPlan::query()
            ->get()
            ->mapWithKeys(fn($r) => [$n($r->package_name) => $n($r->group_name)])
            ->get($normPkg);

        $overrideOnly = \App\Models\MachineCapabilityPartRule::query()->pluck('setup_state_id')->all();

        $states = \App\Models\MachineSetupState::query()
            ->where('machine_id', $machineId)
            ->whereNotIn('setup_state_id', $overrideOnly)
            ->get();

        if ($states->isEmpty()) {
            $why = 'machine has no (non override-only) setup states';
            return null;
        }

        $matches = $states->filter(function ($s) use ($n, $nb, $factory, $pkg, $normPkg, $pkgGroup, $body2d, $thk, $lead, $procNorm) {
            if ($factory !== null && $n($s->factory) !== $n($factory)) {
                return false;
            }
            if ($pkg !== null && $s->package_name !== null) {
                $sp = $n($s->package_name);
                if ($sp !== $normPkg && $sp !== $pkgGroup) {
                    return false;
                }
            }
            if ($body2d !== null) {
                if ($s->body_size !== null && $nb($s->body_size) !== $nb($body2d)) {
                    return false;
                }
                if ($s->thickness !== null && ($thk === null || round((float) $s->thickness, 2) !== round($thk, 2))) {
                    return false;
                }
            }
            if ($lead !== null) {
                if (
                    $s->leadcount_include !== null
                    && !in_array((string) $lead, array_map('trim', explode(',', $s->leadcount_include)), true)
                ) {
                    return false;
                }
                if ($s->leadcount_min !== null && $lead < $s->leadcount_min) {
                    return false;
                }
                if ($s->leadcount_max !== null && $lead > $s->leadcount_max) {
                    return false;
                }
                if (
                    $s->leadcount_exclude !== null
                    && in_array((string) $lead, array_map('trim', explode(',', $s->leadcount_exclude)), true)
                ) {
                    return false;
                }
            }
            if ($procNorm !== null && $n($s->process_type) !== 'both' && $n($s->process_type) !== $procNorm) {
                return false;
            }
            return true;
        });

        if ($matches->isEmpty()) {
            $why = 'no state on this machine matches the spec';
            return null;
        }

        $cols = [
            'focus_group',
            'package_name',
            'body_size',
            'thickness',
            'leadcount_include',
            'leadcount_min',
            'leadcount_max',
            'leadcount_exclude',
            'lot_type',
        ];

        return $matches
            ->sortBy([
                fn($a, $b) => collect($cols)->filter(fn($c) => $b->$c !== null)->count()
                    <=> collect($cols)->filter(fn($c) => $a->$c !== null)->count(), // most constrained first
                fn($a, $b) => $a->setup_state_id <=> $b->setup_state_id,                // deterministic tie-break
            ])
            ->first();
    }

    /** Display-only stand-in so spec pins print through the same code path as lot pins. */
    protected function standInForState(\App\Models\MachineSetupState $state, array $spec): object
    {
        return (object) [
            'Lot_Id'              => "STATE#{$state->setup_state_id}",
            'Part_Name'           => '(state pin)',
            'Lead_Count'          => $spec[1],
            'Package_Name'        => $state->package_name ?? $spec[0],
            'Qty'                 => null,
            'Lot_Type'            => $state->lot_type,
            'Focus_Group'         => $state->focus_group,
            'Lot_Entry_Time_Days' => null,
            'CT'                  => null,
            'Ramp_Time'           => $state->process_type,
            'Body_Size'           => $state->body_size ?? $spec[3],
        ];
    }

    /**
     * @param array $pins machine_id => ['lot_id' => string|null, 'spec' => array|null]
     */
    public function simulate(array $wipRows, array $pins, array $pinnedWipRows, \Carbon\Carbon $targetDate): array
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

        $readPlan = \Closure::bind(fn() => $this->plan, $this, $scope);

        $dateString = $targetDate->toDateString();
        $warnings   = [];
        $stationByLot = [];
        $attrsByLot = [];

        // --- hydrate WIP lots ----------------------------------------------
        $lots = collect();
        foreach ($wipRows as $attrs) {
            $lot = $this->hydrateWipRow($attrs);
            if ($lot === null) {
                $warnings[] = "Could not hydrate lot {$attrs['Lot_Id']} — skipped.";
                continue;
            }
            $stationByLot[$lot->Lot_Id] = $attrs['Station'] ?? null;
            $attrsByLot[$lot->Lot_Id] = $attrs;
            $lots->push($lot);
        }
        $lap('hydrate');

        // --- hydrate lot-id pins -------------------------------------------
        $pinnedLots = collect();
        foreach ($pins as $machineId => $pin) {
            if ($pin['lot_id'] === null) {
                continue;
            }
            $attrs = $pinnedWipRows[$pin['lot_id']] ?? null;
            if ($attrs === null) {
                $warnings[] = "Pinned lot '{$pin['lot_id']}' (machine {$machineId}) not found in the csv — skipped.";
                continue;
            }
            $lot = $this->hydrateWipRow($attrs);
            if ($lot === null) {
                $warnings[] = "Pinned lot '{$pin['lot_id']}' could not be hydrated — skipped.";
                continue;
            }
            $stationByLot[$lot->Lot_Id] = $attrs['Station'] ?? null;
            $attrsByLot[$lot->Lot_Id] = $attrs;
            $pinnedLots->put($machineId, $lot);
        }

        $all = $lots->concat($pinnedLots)->values();

        if ($all->isEmpty()) {
            return [
                'lots' => $lots,
                'warnings' => $warnings,
                'plan' => [],
                'pinned' => [],
                'capacity' => [],
                'doableByLot' => [],
                'unassigned' => collect(),
                'machineIds' => collect(),
                'stationByLot' => $stationByLot,
                'attrsByLot' => $attrsByLot,
                'timings' => $finishTimings(),
            ];
        }

        // Reference data + package list scoped to everything in this run
        $this->preloadReferenceData($all);
        $this->preloadPackageList($all);
        $lap('preload');

        $doableByLot = [];
        foreach ($all as $lot) {
            $doableByLot[$lot->Lot_Id] = $this->estimateCommit($lot);
        }
        $lap('doable');

        // --- resolve every pin's setup state --------------------------------
        $inferred = $this->inferAnchorStates($pinnedLots);

        $pinned = [];
        $specStates = [];

        foreach ($pinnedLots as $machineId => $lot) {
            $stateId = $inferred[$machineId] ?? null;

            if ($stateId === null) {
                $warnings[] = "Pinned lot {$lot->Lot_Id} ({$lot->Part_Name}) on machine {$machineId}: "
                    . "scheduler could not infer a setup state — skipped.";
                continue;
            }

            $pinned[$machineId] = [
                'lot'      => $lot,
                'stand_in' => null,
                'state_id' => (int) $stateId,
                'commit'   => $this->estimateCommit($lot) ?? 0,
                'via'      => "lot {$lot->Lot_Id}",
            ];
        }

        foreach ($pins as $machineId => $pin) {
            if ($pin['spec'] === null) {
                continue;
            }
            $why = null;
            $state = $this->resolveSpecState((int) $machineId, $pin['spec'], $why);
            if ($state === null) {
                $warnings[] = "Spec pin on machine {$machineId} [" . json_encode($pin['spec']) . "]: {$why} — skipped.";
                continue;
            }

            $specStates[$machineId] = $state;
            $pinned[$machineId] = [
                'lot'      => null,
                'stand_in' => $this->standInForState($state, $pin['spec']),
                'state_id' => (int) $state->setup_state_id,
                'commit'   => 0, // no lot -> no capacity used
                'via'      => 'spec ' . json_encode($pin['spec']),
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

        // Spec-pinned states may not be in the batch-scoped setup_states_by_id
        // (scoped by the lots' factories/packages). Add them AFTER getAnchorStates,
        // which can re-run preloadReferenceData() and reset $this->ref.
        if (!empty($specStates)) {
            $patchRef = \Closure::bind(function (array $states) {
                foreach ($states as $s) {
                    if (!$this->ref['setup_states_by_id']->has($s->setup_state_id)) {
                        $this->ref['setup_states_by_id']->put($s->setup_state_id, $s);
                    }
                }
            }, $this, $scope);
            $patchRef($specStates);
        }

        $capacityByMachine = $machineIds->mapWithKeys(
            fn($id) => [$id => \App\Models\MachineCapacity::effectiveFor($id, $targetDate)?->capacity]
        )->all();
        $initialRemaining = $remainingCapacityByMachine->all();
        $pinnedCommit = [];

        // Pinned = the machine's current state; lot pins also eat capacity.
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
        $tierCounts = $this->placePool(
            $lots,
            $openEntriesByMachine,
            $anchorStateByMachine,
            $remainingCapacityByMachine,
            $dateString,
            $results
        );
        $lap('placement');

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
                'db_committed' => $cap - $initial,
                'pinned'       => $pinnedC,
                'planned'      => ($initial - $pinnedC) - $final,
                'remaining'    => $final,
            ];
        }
        $lap('capacity report');

        $this->sortPlan();
        $plan = $readPlan();
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
            'tierCounts'   => $tierCounts,
            'timings'      => $finishTimings(),
            'attrsByLot'   => $attrsByLot,
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
$csv = $readWipCsv($csvPath, $pinnedLotIds);
$csvReadSeconds = microtime(true) - $csvReadStart;

$log("CSV: {$csvPath}");
$log("Read " . count($csv['rows']) . " WIP lot(s) to schedule"
    . " (skipped by station: {$csv['skipped_station']}, by package: {$csv['skipped_package']})");
$log("Pins requested: " . count($pins)
    . " (by lot " . count($pinnedLotIds) . ", by spec " . (count($pins) - count($pinnedLotIds)) . ")");
$log("Target date: " . $targetDate->toDateString());
$log();

// Hard no-write guarantee: roll back whatever happens
\DB::beginTransaction();
try {
    $r = $sim->simulate($csv['rows'], $pins, $csv['pinned_rows'], $targetDate);
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

// Which state each pin resolved to (inference is otherwise silent)
if (!empty($r['pinned'])) {
    $log('PIN RESOLUTION');
    foreach ($r['pinned'] as $machineId => $p) {
        $log("  " . $machineLabel($machineId) . " -> state #{$p['state_id']}  via {$p['via']}");
    }
    $log();
}

// ---------------------------------------------------------------------
// SEQUENCE BY MACHINE
// ---------------------------------------------------------------------

$log(str_repeat('=', 60));
$log('SEQUENCE BY MACHINE');
$log(str_repeat('=', 60));

$lotsById = $r['lots']->keyBy('Lot_Id');
foreach ($r['pinned'] as $p) {
    if ($p['lot'] !== null) {
        $lotsById[$p['lot']->Lot_Id] = $p['lot'];
    }
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
    'Lot_Status',
    'Stage',
    'Stage_Start_Time',
    'Auto_Part',
    'Bake',
    'Bake_Count',
    'CT',
    'Ramp_Time',
    'Body_Size'
];

$raw = fn($lotId, $k) => $r['attrsByLot'][$lotId][$k] ?? null;

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
        $p = $r['pinned'][$machineId];
        $lot = $p['lot'] ?? $p['stand_in']; // spec pins print via the stand-in object
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
            $raw($lot->Lot_Id, 'Lot_Status'),
            $raw($lot->Lot_Id, 'Stage'),
            $raw($lot->Lot_Id, 'Stage_Start_Time'),
            $raw($lot->Lot_Id, 'Auto_Part'),
            $raw($lot->Lot_Id, 'Bake'),
            $raw($lot->Lot_Id, 'Bake_Count'),
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
            $raw($row['lot_id'], 'Lot_Status'),
            $raw($row['lot_id'], 'Stage'),
            $raw($row['lot_id'], 'Stage_Start_Time'),
            $raw($row['lot_id'], 'Auto_Part'),
            $raw($row['lot_id'], 'Bake'),
            $raw($row['lot_id'], 'Bake_Count'),
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

$reasonLabels = [
    'bake_highlight'                => 'BAKE HIGHLIGHT (held on purpose, not scheduled)',
    'no_factory'                    => 'NO FACTORY (focus group does not resolve to a factory)',
    'no_candidate_state'            => 'NO CANDIDATE STATE (no capable machine / setup state)',
    'not_enough_remaining_capacity' => 'NOT ENOUGH REMAINING CAPACITY (capable machines are full)',
    'unknown'                       => 'UNKNOWN REASON (push site not tagged)',
];

$unassignedByReason = [];
$u = 0;
foreach ($r['unassigned'] as $lot) {
    $u++;
    $id = $lot->Lot_Id;
    $cells = [
        $u . '.',
        $lot->Part_Name ?? null,
        $lot->Lead_Count ?? null,
        $lot->Package_Name ?? null,
        $id,
        $r['stationByLot'][$id] ?? null,
        $lot->Qty ?? null,
        $r['doableByLot'][$id] ?? null,
        $lot->Lot_Type ?? null,
        $lot->Focus_Group ?? null,
        $lot->Lot_Entry_Time_Days ?? null,
        $raw($id, 'Lot_Status'),
        $raw($id, 'Stage'),
        $raw($id, 'Stage_Start_Time'),
        $raw($id, 'Auto_Part'),
        $raw($id, 'Bake'),
        $raw($id, 'Bake_Count'),
        $lot->CT ?? null,
        $lot->Ramp_Time ?? null,
        $lot->Body_Size ?? null,
    ];
    $track($cells); // widths shared across all sections

    $reason = $lot->unassigned_reason ?? 'unknown';
    if (!isset($reasonLabels[$reason])) {
        $reasonLabels[$reason] = strtoupper($reason); // future reasons still print
    }
    $unassignedByReason[$reason][] = $cells;
}

foreach ($unassignedByReason as &$rows) {
    usort(
        $rows,
        fn($a, $b) =>
        [strtoupper((string) $a[3]), (string) $a[1], (string) $a[4]]
            <=> [strtoupper((string) $b[3]), (string) $b[1], (string) $b[4]]
    );
    foreach ($rows as $i => &$cells) {
        $cells[0] = ($i + 1) . '.';
    }
    unset($cells);
}
unset($rows);

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
$reasonCounts = collect($unassignedByReason)
    ->map(fn($rows, $reason) => "{$reason} " . count($rows))
    ->implode(', ');

$log("SUMMARY: placed {$placedTotal} / " . $r['lots']->count()
    . " WIP lot(s); unassigned " . $r['unassigned']->count()
    . " ({$reasonCounts})");

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

foreach ($reasonLabels as $reason => $label) {
    if (empty($unassignedByReason[$reason])) {
        continue;
    }
    $log();
    $log("UNASSIGNED - {$label}: " . count($unassignedByReason[$reason]));
    $log($pad($cols));
    foreach ($unassignedByReason[$reason] as $cells) {
        $log($pad($cells));
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

$log('Machines with planned lots: ' . collect($r['plan'])->filter(fn($rows) => collect($rows)->contains('type', 'lot'))->count());

echo "Test completed in " . number_format($totalElapsed, 4) . " seconds\n";
echo "Full output written to: {$path}\n";
