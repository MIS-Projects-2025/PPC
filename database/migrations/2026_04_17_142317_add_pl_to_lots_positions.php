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
        Schema::table('lot_positions', function (Blueprint $table) {
            // Adds the column as INT UNSIGNED NOT NULL
            $table->unsignedInteger('production_line_id');

            // Adds the foreign key constraint with Restrict/Cascade behavior
            $table->foreign('production_line_id', 'fk_lots_production_line')
                ->references('id')
                ->on('production_lines')
                ->onDelete('restrict')
                ->onUpdate('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lot_positions', function (Blueprint $table) {
            // Drop the constraint first, then the column
            $table->dropForeign('fk_lots_production_line');
            $table->dropColumn('production_line_id');
        });
    }
};
