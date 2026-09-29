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
        Schema::create('machine_capability_packages', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('capability_id');
            $table->unsignedInteger('package_id')->index();
            $table->string('required_factory', 20)->nullable();

            $table->index(['package_id', 'capability_id'], 'idx_package_capability');
            $table->unique(['capability_id', 'package_id', 'required_factory'], 'uq_capability_package_factory');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('machine_capability_packages');
    }
};
