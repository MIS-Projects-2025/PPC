<?php

// tests/Feature/LoadingPlan/DebugConnectionTest.php
namespace Tests\Feature\LoadingPlan;

use Tests\TestCase;

class DebugConnectionTest extends TestCase
{
    public function test_dump_qdn_connection_config(): void
    {
        dump(config('database.connections.qdn_db'));
        dump(env('QDN_DB_CONNECTION'));
    }
}
