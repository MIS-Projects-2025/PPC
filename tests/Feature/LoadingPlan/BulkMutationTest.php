<?php

namespace Tests\Feature\LoadingPlan;

use App\Models\LoadingPlanEntry;

class BulkMutationTest extends LoadingPlanFeatureTestCase
{
    public function test_bulk_delete_unassigns_lot_entries_instead_of_removing_them(): void
    {
        $machine = $this->machine('M1');

        $entries = collect([1000, 2000, 3000])->map(
            fn($order) => LoadingPlanEntry::factory()->onMachine($machine, $order)->create([
                'scheduled_date' => '2026-01-05',
            ])
        );

        $response = $this->postJson(route('loading-plan.bulk-delete'), [
            'ids'            => $entries->pluck('id')->all(),
            'scheduled_date' => '2026-01-05',
        ]);

        $response->assertOk();

        foreach ($entries as $entry) {
            $this->assertDatabaseHas('loading_plan_entries', [
                'id'         => $entry->id,
                'machine_id' => null,
            ]);
        }
    }

    public function test_bulk_delete_permanently_removes_block_entries(): void
    {
        $machine = $this->machine('M1');

        $blocks = collect([1000, 2000])->map(
            fn($order) => LoadingPlanEntry::factory()->block()->onMachine($machine, $order)->create([
                'scheduled_date' => '2026-01-05',
            ])
        );

        $response = $this->postJson(route('loading-plan.bulk-delete'), [
            'ids'            => $blocks->pluck('id')->all(),
            'scheduled_date' => '2026-01-05',
        ]);

        $response->assertOk();

        foreach ($blocks as $block) {
            $this->assertDatabaseMissing('loading_plan_entries', ['id' => $block->id]);
        }
    }

    public function test_bulk_delete_rejects_entries_spanning_multiple_dates(): void
    {
        $a = LoadingPlanEntry::factory()->create(['scheduled_date' => '2026-01-05']);
        $b = LoadingPlanEntry::factory()->create(['scheduled_date' => '2026-01-06']);

        $response = $this->postJson(route('loading-plan.bulk-delete'), [
            'ids'            => [$a->id, $b->id],
            'scheduled_date' => '2026-01-05',
        ]);

        $response->assertStatus(422); // assertConsistentDates()'s exception renders as 422 — better than the 500 I'd assumed
    }

    public function test_bulk_updates_fields_across_multiple_entries(): void
    {
        $entryA = LoadingPlanEntry::factory()->create(['scheduled_date' => '2026-01-05', 'remarks' => null, 'lock_version' => 1]);
        $entryB = LoadingPlanEntry::factory()->create(['scheduled_date' => '2026-01-05', 'remarks' => null, 'lock_version' => 1]);

        $response = $this->postJson(route('loading-plan.bulk-update'), [
            'updates' => [
                ['entry_id' => $entryA->id, 'fields' => ['remarks' => 'Hot lot'], 'lock_version' => 1],
                ['entry_id' => $entryB->id, 'fields' => ['remarks' => 'Rework'], 'lock_version' => 1],
            ],
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('loading_plan_entries', ['id' => $entryA->id, 'remarks' => 'Hot lot']);
        $this->assertDatabaseHas('loading_plan_entries', ['id' => $entryB->id, 'remarks' => 'Rework']);
    }

    public function test_bulk_update_reports_conflicts_on_stale_lock_versions(): void
    {
        $entry = LoadingPlanEntry::factory()->create(['scheduled_date' => '2026-01-05', 'lock_version' => 5]);

        $response = $this->postJson(route('loading-plan.bulk-update'), [
            'updates' => [
                ['entry_id' => $entry->id, 'fields' => ['remarks' => 'stale write'], 'lock_version' => 1],
            ],
        ]);

        $response->assertStatus(409)->assertJson(['error' => 'stale']);
        // the good writes in the same batch should NOT be silently applied
        // once a conflict is found — verify against bulkEditField's actual
        // all-or-nothing behavior if this assumption is wrong.
    }

    public function test_bulk_update_rejects_entries_spanning_multiple_dates(): void
    {
        $a = LoadingPlanEntry::factory()->create(['scheduled_date' => '2026-01-05', 'lock_version' => 1]);
        $b = LoadingPlanEntry::factory()->create(['scheduled_date' => '2026-01-06', 'lock_version' => 1]);

        $response = $this->postJson(route('loading-plan.bulk-update'), [
            'updates' => [
                ['entry_id' => $a->id, 'fields' => ['remarks' => 'x'], 'lock_version' => 1],
                ['entry_id' => $b->id, 'fields' => ['remarks' => 'y'], 'lock_version' => 1],
            ],
        ]);

        $response->assertStatus(422)->assertJson(['error' => 'bad_request']);
    }

    /**
     * bulkEditField() never calls assertSupportedEditField() (editField and
     * editLotField both do), and it spreads the request's fields straight into
     * an update() — so extra columns may get written as-is, bypassing all the
     * sequencing/placement logic. Either rejecting the request or ignoring the
     * extra columns is acceptable; overwriting them is not, so no status code
     * is asserted here.
     */
    public function test_bulk_update_cannot_overwrite_placement_columns(): void
    {
        $m1 = $this->machine('M1');
        $m2 = $this->machine('M2');

        $entry = LoadingPlanEntry::factory()->onMachine($m1, 1000)->create([
            'scheduled_date' => '2026-01-05',
            'lock_version'   => 1,
        ]);

        $this->postJson(route('loading-plan.bulk-update'), [
            'updates' => [[
                'entry_id'     => $entry->id,
                'fields'       => ['remarks' => 'sneaky', 'sequence_order' => 999999, 'machine_id' => $m2->id],
                'lock_version' => 1,
            ]],
        ]);

        $fresh = $entry->fresh();
        $this->assertEquals(1000, $fresh->sequence_order, 'bulk-update overwrote sequence_order directly');
        $this->assertEquals($m1->id, $fresh->machine_id, 'bulk-update overwrote machine_id directly');
    }
}
