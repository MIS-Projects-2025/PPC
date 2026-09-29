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
        Schema::create('customer_data_wip_out', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('part_name', 100)->nullable();
            $table->string('lot_id', 50)->nullable();
            $table->dateTime('out_date')->nullable();
            $table->integer('qty')->nullable();
            $table->string('residual', 50)->nullable();
            $table->string('test_part', 100)->nullable();
            $table->string('test_lot_id', 50)->nullable();
            $table->string('focus_group', 50)->nullable();
            $table->string('package', 50)->nullable()->index('idx_package_name');
            $table->string('process_site', 50)->nullable();
            $table->string('test_site', 50)->nullable();
            $table->string('tray', 50)->nullable();
            $table->string('bulk', 50)->nullable();
            $table->dateTime('date_loaded')->nullable();
            $table->string('process_group', 50)->nullable();
            $table->string('ramp_time', 50)->nullable();
            $table->string('imported_by', 7)->nullable();
            $table->date('date_loaded_no_time')->nullable()->storedAs('cast(`date_loaded` as date)');
            $table->date('import_date')->nullable()->default(DB::raw('(CURDATE())'))->index('idx_f1f2_out_import_date');
            $table->string('production_line', 10)->nullable()->index('idx_wip_production_line');

            $table->index(['date_loaded', 'package'], 'idx_date_package');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customer_data_wip_out');
    }
};
