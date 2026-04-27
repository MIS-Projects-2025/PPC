<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lot_positions', function (Blueprint $table) {
            $table->unsignedBigInteger('lot_staging_id')
                ->nullable()
                ->after('lot_id');
            $table->foreign('lot_staging_id')
                ->references('id')
                ->on('lot_stagings')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('lot_positions', function (Blueprint $table) {
            $table->dropForeign(['lot_staging_id']);
            $table->dropColumn('lot_staging_id');
        });
    }
};
