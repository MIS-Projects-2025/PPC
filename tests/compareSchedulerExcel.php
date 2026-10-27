<?php
ini_set('memory_limit', '2G');   // or '-1' for unlimited
/*
|--------------------------------------------------------------------------
| Scheduler vs Excel comparison
|--------------------------------------------------------------------------
| 1. Reads the manual Excel loading plan FIRST.
|      - Block start : a cell "Item" with "Machine" right next to it. The
|                      machine name is the value right below "Machine".
|      - Block rows  : everything below, until
|            * another Item/Machine header, or
|            * 2 consecutive rows with no Lot_ID (column G).
|        SET-UP / conversion rows (Lot_ID = "SET-UP") are kept as blocks.
| 2. The FIRST LOT of every machine in the Excel becomes that machine's PIN
|    ($pinnedByNum) and is injected into tests/testScheduler.php, which is
|    then run unchanged (same $sim, $r, $blocks ... end up in this scope
|    because it is require'd).
| 3. Every Excel Lot_ID is looked up in the WIP csv and hydrated with the
|    SAME hydrateLotFromEntry() path, so both sides show the same columns.
| 4. Writes ONE xlsx: left = tester, right = excel, status in the middle.
|    Column widths = longest value in each column.
|
| Needs phpoffice/phpspreadsheet (comes with maatwebsite/excel).
| Run:  php artisan tinker tests/compareSchedulerExcel.php
*/

// ---------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------

$excelPaths = [
    storage_path('app/loading-plan/STANDARD LOADING PLAN October 12, 2026.xlsx'),
    storage_path('app/loading-plan/TRAY LOADING PLAN OCT.12,2026.xlsx'),
];
$onlySheets = [];            // e.g. ['SOIC_N']. Empty = every sheet
$ignoreSheetContains = ['Plan', 'GT', 'Summary', 'Pipeline'];
$testerScript = base_path('tests/testScheduler.php');
$notesMaxWidth = 120;        // cap for the Notes column only (values can be very long)

$isIgnoredSheet = function (string $title) use ($ignoreSheetContains): bool {
    foreach ($ignoreSheetContains as $needle) {
        if ($needle !== '' && stripos($title, $needle) !== false) {
            return true;
        }
    }
    return false;
};

// ---------------------------------------------------------------------
// PREFLIGHT (fail before the slow scheduler run)
// ---------------------------------------------------------------------

if (!class_exists(\PhpOffice\PhpSpreadsheet\IOFactory::class)) {
    throw new \RuntimeException('phpoffice/phpspreadsheet is not installed (composer require phpoffice/phpspreadsheet)');
}
foreach ($excelPaths as $p) {
    if (!is_readable($p)) {
        throw new \RuntimeException("Excel not readable: {$p}");
    }
}

// ---------------------------------------------------------------------
// 1. READ THE EXCEL (before the tester, so its first lots can be pinned)
// ---------------------------------------------------------------------

$dbMachines = [];   // UPPER(machine_num) => machine_num as stored in db
foreach (\DB::connection('qdn_db')->table('machine_list')->pluck('machine_num') as $n) {
    $n = trim((string) $n);
    if ($n !== '') {
        $dbMachines[strtoupper($n)] = $n;
    }
}

// excel name => db machine_num, for names that are ambiguous (excel -> db)
$machineAlias = [
    '12HSI' => '12HSI250',
    '02HSI' => '02HSI200',
    '04hsi' => '04HSI200',
    '06HSI' => '06HSI200',
    '08hsi' => '08HSI200',
    '10HSI' => '10HSI250',
    '11HSI' => '11HSI250',
    '13HSI' => '13HSI250',
    '18HSI' => '18HSI250',
    '21HSI' => '21HSI250',
    '23HSI' => '23HSI250',
    '25hsi' => '25HSI250',
    '29hsi' => '29HSI250',
    '31HSI' => '31HSI250',
    '32HSI' => '32HSI250',
    '35HSI' => '35HSI250',
    '11AT128' => '11AT128 ADGT',
    '09AT128' => '09AT128 ADGT',
    '10AT128' => '10AT128 ADGT',
    '07ISMECA' => '07ISMECA(ADGT)',
    '02MV853A' => '02MV853A (ADGT)',
    '03SOLAS' => '03SOLAS (ADGT)',
    '05MV853A' => '05MV853A (ADGT)',
    '08MicroV' => '08MicroV (ADGT)',
    '01MV853A' => '01MV853A (ADGT)',
    '03MV853A' => '03MV853A (ADGT)',
    '04MV853A' => '04MV853A (ADGT)',
    '04SOLAS' => '04SOLAS (ADGT)',
    '05SOLAS' => '05SOLAS (ADGT)',
];

// normalise: strip "(...)", uppercase, and drop trailing I/T on HSI400 machines
// "11AT128 (ADGT)" -> "11AT128" | "02hsi400t" / "02HSI400T" / "02hsi400" -> "02HSI400"
$norm = function (string $s): string {
    $s = strtoupper(trim(preg_replace('/\s*\(.*?\)\s*/', ' ', $s)));
    return preg_replace('/(HSI400)[IT]+$/', '$1', $s);
};

$dbByNorm = [];     // normalised => [db names...]
foreach ($dbMachines as $orig) {
    $dbByNorm[$norm($orig)][] = $orig;
}

$resolveMachine = function (string $name) use ($dbMachines, $machineAlias, $dbByNorm, $norm): ?string {
    $k = strtoupper(trim($name));
    if ($k === '') {
        return null;
    }
    if (isset($machineAlias[$k])) {
        return $dbMachines[strtoupper($machineAlias[$k])] ?? null;
    }
    if (isset($dbMachines[$k])) {                        // 1. exact (case-insensitive)
        return $dbMachines[$k];
    }

    $n = $norm($k);
    $cands = $dbByNorm[$n] ?? [];
    if (count($cands) === 1) {                           // 2. unique after normalising
        return $cands[0];
    }

    // 3. several db rows collapse to the same name (only expected for HSI400 variants)
    if (count($cands) > 1 && str_contains($n, 'HSI400')) {
        foreach ($cands as $c) {                         // prefer the plain one (no I/T suffix)
            if (strtoupper($c) === $n) {
                return $c;
            }
        }
        sort($cands);
        return $cands[0];
    }

    return null;                                         // unknown / ambiguous -> orphan
};

$readExcelPlan = function (string $path) use ($onlySheets, $resolveMachine, $isIgnoredSheet): array {
    $reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReaderForFile($path);
    $reader->setReadDataOnly(true);
    $wanted = array_values(array_filter(
        $reader->listWorksheetNames($path),
        fn($t) => !$isIgnoredSheet($t) && (empty($onlySheets) || in_array($t, $onlySheets, true))
    ));
    $reader->setLoadSheetsOnly($wanted);

    if (!empty($onlySheets)) {
        $reader->setLoadSheetsOnly($onlySheets);
    }
    $reader->setReadFilter(new class implements \PhpOffice\PhpSpreadsheet\Reader\IReadFilter {
        public function readCell(string $columnAddress, int $row, string $worksheetName = ''): bool
        {
            return \PhpOffice\PhpSpreadsheet\Cell\Coordinate::columnIndexFromString($columnAddress) <= 20; // A..T
        }
    });
    $book = $reader->load($path);

    $machines = [];  // KEY => ['name', 'sheets', 'items']
    $orphans  = [];  // blocks whose machine is blank / MANUAL / not in machine_list

    foreach ($book->getWorksheetIterator() as $ws) {
        if (!empty($onlySheets) && !in_array($ws->getTitle(), $onlySheets, true)) {
            continue;
        }
        if ($isIgnoredSheet($ws->getTitle())) {      // <-- new
            continue;
        }

        // only A..T are needed (Item col + 11 offset), avoids scanning wide sheets
        $rows = $ws->rangeToArray('A1:T' . $ws->getHighestDataRow(), null, false, false, false);
        $n = count($rows);

        $str = fn($v) => trim((string) ($v ?? ''));

        // find every "Item | Machine" header
        $headers = [];
        for ($i = 0; $i < $n; $i++) {
            for ($c = 0; $c < 18; $c++) {
                if (
                    strcasecmp($str($rows[$i][$c] ?? null), 'Item') === 0
                    && strcasecmp($str($rows[$i][$c + 1] ?? null), 'Machine') === 0
                ) {
                    $headers[] = [$i, $c];
                    break;
                }
            }
        }

        foreach ($headers as $h => [$hr, $c]) {
            $end = isset($headers[$h + 1]) ? $headers[$h + 1][0] : $n;

            // columns relative to the Item column: Machine +1, Part_Name +2, Lot_ID +5, Station +7, Accu. Time +11
            $machine = $str(($rows[$hr + 1] ?? [])[$c + 1] ?? null);
            $items = [];

            for ($i = $hr + 1; $i < $end; $i++) {
                $lotId = strtoupper(trim(str_replace("\xC2\xA0", ' ', (string) ($rows[$i][$c + 5] ?? ''))));
                $status  = $str($rows[$i][$c + 6] ?? null);
                $package = $str($rows[$i][$c + 4] ?? null);

                // totals row / blank row: all three empty -> block ends
                if ($lotId === '' && $status === '' && $package === '') {
                    break;
                }

                $isSetup = strcasecmp($lotId, 'SET-UP') === 0 || strcasecmp($status, 'SET-UP') === 0;

                // has a package or status but no Lot_Id and isn't a set-up: skip, don't stop
                if ($lotId === '' && !$isSetup) {
                    continue;
                }

                $rowMachine = $str($rows[$i][$c + 1] ?? null);
                if ($machine === '' && $rowMachine !== '') {
                    $machine = $rowMachine;
                }

                if ($isSetup) {
                    $hours = $rows[$i][$c + 11] ?? null;
                    $items[] = [
                        'type'    => 'block',
                        'label'   => $str($rows[$i][$c + 2] ?? null) ?: 'SET-UP',
                        'minutes' => is_numeric($hours) ? (int) round($hours * 60) : null,
                        'row'     => $i + 1,
                    ];
                    continue;
                }

                $station = $str($rows[$i][$c + 7] ?? null);
                $items[] = [
                    'type'    => 'lot',
                    'lot_id'  => $lotId,
                    'part'    => $str($rows[$i][$c + 2] ?? null),
                    'station' => $station,
                    'pickup'  => stripos($station, 'P/U') === 0,
                    'row'     => $i + 1,
                ];
            }

            $dbName = $resolveMachine($machine);
            $entry  = ['sheet' => $ws->getTitle(), 'header_row' => $hr + 1, 'label' => $machine, 'items' => $items];

            if ($dbName === null) {
                if (!empty($items)) {
                    $orphans[] = $entry;
                }
                continue;
            }

            $key = strtoupper($dbName);
            $machines[$key]['name'] = $dbName;      // db machine_num -> used for pins
            $machines[$key]['sheets'][$ws->getTitle()] = true;
            $machines[$key]['items'] = array_merge($machines[$key]['items'] ?? [], $items);
        }
    }

    $book->disconnectWorksheets();
    unset($book);
    return ['machines' => $machines, 'orphans' => $orphans];
};

$excel = ['machines' => [], 'orphans' => []];
foreach ($excelPaths as $p) {
    $tag  = pathinfo($p, PATHINFO_FILENAME);
    $part = $readExcelPlan($p);

    foreach ($part['machines'] as $key => $m) {
        $excel['machines'][$key]['name'] = $m['name'];
        foreach (array_keys($m['sheets']) as $s) {
            $excel['machines'][$key]['sheets']["{$tag}:{$s}"] = true;
        }
        $excel['machines'][$key]['items'] = array_merge(
            $excel['machines'][$key]['items'] ?? [],
            $m['items']
        );
    }

    foreach ($part['orphans'] as $o) {
        $o['sheet'] = "{$tag}:{$o['sheet']}";
        $excel['orphans'][] = $o;
    }
}

$excelLotIds = [];
foreach (array_merge(array_column($excel['machines'], 'items'), array_column($excel['orphans'], 'items')) as $items) {
    foreach ($items as $it) {
        if ($it['type'] === 'lot') {
            $excelLotIds[$it['lot_id']] = true;
        }
    }
}
$excelLotIds = array_keys($excelLotIds);

// ---------------------------------------------------------------------
// 2. PINS = FIRST LOT OF EVERY EXCEL MACHINE  ->  injected into the tester
// ---------------------------------------------------------------------

$pinnedByNum = [];
foreach ($excel['machines'] as $m) {
    foreach ($m['items'] as $it) {
        if ($it['type'] === 'lot') {
            $pinnedByNum[$m['name']] = $it['lot_id'];   // machine_num => lot_id
            break;                                       // first lot only
        }
    }
}

echo "Pinning the first Excel lot on " . count($pinnedByNum) . " machine(s)\n";

// ---------------------------------------------------------------------
// 3. RUN THE TESTER (defines $sim, $r, $machinesToShow, $machineNames, $lotsById, $csvPath ...)
// ---------------------------------------------------------------------

require $testerScript;

echo "\n" . str_repeat('=', 60) . "\nEXCEL COMPARISON\n" . str_repeat('=', 60) . "\n";

echo "Excel: " . count($excel['machines']) . " machine block group(s), "
    . count($excel['orphans']) . " no-machine block(s), " . count($excelLotIds) . " distinct lot id(s)\n";

// ---------------------------------------------------------------------
// 4. WIP DETAILS FOR EVERY EXCEL LOT (csv = CustomerDataWip stand-in)
// ---------------------------------------------------------------------

$wipAttrsFor = function (string $path, array $ids): array {
    $need = array_flip($ids);
    $found = [];
    $fh = fopen($path, 'r');
    $header = fgetcsv($fh, 0, ',', '"', '\\');
    $header = array_map(fn($h) => trim(preg_replace('/^\xEF\xBB\xBF/', '', (string) $h)), $header);
    $idCol = array_search('Lot_Id', $header, true);

    while (($data = fgetcsv($fh, 0, ',', '"', '\\')) !== false) {
        $id = strtoupper(trim((string) ($data[$idCol] ?? '')));
        if (!isset($need[$id]) || isset($found[$id])) {
            continue;
        }
        $data = array_pad(array_slice($data, 0, count($header)), count($header), null);
        $attrs = [];
        foreach ($header as $i => $hName) {
            $v = is_string($data[$i]) ? trim($data[$i]) : $data[$i];
            $attrs[$hName] = ($v === '') ? null : $v;
        }
        $found[$id] = $attrs;
        if (count($found) === count($need)) {
            break;
        }
    }
    fclose($fh);

    return $found;
};

$excelAttrs = $wipAttrsFor($csvPath, $excelLotIds);

// hydrate via the tester's own hydrateWipRow() + estimateCommit() ($sim methods are protected)
$describeExcelLots = \Closure::bind(function (array $attrsById) {
    $out = [];
    $lots = collect();
    foreach ($attrsById as $id => $attrs) {
        $lot = $this->hydrateWipRow($attrs);
        if ($lot === null) {
            continue;
        }
        $out[$id] = ['lot' => $lot, 'attrs' => $attrs, 'doable' => null];
        $lots->push($lot);
    }
    if ($lots->isNotEmpty()) {
        $this->preloadPackageList($lots);
        foreach ($out as $id => &$o) {
            try {
                $o['doable'] = $this->estimateCommit($o['lot']);
            } catch (\Throwable $e) {
                $o['doable'] = null;
            }
        }
        unset($o);
    }
    return $out;
}, $sim, get_class($sim));

$excelLots = $describeExcelLots($excelAttrs);

echo "Excel lots found in csv: " . count($excelAttrs) . " / " . count($excelLotIds) . "\n";

// ---------------------------------------------------------------------
// 5. NORMALISE BOTH SIDES INTO THE SAME SHAPE
// ---------------------------------------------------------------------

$cmpCols = [
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
    'Body_Size',
];
$nc = count($cmpCols);

$cellsFor = function ($label, $lot, ?array $attrs, $doable) {
    $a = fn($k) => $attrs[$k] ?? null;
    return [
        $label,
        $lot->Part_Name ?? null,
        $lot->Lead_Count ?? null,
        $lot->Package_Name ?? null,
        $lot->Lot_Id ?? null,
        $a('Station'),
        $lot->Qty ?? null,
        $doable,
        $lot->Lot_Type ?? null,
        $lot->Focus_Group ?? null,
        $lot->Lot_Entry_Time_Days ?? null,
        $a('Lot_Status'),
        $a('Stage'),
        $a('Stage_Start_Time'),
        $a('Auto_Part'),
        $a('Bake'),
        $a('Bake_Count'),
        $lot->CT ?? null,
        $lot->Ramp_Time ?? null,
        $lot->Body_Size ?? null,
    ];
};

// --- tester side: key = machine_num upper ---------------------------------
$testerSeq = [];
foreach ($machinesToShow as $machineId) {
    $key = strtoupper(trim((string) ($machineNames[$machineId] ?? "ID{$machineId}")));
    $items = [];
    $notes = [];

    if (isset($r['pinned'][$machineId])) {
        $p = $r['pinned'][$machineId];
        if ($p['lot'] !== null) {
            $lot = $p['lot'];
            $items[] = [
                'type' => 'lot',
                'lot_id' => $lot->Lot_Id,
                'pin' => true,
                'cells' => $cellsFor('PIN', $lot, $r['attrsByLot'][$lot->Lot_Id] ?? null, $r['doableByLot'][$lot->Lot_Id] ?? null),
            ];
        } else {
            $notes[] = 'PIN (state only): ' . $p['via'] . ' -> state #' . $p['state_id'];
        }
    }

    foreach ($r['plan'][$machineId] ?? [] as $row) {
        if ($row['type'] === 'block') {
            $items[] = ['type' => 'block', 'label' => $row['label'], 'minutes' => $row['duration']];
            continue;
        }
        $id = $row['lot_id'];
        $lot = $lotsById[$id] ?? (object) ['Lot_Id' => $id, 'Part_Name' => $row['part_name'], 'Package_Name' => $row['package_name'], 'Qty' => $row['qty']];
        $items[] = [
            'type' => 'lot',
            'lot_id' => $id,
            'pin' => false,
            'cells' => $cellsFor(null, $lot, $r['attrsByLot'][$id] ?? null, $r['doableByLot'][$id] ?? null),
            'tags' => trim(
                ($row['is_manual_expedite'] ? '[EXPEDITE] ' : '')
                    . (($row['sort']['cycle_time_exceed'] ?? false) ? '[>CT] ' : '')
                    . (($row['sort']['cycle_time_exceed_residual'] ?? false) ? '[RES>CT] ' : '')
                    . (($row['sort']['is_res'] ?? false) ? '[RES] ' : '')
            ),
        ];
    }

    $testerSeq[$key] = ['items' => $items, 'notes' => $notes];
}

// --- excel side -------------------------------------------------------------
$buildExcelItem = function (array $it) use ($excelLots, $cellsFor) {
    if ($it['type'] === 'block') {
        return $it;
    }
    $d = $excelLots[$it['lot_id']] ?? null;
    if ($d) {
        $cells = $cellsFor(null, $d['lot'], $d['attrs'], $d['doable']);
        $in = true;
    } else {
        // lot not in the csv: only Excel's own part name, flagged in notes
        $cells = array_fill(0, 20, null);
        $cells[1] = $it['part'] ?: null;
        $cells[4] = $it['lot_id'];
        $cells[5] = $it['station'] ?: null;
        $in = false;
    }
    return $it + ['cells' => $cells, 'in_csv' => $in];
};

$excelSeq = [];
foreach ($excel['machines'] as $key => $m) {
    $excelSeq[$key] = [
        'name'   => $m['name'],
        'sheets' => implode(', ', array_keys($m['sheets'])),
        'items'  => array_map($buildExcelItem, $m['items']),
    ];
}

// items -> slots: each lot owns the block rows right before it
$toSlots = function (array $items): array {
    $slots = [];
    $pre = [];
    foreach ($items as $it) {
        if ($it['type'] === 'block') {
            $pre[] = $it;
            continue;
        }
        $slots[] = ['pre' => $pre, 'lot' => $it];
        $pre = [];
    }
    return [$slots, $pre]; // $pre = trailing blocks after the last lot
};

// where is every lot on each side (first occurrence)?
$testerPos = [];
foreach ($testerSeq as $key => $seq) {
    [$slots] = $toSlots($seq['items']);
    foreach ($slots as $i => $s) {
        $testerPos[strtoupper($s['lot']['lot_id'])] ??= [$key, $i + 1];
    }
}
$excelPos = [];
foreach ($excelSeq as $key => $seq) {
    [$slots] = $toSlots($seq['items']);
    foreach ($slots as $i => $s) {
        $excelPos[$s['lot']['lot_id']] ??= [$key, $i + 1];
    }
}
foreach ($excel['orphans'] as $o) {
    foreach ($o['items'] as $it) {
        if ($it['type'] === 'lot') {
            $excelPos[$it['lot_id']] ??= ['(' . $o['sheet'] . ': ' . ($o['label'] ?: 'no machine') . ')', null];
        }
    }
}

$unassignedReason = [];
foreach ($r['unassigned'] as $lot) {
    $unassignedReason[$lot->Lot_Id] = $lot->unassigned_reason ?? 'unknown';
}

// why did the tester not put an excel lot on a machine?
$whyNotPlaced = function (string $id) use ($unassignedReason, $r, $excelAttrs) {
    if (isset($unassignedReason[$id])) {
        return "tester left it unassigned ({$unassignedReason[$id]})";
    }
    if (!isset($excelAttrs[$id])) {
        return 'lot id not found in the WIP csv';
    }
    if (!isset($r['attrsByLot'][$id])) {
        return 'in csv but not in the tester pool (station/package filter or $limit)';
    }
    return 'in tester pool but not planned (pinned elsewhere or unknown)';
};

$where = fn($pos) => $pos === null ? '-' : ($pos[1] === null ? $pos[0] : "{$pos[0]} #{$pos[1]}");

// ---------------------------------------------------------------------
// 6. BUILD THE ROWS
// ---------------------------------------------------------------------

$machineKeys = array_values(array_unique(array_merge(array_keys($testerSeq), array_keys($excelSeq))));
natsort($machineKeys);

$out = [];        // rows for the Comparison sheet
$summary = [];    // rows for the Summary sheet
$tot = ['same' => 0, 'lots_t' => 0, 'lots_e' => 0];

foreach ($machineKeys as $key) {
    $T = $testerSeq[$key]['items'] ?? [];
    $E = $excelSeq[$key]['items'] ?? [];
    [$tSlots, $tTrail] = $toSlots($T);
    [$eSlots, $eTrail] = $toSlots($E);

    $nT = count($tSlots);
    $nE = count($eSlots);
    $K = max($nT, $nE);

    $same = 0;
    $eIds = array_column(array_column($eSlots, 'lot'), 'lot_id');
    $tIds = array_column(array_column($tSlots, 'lot'), 'lot_id');
    $sameSet = count(array_intersect($tIds, $eIds));
    $eSet = array_flip($eIds);   // lot ids Excel has on THIS machine
    $tSet = array_flip($tIds);   // lot ids the tester has on THIS machine
    $rel = function (string $id, array $otherSet, array $otherPos): string {
        if (isset($otherSet[$id])) return 'same';           // same machine, other row
        if (isset($otherPos[$id])) return 'other';          // on another machine
        return 'none';                                      // not in the other plan at all
    };

    $bannerIdx = count($out);
    $out[] = ['kind' => 'banner', 'machine' => $key, 'text' => ''];   // text filled after counting

    foreach ($testerSeq[$key]['notes'] ?? [] as $note) {
        $out[] = ['kind' => 'note', 'machine' => $key, 'text' => $note];
    }

    $blockText = fn($b) => $b === null ? null : sprintf('[BLOCK] %s (%smin)', $b['label'], $b['minutes'] ?? '?');

    for ($i = 0; $i < $K; $i++) {
        $ts = $tSlots[$i] ?? null;
        $es = $eSlots[$i] ?? null;

        // blocks sitting before this lot, paired side by side
        $tp = $ts['pre'] ?? [];
        $ep = $es['pre'] ?? [];
        $bn = max(count($tp), count($ep));
        for ($b = 0; $b < $bn; $b++) {
            $out[] = [
                'kind' => 'block',
                'machine' => $key,
                'left' => $blockText($tp[$b] ?? null),
                'right' => $blockText($ep[$b] ?? null),
                'note' => isset($ep[$b]['row']) ? 'excel row ' . $ep[$b]['row'] : '',
            ];
        }

        $L = $ts['lot'] ?? null;
        $X = $es['lot'] ?? null;

        $notes = [];
        if ($L && $X) {
            if ($L['lot_id'] === $X['lot_id']) {
                $status = 'MATCH';
            } else {
                $rl = $rel($L['lot_id'], $eSet, $excelPos);    // where does Excel have the tester's lot?
                $rx = $rel($X['lot_id'], $tSet, $testerPos);   // where does the tester have Excel's lot?
                if ($rl === 'other' || $rx === 'other') {
                    $status = 'DIFF OTHER MACHINE';
                } elseif ($rl === 'same' || $rx === 'same') {
                    $status = 'DIFF SAME MACHINE';
                } else {
                    $status = 'DIFF';
                }
            }
        } elseif ($L) {
            $status = 'TESTER ONLY';
        } else {
            $status = 'EXCEL ONLY';
        }

        if ($L && (!$X || $L['lot_id'] !== $X['lot_id'])) {
            $p = $excelPos[strtoupper($L['lot_id'])] ?? null;
            $notes[] = "tester lot {$L['lot_id']}: " . ($p ? "excel has it at " . $where($p) : 'not in excel plan');
        }
        if ($X && (!$L || $L['lot_id'] !== $X['lot_id'])) {
            $p = $testerPos[$X['lot_id']] ?? null;
            $notes[] = "excel lot {$X['lot_id']}: " . ($p ? "tester has it at " . $where($p) : $whyNotPlaced($X['lot_id']));
        }
        if ($X) {
            if (!($X['in_csv'] ?? true)) {
                $notes[] = 'excel lot not in WIP csv (only excel values shown)';
            }
            if ($X['pickup'] ?? false) {
                $notes[] = 'excel P/U row';
            }
            $notes[] = 'excel row ' . $X['row'];
        }
        if ($L && !empty($L['tags'])) {
            $notes[] = 'tester ' . $L['tags'];
        }

        if ($status === 'MATCH') {
            $same++;
        }

        $lc = $L['cells'] ?? null;
        $xc = $X['cells'] ?? null;
        if ($lc) {
            $lc[0] = ($L['pin'] ?? false) ? 'PIN' : ($i + 1);
        }
        if ($xc) {
            $xc[0] = $i + 1;
        }

        $out[] = ['kind' => 'lot', 'machine' => $key, 'left' => $lc, 'right' => $xc, 'status' => $status, 'note' => implode(' | ', $notes)];
    }

    for ($b = 0, $tn = max(count($tTrail), count($eTrail)); $b < $tn; $b++) {
        $out[] = [
            'kind' => 'block',
            'machine' => $key,
            'left' => $blockText($tTrail[$b] ?? null),
            'right' => $blockText($eTrail[$b] ?? null),
            'note' => 'trailing block',
        ];
    }

    $sheets = $excelSeq[$key]['sheets'] ?? '-';
    $out[$bannerIdx]['text'] = "MACHINE {$key}   |   excel sheet: {$sheets}   |   tester lots {$nT}, excel lots {$nE}, exact position {$same}, same machine {$sameSet}";
    $summary[] = [$key, $sheets, $nT, $nE, $same, $sameSet];
    $tot['same'] += $same;
    $tot['lots_t'] += $nT;
    $tot['lots_e'] += $nE;
}

// ---------------------------------------------------------------------
// 7. WRITE THE XLSX
// ---------------------------------------------------------------------

$book = new \PhpOffice\PhpSpreadsheet\Spreadsheet();
$book->getDefaultStyle()->getFont()->setName('Arial')->setSize(10);

$col = fn(int $i) => \PhpOffice\PhpSpreadsheet\Cell\Coordinate::stringFromColumnIndex($i);

// longest value per sheet/column. $measure=false for text that is meant to
// overflow across empty neighbours (banners, notes, block labels, group titles).
$maxLen = [];
$put = function ($ws, int $c, int $row, $v, bool $measure = true) use ($col, &$maxLen) {
    if ($v === null || $v === '') {
        return;
    }
    $coord = $col($c) . $row;
    if (is_int($v) || is_float($v)) {
        $v = is_float($v) ? round($v, 4) : $v;
        $ws->setCellValueExplicit($coord, $v, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_NUMERIC);
    } else {
        $ws->setCellValueExplicit($coord, (string) $v, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
    }
    if ($measure) {
        $t = $ws->getTitle();
        $maxLen[$t][$c] = max($maxLen[$t][$c] ?? 0, mb_strlen((string) $v));
    }
};

// width = longest value (+2 padding, min 8)
$applyWidths = function ($ws, int $lastCol, array $caps = []) use ($col, &$maxLen) {
    $t = $ws->getTitle();
    for ($c = 1; $c <= $lastCol; $c++) {
        $w = max(8, ($maxLen[$t][$c] ?? 0) + 2);
        if (isset($caps[$c])) {
            $w = min($w, $caps[$c]);
        }
        $ws->getColumnDimension($col($c))->setAutoSize(false)->setWidth($w);
    }
};

$fillRow = function ($ws, int $row, int $c1, int $c2, string $argb) use ($col) {
    $ws->getStyle($col($c1) . $row . ':' . $col($c2) . $row)
        ->getFill()->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)->getStartColor()->setARGB($argb);
};

// layout: A machine | B..U tester | V status | W..AP excel | AQ notes
$cT = 2;
$cS = $cT + $nc;          // status
$cE = $cS + 1;
$cN = $cE + $nc;          // notes
$lastCol = $cN;

// ---- Comparison sheet
$ws = $book->getActiveSheet();
$ws->setTitle('Comparison');

$put($ws, 1, 1, 'Machine', false);
$put($ws, $cT, 1, 'TESTER (scheduler)', false);
$put($ws, $cS, 1, 'Status', false);
$put($ws, $cE, 1, 'EXCEL (manual plan)', false);
$put($ws, $cN, 1, 'Notes', false);
$put($ws, 1, 2, 'Machine');
foreach ($cmpCols as $i => $name) {
    $put($ws, $cT + $i, 2, $name);
    $put($ws, $cE + $i, 2, $name);
}
$put($ws, $cS, 2, 'Status');
$put($ws, $cN, 2, 'Notes');
$ws->getStyle('A1:' . $col($lastCol) . '2')->getFont()->setBold(true);
$fillRow($ws, 1, 1, $lastCol, 'FFD9E1F2');
$fillRow($ws, 2, 1, $lastCol, 'FFD9E1F2');
$fillRow($ws, 1, $cT, $cT + $nc - 1, 'FFBDD7EE');
$fillRow($ws, 1, $cE, $cE + $nc - 1, 'FFC6E0B4');

$statusColor = [
    'MATCH'              => 'FFE2EFDA',  // green
    'DIFF SAME MACHINE'  => 'FFFFF2CC',  // yellow
    'DIFF OTHER MACHINE' => 'FFF8CBAD',  // orange
    'DIFF'               => 'FFD9D9D9',  // gray
    'TESTER ONLY'        => 'FFE4DFEC',  // lavender
    'EXCEL ONLY'         => 'FFE4DFEC',
];

$row = 3;
foreach ($out as $o) {
    switch ($o['kind']) {
        case 'banner':
            $put($ws, 1, $row, $o['machine']);
            $put($ws, $cT, $row, $o['text'], false);
            $ws->getStyle('A' . $row . ':' . $col($lastCol) . $row)->getFont()->setBold(true);
            $fillRow($ws, $row, 1, $lastCol, 'FFD9D9D9');
            break;

        case 'note':
            $put($ws, 1, $row, $o['machine']);
            $put($ws, $cT + 1, $row, $o['text'], false);
            $ws->getStyle($col($cT + 1) . $row)->getFont()->setItalic(true);
            break;

        case 'block':
            $put($ws, 1, $row, $o['machine']);
            $put($ws, $cT + 1, $row, $o['left'], false);
            $put($ws, $cE + 1, $row, $o['right'], false);
            $put($ws, $cN, $row, $o['note']);
            $ws->getStyle('A' . $row . ':' . $col($lastCol) . $row)->getFont()->setItalic(true)->getColor()->setARGB('FF7F7F7F');
            break;

        case 'lot':
            $put($ws, 1, $row, $o['machine']);
            foreach ($o['left'] ?? [] as $i => $v) {
                $put($ws, $cT + $i, $row, $v);
            }
            foreach ($o['right'] ?? [] as $i => $v) {
                $put($ws, $cE + $i, $row, $v);
            }
            $put($ws, $cS, $row, $o['status']);
            $put($ws, $cN, $row, $o['note']);
            $fillRow($ws, $row, $cS, $cS, $statusColor[$o['status']]);
            // highlight the Lot_Id cell on each side
            $fillRow($ws, $row, $cT + 4, $cT + 4, $statusColor[$o['status']]);
            $fillRow($ws, $row, $cE + 4, $cE + 4, $statusColor[$o['status']]);
            break;
    }
    $row++;
}

$ws->freezePane('B3');
$ws->setAutoFilter('A2:' . $col($lastCol) . ($row - 1));
$applyWidths($ws, $lastCol, [$cN => $notesMaxWidth]);

// ---- Summary sheet
$sm = $book->createSheet();
$sm->setTitle('Summary');
$head = ['Machine', 'Excel sheet', 'Tester lots', 'Excel lots', 'Exact position', 'Same machine (any position)', 'Exact position %', 'Same machine %'];
foreach ($head as $i => $h) {
    $put($sm, $i + 1, 1, $h);
}
$sm->getStyle('A1:H1')->getFont()->setBold(true);
$fillRow($sm, 1, 1, 8, 'FFD9E1F2');

$pct = fn($num, $r) => "=IF(MAX(C{$r},D{$r})=0,\"\",{$num}{$r}/MAX(C{$r},D{$r}))";

$sr = 2;
foreach ($summary as [$key, $sheets, $nT, $nE, $same, $sameSet]) {
    $put($sm, 1, $sr, $key);
    $put($sm, 2, $sr, $sheets);
    $sm->setCellValue("C{$sr}", $nT);
    $sm->setCellValue("D{$sr}", $nE);
    $sm->setCellValue("E{$sr}", $same);
    $sm->setCellValue("F{$sr}", $sameSet);
    $sm->setCellValue("G{$sr}", $pct('E', $sr));   // exact position %
    $sm->setCellValue("H{$sr}", $pct('F', $sr));   // same machine, any position %
    $sr++;
}
$last = $sr - 1;
$sm->setCellValue("A{$sr}", 'TOTAL');
foreach (['C', 'D', 'E', 'F'] as $cl) {
    $sm->setCellValue("{$cl}{$sr}", "=SUM({$cl}2:{$cl}{$last})");
}
$sm->setCellValue("G{$sr}", $pct('E', $sr));
$sm->setCellValue("H{$sr}", $pct('F', $sr));
$sm->getStyle("A{$sr}:H{$sr}")->getFont()->setBold(true);
$sm->getStyle("G2:H{$sr}")->getNumberFormat()->setFormatCode('0.0%');
$sm->freezePane('A2');
$applyWidths($sm, 8);

// ---- Excel blocks that are not a real machine (blank / MANUAL / For Bake ...)
$or = $book->createSheet();
$or->setTitle('Excel no machine');
$head = ['Excel sheet', 'Header row', 'Block label', 'Excel row', 'Lot_Id', 'Part_Name (excel)', 'Station (excel)', 'Tester result'];
foreach ($head as $i => $h) {
    $put($or, $i + 1, 1, $h);
}
$or->getStyle('A1:H1')->getFont()->setBold(true);
$fillRow($or, 1, 1, 8, 'FFD9E1F2');
$orr = 2;
foreach ($excel['orphans'] as $o) {
    foreach ($o['items'] as $it) {
        if ($it['type'] !== 'lot') {
            continue;
        }
        $id = $it['lot_id'];
        $put($or, 1, $orr, $o['sheet']);
        $put($or, 2, $orr, $o['header_row']);
        $put($or, 3, $orr, $o['label'] ?: '(blank)');
        $put($or, 4, $orr, $it['row']);
        $put($or, 5, $orr, $id);
        $put($or, 6, $orr, $it['part']);
        $put($or, 7, $orr, $it['station']);
        $put($or, 8, $orr, isset($testerPos[$id]) ? 'planned on ' . $where($testerPos[$id]) : $whyNotPlaced($id));
        $orr++;
    }
}
$or->freezePane('A2');
$applyWidths($or, 8);

$book->setActiveSheetIndex(0);

$outPath = storage_path('app/scheduler_vs_excel_' . now()->format('Y-m-d_His') . '.xlsx');
(new \PhpOffice\PhpSpreadsheet\Writer\Xlsx($book))->save($outPath);

echo "Machines compared: " . count($machineKeys)
    . " | lots same position: {$tot['same']} / tester {$tot['lots_t']} / excel {$tot['lots_e']}\n";
echo "Comparison written to: {$outPath}\n";
