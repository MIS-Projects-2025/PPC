<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'qdn_db';

    public function up(): void
    {
        $connection = $this->connection;

        // Create capacity band groups
        Schema::connection($connection)->create('capacity_band_groups', function (Blueprint $table) {
            $table->string('code', 10)
                ->charset('utf8mb4')
                ->collation('utf8mb4_general_ci')
                ->primary();

            $table->string('label', 30);
        });

        // Seed groups
        DB::connection($connection)
            ->table('capacity_band_groups')
            ->insert([
                ['code' => 'F1F2', 'label' => 'F1 / F2'],
                ['code' => 'F3', 'label' => 'F3'],
            ]);

        // Add band_group and replace the old unique key
        Schema::connection($connection)
            ->table('machine_platform_capacity_bands', function (Blueprint $table) {
                $table->string('band_group', 10)
                    ->default('F1F2')
                    ->after('id');

                $table->foreign('band_group', 'fk_band_group')
                    ->references('code')
                    ->on('capacity_band_groups');

                $table->dropUnique('uq_platform_range');

                $table->unique(
                    ['band_group', 'platform', 'qty_min', 'qty_max'],
                    'uq_band'
                );
            });

        // Remove default after existing records have been assigned F1F2
        DB::connection($connection)->statement(
            'ALTER TABLE `machine_platform_capacity_bands`
             ALTER COLUMN `band_group` DROP DEFAULT'
        );

        // F3 capacity bands
        $f3Bands = [
            'G6L' => [
                [1, 499, 156],
                [500, 749, 505],
                [750, 999, 739],
                [1000, 3077, 960],
                [2500, 4999, 1740],
                [5000, 7499, 3872],
                [7500, 9999, 3077],
                [10000, 100000, 3405],
            ],

            'Vitrox' => [
                [1, 499, 156],
                [500, 749, 505],
                [750, 999, 739],
                [1000, 3077, 960],
                [2500, 4999, 2017],
                [5000, 7499, 4863],
                [7500, 9999, 4066],
                [10000, 100000, 4657],
            ],

            'HSI' => [
                [1, 499, 156],
                [500, 749, 505],
                [750, 999, 739],
                [1000, 3077, 960],
                [2500, 4999, 2106],
                [5000, 7499, 5219],
                [7500, 9999, 4445],
                [10000, 100000, 5162],
            ],
        ];

        $rows = [];

        foreach ($f3Bands as $platform => $ranges) {
            foreach ($ranges as [$qtyMin, $qtyMax, $capacityUph]) {
                $rows[] = [
                    'band_group' => 'F3',
                    'platform' => $platform,
                    'qty_min' => $qtyMin,
                    'qty_max' => $qtyMax,
                    'capacity_uph' => $capacityUph,
                ];
            }
        }

        DB::connection($connection)
            ->table('machine_platform_capacity_bands')
            ->insert($rows);
    }

    public function down(): void
    {
        $connection = $this->connection;

        // Remove F3 seed data
        DB::connection($connection)
            ->table('machine_platform_capacity_bands')
            ->where('band_group', 'F3')
            ->delete();

        // Restore the original unique key and remove band_group
        Schema::connection($connection)
            ->table('machine_platform_capacity_bands', function (Blueprint $table) {
                $table->dropUnique('uq_band');

                $table->unique(
                    ['platform', 'qty_min', 'qty_max'],
                    'uq_platform_range'
                );

                $table->dropForeign('fk_band_group');

                $table->dropColumn('band_group');
            });

        // Drop the group table
        Schema::connection($connection)
            ->dropIfExists('capacity_band_groups');
    }
};
