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
        Schema::table('f3_pickup', function (Blueprint $table) {
            $table->foreign(['ppc_pickup_id'], 'fk_f3_pickup_ppc_pickup')->references(['id_pickup'])->on('ppc_pickupdb')->onUpdate('no action')->onDelete('no action');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('f3_pickup', function (Blueprint $table) {
            $table->dropForeign('fk_f3_pickup_ppc_pickup');
        });
    }
};
