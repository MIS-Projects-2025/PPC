<?php

return [
    // real = query bms_db | fake = mocked lots (never honoured in production) | off = no badges
    'driver' => env('BAKE_DRIVER', 'real'),

    'fake_ratio'      => 0.10,
    'fake_oven_count' => 6,

    // after a failed connection/query, skip bms_db for this many seconds
    'retry_after' => 60,
];
