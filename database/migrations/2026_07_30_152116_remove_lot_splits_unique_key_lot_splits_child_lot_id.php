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
        Schema::table('lot_splits', function (Blueprint $table) {
            $table->dropUnique('lot_splits_child_lot_id_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lot_splits', function (Blueprint $table) {
            // Re-add the unique constraint if the migration is rolled back
            $table->unique('child_lot_id', 'lot_splits_child_lot_id_unique');
        });
    }
};
