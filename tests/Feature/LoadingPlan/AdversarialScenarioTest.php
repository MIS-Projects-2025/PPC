<?php

namespace Tests\Feature\LoadingPlan;

use App\Models\LoadingPlanEntry;
use App\Models\LotQuantity;

/**
 * Where ChaosScenarioTest chains the happy path, this one deliberately hits
 * blocked paths, double-actions, and combinations the code doesn't look
 * like it explicitly guards against. A few of these assertions document
 * CURRENT behavior rather than asserting it's correct — flagged inline —
 * because the point here is finding out what actually happens, not
 * assuming. If a flagged assertion fails, that's the test doing its job;
 * tell me what it actually returned and we'll decide whether it's a bug
 * worth fixing or just needs the assertion corrected.
 */
class AdversarialScenarioTest extends LoadingPlanFeatureTestCase
{
    private const DATE = '2026-02-11';

    public function test_double_actions_blocked_reverts_and_concurrent_splits_behave_sanely(): void
    {
        $m1 = $this->machine('M1');
        $m2 = $this->machine('M2');
        $m3 = $this->machine('M3');

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
            'qty_base' => 300,
        ]);

        // --- step 1 & 2: split LOT-A TWICE, two simultaneously-active
        // children on different machines ---
        $split2Response = $this->postJson(route('loading-plan.splits.store'), [
            'parent_entry_id' => $entryA->id,
            'child_qty' => 400,
            'target_machine' => 'M2',
        ])->assertCreated();
        $splitAId = $split2Response->json('split.id');

        $split3Response = $this->postJson(route('loading-plan.splits.store'), [
            'parent_entry_id' => $entryA->id,
            'child_qty' => 200,
            'target_machine' => 'M3',
        ])->assertCreated();
        $splitBId = $split3Response->json('split.id');

        $this->assertSame('LOT-A.2', $split2Response->json('child.lot_id'));
        $this->assertSame('LOT-A.3', $split3Response->json('child.lot_id'));

        // recalculateParentQty sums ALL active children's split_adjustment,
        // not just the most recent one
        $this->assertQtyEquals('LOT-A', 400); // 1000 - 400 - 200

        // --- step 3: merge LOT-A.2 into LOT-B (B=300 < A.2=400, so A.2
        // becomes target) ---
        $childA2 = LoadingPlanEntry::where('lot_id', 'LOT-A.2')->where('scheduled_date', self::DATE)->firstOrFail();

        $mergeResponse = $this->postJson(route('loading-plan.merges.store'), [
            'entry_id_a' => $childA2->id,
            'entry_id_b' => $entryB->id,
        ])->assertCreated();
        $mergeId = $mergeResponse->json('merge.id');

        $this->assertQtyEquals('LOT-A.2', 700); // 400 + 300 absorbed
        $this->assertQtyEquals('LOT-B', 0);

        // --- step 4: try to revert the split for A.2 WHILE its merge is
        // still active — should be blocked (assertNotInvolvedInMerge) ---
        $this->deleteJson(route('loading-plan.splits.destroy', $splitAId))
            ->assertStatus(422)
            ->assertJson(['error' => 'invalid_split']);

        // confirm nothing actually changed from the blocked attempt
        $this->assertDatabaseHas('loading_plan_entries', ['lot_id' => 'LOT-A.2']);
        $this->assertQtyEquals('LOT-A.2', 700);

        // --- step 5: revert the merge first ---
        $this->deleteJson(route('loading-plan.merges.destroy', $mergeId))->assertOk();
        $this->assertQtyEquals('LOT-A.2', 400);
        $this->assertQtyEquals('LOT-B', 300);

        // --- step 6: NOW the split revert should succeed ---
        $this->deleteJson(route('loading-plan.splits.destroy', $splitAId))->assertOk();
        $this->assertDatabaseMissing('loading_plan_entries', ['lot_id' => 'LOT-A.2']);

        // parent qty should now reflect only the ONE remaining active split (A.3)
        $this->assertQtyEquals('LOT-A', 800); // 1000 - 200

        // --- step 7: double-revert — try reverting the same split again ---
        // CURRENT BEHAVIOR: LotSplitService::revert() scopes to
        // LotSplit::active() (whereNull reverted_at), so a second revert
        // can't find it and throws ModelNotFoundException. The controller's
        // destroy() only catches InvalidSplitException and
        // LoadingPlanDateFinalizedException — not ModelNotFoundException —
        // so this currently surfaces as a raw 500, not a clean 4xx. If you'd
        // rather it return 404/422, that's a controller catch-clause fix,
        // not a test fix.
        $this->deleteJson(route('loading-plan.splits.destroy', $splitAId))
            ->assertStatus(500);

        // --- step 8: unrevert something that was never reverted (splitB/A.3
        // is still active, never reverted). LotSplitService::unrevert()
        // scopes to whereNotNull('reverted_at'), so findOrFail() throws
        // ModelNotFoundException. unrevertSplit() has NO try/catch at all
        // (flagged back when this suite was first written), so unlike
        // destroy() — which manually catches every \Throwable and returns
        // its own 500 — this one bubbles to Laravel's DEFAULT exception
        // handler, which has built-in special-case handling that renders
        // ModelNotFoundException as a clean 404. Net effect: the identical
        // failure mode (split not in the expected state) returns three
        // different shapes depending on which endpoint hits it — 422 clean
        // (step 4), 500 manual (step 7), 404 default (here). Worth a
        // conscious call on whether that inconsistency matters, not
        // something this test fixes on its own.
        $this->postJson(route('loading-plan.splits.unrevert', $splitBId))
            ->assertStatus(404);

        // --- step 9: try to merge LOT-A with its own active split child
        // (A.3). Merging a parent back into a fragment split from it would
        // leave an active split AND an active merge describing overlapping
        // quantity movement between the same two lots, so LotMergeService
        // blocks it — the way to recombine a split is to revert the split.
        $childA3 = LoadingPlanEntry::where('lot_id', 'LOT-A.3')->where('scheduled_date', self::DATE)->firstOrFail();

        $this->postJson(route('loading-plan.merges.store'), [
            'entry_id_a' => $entryA->id,
            'entry_id_b' => $childA3->id,
        ])->assertStatus(422)->assertJson(['error' => 'invalid_merge']);

        // and the blocked attempt changed nothing
        $this->assertEquals(0, \App\Models\LotMerge::active()->count());
        $this->assertQtyEquals('LOT-A', 800);
        $this->assertQtyEquals('LOT-A.3', 200);

        $this->assertNoSequenceCollisions();
        $this->assertAllQuantitiesNonNegative();
    }

    private function assertQtyEquals(string $lotId, int $expected): void
    {
        $qty = LotQuantity::where('lot_id', $lotId)->where('scheduled_date', self::DATE)->first();
        $this->assertNotNull($qty, "no LotQuantity row for [{$lotId}]");
        $this->assertEquals($expected, $qty->effectiveQty(), "effectiveQty mismatch for [{$lotId}]");
    }

    private function assertNoSequenceCollisions(): void
    {
        $collisions = \Illuminate\Support\Facades\DB::table('loading_plan_entries')
            ->select('machine_id', 'scheduled_date', 'sequence_order', \Illuminate\Support\Facades\DB::raw('count(*) as c'))
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
