<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Carbon\Carbon;

/**
 * Seeds only the tables the Loading Plan feature actually reads/writes:
 *
 *   - machines             (LotScheduleCalculator platform lookups / MACHINES config)
 *   - capacity_bands       (LotScheduleCalculator::capacityUph)
 *   - customer_data_wip    (LoadingPlanController::index -> CustomerDataWip)
 *   - loading_plan_entries (LoadingPlanController::index -> LoadingPlanEntry)
 *
 * Everything else in the dump (f3_*, employee_masterlist, ppc_pickupdb,
 * lots/racks/rack_slots, sessions, jobs, etc.) is intentionally skipped —
 * none of it is touched by LoadingPlanController, CustomerDataWip, or
 * LotScheduleCalculator.
 *
 * Run with:
 *   php artisan db:seed --class=Database\\Seeders\\LoadingPlanSeeder
 */
class LoadingPlanSeeder extends Seeder
{
    /** Real tape-reel stations from config/wip.php, minus the 3 post-TNR
     *  stations (GTTFVI_T, GTTOQA_T, GTTBOX_T) that
     *  CustomerDataWip::scopeExcludingPostTnr() filters out afterward —
     *  no point seeding rows into buckets the controller always excludes. */
    private array $tapeReelStations = [
        'GTTLLI_T',
        'GTREEL_T',
        'GTBKIPBE_T',
        'GTBKLDBE_T',
        'GTBRAND_T',
        'GTIQA_T',
        'GTTRANS_T',
        'GTLPI_T',
        'GTCARIER_T',
        'GTBKULBE_T',
        'GTFORM_T',
    ];

    private array $packages = [
        'LQFN',
        'DFN',
        'QFN',
        'LQFN_EP',
        'LFCSP',
        'LGA',
        'LGA_CAV',
        'CBGA',
        'SOIC',
        'TQFP',
        'BGA',
    ];

    private array $lotTypes = ['NORMAL', 'HOT', 'ENGINEERING', 'RESAMPLE'];
    private array $lotStatuses = ['ACTIVE', 'HOLD', 'RELEASED'];
    private array $focusGroups = ['CV', 'LTI', 'LTCL', 'LT', 'STD'];
    private array $stages = ['STAGE1', 'STAGE2', 'STAGE3', 'FINAL'];
    private array $bodySizes = ['3x3', '5x5', '8x8', '10x10', '12x12'];
    private array $cr3Values = ['RES', 'REL', null];

    private array $entryStatuses = [
        'DONE',
        'RUNNING',
        'FOR PROCESS',
        'FVI',
        'BOXING',
        'LWAIT',
        null,
    ];
    private array $tags = ['expedite', 'hold', 'flag', null];

    public function run(): void
    {
        // FOR SAFETY: If you run this seeder, it will wipe out all existing.
        // I WILL RETURN IF I AM USING THE LIVE DATABASE. DO NOT RUN THIS SEEDER AGAINST PRODUCTION.
        return;
        return;
        return;
        return;
        return;
        return;
        return;
        return;
        return;
        return;
        return;

        $this->truncateOwnedTables();

        $this->seedMachines();
        $bandsByPlatform = $this->seedCapacityBands();
        $wipRows = $this->seedCustomerDataWip();
        $this->seedLoadingPlanEntries(array_column($wipRows, 'Lot_Id'), array_keys($bandsByPlatform));
    }

    // ------------------------------------------------------------------
    // Idempotency
    // ------------------------------------------------------------------
    //
    // customer_data_wip has no unique constraints of its own, and
    // loading_plan_entries has a unique (machine, scheduled_date,
    // sequence_order) that collides on a second run (same day => same
    // Lot_Ids => same tuples). Truncating first makes re-running safe.
    //
    // lot_registry no longer exists (dropped — manual lots now store
    // Part_Name/Package_Name/Qty directly on loading_plan_entries), so it's
    // no longer part of this truncate or the seeding order below.
    // machines/capacity_bands are handled separately via upsert() and are
    // left alone here.
    private function truncateOwnedTables(): void
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        DB::table('loading_plan_entries')->truncate();
        DB::table('customer_data_wip')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');
    }

    // ------------------------------------------------------------------
    // machines
    // ------------------------------------------------------------------
    private function seedMachines(): array
    {
        $machines = [
            ['name' => '08G6L',  'platform' => 'G6L'],
            ['name' => '09G6L',  'platform' => 'G6L'],
            ['name' => '54AT28', 'platform' => 'G6L'],
            ['name' => '12HSI',  'platform' => 'HSI'],
            ['name' => '13HSI',  'platform' => 'HSI'],
            ['name' => 'VTX-01', 'platform' => 'VITROX'],
            ['name' => 'VTX-02', 'platform' => 'VITROX'],
        ];

        $now = now();
        $rows = array_map(
            fn($m) => [
                'name'        => $m['name'],
                'modified_at' => $now,
                'modified_by' => 'seeder',
            ],
            $machines
        );

        DB::table('machines')->upsert($rows, ['name'], ['modified_at', 'modified_by']);

        // Return name => platform, since `machines` table itself has no
        // platform column in this schema (platform mapping lives in code/
        // config per the LoadingPlanTable.jsx MACHINES constant).
        return collect($machines)->pluck('platform', 'name')->all();
    }

    // ------------------------------------------------------------------
    // capacity_bands
    // ------------------------------------------------------------------
    private function seedCapacityBands(): array
    {
        $bands = [
            'VITROX' => [
                [1, 500, 110],
                [501, 750, 357],
                [751, 1000, 524],
                [1001, 2500, 679],
                [2501, 5000, 1187],
                [5001, 7500, 2095],
                [7501, 10000, 2752],
                [10001, 999999, 4000],
            ],
            'HSI' => [
                [1, 500, 110],
                [501, 750, 357],
                [751, 1000, 524],
                [1001, 2500, 679],
                [2501, 5000, 1276],
                [5001, 7500, 2263],
                [7501, 10000, 3050],
                [10001, 999999, 4000],
            ],
            'G6L' => [
                [1, 500, 110],
                [501, 750, 357],
                [751, 1000, 524],
                [1001, 2500, 679],
                [2501, 5000, 1132],
                [5001, 7500, 1845],
                [7501, 10000, 2337],
                [10001, 999999, 4000],
            ],
        ];

        $now = now();
        $rows = [];
        foreach ($bands as $platform => $ranges) {
            foreach ($ranges as [$min, $max, $uph]) {
                $rows[] = [
                    'platform'     => $platform,
                    'qty_min'      => $min,
                    'qty_max'      => $max,
                    'capacity_uph' => $uph,
                    'created_at'   => $now,
                    'updated_at'   => $now,
                ];
            }
        }

        DB::table('capacity_bands')->upsert(
            $rows,
            ['platform', 'qty_min'],
            ['qty_max', 'capacity_uph', 'updated_at']
        );

        return $bands;
    }

    // ------------------------------------------------------------------
    // customer_data_wip
    // ------------------------------------------------------------------
    private function seedCustomerDataWip(int $count = 20): array
    {
        $today = Carbon::today();
        $rows = [];

        for ($i = 0; $i < $count; $i++) {
            $lotId = 'LOT' . Str::padLeft((string) (100000 + $i), 6, '0');

            $qty = fake()->numberBetween(50, 12000);
            $leadCount = fake()->randomElement([16, 24, 32, 48, 64, 100]);
            $package = fake()->randomElement($this->packages);
            $station = fake()->randomElement($this->tapeReelStations);
            $partName = strtoupper(fake()->bothify('PN-####??'));

            $dateLoaded = $today->copy()->addSeconds(fake()->numberBetween(0, 86399));
            $beStart = $dateLoaded->copy()->subDays(fake()->numberBetween(1, 15));

            $rows[] = [
                'Plant'                => 'PLANT1',
                'Part_Name'            => $partName,
                'Lead_Count'           => $leadCount,
                'Package_Name'         => $package,
                'Lot_Id'               => $lotId,
                'Station'              => $station,
                'Qty'                  => $qty,
                'Lot_Type'             => fake()->randomElement($this->lotTypes),
                'Prod_Area'            => 'BACKEND',
                'Lot_Status'           => fake()->randomElement($this->lotStatuses),
                'Date_Loaded'          => $dateLoaded,
                'Start_Time'           => $dateLoaded,
                'Part_Type'            => fake()->randomElement(['STD', 'AUTO']),
                'Part_Class'           => fake()->randomElement(['A', 'B', 'C']),
                'Date_Code'            => $today->format('ymd'),
                'Focus_Group'          => fake()->randomElement($this->focusGroups),
                'Process_Group'        => 'PG' . fake()->numberBetween(1, 9),
                'Bulk'                 => fake()->boolean() ? 'YES' : 'NO',
                'Reqd_Time'            => $dateLoaded->copy()->addDays(fake()->numberBetween(1, 5)),
                'Lot_Entry_Time'       => $beStart,
                'Stage'                => fake()->randomElement($this->stages),
                'Stage_Start_Time'     => $dateLoaded,
                'CCD'                  => $dateLoaded->copy()->addDays(fake()->numberBetween(2, 10)),
                'Stage_Run_Days'       => fake()->numberBetween(0, 10),
                'Lot_Entry_Time_Days'  => fake()->numberBetween(0, 30),
                'Tray'                 => fake()->boolean() ? 'TRAY' : 'BULK',
                'Backend_Leadtime'     => fake()->numberBetween(1, 20),
                'OSL_Days'             => fake()->numberBetween(-5, 5),
                'BE_Group'             => 'BE' . fake()->numberBetween(1, 5),
                'Strategy_Code'        => fake()->randomElement(['STD', 'EXP', 'HOT']),
                'CR3'                  => fake()->randomElement($this->cr3Values),
                'BE_Starttime'         => $beStart,
                'BE_OSL_Days'          => fake()->numberBetween(-5, 15),
                'Body_Size'            => fake()->randomElement($this->bodySizes),
                'Auto_Part'            => fake()->boolean() ? 'Y' : 'N',
                'Ramp_Time'            => fake()->numberBetween(0, 120),
                'End_Customer'         => fake()->randomElement(['CUST_A', 'CUST_B', 'CUST_C']),
                'Bake'                 => fake()->randomElement(['For Bake', 'Not Required', null]),
                'Bake_Count'           => fake()->numberBetween(0, 3),
                'Test_Lot_Id'          => null,
                'Stock_Position'       => fake()->randomElement(['FRONT', 'BACK']),
                'Assy_Site'            => 'SITE1',
                'Bake_Time_Temp'       => fake()->boolean() ? '8HR/125C' : null,
                'imported_by'          => 'seeder',
                'import_date'          => $today->toDateString(),
                'production_line'      => fake()->randomElement(['PL1', 'PL2', null]),
            ];
        }

        // Insert in chunks to keep each query reasonably sized.
        foreach (array_chunk($rows, 100) as $chunk) {
            DB::table('customer_data_wip')->insert($chunk);
        }

        return $rows;
    }

    // ------------------------------------------------------------------
    // loading_plan_entries
    // ------------------------------------------------------------------
    private function seedLoadingPlanEntries(array $lotIds, array $platforms): void
    {
        if (empty($lotIds)) {
            return;
        }

        // Real machine names — mirror the MACHINES config in LoadingPlanTable.jsx.
        $realMachines = ['08G6L', '09G6L', '54AT28', '12HSI', '13HSI', 'VTX-01', 'VTX-02'];
        $machineBuckets = array_merge([null, 'MANUAL'], $realMachines);

        $today = Carbon::today()->toDateString();
        $rows = [];
        $sequenceCounters = [];

        // Leave a portion of lots with no plan entry at all, so
        // "Unassigned" behaves realistically (no entry -> machine === null
        // in the controller via `$entry->machine ?? null`).
        $lotsToPlan = fake()->randomElements($lotIds, (int) (count($lotIds) * 0.75));

        foreach ($lotsToPlan as $lotId) {
            $machine = fake()->randomElement($machineBuckets);
            $bucketKey = $machine ?? 'unassigned';
            $sequenceCounters[$bucketKey] = ($sequenceCounters[$bucketKey] ?? 0) + 1000;

            $rows[] = [
                'entry_type'      => 'lot',
                'lot_id'          => $lotId,
                'scheduled_date'  => $today,
                'machine'         => $machine,
                'sequence_order'  => $sequenceCounters[$bucketKey],
                'status'          => fake()->randomElement($this->entryStatuses),
                'tag'             => fake()->randomElement($this->tags),
                'remarks'         => fake()->boolean(30) ? fake()->sentence(6) : null,
                'block_label'     => null,
                'created_at'      => now(),
                'updated_at'      => now(),
            ];
        }

        // Sprinkle in a handful of standalone "block" entries (Preventative
        // Maintenance, Changeover, Lunch) on real machines / MANUAL, same
        // as handleAddBlock() in LoadingPlanTable.jsx.
        $blockLabels = ['Preventative Maintenance', 'Changeover', 'Lunch', 'Shift Handover'];
        $blockMachines = array_merge(['MANUAL'], $realMachines);

        foreach (fake()->randomElements($blockMachines, min(4, count($blockMachines))) as $machine) {
            $bucketKey = $machine;
            $sequenceCounters[$bucketKey] = ($sequenceCounters[$bucketKey] ?? 0) + 1000;

            $rows[] = [
                'entry_type'      => 'block',
                'lot_id'          => null,
                'scheduled_date'  => $today,
                'machine'         => $machine,
                'sequence_order'  => $sequenceCounters[$bucketKey],
                'status'          => null,
                'tag'             => null,
                'remarks'         => null,
                'block_label'     => fake()->randomElement($blockLabels),
                'created_at'      => now(),
                'updated_at'      => now(),
            ];
        }

        foreach (array_chunk($rows, 100) as $chunk) {
            DB::table('loading_plan_entries')->insert($chunk);
        }
    }
}
