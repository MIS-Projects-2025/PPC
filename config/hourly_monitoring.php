<?php

return [
    // CAP/HOUR = CAPACITY / cap_divisor
    'cap_divisor' => 20,

    // Main tabs and their sub-tabs. One hourly_sheets row per (date, type, line).
    // The first word of a line is its "family" (F1, F2, F3, PL1...): the summary adds STD + TRAY of a family together.
    'lines' => [
        'tnr'    => ['F1 STD', 'F2 STD', 'F3 STD', 'F1 TRAY', 'F2 TRAY', 'F3 TRAY'],
        'fvi'    => ['PL1', 'PL6'],
        'boxing' => ['F1', 'F2', 'F3'],
    ],

    // Pickup tab: read-only, fed by the existing pickup tables, so it is NOT in 'lines' (no hourly_sheets row is created for it).
    // F1 / F2 lots come from ppc_pickupdb (factory = package_list.areas of the lot's part name), F3 lots from process_travelers.
    'pickup' => [
        'lines' => ['F1', 'F2', 'F3'],
    ],

    // Order of the groups in the Summary tab (Pickup sits between Tape and Reel and FVI Outs).
    'summary_order' => ['pickup', 'tnr', 'fvi', 'boxing'],

    // Pale colors for the F1 / F2 / F3 tabs and summary headers (keyed by family).
    'line_colors' => [
        'F1' => '#D5EFD3', // pale green
        'F2' => '#FFF3B8', // pale yellow
        'F3' => '#D3E6F8', // pale blue
    ],

    // A slot is the hour *ending* at that time: 0800H = 7am-8am ... 1900H = 6pm-7pm,
    // so day = "7am-7pm" and night = "7pm-7am". Both shifts belong to the same sheet date.
    'day_hours'   => range(8, 19),
    'night_hours' => array_merge(range(20, 23), range(0, 7)),

    // Columns copied when a day is opened for the first time (copied from the latest earlier sheet).
    // SET-UP, PLAN, lots, reason/action/etc. and every hourly cell start empty.
    // Remove the *_emp_* entries if employees should NOT carry over.
    'carry_over' => [
        'tnr'    => ['machine', 'capacity', 'package_type', 'day_emp_id', 'day_emp_name', 'night_emp_id', 'night_emp_name'],
        'fvi'    => ['day_emp_id', 'day_emp_name', 'day_designation', 'night_emp_id', 'night_emp_name', 'night_designation'],
        'boxing' => ['shift', 'emp_id', 'emp_name'],
    ],

    'employee_search_limit' => 15,
];
