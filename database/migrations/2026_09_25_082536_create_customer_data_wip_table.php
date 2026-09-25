<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('customer_data_wip', function (Blueprint $table) {
            $table->integer('customer_data_id', true);
            $table->string('Plant', 50)->nullable();
            $table->string('Part_Name', 100)->nullable()->index('idx_package_name');
            $table->integer('Lead_Count')->nullable();
            $table->string('Package_Name', 50)->nullable()->index('idx_package_name_2');
            $table->string('Lot_Id', 50)->nullable();
            $table->string('Station', 50)->nullable()->index('idx_station');
            $table->integer('Qty')->nullable();
            $table->string('Lot_Type', 50)->nullable();
            $table->string('Prod_Area', 50)->nullable();
            $table->string('Lot_Status', 50)->nullable();
            $table->dateTime('Date_Loaded')->nullable();
            $table->dateTime('Start_Time')->nullable();
            $table->string('Part_Type', 50)->nullable();
            $table->string('Part_Class', 50)->nullable();
            $table->string('Date_Code', 50)->nullable();
            $table->string('Focus_Group', 50)->nullable();
            $table->string('Process_Group', 50)->nullable();
            $table->string('Bulk', 50)->nullable();
            $table->dateTime('Reqd_Time')->nullable();
            $table->dateTime('Lot_Entry_Time')->nullable();
            $table->string('Stage', 50)->nullable();
            $table->dateTime('Stage_Start_Time')->nullable();
            $table->dateTime('CCD')->nullable();
            $table->integer('Stage_Run_Days')->nullable();
            $table->integer('Lot_Entry_Time_Days')->nullable();
            $table->string('Tray', 50)->nullable();
            $table->integer('Backend_Leadtime')->nullable();
            $table->integer('OSL_Days')->nullable();
            $table->string('BE_Group', 50)->nullable();
            $table->string('Strategy_Code', 50)->nullable();
            $table->string('CR3', 50)->nullable();
            $table->dateTime('BE_Starttime')->nullable();
            $table->integer('BE_OSL_Days')->nullable();
            $table->string('Body_Size', 50)->nullable();
            $table->string('Auto_Part', 50)->nullable();
            $table->string('Ramp_Time', 50)->nullable();
            $table->string('End_Customer', 50)->nullable();
            $table->string('Bake', 50)->nullable();
            $table->integer('Bake_Count')->nullable();
            $table->string('Test_Lot_Id', 50)->nullable();
            $table->string('Stock_Position', 50)->nullable();
            $table->string('Assy_Site', 50)->nullable();
            $table->string('Bake_Time_Temp', 50)->nullable();
            $table->string('imported_by', 7)->nullable();
            $table->tinyInteger('f2_focus_group_flag')->nullable()->storedAs('(`Focus_Group` in (_utf8mb4\'CV\',_utf8mb4\'LTI\',_utf8mb4\'LTCL\',_utf8mb4\'LT\'))');
            $table->tinyInteger('f1_focus_group_flag')->nullable()->storedAs('(`Focus_Group` not in (_utf8mb4\'CV\',_utf8mb4\'CV1\',_utf8mb4\'LT\',_utf8mb4\'LTCL\',_utf8mb4\'LTI\'))');
            $table->date('import_date')->nullable()->default(DB::raw('(CURDATE())'))->index('idx_f1f2_wip_import_date');
            $table->string('canonical_body_size', 32)->nullable()->storedAs('(case when regexp_like(lower(`Body_Size`),_utf8mb4\'^[0-9]*.?[0-9]+[xX][0-9]*.?[0-9]+.*$\') then concat(trim(trailing _utf8mb4\'.\' from trim(trailing _utf8mb4\'0\' from least(cast(substring_index(lower(`Body_Size`),_utf8mb4\'x\',1) as decimal(10,4)),cast(substring_index(substring_index(lower(`Body_Size`),_utf8mb4\'x\',2),_utf8mb4\'x\',-(1)) as decimal(10,4))))),_utf8mb4\'x\',trim(trailing _utf8mb4\'.\' from trim(trailing _utf8mb4\'0\' from greatest(cast(substring_index(lower(`Body_Size`),_utf8mb4\'x\',1) as decimal(10,4)),cast(substring_index(substring_index(lower(`Body_Size`),_utf8mb4\'x\',2),_utf8mb4\'x\',-(1)) as decimal(10,4)))))) else lower(`Body_Size`) end)');
            $table->string('production_line', 10)->nullable()->index('idx_wip_production_line');

            $table->index(['Lot_Id', 'import_date'], 'idx_customer_data_wip_lot_id');
            $table->index(['f1_focus_group_flag', 'Package_Name', 'Station', 'Date_Loaded'], 'idx_f1_filter');
            $table->index(['Date_Loaded', 'Package_Name', 'Station'], 'idx_f1_filter_2');
            $table->index(['f2_focus_group_flag', 'Package_Name', 'Station', 'Date_Loaded'], 'idx_f2_filter');
            $table->index(['f2_focus_group_flag', 'Station', 'Date_Loaded', 'Package_Name', 'Qty'], 'idx_f2_focus_group_station_date_package_qty');
            $table->index(['import_date', 'Lot_Id', 'Part_Name'], 'idx_import_date_lot_part');
            $table->index(['Date_Loaded', 'Plant', 'Focus_Group', 'Station', 'Qty'], 'idx_wip_covering');
            $table->index(['Package_Name', 'Date_Loaded', 'Plant', 'f1_focus_group_flag', 'Station', 'Qty'], 'idx_wip_covering2');
            $table->index(['Package_Name', 'Date_Loaded', 'Qty', 'canonical_body_size'], 'idx_wip_package_date_qty_size');
            $table->index(['Package_Name', 'Date_Loaded', 'Station', 'Part_Name'], 'idx_wip_package_date_station_part');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customer_data_wip');
    }
};
