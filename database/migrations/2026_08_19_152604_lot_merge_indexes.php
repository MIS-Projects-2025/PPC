<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('lot_merges', function (Blueprint $table) {
            // Composite index for target lookups filtered by date
            $table->index(['target_lot_id', 'scheduled_date'], 'idx_merges_target_date');

            // Composite index for source lookups filtered by date
            $table->index(['source_lot_id', 'scheduled_date'], 'idx_merges_source_date');
        });
    }

    public function down(): void
    {
        Schema::table('lot_merges', function (Blueprint $table) {
            $table->dropIndex('idx_merges_target_date');
            $table->dropIndex('idx_merges_source_date');
        });
    }
};
