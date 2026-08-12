<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CapacityBandSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $now = now();

        $bands = [
            // VITROX
            ['platform' => 'VITROX', 'qty_min' => 1,     'qty_max' => 500,   'capacity_uph' => 110],
            ['platform' => 'VITROX', 'qty_min' => 501,   'qty_max' => 750,   'capacity_uph' => 357],
            ['platform' => 'VITROX', 'qty_min' => 751,   'qty_max' => 1000,  'capacity_uph' => 524],
            ['platform' => 'VITROX', 'qty_min' => 1001,  'qty_max' => 2500,  'capacity_uph' => 679],
            ['platform' => 'VITROX', 'qty_min' => 2501,  'qty_max' => 5000,  'capacity_uph' => 1187],
            ['platform' => 'VITROX', 'qty_min' => 5001,  'qty_max' => 7500,  'capacity_uph' => 2095],
            ['platform' => 'VITROX', 'qty_min' => 7501,  'qty_max' => 10000, 'capacity_uph' => 2752],
            ['platform' => 'VITROX', 'qty_min' => 10001, 'qty_max' => null,  'capacity_uph' => 4000],

            // HSI
            ['platform' => 'HSI', 'qty_min' => 1,     'qty_max' => 500,   'capacity_uph' => 110],
            ['platform' => 'HSI', 'qty_min' => 501,   'qty_max' => 750,   'capacity_uph' => 357],
            ['platform' => 'HSI', 'qty_min' => 751,   'qty_max' => 1000,  'capacity_uph' => 524],
            ['platform' => 'HSI', 'qty_min' => 1001,  'qty_max' => 2500,  'capacity_uph' => 679],
            ['platform' => 'HSI', 'qty_min' => 2501,  'qty_max' => 5000,  'capacity_uph' => 1276],
            ['platform' => 'HSI', 'qty_min' => 5001,  'qty_max' => 7500,  'capacity_uph' => 2263],
            ['platform' => 'HSI', 'qty_min' => 7501,  'qty_max' => 10000, 'capacity_uph' => 3050],
            ['platform' => 'HSI', 'qty_min' => 10001, 'qty_max' => null,  'capacity_uph' => 4000],

            // G6L
            ['platform' => 'G6L', 'qty_min' => 1,     'qty_max' => 500,   'capacity_uph' => 110],
            ['platform' => 'G6L', 'qty_min' => 501,   'qty_max' => 750,   'capacity_uph' => 357],
            ['platform' => 'G6L', 'qty_min' => 751,   'qty_max' => 1000,  'capacity_uph' => 524],
            ['platform' => 'G6L', 'qty_min' => 1001,  'qty_max' => 2500,  'capacity_uph' => 679],
            ['platform' => 'G6L', 'qty_min' => 2501,  'qty_max' => 5000,  'capacity_uph' => 1132],
            ['platform' => 'G6L', 'qty_min' => 5001,  'qty_max' => 7500,  'capacity_uph' => 1845],
            ['platform' => 'G6L', 'qty_min' => 7501,  'qty_max' => 10000, 'capacity_uph' => 2337],
            ['platform' => 'G6L', 'qty_min' => 10001, 'qty_max' => null,  'capacity_uph' => 4000],
        ];

        // Add timestamps to each row
        $bands = array_map(function ($band) use ($now) {
            $band['created_at'] = $now;
            $band['updated_at'] = $now;
            return $band;
        }, $bands);

        DB::table('capacity_bands')->insert($bands);
    }
}
