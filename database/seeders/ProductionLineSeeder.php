<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProductionLineSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('production_lines')->insert([
            ['name' => 'PL1', 'is_active' => 1],
            ['name' => 'PL6', 'is_active' => 1],
        ]);
    }
}
