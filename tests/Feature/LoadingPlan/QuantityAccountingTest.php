<?php

namespace Tests\Feature\LoadingPlan;

use App\Models\LoadingPlanEntry;
use App\Models\LotMerge;
use App\Models\LotQuantity;
use App\Models\LotSplit;
use Illuminate\Testing\TestResponse;

/**
 * Split and merge both move quantity by writing adjustment columns on
 * lot_quantities (split_adjustment / merge_adjustment), and effectiveQty()
 * is base + both adjustments. Each mechanism is guarded on its own, but
 * they can be stacked on the same lot, and reverting or un-reverting ONE of
 * them while the other is still applied changes the numbers underneath it.
 * Nothing re-checks the result, so a lot can go negative while the family
 * total still adds up — which is exactly what makes it easy to miss.
 *
 * The scenario tests below assert an invariant rather than a specific
 * status code: the request must EITHER be rejected with nothing changed,
 * OR succeed without leaving any live lot negative (and, for split/merge
 * moves, without changing the total quantity). How to reject is your call.
 *
 * Expected today (from reading the code, not from running it):
 *   passing:  test_a_lot_merged_away_to_zero_cannot_be_split
 *   failing:  the revert/unrevert scenarios and the two bulk-update qty tests
 */
class QuantityAccountingTest extends LoadingPlanFeatureTestCase
{
    private const DATE = '2026-03-03';

    /**
     * A absorbs B (A=1400), then 1300 is split out of A (A=100). Reverting
     * the merge takes B's 400 back out of A: 1000 - 1300 = -300.
     */
    public function test_reverting_a_merge_after_the_merged_in_quantity_was_split_out(): void
    {
        [$m1] = $this->machines();

        $a = $this->lot('LOT-A', 1000, $m1, 1000);
        $b = $this->lot('LOT-B', 400, $m1, 2000);

        $mergeId = $this->merge($a, $b);
        $this->assertQty('LOT-A', 1400);
        $this->assertQty('LOT-B', 0);

        $this->split($a, 1300); // allowed: A currently has 1400
        $this->assertQty('LOT-A', 100);

        $before = $this->snapshot();
        $response = $this->deleteJson(route('loading-plan.merges.destroy', $mergeId));

        $this->assertRejectedOrConsistent($response, $before, 1400, 'revert merge after splitting out the merged-in qty');
    }

    /**
     * A absorbs B, then A (now 1400) is itself merged into the bigger C.
     * Reverting the INNER merge (A,B) while the outer one is still active
     * pulls 400 out of an A that has already been emptied into C.
     */
    public function test_reverting_an_inner_merge_while_the_outer_merge_is_still_active(): void
    {
        [$m1] = $this->machines();

        $a = $this->lot('LOT-A', 1000, $m1, 1000);
        $b = $this->lot('LOT-B', 400, $m1, 2000);
        $c = $this->lot('LOT-C', 2000, $m1, 3000);

        $innerMergeId = $this->merge($a, $b);   // A=1400, B=0
        $this->merge($a, $c);                   // C larger -> C=3400, A=0

        $this->assertQty('LOT-A', 0);
        $this->assertQty('LOT-C', 3400);

        $before = $this->snapshot();
        $response = $this->deleteJson(route('loading-plan.merges.destroy', $innerMergeId));

        $this->assertRejectedOrConsistent($response, $before, 3400, 'revert inner merge while outer merge is active');
    }

    /**
     * Split 400 off A, revert the split, merge A away into the bigger C
     * (A=0), then un-revert the split: it takes 400 back out of an A that
     * has nothing left.
     */
    public function test_unreverting_a_split_after_the_parent_was_merged_away(): void
    {
        [$m1] = $this->machines();

        $a = $this->lot('LOT-A', 1000, $m1, 1000);
        $c = $this->lot('LOT-C', 3000, $m1, 2000);

        $splitId = $this->split($a, 400);
        $this->assertQty('LOT-A', 600);

        $this->deleteJson(route('loading-plan.splits.destroy', $splitId))->assertOk();
        $this->assertQty('LOT-A', 1000);

        $this->merge($a, $c);                   // C larger -> C=4000, A=0
        $this->assertQty('LOT-A', 0);
        $this->assertQty('LOT-C', 4000);

        $before = $this->snapshot();
        $response = $this->postJson(route('loading-plan.splits.unrevert', $splitId));

        $this->assertRejectedOrConsistent($response, $before, 4000, 'unrevert split after the parent was merged away');
    }

    /**
     * Merge A,B and revert it, then split 300 off B (B=100), then un-revert
     * the merge: it re-applies the full 400 transfer out of a B that only
     * has 100 left: 400 - 300 - 400 = -300.
     */
    public function test_unreverting_a_merge_after_the_source_was_split(): void
    {
        [$m1] = $this->machines();

        $a = $this->lot('LOT-A', 1000, $m1, 1000);
        $b = $this->lot('LOT-B', 400, $m1, 2000);

        $mergeId = $this->merge($a, $b);
        $this->deleteJson(route('loading-plan.merges.destroy', $mergeId))->assertOk();
        $this->assertQty('LOT-A', 1000);
        $this->assertQty('LOT-B', 400);

        $this->split($b, 300);
        $this->assertQty('LOT-B', 100);

        $before = $this->snapshot();
        $response = $this->postJson(route('loading-plan.merges.unrevert', $mergeId));

        $this->assertRejectedOrConsistent($response, $before, 1400, 'unrevert merge after the source lot was split');
    }

    /** The guard that DOES exist: a lot merged away to 0 has nothing left to split. */
    public function test_a_lot_merged_away_to_zero_cannot_be_split(): void
    {
        [$m1] = $this->machines();

        $a = $this->lot('LOT-A', 1000, $m1, 1000);
        $c = $this->lot('LOT-C', 3000, $m1, 2000);

        $this->merge($a, $c); // C absorbs A
        $this->assertQty('LOT-A', 0);

        $this->postJson(route('loading-plan.splits.store'), [
            'parent_entry_id' => $a->id,
            'child_qty'       => 1,
            'target_machine'  => 'M2',
        ])->assertStatus(422)->assertJson(['error' => 'invalid_split']);
    }

    /**
     * bulk-update writes fields.qty straight into qty_base. Lower it below
     * what has already been split out and the parent goes negative
     * (100 - 400 = -300). No total is asserted — a manual qty edit is
     * allowed to change the total, just not to make a lot negative.
     */
    public function test_bulk_update_qty_cannot_drop_a_split_parent_below_what_was_split_out(): void
    {
        [$m1] = $this->machines();

        $a = $this->lot('LOT-A', 1000, $m1, 1000);
        $this->split($a, 400);
        $this->assertQty('LOT-A', 600);

        $before = $this->snapshot();
        $response = $this->postJson(route('loading-plan.bulk-update'), [
            'updates' => [[
                'entry_id'     => $a->id,
                'fields'       => ['qty' => 100],
                'lock_version' => $a->fresh()->lock_version,
            ]],
        ]);

        $this->assertRejectedOrConsistent($response, $before, null, 'bulk-update qty below the already-split amount');
    }

    public function test_bulk_update_rejects_a_negative_quantity(): void
    {
        [$m1] = $this->machines();

        $a = $this->lot('LOT-A', 500, $m1, 1000);

        $before = $this->snapshot();
        $response = $this->postJson(route('loading-plan.bulk-update'), [
            'updates' => [[
                'entry_id'     => $a->id,
                'fields'       => ['qty' => -50],
                'lock_version' => $a->fresh()->lock_version,
            ]],
        ]);

        $this->assertRejectedOrConsistent($response, $before, null, 'bulk-update with a negative qty');
    }

    // ------------------------------------------------------------------
    // helpers
    // ------------------------------------------------------------------

    /** M1 for the parents, M2 for split children to land on. */
    private function machines(): array
    {
        return [$this->machine('M1'), $this->machine('M2')];
    }

    private function lot(string $lotId, int $qty, $machine, float $order): LoadingPlanEntry
    {
        $entry = LoadingPlanEntry::factory()->onMachine($machine, $order)->create([
            'lot_id'         => $lotId,
            'scheduled_date' => self::DATE,
        ]);

        LotQuantity::factory()->create([
            'lot_id'         => $lotId,
            'scheduled_date' => self::DATE,
            'part_name'      => 'PART-X',
            'qty_base'       => $qty,
        ]);

        return $entry;
    }

    private function merge(LoadingPlanEntry $a, LoadingPlanEntry $b): int
    {
        return $this->postJson(route('loading-plan.merges.store'), [
            'entry_id_a' => $a->id,
            'entry_id_b' => $b->id,
        ])->assertCreated()->json('merge.id');
    }

    private function split(LoadingPlanEntry $parent, int $childQty): int
    {
        return $this->postJson(route('loading-plan.splits.store'), [
            'parent_entry_id' => $parent->id,
            'child_qty'       => $childQty,
            'target_machine'  => 'M2',
        ])->assertCreated()->json('split.id');
    }

    private function assertQty(string $lotId, int $expected): void
    {
        $qty = LotQuantity::where('lot_id', $lotId)->where('scheduled_date', self::DATE)->first();
        $this->assertNotNull($qty, "no LotQuantity row for [{$lotId}]");
        $this->assertEquals($expected, $qty->effectiveQty(), "effectiveQty mismatch for [{$lotId}] (scenario setup step)");
    }

    /**
     * Effective qty of every lot that still has an entry on DATE (a reverted
     * split leaves its child's lot_quantities row behind, so counting rows
     * without entries would double-count), plus which splits/merges are active.
     */
    private function snapshot(): array
    {
        $liveLotIds = LoadingPlanEntry::where('scheduled_date', self::DATE)
            ->pluck('lot_id')
            ->filter()
            ->all();

        $qty = LotQuantity::where('scheduled_date', self::DATE)
            ->whereIn('lot_id', $liveLotIds)
            ->get()
            ->mapWithKeys(fn($q) => [$q->lot_id => (int) $q->effectiveQty()])
            ->sortKeys()
            ->all();

        return [
            'qty'    => $qty,
            'splits' => LotSplit::active()->orderBy('id')->pluck('id')->all(),
            'merges' => LotMerge::active()->orderBy('id')->pluck('id')->all(),
        ];
    }

    private function assertRejectedOrConsistent(TestResponse $response, array $before, ?int $expectedTotal, string $context): void
    {
        if ($response->getStatusCode() >= 400) {
            $this->assertEquals(
                $before,
                $this->snapshot(),
                "{$context}: rejected with {$response->getStatusCode()}, but state still changed"
            );

            return;
        }

        $after = $this->snapshot();

        $negative = array_filter($after['qty'], fn($q) => $q < 0);
        $this->assertSame([], $negative, "{$context}: accepted, but left negative quantities: " . json_encode($negative));

        if ($expectedTotal !== null) {
            $this->assertEquals(
                $expectedTotal,
                array_sum($after['qty']),
                "{$context}: accepted, but the total quantity across live lots changed: " . json_encode($after['qty'])
            );
        }
    }
}
