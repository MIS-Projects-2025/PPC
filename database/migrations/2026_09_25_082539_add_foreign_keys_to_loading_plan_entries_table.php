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
        Schema::table('loading_plan_entries', function (Blueprint $table) {
            if (Schema::connection('qdn_db')->hasTable('machine_transition_rules')) {
                $table->foreign(['matched_rule_id'])
                    ->references(['rule_id'])->on('machine_transition_rules')
                    ->onUpdate('no action')->onDelete('set null');
            }

            if (Schema::connection('qdn_db')->hasTable('machine_setup_states')) {
                $table->foreign(['resulting_setup_state_id'])
                    ->references(['setup_state_id'])->on('machine_setup_states')
                    ->onUpdate('no action')->onDelete('set null');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loading_plan_entries', function (Blueprint $table) {
            if (Schema::connection('qdn_db')->hasTable('machine_transition_rules')) {
                $table->dropForeign('loading_plan_entries_matched_rule_id_foreign');
            }
            if (Schema::connection('qdn_db')->hasTable('machine_setup_states')) {
                $table->dropForeign('loading_plan_entries_resulting_setup_state_id_foreign');
            }
        });
    }
};
