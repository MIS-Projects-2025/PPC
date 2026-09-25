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
        Schema::table('machine_capability_leadcounts', function (Blueprint $table) {
            $table->foreign(['capability_id'])->references(['capability_id'])->on('machine_capability_configs')->onUpdate('no action')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('machine_capability_leadcounts', function (Blueprint $table) {
            $table->dropForeign('machine_capability_leadcounts_capability_id_foreign');
        });
    }
};
