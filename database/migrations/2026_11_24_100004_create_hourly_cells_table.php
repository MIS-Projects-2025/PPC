<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // One row per (row, hour slot). A cell is EITHER an output quantity OR a downtime code (FK).
        // Empty cells simply have no record.
        Schema::create('hourly_cells', function (Blueprint $table) {
            $table->id();
            $table->string('rowable_type', 20);          // 'machine' | 'fvi' (see HourlyRow::MORPH)
            $table->unsignedBigInteger('rowable_id');
            $table->unsignedTinyInteger('hour');         // 0-23, the slot label (0800H => 8)
            $table->unsignedBigInteger('output_qty')->nullable();
            $table->foreignId('downtime_code_id')->nullable()->constrained('downtime_code')->restrictOnDelete();
            $table->string('updated_by', 50)->nullable();
            $table->timestamps();

            $table->unique(['rowable_type', 'rowable_id', 'hour']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hourly_cells');
    }
};
