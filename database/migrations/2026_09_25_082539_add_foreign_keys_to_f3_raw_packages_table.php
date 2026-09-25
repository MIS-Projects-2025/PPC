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
        Schema::table('f3_raw_packages', function (Blueprint $table) {
            $table->foreign(['package_id'], 'fk_f3_raw_packages_package')->references(['id'])->on('f3_package_names')->onUpdate('cascade')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('f3_raw_packages', function (Blueprint $table) {
            $table->dropForeign('fk_f3_raw_packages_package');
        });
    }
};
