<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RackAndLotSeeder extends Seeder
{
  public function run(): void
  {
    // 1. Create Production Line
    $plId = 1;

    // 2. Create 3 Racks (150 slots total)
    $racks = ['RACK-A', 'RACK-B', 'RACK-C'];
    $allSlotIds = [];

    foreach ($racks as $rackLabel) {
      $rackId = DB::table('racks')->insertGetId([
        'production_line_id' => $plId,
        'label' => $rackLabel,
      ]);

      foreach (range('A', 'E') as $layer) {
        for ($i = 1; $i <= 10; $i++) {
          $isFull = rand(1, 10) === 1; // 10% chance to be "Manually Full"

          $allSlotIds[] = DB::table('rack_slots')->insertGetId([
            'rack_id' => $rackId,
            'label' => $layer . str_pad($i, 2, '0', STR_PAD_LEFT),
            'is_manually_full' => $isFull,
            'marked_full_by' => $isFull ? 'OP999' : null,
            'marked_full_at' => $isFull ? now() : null,
          ]);
        }
      }
    }

    // 3. Generate 100 Lots using the helper function
    $lotsToCreate = $this->generateLots(100);

    $currentSlotIndex = 0;
    $totalAvailableSlots = count($allSlotIds);

    foreach ($lotsToCreate as $data) {
      // Check if we still have enough physical slots for this lot's size
      if ($currentSlotIndex + $data['slots'] > $totalAvailableSlots) {
        break; // Stop if the racks are physically full
      }

      $lotRecordId = DB::table('lots')->insertGetId([
        'lot_id'      => $data['id'],
        'partname'   => $data['part'],
        'qty'         => $data['qty'],
        'status'      => 'staged',
        'received_by' => 'OP001',
        'received_at' => now(),
      ]);

      // 4. Assign to N slots (handles multi-slot lots)
      for ($i = 0; $i < $data['slots']; $i++) {
        DB::table('lot_positions')->insert([
          'lot_id'       => $lotRecordId,
          'rack_slot_id' => $allSlotIds[$currentSlotIndex],
          'assigned_by'  => 'OP001',
          'assigned_at'  => now(),
        ]);
        $currentSlotIndex++;
      }
    }
  }

  /**
   * Helper to generate a specified number of lot data arrays
   */
  private function generateLots(int $count): array
  {
    $lots = [];
    $parts = ['ADXL312', 'AD8221ARZ', 'TMP36GRTZ', 'MAX3232', 'ESP32-WROOM'];

    for ($i = 0; $i < $count; $i++) {
      $part = $parts[array_rand($parts)];
      $prefix = strtoupper(Str::random(2));
      $suffix = rand(10000, 99999);

      // Randomly determine if it's a 1, 2, or 3 slot lot
      // 80% single, 15% double, 5% triple
      $roll = rand(1, 100);
      $slotsNeeded = ($roll > 95) ? 3 : (($roll > 80) ? 2 : 1);

      $lots[] = [
        'id'    => "{$prefix}{$suffix}.{$i};{$part};" . rand(2400, 2450) . ";" . rand(500, 5000) . ";1",
        'part'  => $part,
        'qty'   => rand(500, 5000),
        'slots' => $slotsNeeded
      ];
    }

    return $lots;
  }
}
