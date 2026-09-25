<?php

namespace Database\Factories;

use App\Models\LotMerge;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<LotMerge> */
class LotMergeFactory extends Factory
{
    protected $model = LotMerge::class;

    public function definition(): array
    {
        return [
            'target_lot_id'   => 'LOT-A',
            'source_lot_id'   => 'LOT-B',
            'scheduled_date'  => now()->toDateString(),
            'transferred_qty' => 100,
            'created_by'      => 'tester',
            'reverted_at'     => null,
            'reverted_by'     => null,
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
