<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('lot_splits', function (Blueprint $table) {
            // Composite index for parent lookups filtered by date
            $table->index(['parent_lot_id', 'scheduled_date'], 'idx_splits_parent_date');

            // Composite index for child lookups filtered by date
            $table->index(['child_lot_id', 'scheduled_date'], 'idx_splits_child_date');
        });
    }

    public function down(): void
    {
        Schema::table('lot_splits', function (Blueprint $table) {
            $table->dropIndex('idx_splits_parent_date');
            $table->dropIndex('idx_splits_child_date');
        });
    }
};
