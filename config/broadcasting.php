<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Broadcaster
    |--------------------------------------------------------------------------
    |
    | We default to 'reverb' since you are using Laravel's first-party 
    | WebSocket server. Ensure BROADCAST_CONNECTION=reverb in your .env.
    |
    */

    'default' => env('BROADCAST_CONNECTION', 'reverb'),

    /*
    |--------------------------------------------------------------------------
    | Broadcast Connections
    |--------------------------------------------------------------------------
    */

    'connections' => [

        'reverb' => [
            'driver' => 'reverb',
            'key' => env('REVERB_APP_KEY'),
            'secret' => env('REVERB_APP_SECRET'),
            'app_id' => env('REVERB_APP_ID'),
            'options' => [
                'host' => env('REVERB_HOST'),
                'port' => env('REVERB_PORT', 443),
                'scheme' => env('REVERB_SCHEME', 'https'),
                'useTLS' => env('REVERB_SCHEME', 'https') === 'https',
            ],
            'client_options' => [
                // Set to false if you are using self-signed certificates in local XAMPP
                'verify' => false,
                // 'verify' => env('REVERB_VERIFY_PEER', true),
            ],
        ],

        // Kept for local testing/debugging without a server
        'log' => [
            'driver' => 'log',
        ],

        // Kept for disabling broadcasting entirely
        'null' => [
            'driver' => 'null',
        ],

    ],

];
