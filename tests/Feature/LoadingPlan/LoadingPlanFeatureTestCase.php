<?php

namespace Tests\Feature\LoadingPlan;

use App\Models\QdnMachine;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\MocksScheduleCalculator;
use Tests\TestCase;

abstract class LoadingPlanFeatureTestCase extends TestCase
{
    use RefreshDatabase;
    use MocksScheduleCalculator;

    protected $connectionsToTransact = ['mysql', 'qdn_db'];

    protected function setUp(): void
    {
        parent::setUp();

        $this->mockScheduleCalculator();

        // These routes are gated by custom SSO middleware (AuthMiddleware +
        // SessionMiddleware), not Laravel's session guard — actingAs() can't
        // satisfy it since it's not checking Laravel's auth guard at all.
        // Bypassing both for these mutation-logic tests; if any of the
        // controllers/services under test actually read the authenticated
        // user (e.g. for created_by/reverted_by attribution), that'll need
        // a real fake-user swap-in instead — see note below.
        $this->withoutMiddleware([
            \App\Http\Middleware\AuthMiddleware::class,
            \App\Http\Middleware\SessionMiddleware::class,
        ]);
    }

    protected function machine(string $num = 'M1'): QdnMachine
    {
        return QdnMachine::factory()->create(['machine_num' => $num]);
    }
}
