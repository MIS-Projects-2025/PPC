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
        Schema::create('machine_capability_configs', function (Blueprint $table) {
            $table->bigIncrements('capability_id');
            $table->integer('machine_id')->index();
            $table->enum('process_type', ['taping', 'tubing', 'both'])->nullable();
            $table->string('remarks')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('machine_capability_configs');
    }
};
