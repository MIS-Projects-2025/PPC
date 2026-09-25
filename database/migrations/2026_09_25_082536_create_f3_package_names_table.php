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
        Schema::create('f3_package_names', function (Blueprint $table) {
            $table->integer('id', true);
            $table->string('package_name', 45)->index('idx_pkg_name');

            $table->unique(['package_name'], 'package_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('f3_package_names');
    }
};
