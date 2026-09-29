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
        Schema::table('racks', function (Blueprint $table) {
            $table->foreign(['production_line_id'], 'fk_racks_production_line')->references(['id'])->on('production_lines')->onUpdate('cascade')->onDelete('restrict');
            $table->foreign(['rack_page_id'])->references(['id'])->on('rack_pages')->onUpdate('cascade')->onDelete('restrict');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('racks', function (Blueprint $table) {
            $table->dropForeign('fk_racks_production_line');
            $table->dropForeign('racks_rack_page_id_foreign');
        });
    }
};
