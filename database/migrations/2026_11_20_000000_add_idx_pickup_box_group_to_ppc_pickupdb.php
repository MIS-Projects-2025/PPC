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
        Schema::table('ppc_pickupdb', function (Blueprint $table) {
            $table->index('box_group_id', 'idx_pickup_box_group');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ppc_pickupdb', function (Blueprint $table) {
            $table->dropIndex('idx_pickup_box_group');
        });
    }
};
