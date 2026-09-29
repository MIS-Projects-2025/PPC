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
        Schema::create('machine_capability_leadcounts', function (Blueprint $table) {
            $table->unsignedBigInteger('capability_id');
            $table->integer('leadcount');
            $table->enum('mode', ['include', 'exclude'])->default('include');

            $table->primary(['capability_id', 'leadcount']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('machine_capability_leadcounts');
    }
};
