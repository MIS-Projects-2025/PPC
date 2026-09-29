<?php

namespace Database\Factories;

use App\Models\LotSplit;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<LotSplit> */
class LotSplitFactory extends Factory
{
    protected $model = LotSplit::class;

    public function definition(): array
    {
        return [
            'parent_lot_id'           => 'LOT-PARENT',
            'child_lot_id'            => 'LOT-PARENT.2',
            'root_lot_id'             => 'LOT-PARENT',
            'scheduled_date'          => now()->toDateString(),
            'child_qty'               => 100,
            'split_percentage'        => 10.0,
            'target_machine'          => 'M1',
            'sequence_order_at_split' => 1000.0,
            'created_by'              => 'tester',
            'reverted_at'             => null,
            'reverted_by'             => null,
        ];
    }

    public function reverted(): static
    {
        return $this->state(fn () => [
            'reverted_at' => now(),
            'reverted_by' => 'tester',
        ]);
    }
}
