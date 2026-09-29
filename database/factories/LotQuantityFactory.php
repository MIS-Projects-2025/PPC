<?php

namespace Database\Factories;

use App\Models\LotQuantity;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LotQuantity>
 *
 * ADJUST: effectiveQty() is assumed to be qty_base + split_adjustment +
 * merge_adjustment — verify against the real model method.
 */
class LotQuantityFactory extends Factory
{
    protected $model = LotQuantity::class;

    public function definition(): array
    {
        return [
            'lot_id'                => 'LOT' . $this->faker->unique()->numerify('#####'),
            'scheduled_date'        => now()->toDateString(),
            'part_name'             => 'PART-A',
            'qty_base'              => 1000,
            'split_adjustment'      => 0,
            'merge_adjustment'      => 0,
            'recipe_used'           => null,
            'recipe_source_id'      => null,
            'commit'                => 0,
            'recipe_status'         => 'ok',
            'capacity_uph_snapshot' => null,
        ];
    }
}
