<?php

namespace Database\Factories;

use App\Models\QdnMachine;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<QdnMachine> */
class QdnMachineFactory extends Factory
{
    protected $model = QdnMachine::class;

    public function definition(): array
    {
        return [
            'machine_num' => 'M' . $this->faker->unique()->numerify('###'),
        ];
    }
}
