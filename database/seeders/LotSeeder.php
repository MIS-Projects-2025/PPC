<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\RackSlot;
use Illuminate\Support\Str;
use Carbon\Carbon;

class LotSeeder extends Seeder
{
    public function run(): void
    {
        $availableSlots = RackSlot::with('rack')->get();

        if ($availableSlots->isEmpty()) {
            $this->command->error('No RackSlots found. Seed those first!');
            return;
        }

        $employeeIds = ['1805', '2022', '3045', '1102'];
        $partNames = ['Resistor', 'Capacitor', 'IC-Chip', 'LED', 'MCU'];

        for ($i = 0; $i < 300; $i++) {
            $receivedAt = Carbon::now()
                ->subDays(rand(0, 30))
                ->subHours(rand(0, 23))
                ->subMinutes(rand(0, 59));

            $status = (rand(0, 1) === 1) ? 'staged' : 'released';
            $isReleased = ($status === 'released');
            $releasedAt = $isReleased ? (clone $receivedAt)->addHours(rand(1, 48)) : null;
            $releasedBy = $isReleased ? $employeeIds[array_rand($employeeIds)] : null;

            $randomSlots = $availableSlots->random(rand(1, 2));

            $productionLineId = $randomSlots->first()->rack->production_line_id;

            $lotId = DB::table('lots')->insertGetId([
                'lot_id'             => strtoupper(Str::random(8)),
                'partname'           => $partNames[array_rand($partNames)] . '-' . rand(100, 999),
                'qty'                => rand(50, 10000),
                'status'             => $status,
                'received_at'        => $receivedAt,
                'received_by'        => $employeeIds[array_rand($employeeIds)],
                'created_at'         => $receivedAt,
                'updated_at'         => $isReleased ? $releasedAt : $receivedAt,
                'released_at'        => $releasedAt,
                'released_by'        => $releasedBy,
            ]);

            foreach ($randomSlots as $slot) {
                DB::table('lot_positions')->insert([
                    'lot_id'       => $lotId,
                    'rack_slot_id' => $slot->id,
                    'production_line_id' => $productionLineId,
                    'assigned_at'  => $receivedAt,
                    'assigned_by'  => $employeeIds[array_rand($employeeIds)],
                    'released_at'  => $releasedAt,
                    'released_by'  => $releasedBy,
                ]);
            }
        }
    }
}
