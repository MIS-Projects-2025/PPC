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
            $table->foreign(['lot_id'], 'fk_lot_positions_lot')->references(['id'])->on('lots')->onUpdate('cascade')->onDelete('restrict');
            $table->foreign(['rack_slot_id'], 'fk_lot_positions_rack_slot')->references(['id'])->on('rack_slots')->onUpdate('cascade')->onDelete('restrict');
            $table->foreign(['production_line_id'], 'fk_lots_production_line')->references(['id'])->on('production_lines')->onUpdate('cascade')->onDelete('restrict');
            $table->foreign(['lot_staging_id'])->references(['id'])->on('lot_stagings')->onUpdate('no action')->onDelete('cascade');
            $table->foreign(['rack_page_id'])->references(['id'])->on('rack_pages')->onUpdate('cascade')->onDelete('restrict');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lot_positions', function (Blueprint $table) {
            $table->dropForeign('fk_lot_positions_lot');
            $table->dropForeign('fk_lot_positions_rack_slot');
            $table->dropForeign('fk_lots_production_line');
            $table->dropForeign('lot_positions_lot_staging_id_foreign');
            $table->dropForeign('lot_positions_rack_page_id_foreign');
        });
    }
};
