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
            // Fractional ordering: moving a lot only ever rewrites its own
            // row (see LoadingPlanEntryService::computeSequenceOrder).
            $table->decimal('sequence_order', 14, 4)->change();

            // Optimistic locking for direct field edits (status, Remarks,
            // accu_time, tag) — see LoadingPlanEntryService::editField.
            $table->unsignedBigInteger('lock_version')->default(1)->after('updated_at');

            // Block duration (minutes) — blocks have no WIP row, so this
            // is the only source of their accu_time. Also usable as a
            // manual accu_time override for real lots if ever needed.
            $table->integer('accu_time')->nullable()->after('block_label');
        });

        Schema::table('loading_plan_entries', function (Blueprint $table) {
            $table->unique(['machine', 'scheduled_date', 'sequence_order'], 'uniq_machine_sequence_per_day');
        });
    }

    public function down(): void
    {
        Schema::table('loading_plan_entries', function (Blueprint $table) {
            $table->dropUnique('uniq_machine_sequence_per_day');
            $table->dropColumn(['lock_version', 'accu_time']);
        });

        Schema::table('loading_plan_entries', function (Blueprint $table) {
            $table->integer('sequence_order')->change();
        });

        Schema::table('loading_plan_entries', function (Blueprint $table) {
            $table->unique(['machine', 'scheduled_date', 'sequence_order'], 'uniq_machine_sequence_per_day');
        });
    }
};
