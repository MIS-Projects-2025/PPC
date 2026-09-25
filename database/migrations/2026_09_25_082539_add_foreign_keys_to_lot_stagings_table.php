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
        Schema::table('lot_stagings', function (Blueprint $table) {
            $table->foreign(['lot_id'])->references(['id'])->on('lots')->onUpdate('no action')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lot_stagings', function (Blueprint $table) {
            $table->dropForeign('lot_stagings_lot_id_foreign');
        });
    }
};
