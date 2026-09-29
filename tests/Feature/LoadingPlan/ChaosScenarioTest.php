<?php

namespace Tests\Feature\LoadingPlan;

use App\Models\LoadingPlanEntry;
use App\Models\LotQuantity;
use Illuminate\Support\Facades\DB;

/**
 * These tests don't isolate one operation — they chain many, in the order a
 * real planner clicking around the UI might, and assert state is still
 * internally consistent after every step. A bug that only shows up because
 * step 6 depends on state step 3 left behind is exactly what a suite of
 * isolated happy-path tests can't catch.
 */
class ChaosScenarioTest extends LoadingPlanFeatureTestCase
{
    private const DATE = '2026-02-10';

    public function test_split_move_transfer_edit_merge_revert_unrevert_bulk_chain_leaves_consistent_state(): void
    {
        $m1 = $this->machine('M1');
        $m2 = $this->machine('M2');
        $m3 = $this->machine('M3');

        // --- setup: two lots of the same part (mergeable later), plus a
        // filler entry on M2 to reorder against ---
        $entryA = LoadingPlanEntry::factory()->onMachine($m1, 1000)->create([
            'lot_id' => 'LOT-A',
            'scheduled_date' => self::DATE,
        ]);
        LotQuantity::factory()->create([
            'lot_id' => 'LOT-A',
            'scheduled_date' => self::DATE,
            'part_name' => 'PART-X',
            'qty_base' => 1000,
        ]);

        $entryB = LoadingPlanEntry::factory()->onMachine($m1, 2000)->create([
            'lot_id' => 'LOT-B',
            'scheduled_date' => self::DATE,
        ]);
        LotQuantity::factory()->create([
            'lot_id' => 'LOT-B',
            'scheduled_date' => self::DATE,
            'part_name' => 'PART-X',
            'qty_base' => 400,
        ]);

        $filler = LoadingPlanEntry::factory()->onMachine($m2, 1000)->create([
            'lot_id' => 'LOT-FILLER',
            'scheduled_date' => self::DATE,
        ]);
        LotQuantity::factory()->create([
            'lot_id' => 'LOT-FILLER',
            'scheduled_date' => self::DATE,
            'part_name' => 'PART-Y',
            'qty_base' => 500,
        ]);

        $this->assertNoSequenceCollisions();

        // --- step 1: split LOT-A, child goes to M2 ---
        $splitResponse = $this->postJson(route('loading-plan.splits.store'), [
            'parent_entry_id' => $entryA->id,
            'child_qty'       => 300,
            'target_machine'  => 'M2',
        ])->assertCreated();

        $splitId = $splitResponse->json('split.id');
        $childLotId = $splitResponse->json('child.lot_id');
        $this->assertNotNull($splitId);
        $this->assertSame('LOT-A.2', $childLotId);

        $this->assertQtyEquals('LOT-A', 700); // 1000 - 300 split_adjustment
        $this->assertQtyEquals('LOT-A.2', 300);
        $this->assertNoSequenceCollisions();

        $childEntry = LoadingPlanEntry::where('lot_id', $childLotId)->where('scheduled_date', self::DATE)->firstOrFail();
        $this->assertEquals($m2->id, $childEntry->machine_id);

        // --- step 2: move the child ahead of the filler entry, same machine ---
        $this->postJson(route('loading-plan.move'), [
            'entry_type'     => 'lot',
            'entry_id'       => $childEntry->id,
            'after_entry_id' => $filler->id,
            'machine'        => 'M2',
        ])->assertOk();

        $childEntry->refresh();
        $filler->refresh();
        $this->assertLessThan($filler->sequence_order, $childEntry->sequence_order);
        $this->assertNoSequenceCollisions();

        // --- step 3: transfer the child to a third machine entirely ---
        $this->postJson(route('loading-plan.transfer'), [
            'entry_type'     => 'lot',
            'entry_id'       => $childEntry->id,
            'target_machine' => 'M3',
        ])->assertOk();

        $childEntry->refresh();
        $this->assertEquals($m3->id, $childEntry->machine_id);
        $this->assertNoSequenceCollisions();

        // --- step 4: edit its status/remarks via bulk-update ---
        $this->postJson(route('loading-plan.bulk-update'), [
            'updates' => [[
                'entry_id'     => $childEntry->id,
                'fields'       => ['status' => 'HOT', 'remarks' => 'expedite per planner'],
                'lock_version' => $childEntry->lock_version,
            ]],
        ])->assertOk();

        $childEntry->refresh();
        $this->assertSame('HOT', $childEntry->status);
        $this->assertSame('expedite per planner', $childEntry->remarks);

        // --- step 5: merge LOT-B and the child — B has more qty (400 > 300),
        // so B becomes target, child becomes source ---
        $mergeResponse = $this->postJson(route('loading-plan.merges.store'), [
            'entry_id_a' => $entryB->id,
            'entry_id_b' => $childEntry->id,
        ])->assertCreated();

        $mergeId = $mergeResponse->json('merge.id');
        $this->assertNotNull($mergeId);

        $this->assertQtyEquals('LOT-B', 700);      // 400 + 300 absorbed
        $this->assertQtyEquals('LOT-A.2', 0);      // 300 - 300 given away

        // --- step 6: revert the merge — quantities should return exactly ---
        $this->deleteJson(route('loading-plan.merges.destroy', $mergeId))->assertOk();

        $this->assertQtyEquals('LOT-B', 400);
        $this->assertQtyEquals('LOT-A.2', 300);

        // --- step 7: revert the split — child entry disappears, parent
        // qty returns to full ---
        $this->deleteJson(route('loading-plan.splits.destroy', $splitId))->assertOk();

        $this->assertDatabaseMissing('loading_plan_entries', ['lot_id' => 'LOT-A.2']);
        $this->assertQtyEquals('LOT-A', 1000);

        // --- step 8: unrevert the split — child comes back. Important
        // subtlety worth asserting explicitly: it's recreated on the split's
        // ORIGINAL target_machine (M2, recorded at creation), not wherever
        // step 3 transferred it to (M3) — unrevert doesn't know about that
        // later transfer at all. ---
        $this->postJson(route('loading-plan.splits.unrevert', $splitId))->assertOk();

        $recreatedChild = LoadingPlanEntry::where('lot_id', 'LOT-A.2')->where('scheduled_date', self::DATE)->firstOrFail();
        $this->assertEquals($m2->id, $recreatedChild->machine_id, 'unrevert should restore to the split\'s original target_machine, not the last transfer');
        $this->assertQtyEquals('LOT-A', 700);
        $this->assertQtyEquals('LOT-A.2', 300);
        $this->assertNoSequenceCollisions();

        // Also worth confirming: the recreated child does NOT carry over the
        // 'HOT'/remarks edit from step 4 — that was on the entry unrevert()
        // deleted in step 7, not something split/merge metadata preserves.
        $this->assertNotSame('HOT', $recreatedChild->status);

        // --- step 9: bulk-delete (unassign) the filler and the recreated
        // child together ---
        $this->postJson(route('loading-plan.bulk-delete'), [
            'ids'            => [$filler->id, $recreatedChild->id],
            'scheduled_date' => self::DATE,
        ])->assertOk();

        $this->assertNull($filler->fresh()->machine_id);
        $this->assertNull($recreatedChild->fresh()->machine_id);

        // --- step 10: bulk-transfer both LOT-B and the (now unassigned)
        // child back onto M1 together ---
        $this->postJson(route('loading-plan.bulk-transfer'), [
            'lot_ids'        => ['LOT-B', 'LOT-A.2'],
            'target_machine' => 'M1',
            'scheduled_date' => self::DATE,
        ])->assertOk();

        $this->assertEquals($m1->id, $entryB->fresh()->machine_id);
        $this->assertEquals($m1->id, $recreatedChild->fresh()->machine_id);

        // --- final invariants across everything that happened above ---
        $this->assertNoSequenceCollisions();
        $this->assertAllQuantitiesNonNegative();
        $this->assertGreaterThan(1, $recreatedChild->fresh()->lock_version, 'recreatedChild should have accumulated multiple lock_version bumps across the chain (create, transfer-in-unrevert, unassign, bulk-transfer)');
    }

    private function assertQtyEquals(string $lotId, int $expected): void
    {
        $qty = LotQuantity::where('lot_id', $lotId)->where('scheduled_date', self::DATE)->first();
        $this->assertNotNull($qty, "no LotQuantity row for [{$lotId}]");
        $this->assertEquals($expected, $qty->effectiveQty(), "effectiveQty mismatch for [{$lotId}]");
    }

    private function assertNoSequenceCollisions(): void
    {
        $collisions = DB::table('loading_plan_entries')
            ->select('machine_id', 'scheduled_date', 'sequence_order', DB::raw('count(*) as c'))
            ->whereNotNull('machine_id')
            ->groupBy('machine_id', 'scheduled_date', 'sequence_order')
            ->having('c', '>', 1)
            ->get();

        $this->assertCount(0, $collisions, 'found duplicate (machine_id, scheduled_date, sequence_order) rows: ' . $collisions->toJson());
    }

    private function assertAllQuantitiesNonNegative(): void
    {
        $negative = LotQuantity::where('scheduled_date', self::DATE)
            ->get()
            ->filter(fn($q) => $q->effectiveQty() < 0);

        $this->assertCount(0, $negative, 'found LotQuantity rows with negative effectiveQty: ' . $negative->pluck('lot_id')->implode(', '));
    }
}
