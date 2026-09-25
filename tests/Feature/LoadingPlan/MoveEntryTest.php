<?php

namespace Tests\Feature\LoadingPlan;

use App\Models\LoadingPlanEntry;

class MoveEntryTest extends LoadingPlanFeatureTestCase
{
    public function test_moves_a_lot_entry_between_two_neighbors_on_its_machine(): void
    {
        $machine = $this->machine('M1');
        $date = '2026-01-05';

        $first  = LoadingPlanEntry::factory()->onMachine($machine, 1000)->create(['scheduled_date' => $date]);
        $second = LoadingPlanEntry::factory()->onMachine($machine, 2000)->create(['scheduled_date' => $date]);
        $moving = LoadingPlanEntry::factory()->onMachine($machine, 3000)->create(['scheduled_date' => $date]);

        $response = $this->postJson(route('loading-plan.move'), [
            'entry_type'      => 'lot',
            'entry_id'        => $moving->id,
            'before_entry_id' => $first->id,
            'after_entry_id'  => $second->id,
            'machine'         => 'M1',
        ]);
        dump($response->headers->get('Location'));

        $response->assertOk();

        $moving->refresh();
        $this->assertGreaterThan($first->sequence_order, $moving->sequence_order);
        $this->assertLessThan($second->sequence_order, $moving->sequence_order);
    }

    public function test_rejects_moving_a_finalized_entry(): void
    {
        $machine = $this->machine('M1');

        $entry = LoadingPlanEntry::factory()
            ->onMachine($machine, 1000)
            ->finalized()
            ->create(['scheduled_date' => '2026-01-05']);

        $response = $this->postJson(route('loading-plan.move'), [
            'entry_type' => 'lot',
            'entry_id'   => $entry->id,
            'machine'    => 'M1',
        ]);

        // Controller catches every Throwable from the service as a 422
        // bad_request — adjust if assertNotFinalized() throws something
        // this test should distinguish more specifically.
        $response->assertStatus(422)->assertJson(['error' => 'bad_request']);
    }

    public function test_validates_required_fields(): void
    {
        $response = $this->postJson(route('loading-plan.move'), []);

        $response->assertStatus(422);
    }

    public function test_moving_a_block_bumps_its_lock_version(): void
    {
        $machine = $this->machine('M1');
        $date = '2026-01-05';

        $anchor = LoadingPlanEntry::factory()->onMachine($machine, 1000)->create(['scheduled_date' => $date]);
        $block  = LoadingPlanEntry::factory()->block()->onMachine($machine, 2000)
            ->create(['scheduled_date' => $date, 'lock_version' => 1]);

        $response = $this->postJson(route('loading-plan.move'), [
            'entry_type'     => 'block',
            'entry_id'       => $block->id,
            'before_entry_id' => $anchor->id,
            'machine'        => 'M1',
        ]);

        $response->assertOk();
        $this->assertEquals(2, $block->fresh()->lock_version);
    }
}
