<?php

namespace Tests\Feature\LoadingPlan;

use App\Models\LoadingPlanEntry;
use Illuminate\Support\Facades\DB;

/**
 * sequence_order is what every machine's timeline is built on — if two rows
 * collide or the order silently shuffles, times cascade wrong from there.
 *
 * Inserting between two rows takes the midpoint of their orders, so
 * repeatedly inserting into the same gap halves it each time (1000, 500,
 * 250 ...) until it drops below MIN_GAP and the service falls back to
 * rebalance(). These tests hammer exactly that, plus a seeded random walk
 * checked against a simple in-memory model of what the order SHOULD be.
 *
 * Needs the real MySQL test database (not sqlite): rebalance() relies on
 * raw CASE UPDATEs under the uniq_machine_sequence_per_day unique index.
 */
class SequenceOrderTest extends LoadingPlanFeatureTestCase
{
    private const DATE = '2026-03-02';

    public function test_inserting_into_one_gap_repeatedly_exhausts_it_and_rebalances_with_both_anchors(): void
    {
        $this->exhaustGapAndVerify('both');
    }

    /**
     * SUSPECTED BUG. With only before_entry_id, the service fills in the
     * other neighbour from the DB. But once the gap is exhausted, the
     * fallback in resolveSequenceOrder() re-looks-up only the ids that were
     * actually sent — so the missing neighbour is null, and the new order
     * becomes before + GAP_SEED. After a rebalance rows are spaced exactly
     * GAP_SEED apart, so that lands on the next row's slot -> duplicate key.
     */
    public function test_inserting_into_one_gap_repeatedly_with_only_a_before_anchor(): void
    {
        $this->exhaustGapAndVerify('before-only');
    }

    /** Same suspected bug, mirrored: after - GAP_SEED lands on the previous row's slot. */
    public function test_inserting_into_one_gap_repeatedly_with_only_an_after_anchor(): void
    {
        $this->exhaustGapAndVerify('after-only');
    }

    public function test_transfers_into_an_exhausted_gap_rebalance_the_target_machine(): void
    {
        $m1 = $this->machine('M1');
        $m2 = $this->machine('M2');

        $a = $this->lot('LOT-A', $m1, 1000);
        $b = $this->lot('LOT-B', $m1, 2000);

        $movers = [];
        for ($i = 0; $i < 30; $i++) {
            $movers[] = $this->lot('MOVER-' . $i, $m2, ($i + 1) * 1000);
        }

        $previous = $b;
        foreach ($movers as $i => $mover) {
            $this->sendOk('loading-plan.transfer', [
                'entry_type'      => 'lot',
                'entry_id'        => $mover->id,
                'target_machine'  => 'M1',
                'before_entry_id' => $a->id,
                'after_entry_id'  => $previous->id,
            ], "transfer #{$i}");

            $previous = $mover;
        }

        $expected = array_merge(['LOT-A'], array_reverse(array_map(fn($m) => $m->lot_id, $movers)), ['LOT-B']);
        $this->assertSame($expected, $this->lotIdsOn($m1));
        $this->assertSame([], $this->lotIdsOn($m2), 'every mover should have left M2');

        $this->assertRebalanceHappened($movers[0]);
        $this->assertNoSequenceCollisions();
    }

    public function test_repeated_front_inserts_keep_order_even_as_sequence_orders_go_negative(): void
    {
        $m1 = $this->machine('M1');
        $first = $this->lot('LOT-FIRST', $m1, 1000);

        $movers = [];
        for ($i = 0; $i < 6; $i++) {
            $movers[] = $this->lot("LOT-FRONT-{$i}", $m1, 100000 + ($i * 1000));
        }

        $currentFirst = $first;
        foreach ($movers as $i => $mover) {
            $this->sendOk('loading-plan.move', [
                'entry_type'     => 'lot',
                'entry_id'       => $mover->id,
                'after_entry_id' => $currentFirst->id,
                'machine'        => 'M1',
            ], "front insert #{$i}");

            $currentFirst = $mover;
        }

        $expected = array_merge(array_reverse(array_map(fn($m) => $m->lot_id, $movers)), ['LOT-FIRST']);
        $this->assertSame($expected, $this->lotIdsOn($m1));
        $this->assertLessThan(0, (float) $movers[5]->fresh()->sequence_order);
        $this->assertNoSequenceCollisions();
    }

    public function test_dropping_an_entry_back_into_its_own_slot_and_swapping_neighbours(): void
    {
        $m1 = $this->machine('M1');
        $x = $this->lot('LOT-X', $m1, 1000);
        $y = $this->lot('LOT-Y', $m1, 2000);
        $z = $this->lot('LOT-Z', $m1, 3000);

        // Y dropped between the neighbours it already has
        $this->sendOk('loading-plan.move', [
            'entry_type' => 'lot',
            'entry_id' => $y->id,
            'before_entry_id' => $x->id,
            'after_entry_id' => $z->id,
            'machine' => 'M1',
        ], 'y into its own slot');
        $this->assertSame(['LOT-X', 'LOT-Y', 'LOT-Z'], $this->lotIdsOn($m1));

        // X moved after Y (adjacent swap)
        $this->sendOk('loading-plan.move', [
            'entry_type' => 'lot',
            'entry_id' => $x->id,
            'before_entry_id' => $y->id,
            'after_entry_id' => $z->id,
            'machine' => 'M1',
        ], 'x after y');
        $this->assertSame(['LOT-Y', 'LOT-X', 'LOT-Z'], $this->lotIdsOn($m1));

        // Z to the very front
        $this->sendOk('loading-plan.move', [
            'entry_type' => 'lot',
            'entry_id' => $z->id,
            'after_entry_id' => $y->id,
            'machine' => 'M1',
        ], 'z to the front');
        $this->assertSame(['LOT-Z', 'LOT-Y', 'LOT-X'], $this->lotIdsOn($m1));

        $this->assertNoSequenceCollisions();
    }

    /**
     * Seeded random walk of moves, transfers, unassigns and re-placements,
     * checked after EVERY step against an in-memory model of the order the
     * DB should have. A share of the moves are "hot": take the last entry
     * and drop it into slot 1, over and over, which halves the same gap
     * until a rebalance kicks in mid-run. Rerun with the same seed to
     * reproduce a failure exactly; the failure message says which step.
     */
    public function test_random_moves_transfers_and_unassigns_always_match_an_in_memory_model(): void
    {
        $seed = 20260302;
        mt_srand($seed);

        $machineIds = [
            'M1' => $this->machine('M1')->id,
            'M2' => $this->machine('M2')->id,
        ];
        $machineModels = [
            'M1' => \App\Models\QdnMachine::find($machineIds['M1']),
            'M2' => \App\Models\QdnMachine::find($machineIds['M2']),
        ];

        // model: machine => entry ids in the order they SHOULD be sequenced;
        // 'U' => unassigned entry ids (order irrelevant)
        $model = ['M1' => [], 'M2' => [], 'U' => []];

        for ($i = 0; $i < 10; $i++) {
            $name = $i < 5 ? 'M1' : 'M2';
            $entry = $this->lot("LOT-{$i}", $machineModels[$name], (($i % 5) + 1) * 1000);
            $model[$name][] = (int) $entry->id;
        }

        for ($i = 10; $i < 12; $i++) {
            $entry = LoadingPlanEntry::factory()->create([
                'lot_id'         => "LOT-{$i}",
                'scheduled_date' => self::DATE,
            ]);
            $model['U'][] = (int) $entry->id;
        }

        $this->assertModelMatchesDatabase($model, $machineIds, 'initial setup');

        $steps = 120;

        for ($step = 1; $step <= $steps; $step++) {
            $roll = mt_rand(1, 100);
            $action = match (true) {
                $roll <= 45 => 'hot',
                $roll <= 70 => 'move',
                $roll <= 85 => 'transfer',
                $roll <= 93 => 'unassign',
                default     => 'place',
            };

            $description = $this->applyRandomAction($action, $model, $machineIds);

            $this->assertModelMatchesDatabase($model, $machineIds, "seed {$seed}, step {$step}: {$description}");
        }
    }

    // ------------------------------------------------------------------
    // shared scenario + random-walk helpers
    // ------------------------------------------------------------------

    private function exhaustGapAndVerify(string $anchors): void
    {
        $m1 = $this->machine('M1');

        $a = $this->lot('LOT-A', $m1, 1000);
        $b = $this->lot('LOT-B', $m1, 2000);

        // movers start parked after B; each one is then moved into the gap
        // between A and the previously moved mover, so that gap halves
        // every time: 1000, 500, 250 ... below MIN_GAP around insert 21
        $movers = [];
        for ($i = 0; $i < 30; $i++) {
            $movers[] = $this->lot('MOVER-' . $i, $m1, 3000 + ($i * 1000));
        }

        $previous = $b;
        foreach ($movers as $i => $mover) {
            $payload = [
                'entry_type' => 'lot',
                'entry_id'   => $mover->id,
                'machine'    => 'M1',
            ];

            if ($anchors !== 'after-only') {
                $payload['before_entry_id'] = $a->id;
            }
            if ($anchors !== 'before-only') {
                $payload['after_entry_id'] = $previous->id;
            }

            $this->sendOk('loading-plan.move', $payload, "insert #{$i} ({$anchors})");

            $previous = $mover;
        }

        // newest mover sits closest to A, oldest closest to B
        $expected = array_merge(['LOT-A'], array_reverse(array_map(fn($m) => $m->lot_id, $movers)), ['LOT-B']);
        $this->assertSame($expected, $this->lotIdsOn($m1), "order after exhausting the gap ({$anchors})");

        $this->assertRebalanceHappened($movers[0]);
        $this->assertNoSequenceCollisions();
    }

    /**
     * MOVER-0 is first placed at 1500 (not a multiple of 1000). Only a
     * rebalance re-spaces it onto a whole multiple of 1000 — so this proves
     * the exhaustion/rebalance path was really exercised, not skipped.
     */
    private function assertRebalanceHappened(LoadingPlanEntry $firstMover): void
    {
        $this->assertEquals(
            0.0,
            fmod((float) $firstMover->fresh()->sequence_order, 1000.0),
            'expected a rebalance to have re-spaced the first mover onto a multiple of 1000 — the gap was never exhausted'
        );
    }

    private function applyRandomAction(string $action, array &$model, array $machineIds): string
    {
        $names = array_keys($machineIds);

        $eligible = fn(string $a): array => match ($a) {
            'hot'                  => array_values(array_filter($names, fn($n) => count($model[$n]) >= 3)),
            'move'                 => array_values(array_filter($names, fn($n) => count($model[$n]) >= 2)),
            'transfer', 'unassign' => array_values(array_filter($names, fn($n) => count($model[$n]) >= 1)),
            'place'                => empty($model['U']) ? [] : $names,
            default                => [],
        };

        // fall back if the rolled action isn't possible in the current state
        $machines = [];
        foreach ([$action, 'move', 'transfer', 'place', 'unassign'] as $candidate) {
            $machines = $eligible($candidate);
            if (! empty($machines)) {
                $action = $candidate;
                break;
            }
        }

        switch ($action) {
            case 'hot':
            case 'move':
                $name = $machines[mt_rand(0, count($machines) - 1)];
                $list = $model[$name];
                $index = $action === 'hot' ? count($list) - 1 : mt_rand(0, count($list) - 1);
                $moverId = $list[$index];

                $remaining = $list;
                array_splice($remaining, $index, 1);
                $pos = $action === 'hot' ? 1 : mt_rand(0, count($remaining));

                $payload = ['entry_type' => 'lot', 'entry_id' => $moverId, 'machine' => $name]
                    + $this->anchorsFor($remaining, $pos);
                $description = "{$action}: entry {$moverId} to position {$pos} on {$name} " . json_encode($payload);
                $this->sendOk('loading-plan.move', $payload, $description);

                array_splice($remaining, $pos, 0, [$moverId]);
                $model[$name] = $remaining;

                return $description;

            case 'transfer':
                $from = $machines[mt_rand(0, count($machines) - 1)];
                $to = $from === 'M1' ? 'M2' : 'M1';
                $index = mt_rand(0, count($model[$from]) - 1);
                $moverId = $model[$from][$index];

                $target = $model[$to];
                $pos = mt_rand(0, count($target));

                $payload = ['entry_type' => 'lot', 'entry_id' => $moverId, 'target_machine' => $to]
                    + $this->anchorsFor($target, $pos);
                $description = "transfer: entry {$moverId} from {$from} to position {$pos} on {$to} " . json_encode($payload);
                $this->sendOk('loading-plan.transfer', $payload, $description);

                array_splice($model[$from], $index, 1);
                array_splice($target, $pos, 0, [$moverId]);
                $model[$to] = $target;

                return $description;

            case 'unassign':
                $from = $machines[mt_rand(0, count($machines) - 1)];
                $index = mt_rand(0, count($model[$from]) - 1);
                $moverId = $model[$from][$index];

                $payload = ['entry_type' => 'lot', 'entry_id' => $moverId, 'target_machine' => null];
                $description = "unassign: entry {$moverId} off {$from}";
                $this->sendOk('loading-plan.transfer', $payload, $description);

                array_splice($model[$from], $index, 1);
                $model['U'][] = $moverId;

                return $description;

            case 'place':
                $index = mt_rand(0, count($model['U']) - 1);
                $moverId = $model['U'][$index];
                $to = $machines[mt_rand(0, count($machines) - 1)];

                $target = $model[$to];
                $pos = mt_rand(0, count($target));

                $payload = ['entry_type' => 'lot', 'entry_id' => $moverId, 'target_machine' => $to]
                    + $this->anchorsFor($target, $pos);
                $description = "place: unassigned entry {$moverId} to position {$pos} on {$to} " . json_encode($payload);
                $this->sendOk('loading-plan.transfer', $payload, $description);

                array_splice($model['U'], $index, 1);
                array_splice($target, $pos, 0, [$moverId]);
                $model[$to] = $target;

                return $description;
        }

        return 'no-op';
    }

    /**
     * before/after neighbour ids for inserting at $pos in $remaining. Randomly
     * sends only one of them so the service's "fill in the other neighbour"
     * path gets exercised too — but never drops the only anchor there is
     * (both null would mean "append to the end").
     */
    private function anchorsFor(array $remaining, int $pos): array
    {
        $before = $pos > 0 ? $remaining[$pos - 1] : null;
        $after = $pos < count($remaining) ? $remaining[$pos] : null;

        $mode = mt_rand(0, 2); // 0 = both, 1 = before only, 2 = after only
        if ($mode === 1 && $before !== null) {
            $after = null;
        } elseif ($mode === 2 && $after !== null) {
            $before = null;
        }

        return ['before_entry_id' => $before, 'after_entry_id' => $after];
    }

    private function assertModelMatchesDatabase(array $model, array $machineIds, string $context): void
    {
        foreach ($machineIds as $name => $machineId) {
            $actual = LoadingPlanEntry::where('machine_id', $machineId)
                ->where('scheduled_date', self::DATE)
                ->orderBy('sequence_order')
                ->pluck('id')
                ->map(fn($id) => (int) $id)
                ->all();

            $this->assertSame($model[$name], $actual, "{$context} — order on {$name} diverged from the model");
        }

        $unassigned = LoadingPlanEntry::whereNull('machine_id')
            ->where('scheduled_date', self::DATE)
            ->pluck('id')
            ->map(fn($id) => (int) $id)
            ->sort()
            ->values()
            ->all();

        $expectedUnassigned = collect($model['U'])->sort()->values()->all();

        $this->assertSame($expectedUnassigned, $unassigned, "{$context} — unassigned set diverged from the model");
        $this->assertNoSequenceCollisions();
    }

    private function sendOk(string $routeName, array $payload, string $context): void
    {
        $response = $this->postJson(route($routeName), $payload);

        $this->assertSame(
            200,
            $response->getStatusCode(),
            "{$context} — expected 200, got {$response->getStatusCode()}: " . $response->getContent()
        );
    }

    private function lot(string $lotId, $machine, float $order): LoadingPlanEntry
    {
        return LoadingPlanEntry::factory()->onMachine($machine, $order)->create([
            'lot_id'         => $lotId,
            'scheduled_date' => self::DATE,
        ]);
    }

    private function lotIdsOn($machine): array
    {
        return LoadingPlanEntry::where('machine_id', $machine->id)
            ->where('scheduled_date', self::DATE)
            ->orderBy('sequence_order')
            ->pluck('lot_id')
            ->all();
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
}
