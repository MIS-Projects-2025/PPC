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
        Schema::create('lot_positions', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('lot_id')->index('idx_lot_positions_lot');
            $table->unsignedBigInteger('lot_staging_id')->nullable()->index('lot_positions_lot_staging_id_foreign');
            $table->unsignedInteger('rack_slot_id')->index('idx_lot_positions_slot');
            $table->timestamp('assigned_at')->useCurrent();
            $table->string('assigned_by', 10);
            $table->timestamp('released_at')->nullable()->index('idx_lot_positions_released');
            $table->string('released_by', 10)->nullable();
            $table->unsignedInteger('production_line_id')->index('fk_lots_production_line');
            $table->unsignedBigInteger('rack_page_id')->nullable()->index('lot_positions_rack_page_id_foreign');
            $table->string('v_one_machine_id', 50)->nullable();
            $table->string('v_one_platform', 20)->nullable();
            $table->string('v_one_status', 20)->nullable()->comment('RELEASED|IN_TRANSIT|RUNNING|COMPLETED');
            $table->string('v_one_run_status', 50)->nullable()->comment('RUN|IDLE|ERROR from machine');
            $table->string('v_one_message')->nullable();
            $table->timestamp('v_one_running_at')->nullable();
            $table->timestamp('v_one_completed_at')->nullable();
            $table->timestamp('v_one_last_checked_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lot_positions');
    }
};
