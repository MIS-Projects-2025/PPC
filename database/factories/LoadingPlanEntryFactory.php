<?php

namespace Database\Factories;

use App\Models\LoadingPlanEntry;
use App\Models\QdnMachine;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LoadingPlanEntry>
 *
 * ADJUST: fields below are inferred from LoadingPlanEntryService /
 * LoadingPlanEntryController usage, not from the actual migration.
 * Verify column names/types (esp. sequence_order type, lock_version
 * default, finalized_at/machine_snapshot) against your schema.
 */
class LoadingPlanEntryFactory extends Factory
{
    protected $model = LoadingPlanEntry::class;

    public function definition(): array
    {
        return [
            'entry_type'     => 'lot',
            'lot_id'         => 'LOT' . $this->faker->unique()->numerify('#####'),
            'package_name'   => 'PKG-A',
            'scheduled_date' => now()->toDateString(),
            'machine_id'     => null,
            'sequence_order' => null,
            'status'         => 'NONE',
            'remarks'        => null,
            'tag'            => null,
            'accu_time'      => 10,
            'block_label'    => null,
            'lock_version'   => 1,
            'finalized_at'   => null,
        ];
    }

    public function block(): static
    {
        return $this->state(fn () => [
            'entry_type'   => 'block',
            'lot_id'       => null,
            'package_name' => null,
            'block_label'  => 'Gap',
        ]);
    }

    public function onMachine(QdnMachine|int|string $machine, float $sequenceOrder = 1000.0): static
    {
        $machineId = $machine instanceof QdnMachine ? $machine->id : $machine;

        return $this->state(fn () => [
            'machine_id'     => $machineId,
            'sequence_order' => $sequenceOrder,
        ]);
    }

    public function finalized(): static
    {
        return $this->state(fn () => [
            'finalized_at' => now(),
        ]);
    }
}
