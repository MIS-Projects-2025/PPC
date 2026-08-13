<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loading_plan_entries', function (Blueprint $table) {
            $table->index('scheduled_date', 'idx_loading_plan_scheduled_date');
            $table->index(['machine_id', 'sequence_order'], 'idx_loading_plan_machine_seq');
            $table->dropIndex('loading_plan_entries_machine_id_index'); // redundant, superseded by composite above
        });
    }

    public function down(): void
    {
        Schema::table('loading_plan_entries', function (Blueprint $table) {
            $table->dropIndex('idx_loading_plan_scheduled_date');
            $table->dropIndex('idx_loading_plan_machine_seq');
            $table->index('machine_id', 'loading_plan_entries_machine_id_index'); // restore what we dropped
        });
    }
};
