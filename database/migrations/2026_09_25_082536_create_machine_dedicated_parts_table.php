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
        Schema::create('machine_dedicated_parts', function (Blueprint $table) {
            $table->integer('machine_id');
            $table->string('part_name', 100);

            $table->index(['part_name', 'machine_id'], 'idx_part_name');
            $table->primary(['machine_id', 'part_name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('machine_dedicated_parts');
    }
};
