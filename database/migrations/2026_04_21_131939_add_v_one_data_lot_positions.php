<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lot_positions', function (Blueprint $table) {
            $table->string('v_one_machine_id', 50)->nullable();
            $table->string('v_one_platform', 20)->nullable();
            $table->string('v_one_status', 20)->nullable()->comment('RELEASED|IN_TRANSIT|RUNNING|COMPLETED');
            $table->string('v_one_run_status', 50)->nullable()->comment('RUN|IDLE|ERROR from machine');
            $table->string('v_one_message', 255)->nullable();
            $table->timestamp('v_one_running_at')->nullable();
            $table->timestamp('v_one_completed_at')->nullable();
            $table->timestamp('v_one_last_checked_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('lot_positions', function (Blueprint $table) {
            $table->dropColumn([
                'v_one_machine_id',
                'v_one_platform',
                'v_one_status',
                'v_one_run_status',
                'v_one_message',
                'v_one_running_at',
                'v_one_completed_at',
                'v_one_last_checked_at',
            ]);
        });
    }
};
