<?php

namespace Tests\Feature\LoadingPlan;

use App\Models\LoadingPlanEntry;
use App\Models\LotMerge;
use App\Models\LotQuantity;
use App\Models\LotSplit;

class MergeMutationTest extends LoadingPlanFeatureTestCase
{
    public function test_merges_two_lots_of_the_same_part_larger_qty_becomes_target(): void
    {
        $entryA = LoadingPlanEntry::factory()->create(['lot_id' => 'LOT-A', 'scheduled_date' => '2026-01-05']);
        $entryB = LoadingPlanEntry::factory()->create(['lot_id' => 'LOT-B', 'scheduled_date' => '2026-01-05']);

        LotQuantity::factory()->create(['lot_id' => 'LOT-A', 'scheduled_date' => '2026-01-05', 'part_name' => 'PART-A', 'qty_base' => 1000]);
        LotQuantity::factory()->create(['lot_id' => 'LOT-B', 'scheduled_date' => '2026-01-05', 'part_name' => 'PART-A', 'qty_base' => 500]);

        $response = $this->postJson(route('loading-plan.merges.store'), [
            'entry_id_a' => $entryA->id,
            'entry_id_b' => $entryB->id,
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('lot_merges', [
            'target_lot_id'   => 'LOT-A',
            'source_lot_id'   => 'LOT-B',
            'transferred_qty' => 500,
        ]);
    }

    public function test_rejects_merging_lots_with_different_part_names(): void
    {
        $entryA = LoadingPlanEntry::factory()->create(['lot_id' => 'LOT-C', 'scheduled_date' => '2026-01-05']);
        $entryB = LoadingPlanEntry::factory()->create(['lot_id' => 'LOT-D', 'scheduled_date' => '2026-01-05']);

        LotQuantity::factory()->create(['lot_id' => 'LOT-C', 'scheduled_date' => '2026-01-05', 'part_name' => 'PART-A']);
        LotQuantity::factory()->create(['lot_id' => 'LOT-D', 'scheduled_date' => '2026-01-05', 'part_name' => 'PART-B']);

        $response = $this->postJson(route('loading-plan.merges.store'), [
            'entry_id_a' => $entryA->id,
            'entry_id_b' => $entryB->id,
        ]);

        $response->assertStatus(422)->assertJson(['error' => 'invalid_merge']);
    }

    public function test_rejects_merging_a_lot_into_itself(): void
    {
        $entry = LoadingPlanEntry::factory()->create(['lot_id' => 'LOT-SELF', 'scheduled_date' => '2026-01-05']);
        LotQuantity::factory()->create(['lot_id' => 'LOT-SELF', 'scheduled_date' => '2026-01-05']);

        $response = $this->postJson(route('loading-plan.merges.store'), [
            'entry_id_a' => $entry->id,
            'entry_id_b' => $entry->id,
        ]);

        // entry_id_a === entry_id_b fails "distinct"-style checks upstream of
        // the service's own self-merge guard — either way it must not create
        // a merge.
        $response->assertStatus(422);
        $this->assertDatabaseCount('lot_merges', 0);
    }

    public function test_reverts_a_merge_and_undoes_the_qty_adjustment(): void
    {
        LoadingPlanEntry::factory()->create(['lot_id' => 'LOT-E', 'scheduled_date' => '2026-01-05']);
        LoadingPlanEntry::factory()->create(['lot_id' => 'LOT-F', 'scheduled_date' => '2026-01-05']);

        LotQuantity::factory()->create(['lot_id' => 'LOT-E', 'scheduled_date' => '2026-01-05', 'qty_base' => 1000, 'merge_adjustment' => 200]);
        LotQuantity::factory()->create(['lot_id' => 'LOT-F', 'scheduled_date' => '2026-01-05', 'qty_base' => 500, 'merge_adjustment' => -200]);

        $merge = LotMerge::factory()->create([
            'target_lot_id'   => 'LOT-E',
            'source_lot_id'   => 'LOT-F',
            'scheduled_date'  => '2026-01-05',
            'transferred_qty' => 200,
        ]);

        $response = $this->deleteJson(route('loading-plan.merges.destroy', $merge->id));

        $response->assertOk();
        $this->assertNotNull($merge->fresh()->reverted_at);
        $this->assertEquals(0, LotQuantity::where('lot_id', 'LOT-E')->first()->merge_adjustment);
        $this->assertEquals(0, LotQuantity::where('lot_id', 'LOT-F')->first()->merge_adjustment);
    }

    public function test_unreverts_a_merge_and_reapplies_the_qty_adjustment(): void
    {
        LoadingPlanEntry::factory()->create(['lot_id' => 'LOT-G', 'scheduled_date' => '2026-01-05']);
        LoadingPlanEntry::factory()->create(['lot_id' => 'LOT-H', 'scheduled_date' => '2026-01-05']);

        LotQuantity::factory()->create(['lot_id' => 'LOT-G', 'scheduled_date' => '2026-01-05', 'qty_base' => 1000]);
        LotQuantity::factory()->create(['lot_id' => 'LOT-H', 'scheduled_date' => '2026-01-05', 'qty_base' => 500]);

        $merge = LotMerge::factory()->reverted()->create([
            'target_lot_id'   => 'LOT-G',
            'source_lot_id'   => 'LOT-H',
            'scheduled_date'  => '2026-01-05',
            'transferred_qty' => 500,
        ]);

        $response = $this->postJson(route('loading-plan.merges.unrevert', $merge->id));

        $response->assertOk();
        $this->assertNull($merge->fresh()->reverted_at);
        $this->assertEquals(500, LotQuantity::where('lot_id', 'LOT-G')->first()->merge_adjustment);
        $this->assertEquals(-500, LotQuantity::where('lot_id', 'LOT-H')->first()->merge_adjustment);
    }

    public function test_rejects_merging_a_split_parent_with_its_child(): void
    {
        [$parent, $child] = $this->makeSplitFamily('LOT-P', ['LOT-P.2']);

        $this->postJson(route('loading-plan.merges.store'), [
            'entry_id_a' => $parent->id,
            'entry_id_b' => $child['LOT-P.2']->id,
        ])->assertStatus(422)->assertJson(['error' => 'invalid_merge']);

        $this->assertDatabaseCount('lot_merges', 0);
    }

    public function test_rejects_merging_a_split_child_with_its_parent_regardless_of_order(): void
    {
        [$parent, $child] = $this->makeSplitFamily('LOT-Q', ['LOT-Q.2']);

        // child as entry_id_a this time
        $this->postJson(route('loading-plan.merges.store'), [
            'entry_id_a' => $child['LOT-Q.2']->id,
            'entry_id_b' => $parent->id,
        ])->assertStatus(422)->assertJson(['error' => 'invalid_merge']);

        $this->assertDatabaseCount('lot_merges', 0);
    }

    public function test_allows_merging_two_siblings_split_from_the_same_parent(): void
    {
        // Consolidating fragments onto one machine is a legitimate use of
        // merge — only the direct parent/child pairing is blocked.
        [, $children] = $this->makeSplitFamily('LOT-R', ['LOT-R.2', 'LOT-R.3']);

        $this->postJson(route('loading-plan.merges.store'), [
            'entry_id_a' => $children['LOT-R.2']->id,
            'entry_id_b' => $children['LOT-R.3']->id,
        ])->assertCreated();
    }

    public function test_a_reverted_split_does_not_block_merging_its_former_parent_and_child(): void
    {
        [$parent, $child] = $this->makeSplitFamily('LOT-S', ['LOT-S.2']);

        LotSplit::where('parent_lot_id', 'LOT-S')->update(['reverted_at' => now()]);

        $this->postJson(route('loading-plan.merges.store'), [
            'entry_id_a' => $parent->id,
            'entry_id_b' => $child['LOT-S.2']->id,
        ])->assertCreated();
    }

    /**
     * Builds a parent lot plus one active split (and child entry/quantity)
     * per given child lot id. Returns [parentEntry, [childLotId => entry]].
     */
    private function makeSplitFamily(string $parentLotId, array $childLotIds): array
    {
        $date = '2026-01-05';

        $parent = LoadingPlanEntry::factory()->create(['lot_id' => $parentLotId, 'scheduled_date' => $date]);
        LotQuantity::factory()->create([
            'lot_id' => $parentLotId,
            'scheduled_date' => $date,
            'part_name' => 'PART-A',
            'qty_base' => 1000,
        ]);

        $children = [];
        foreach ($childLotIds as $childLotId) {
            $children[$childLotId] = LoadingPlanEntry::factory()->create(['lot_id' => $childLotId, 'scheduled_date' => $date]);
            LotQuantity::factory()->create([
                'lot_id' => $childLotId,
                'scheduled_date' => $date,
                'part_name' => 'PART-A',
                'qty_base' => 200,
            ]);
            LotSplit::factory()->create([
                'parent_lot_id'  => $parentLotId,
                'child_lot_id'   => $childLotId,
                'root_lot_id'    => $parentLotId,
                'scheduled_date' => $date,
                'child_qty'      => 200,
            ]);
        }

        return [$parent, $children];
    }
}
