<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loading_plan_entries', function (Blueprint $table) {
            $table->dropUnique('uniq_machine_sequence_per_day');
        });

        Schema::table('loading_plan_entries', function (Blueprint $table) {
            $table->dropColumn('machine');
        });

        Schema::table('loading_plan_entries', function (Blueprint $table) {
            $table->unique(['machine_id', 'scheduled_date', 'sequence_order'], 'uniq_machine_sequence_per_day');
        });
    }

    public function down(): void
    {
        Schema::table('loading_plan_entries', function (Blueprint $table) {
            $table->dropUnique('uniq_machine_sequence_per_day');
            $table->string('machine')->nullable()->after('scheduled_date');
            $table->unique(['machine', 'scheduled_date', 'sequence_order'], 'uniq_machine_sequence_per_day');
        });
    }
};
