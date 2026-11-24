<?php

namespace Tests\Feature;

use App\Models\HourlyCell;
use App\Models\HourlySheet;
use App\Services\HourlyMonitoring\EmployeeLookupService;
use App\Services\HourlyMonitoring\HourlyRowService;
use App\Services\HourlyMonitoring\SheetService;
use Database\Seeders\DowntimeCodeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HourlyMonitoringTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DowntimeCodeSeeder::class);

        $this->mock(EmployeeLookupService::class, function ($mock) {
            $mock->shouldReceive('nameFor')->with('1001')->andReturn('JUAN DELA CRUZ');
            $mock->shouldReceive('nameFor')->with('9999')->andReturn(null);
        });
    }

    private function sheet(string $date, string $type, string $line): HourlySheet
    {
        return app(SheetService::class)->openDay($date)->first(fn ($s) => $s->type === $type && $s->line === $line);
    }

    public function test_downtime_codes_follow_the_rules(): void
    {
        $this->assertDatabaseHas('downtime_code', ['code' => 'E_CHIPOUT', 'is_downtime' => true, 'bg_color' => '#FF0000']);
        $this->assertDatabaseHas('downtime_code', ['code' => 'S_SETUP', 'is_downtime' => true]);
        $this->assertDatabaseHas('downtime_code', ['code' => 'I_NO OPERATOR', 'is_downtime' => false, 'bg_color' => '#BFBFBF']);
        $this->assertDatabaseHas('downtime_code', ['code' => 'P_PDPM', 'is_downtime' => false, 'bg_color' => '#1F3864']);
        $this->assertDatabaseHas('downtime_code', ['code' => 'NEW LOT', 'is_downtime' => false, 'bg_color' => '#BDD7EE']);
    }

    public function test_opening_a_day_creates_five_sheets_and_carries_rows_over(): void
    {
        $svc   = app(HourlyRowService::class);
        $sheet = $this->sheet('2026-11-23', 'tnr', 'F1');
        $row   = $svc->addRow($sheet);

        $svc->apply($sheet, [[
            'id'     => $row->id,
            'fields' => ['machine' => 'TNR-01', 'capacity' => 2000, 'package_type' => 'SOIC', 'setup' => 'S1', 'day_emp_id' => '1001'],
            'cells'  => ['8' => '1500'],
        ]]);

        $next = app(SheetService::class)->openDay('2026-11-24');
        $copy = $next->first(fn ($s) => $s->type === 'tnr' && $s->line === 'F1')->machineRows->first();

        $this->assertCount(5, $next);
        $this->assertSame('TNR-01', $copy->machine);
        $this->assertSame('SOIC', $copy->package_type);
        $this->assertSame('1001', $copy->day_emp_id);
        $this->assertSame('JUAN DELA CRUZ', $copy->day_emp_name);
        $this->assertNull($copy->setup);
        $this->assertCount(0, $copy->cells);
    }

    public function test_cells_accept_integers_and_codes_and_reject_garbage_atomically(): void
    {
        $sheet = $this->sheet('2026-11-24', 'tnr', 'F1');
        $row   = app(HourlyRowService::class)->addRow($sheet);
        $url   = route('hourly-monitoring.sheets.rows.update', $sheet);

        $this->patchJson($url, ['rows' => [[
            'id' => $row->id,
            'cells' => ['8' => '1,500', '9' => 'e_chipout', '10' => 'I_NO OPERATOR', '11' => ''],
        ]]])->assertOk();

        $this->assertDatabaseHas('hourly_cells', ['rowable_type' => 'machine', 'rowable_id' => $row->id, 'hour' => 8, 'output_qty' => 1500]);
        $this->assertDatabaseHas('hourly_cells', ['rowable_id' => $row->id, 'hour' => 9, 'output_qty' => null]);
        $this->assertSame(3, HourlyCell::count());

        // One bad cell rejects the whole batch.
        $this->patchJson($url, ['rows' => [[
            'id' => $row->id,
            'cells' => ['8' => '999', '12' => 'nonsense'],
        ]]])->assertUnprocessable();

        $this->assertDatabaseHas('hourly_cells', ['rowable_id' => $row->id, 'hour' => 8, 'output_qty' => 1500]);

        // Hours outside 0-23 slots are rejected too.
        $this->patchJson($url, ['rows' => [['id' => $row->id, 'cells' => ['99' => '1']]]])->assertUnprocessable();

        // Blank clears.
        $this->patchJson($url, ['rows' => [['id' => $row->id, 'cells' => ['8' => '']]]])->assertOk();
        $this->assertDatabaseMissing('hourly_cells', ['rowable_id' => $row->id, 'hour' => 8]);
    }

    public function test_employee_name_is_a_server_side_snapshot(): void
    {
        $sheet = $this->sheet('2026-11-24', 'fvi', 'PL1');
        $row   = app(HourlyRowService::class)->addRow($sheet);
        $url   = route('hourly-monitoring.sheets.rows.update', $sheet);

        // Client-sent names are ignored; the masterlist decides.
        $this->patchJson($url, ['rows' => [['id' => $row->id, 'fields' => ['day_emp_id' => '1001', 'day_emp_name' => 'HACKER']]]])
            ->assertOk()
            ->assertJsonPath('data.0.day_emp_name', 'JUAN DELA CRUZ');

        $this->patchJson($url, ['rows' => [['id' => $row->id, 'fields' => ['night_emp_id' => '9999']]]])
            ->assertUnprocessable();
    }

    public function test_summary_counts_only_numeric_output_and_splits_shifts(): void
    {
        $svc = app(HourlyRowService::class);

        $f1  = $this->sheet('2026-11-24', 'tnr', 'F1');
        $r1  = $svc->addRow($f1);
        $svc->apply($f1, [['id' => $r1->id, 'cells' => ['8' => '1000', '9' => 'E_CHIPOUT', '20' => '500', '0' => '250']]]);

        $pl1 = $this->sheet('2026-11-24', 'fvi', 'PL1');
        $r2  = $svc->addRow($pl1);
        $svc->apply($pl1, [['id' => $r2->id, 'cells' => ['8' => '300', '10' => 'I_NO OPERATOR']]]);

        $this->getJson(route('hourly-monitoring.summary', ['date' => '2026-11-24']))
            ->assertOk()
            ->assertJsonPath('shifts.day.total.F1', 1000)
            ->assertJsonPath('shifts.day.total.PL1', 300)
            ->assertJsonPath('shifts.day.total.tnr', 1000)
            ->assertJsonPath('shifts.night.total.F1', 750)
            ->assertJsonPath('totals.2.label', 'Total')
            ->assertJsonPath('totals.2.tnr', 1750)
            ->assertJsonPath('totals.2.fvi', 300)
            ->assertJsonPath('shifts.night.rows.0.label', '20:00')
            ->assertJsonPath('shifts.night.rows.4.label', '00:00');
    }
}
