<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class RackAndSlotSeeder extends Seeder
{
  public function run(): void
  {
    $now = Carbon::now();

    // Map the Production Line names to their respective Racks and Slots
    $config = [
      'PL6' => [
        'Middle-racks' => [
          'A01',
          'A02',
          'A03',
          'A04',
          'B01',
          'B02',
          'B03',
          'B04',
          'C01',
          'C02',
          'C03',
          'C04',
          'D01',
          'D02',
          'D03',
          'D04'
        ],
        'corner-racks' => [
          'A01',
          'A02',
          'A03',
          'A04',
          'A05',
          'B01',
          'B02',
          'B03',
          'B04',
          'B05',
          'C01',
          'C02',
          'C03',
          'C04',
          'C05',
          'D01',
          'D02',
          'D03',
          'D04',
          'D05',
          'E01',
          'E02',
          'E03',
          'E04',
          'E05'
        ],
      ],
      'PL1' => [
        'Rack-1' => [
          'A01',
          'A02',
          'A03',
          'A04',
          'B01',
          'B02',
          'B03',
          'B04'
        ],
        'Rack-2' => [
          'A01',
          'A02',
          'A03',
          'A04',
          'B01',
          'B02',
          'B03',
          'B04'
        ],
      ],
    ];

    foreach ($config as $plName => $racks) {
      $plId = DB::table('production_lines')->where('name', $plName)->value('id');

      if (!$plId) {
        continue;
      }

      foreach ($racks as $rackLabel => $slots) {
        DB::table('racks')->updateOrInsert(
          ['label' => $rackLabel, 'production_line_id' => $plId],
          ['created_at' => $now, 'updated_at' => $now]
        );

        $rackId = DB::table('racks')
          ->where('label', $rackLabel)
          ->where('production_line_id', $plId)
          ->value('id');

        $slotInserts = [];
        foreach ($slots as $slotLabel) {
          $slotInserts[] = [
            'rack_id' => $rackId,
            'label' => $slotLabel,
            'is_manually_full' => 0,
            'is_active' => 1,
            'created_at' => $now,
            'updated_at' => $now
          ];
        }

        DB::table('rack_slots')->insertOrIgnore($slotInserts);
      }
    }
  }
}
