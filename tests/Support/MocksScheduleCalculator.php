<?php

namespace Tests\Support;

use App\Services\LotScheduleCalculator;
use Mockery;
use Mockery\MockInterface;

/**
 * Neutralizes LotScheduleCalculator for tests that exercise mutation logic
 * (move/transfer/split/merge/bulk) without needing real UPH/recipe/capacity
 * config seeded.
 *
 * IMPORTANT: bound with $this->app->bind(..., closure), NOT ->instance().
 * Laravel's container skips an instance()-bound singleton whenever the
 * caller passes constructor parameters — and several call sites do:
 * app(LotScheduleCalculator::class, ['dates' => ..., 'lotIds' => ...]).
 * A bind() closure still gets invoked in that case and can just hand back
 * the same mock regardless of what params it was called with.
 *
 * This only covers call sites that resolve the class via the container.
 * Any `new LotScheduleCalculator(...)` site bypasses this entirely — see
 * the refactor notes in testing-notes.md if a test using this trait still
 * hits the real calculator.
 */
trait MocksScheduleCalculator
{
    protected MockInterface $scheduleCalculatorMock;

    protected function mockScheduleCalculator(): MockInterface
    {
        $mock = Mockery::mock(LotScheduleCalculator::class);

        // Every mutation flow chains loadPackageList() straight into
        // recalculateAndRetime() or recomputeTimeStartAndEnd() and ignores
        // the return value except for the initial chain — these no-ops are
        // enough to let the mutation/DB logic under test run for real.
        $mock->shouldReceive('loadPackageList')->andReturnSelf()->byDefault();
        $mock->shouldReceive('recalculateAndRetime')->andReturnNull()->byDefault();
        $mock->shouldReceive('recomputeTimeStartAndEnd')->andReturnNull()->byDefault();
        $mock->shouldReceive('findPredecessor')->andReturnNull()->byDefault();
        $mock->shouldReceive('machineNumFor')->andReturn('M1')->byDefault();
        $mock->shouldReceive('computeMetrics')->andReturn([
            'accu_time'             => 10,
            'recipe_used'           => null,
            'recipe_source_id'      => null,
            'commit'                => 0,
            'recipe_status'         => 'ok',
            'capacity_uph_snapshot' => null,
        ])->byDefault();

        $this->app->bind(LotScheduleCalculator::class, fn () => $mock);

        return $this->scheduleCalculatorMock = $mock;
    }
}
