<?php

return [
    // CAP/HOUR = CAPACITY / cap_divisor
    'cap_divisor' => 20,

    // Tabs: TNR has sub-tabs F1/F2/F3, FVI has PL1/PL6. One hourly_sheets row per (date, type, line).
    'lines' => [
        'tnr' => ['F1', 'F2', 'F3'],
        'fvi' => ['PL1', 'PL6'],
    ],

    // A slot is the hour *ending* at that time: 0800H = 7am-8am ... 1900H = 6pm-7pm,
    // so day = "7am-7pm" and night = "7pm-7am". Both shifts belong to the same sheet date.
    'day_hours'   => range(8, 19),
    'night_hours' => array_merge(range(20, 23), range(0, 7)),

    // Columns copied when a day is opened for the first time (copied from the latest earlier sheet).
    // SET-UP, PLAN, lots, reason/action/etc. and every hourly cell start empty.
    // Remove the *_emp_* entries if employees should NOT carry over.
    'carry_over' => [
        'tnr' => ['machine', 'capacity', 'package_type', 'day_emp_id', 'day_emp_name', 'night_emp_id', 'night_emp_name'],
        'fvi' => ['day_emp_id', 'day_emp_name', 'day_designation', 'night_emp_id', 'night_emp_name', 'night_designation'],
    ],

    'employee_search_limit' => 15,
];
