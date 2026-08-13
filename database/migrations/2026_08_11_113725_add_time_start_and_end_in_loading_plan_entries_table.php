<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loading_plan_entries', function (Blueprint $table) {
            $table->dateTime('time_start')->nullable()->after('accu_time');
            $table->dateTime('time_end')->nullable()->after('time_start');
            $table->index(['machine_id', 'time_start', 'time_end'], 'idx_machine_time_range');
        });
    }

    public function down(): void
    {
        Schema::table('loading_plan_entries', function (Blueprint $table) {
            $table->dropIndex('idx_machine_time_range');
            $table->dropColumn(['time_start', 'time_end']);
        });
    }
};
