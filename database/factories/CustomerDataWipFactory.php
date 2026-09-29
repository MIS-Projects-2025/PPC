<?php

namespace Database\Factories;

use App\Models\CustomerDataWip;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CustomerDataWip>
 *
 * ADJUST: if CustomerDataWip lives on a different DB connection than your
 * default app connection (common for a legacy import table like this,
 * given the capitalized columns), you'll need to give that connection an
 * sqlite/test equivalent too — see testing-notes.md.
 */
class CustomerDataWipFactory extends Factory
{
    protected $model = CustomerDataWip::class;

    public function definition(): array
    {
        return [
            'Lot_Id'       => 'LOT' . $this->faker->unique()->numerify('#####'),
            'Package_Name' => 'PKG-A',
            'Part_Name'    => 'PART-A',
            'Qty'          => 500,
            'import_date'  => now(),
        ];
    }
}
