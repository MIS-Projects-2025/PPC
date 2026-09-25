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
        Schema::table('rack_slots', function (Blueprint $table) {
            $table->foreign(['rack_id'], 'fk_rack_slots_rack')->references(['id'])->on('racks')->onUpdate('cascade')->onDelete('restrict');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rack_slots', function (Blueprint $table) {
            $table->dropForeign('fk_rack_slots_rack');
        });
    }
};
