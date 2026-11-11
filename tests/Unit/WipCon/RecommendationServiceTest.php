<?php

namespace Tests\Unit;

use App\Models\BoxDimension;
use App\Services\RecommendationService;
use PHPUnit\Framework\TestCase;

/**
 * Engine tests from section 10 of the Phase 2 document. They run on hand-built snapshots, so no
 * database is involved. Allowances are pinned (gap 0, margin 0, clearance 0, cap 1.0) so every
 * number below can be checked by hand; the cap test overrides it.
 *
 * Not covered here (they need the database): "unknown dimension in any occupant makes the slot
 * untracked" lives in snapshot(), and the commit/kill-switch integration tests.
 */
class RecommendationServiceTest extends TestCase
{
    private RecommendationService $svc;

    protected function setUp(): void
    {
        $this->svc = (new RecommendationService())->useSettings([
            'column_gap'       => 0.0,
            'end_margin'       => 0.0,
            'height_clearance' => 0.0,
            'utilization_cap'  => 1.0,
        ]);
    }

    // ---- helpers -----------------------------------------------------

    private function dim(int $id, int $length, int $height, int $depth = 2): BoxDimension
    {
        return (new BoxDimension())->forceFill(['id' => $id, 'length' => $length, 'height' => $height, 'depth_units' => $depth]);
    }

    /** 100 x 100 full-depth box: with slot height 100 every box is its own column, footprint 100. */
    private function box(): BoxDimension
    {
        return $this->dim(1, 100, 100);
    }

    private function slot(int $id, array $used = [0, 0], array $over = []): array
    {
        return array_merge([
            'id'              => $id,
            'label'           => sprintf('A%02d', $id),
            'rack_key'        => '1:A',
            'height'          => 100,
            'usable'          => 1000,
            'tracked'         => true,
            'lanes_all'       => [(float) $used[0], (float) $used[1]],
            'lanes_confirmed' => [(float) $used[0], (float) $used[1]],
            'lot_ids'         => [],
            'dimension_ids'   => [],
            'has_mini'        => false,
        ], $over);
    }

    private function snap(array ...$slots): array
    {
        return array_column($slots, null, 'id');
    }

    private function call(string $method, mixed ...$args): mixed
    {
        $m = new \ReflectionMethod($this->svc, $method);
        $m->setAccessible(true);

        return $m->invoke($this->svc, ...$args);
    }

    private function slotIds(?array $rec): ?array
    {
        return $rec === null ? null : array_column($rec, 'slot_id');
    }

    // ---- capacity arithmetic ------------------------------------------

    public function test_worked_example_from_the_document(): void
    {
        $svc = (new RecommendationService())->useSettings([
            'column_gap' => 1.0,
            'end_margin' => 0.0,
            'height_clearance' => 0.0,
            'utilization_cap' => 1.0,
        ]);
        $settings = (new \ReflectionMethod($svc, 'settings'));
        $settings->setAccessible(true);
        $s = $settings->invoke($svc);

        $footprint = new \ReflectionMethod($svc, 'footprint');
        $footprint->setAccessible(true);

        // Slot height 20. A: 3 identical 40x5 boxes stack in one column. B: 30x8. C: 25x10.
        $a = $footprint->invoke($svc, $this->dim(1, 40, 5), 3, 20, $s);
        $b = $footprint->invoke($svc, $this->dim(2, 30, 8), 1, 20, $s);
        $c = $footprint->invoke($svc, $this->dim(3, 25, 10), 1, 20, $s);

        $this->assertEquals(41, $a);
        $this->assertEquals(31, $b);
        $this->assertEquals(26, $c);
        $this->assertEquals(98, $a + $b + $c);
        $this->assertEquals(2, 100 - ($a + $b + $c)); // remaining on a 100 long slot
    }

    public function test_mini_pizzas_fill_the_emptier_lane_and_full_depth_uses_both(): void
    {
        $mini  = $this->dim(2, 100, 100, 1);
        $lanes = [0.0, 0.0];

        $m = new \ReflectionMethod($this->svc, 'addToLanes');
        $m->setAccessible(true);

        $m->invokeArgs($this->svc, [&$lanes, $mini, 1000.0]);
        $this->assertEquals([1000.0, 0.0], $lanes);

        $m->invokeArgs($this->svc, [&$lanes, $mini, 1000.0]);
        $this->assertEquals([1000.0, 1000.0], $lanes); // capacity is twice the usable length

        $m->invokeArgs($this->svc, [&$lanes, $this->box(), 50.0]);
        $this->assertEquals([1050.0, 1050.0], $lanes);
    }

    public function test_full_depth_needs_both_lanes_but_a_mini_needs_one(): void
    {
        $snapshot = $this->snap($this->slot(1, [1000, 0]));

        $this->assertNull($this->svc->recommend($snapshot, $this->box(), 1));
        $this->assertSame([1], $this->slotIds($this->svc->recommend($snapshot, $this->dim(2, 100, 100, 1), 1)));
    }

    // ---- eligibility ----------------------------------------------------

    public function test_tub_or_untracked_slots_are_never_recommended(): void
    {
        $snapshot = $this->snap($this->slot(1, [0, 0], ['tracked' => false]));

        $this->assertNull($this->svc->recommend($snapshot, $this->box(), 1));
    }

    public function test_a_slot_at_the_utilization_cap_is_not_offered(): void
    {
        $svc = (new RecommendationService())->useSettings([
            'column_gap' => 0.0,
            'end_margin' => 0.0,
            'height_clearance' => 0.0,
            'utilization_cap' => 0.85,
        ]);

        // cap = 850. Used 750 leaves exactly 100; used 760 leaves 90.
        $this->assertNotNull($svc->recommend($this->snap($this->slot(1, [750, 750])), $this->box(), 1));
        $this->assertNull($svc->recommend($this->snap($this->slot(1, [760, 760])), $this->box(), 1));
    }

    public function test_a_lot_that_fits_nowhere_returns_null(): void
    {
        // Two slots with 300 free each: 3 boxes each, 6 in total, the lot has 10.
        $snapshot = $this->snap($this->slot(1, [700, 700]), $this->slot(2, [700, 700]));

        $this->assertNull($this->svc->recommend($snapshot, $this->box(), 10));
    }

    // ---- ranking ----------------------------------------------------------

    public function test_confirmed_free_space_ranks_before_presumed_free_space(): void
    {
        // Slot 1 only has room if its presumed-released lots are really gone. Slot 2 has confirmed room.
        $presumed = $this->slot(1, [1000, 1000], ['lanes_confirmed' => [0.0, 0.0]]);
        $confirmed = $this->slot(2, [900, 900]);

        $rec = $this->svc->recommend($this->snap($presumed, $confirmed), $this->box(), 1);
        $this->assertSame([2], $this->slotIds($rec));
        $this->assertFalse($rec[0]['unverified']);

        $rec = $this->svc->recommend($this->snap($presumed), $this->box(), 1);
        $this->assertSame([1], $this->slotIds($rec));
        $this->assertTrue($rec[0]['unverified']);
    }

    public function test_merged_lot_affinity_beats_same_dimension_beats_largest_free_space(): void
    {
        $empty   = $this->slot(1);                                                        // most free space
        $sameDim = $this->slot(2, [500, 500], ['dimension_ids' => [1 => true]]);
        $sameLot = $this->slot(3, [900, 900], ['lot_ids' => [7 => true]]);               // least free space

        $all = $this->snap($empty, $sameDim, $sameLot);

        $this->assertSame([3], $this->slotIds($this->svc->recommend($all, $this->box(), 1, 7)));
        $this->assertSame([2], $this->slotIds($this->svc->recommend($all, $this->box(), 1)));
        $this->assertSame([1], $this->slotIds($this->svc->recommend($this->snap($empty, $this->slot(4, [900, 900])), $this->box(), 1)));
    }

    public function test_same_lot_in_the_same_rack_beats_other_racks(): void
    {
        $other = $this->slot(1, [0, 0], ['rack_key' => '2:B']);
        $inRack = $this->slot(2, [800, 800], ['rack_key' => '1:A']);
        $holder = $this->slot(3, [0, 0], ['rack_key' => '1:A', 'lot_ids' => [7 => true], 'tracked' => false]);

        $this->assertSame([2], $this->slotIds($this->svc->recommend($this->snap($other, $inRack, $holder), $this->box(), 1, 7)));
    }

    public function test_ties_go_to_the_lower_slot(): void
    {
        $this->assertSame([1], $this->slotIds($this->svc->recommend($this->snap($this->slot(2), $this->slot(1)), $this->box(), 1)));
    }

    // ---- combinations -----------------------------------------------------

    public function test_a_split_lot_uses_the_fewest_slots(): void
    {
        // 7 boxes. Free: 300 (3 boxes) in slots 1-3, 500 (5 boxes) in slot 4. No single slot takes 7.
        $snapshot = $this->snap(
            $this->slot(1, [700, 700]),
            $this->slot(2, [700, 700]),
            $this->slot(3, [700, 700]),
            $this->slot(4, [500, 500]),
        );

        $rec = $this->svc->recommend($snapshot, $this->box(), 7);

        $this->assertCount(2, $rec);
        $this->assertSame(7, array_sum(array_column($rec, 'boxes')));
        $this->assertSame(5, array_column($rec, 'boxes', 'slot_id')[4]);
    }

    // ---- logging ----------------------------------------------------------

    public function test_adherence(): void
    {
        $rec = [['slot_id' => 1, 'boxes' => 4], ['slot_id' => 2, 'boxes' => 2]];

        $this->assertSame('full', $this->svc->adherence($rec, [2, 1]));
        $this->assertSame('partial', $this->svc->adherence($rec, [1]));
        $this->assertSame('partial', $this->svc->adherence($rec, [1, 2, 3]));
        $this->assertSame('none', $this->svc->adherence($rec, [9]));
        $this->assertNull($this->svc->adherence(null, [1]));
    }
}
