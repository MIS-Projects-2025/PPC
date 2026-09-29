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
        Schema::create('package_capacity_history', function (Blueprint $table) {
            $table->integer('id', true);
            $table->string('package_name', 45);
            $table->string('factory_name', 20);
            $table->bigInteger('capacity')->nullable();
            $table->date('effective_from');
            $table->date('effective_to')->nullable();

            $table->unique(['package_name', 'factory_name', 'effective_from'], 'uniq_effective_period');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('package_capacity_history');
    }
};
