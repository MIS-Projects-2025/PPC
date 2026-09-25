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
        Schema::table('f3', function (Blueprint $table) {
            $table->foreign(['package'], 'fk_package')->references(['id'])->on('f3_raw_packages')->onUpdate('cascade')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('f3', function (Blueprint $table) {
            $table->dropForeign('fk_package');
        });
    }
};
