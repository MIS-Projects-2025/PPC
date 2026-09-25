<?php

namespace Tests\Feature\LoadingPlan;

use App\Models\LoadingPlanEntry;
use App\Models\LotQuantity;
use App\Models\LotSplit;

class SplitMutationTest extends LoadingPlanFeatureTestCase
{
    public function test_splits_a_lot_into_a_new_child_placed_on_the_target_machine(): void
    {
        $source = $this->machine('M1');
        $target = $this->machine('M2');

        $parent = LoadingPlanEntry::factory()->onMachine($source, 1000)->create([
            'lot_id'         => 'PARENT-1',
            'scheduled_date' => '2026-01-05',
        ]);

        LotQuantity::factory()->create([
            'lot_id'         => 'PARENT-1',
            'scheduled_date' => '2026-01-05',
            'part_name'      => 'PART-A',
            'qty_base'       => 1000,
        ]);

        $response = $this->postJson(route('loading-plan.splits.store'), [
            'parent_entry_id' => $parent->id,
            'child_qty'       => 300,
            'target_machine'  => 'M2',
        ]);

        $response->assertCreated();

        $this->assertDatabaseHas('lot_splits', [
            'parent_lot_id' => 'PARENT-1',
            'child_qty'     => 300,
        ]);

        $childLotId = $response->json('child.lot_id');
        $this->assertNotNull($childLotId);
        $this->assertDatabaseHas('loading_plan_entries', [
            'lot_id'     => $childLotId,
            'machine_id' => $target->id,
        ]);
    }

    public function test_rejects_a_split_where_child_qty_is_not_less_than_the_total(): void
    {
        $this->machine('M2');

        $parent = LoadingPlanEntry::factory()->create([
            'lot_id'         => 'PARENT-2',
            'scheduled_date' => '2026-01-05',
        ]);

        LotQuantity::factory()->create([
            'lot_id'         => 'PARENT-2',
            'scheduled_date' => '2026-01-05',
            'qty_base'       => 100,
        ]);

        $response = $this->postJson(route('loading-plan.splits.store'), [
            'parent_entry_id' => $parent->id,
            'child_qty'       => 100,
            'target_machine'  => 'M2',
        ]);

        $response->assertStatus(422)->assertJson(['error' => 'invalid_split']);
    }

    public function test_rejects_a_split_onto_a_nonexistent_machine(): void
    {
        $parent = LoadingPlanEntry::factory()->create([
            'lot_id'         => 'PARENT-2B',
            'scheduled_date' => '2026-01-05',
        ]);

        LotQuantity::factory()->create([
            'lot_id'         => 'PARENT-2B',
            'scheduled_date' => '2026-01-05',
            'qty_base'       => 1000,
        ]);

        $response = $this->postJson(route('loading-plan.splits.store'), [
            'parent_entry_id' => $parent->id,
            'child_qty'       => 300,
            'target_machine'  => 'DOES-NOT-EXIST',
        ]);

        $response->assertStatus(422)->assertJson(['error' => 'invalid_split']);
    }

    public function test_reverts_a_split_and_removes_the_child_entry(): void
    {
        $this->machine('M1'); // matches the factory's default target_machine

        $split = LotSplit::factory()->create([
            'parent_lot_id'  => 'PARENT-3',
            'child_lot_id'   => 'PARENT-3.2',
            'root_lot_id'    => 'PARENT-3',
            'scheduled_date' => '2026-01-05',
            'child_qty'      => 300,
        ]);

        LoadingPlanEntry::factory()->create([
            'lot_id'         => 'PARENT-3.2',
            'scheduled_date' => '2026-01-05',
        ]);
        LoadingPlanEntry::factory()->create([
            'lot_id'         => 'PARENT-3',
            'scheduled_date' => '2026-01-05',
        ]);
        LotQuantity::factory()->create([
            'lot_id'         => 'PARENT-3',
            'scheduled_date' => '2026-01-05',
            'qty_base'       => 1000,
        ]);

        $response = $this->deleteJson(route('loading-plan.splits.destroy', $split->id));

        $response->assertOk();
        $this->assertDatabaseMissing('loading_plan_entries', ['lot_id' => 'PARENT-3.2']);
        $this->assertNotNull($split->fresh()->reverted_at);
    }

    public function test_unreverts_a_split_and_recreates_the_child_entry(): void
    {
        $this->machine('M1'); // matches the factory's default target_machine

        $split = LotSplit::factory()->reverted()->create([
            'parent_lot_id'  => 'PARENT-4',
            'child_lot_id'   => 'PARENT-4.2',
            'root_lot_id'    => 'PARENT-4',
            'scheduled_date' => '2026-01-05',
            'child_qty'      => 100,
        ]);

        LoadingPlanEntry::factory()->create([
            'lot_id'         => 'PARENT-4',
            'scheduled_date' => '2026-01-05',
        ]);
        LotQuantity::factory()->create([
            'lot_id'         => 'PARENT-4',
            'scheduled_date' => '2026-01-05',
            'qty_base'       => 1000,
        ]);

        $response = $this->postJson(route('loading-plan.splits.unrevert', $split->id));

        $response->assertOk();
        $this->assertNull($split->fresh()->reverted_at);
        $this->assertDatabaseHas('loading_plan_entries', ['lot_id' => 'PARENT-4.2']);
    }

    public function test_unrevert_fails_if_the_child_lot_id_is_now_taken(): void
    {
        $this->machine('M1');

        $split = LotSplit::factory()->reverted()->create([
            'parent_lot_id'  => 'PARENT-5',
            'child_lot_id'   => 'PARENT-5.2',
            'root_lot_id'    => 'PARENT-5',
            'scheduled_date' => '2026-01-05',
            'child_qty'      => 100,
        ]);

        LoadingPlanEntry::factory()->create(['lot_id' => 'PARENT-5', 'scheduled_date' => '2026-01-05']);
        // Someone/something already created an entry at the child's lot_id.
        LoadingPlanEntry::factory()->create(['lot_id' => 'PARENT-5.2', 'scheduled_date' => '2026-01-05']);

        $response = $this->postJson(route('loading-plan.splits.unrevert', $split->id));

        $response->assertStatus(500); // unrevertSplit doesn't catch InvalidSplitException — worth fixing in the controller
    }
}
