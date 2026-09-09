<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loading_plan_entries', function (Blueprint $table) {
            $table->unsignedBigInteger('resulting_setup_state_id')->nullable()->after('block_label');
            $table->enum('operation_type', ['setup', 'conversion'])->nullable()->after('resulting_setup_state_id');
            $table->unsignedBigInteger('matched_rule_id')->nullable()->after('operation_type');

            $table->foreign('resulting_setup_state_id')
                ->references('setup_state_id')->on('qdn_db.machine_setup_states')
                ->nullOnDelete();
            $table->foreign('matched_rule_id')
                ->references('rule_id')->on('qdn_db.machine_transition_rules')
                ->nullOnDelete();

            $table->index(['machine_id', 'status', 'time_start'], 'idx_lpe_machine_status_start');
        });
    }

    public function down(): void
    {
        Schema::connection('qdn_db')->table('loading_plan_entries', function (Blueprint $table) {
            $table->dropIndex('idx_lpe_machine_status_start');
            $table->dropIndex('idx_lpe_resulting_state');

            $table->dropColumn([
                'resulting_setup_state_id',
                'operation_type',
                'matched_rule_id',
            ]);
        });
    }
};
