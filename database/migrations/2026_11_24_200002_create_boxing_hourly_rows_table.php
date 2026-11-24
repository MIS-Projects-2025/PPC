<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // One row = one employee on one shift. Day and night live in the same sheet (date, boxing, line),
        // the `shift` column decides which of the two tables the row belongs to.
        Schema::create('boxing_hourly_rows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hourly_sheet_id')->constrained('hourly_sheets')->cascadeOnDelete();
            $table->unsignedInteger('sort_order')->default(0);
            $table->string('shift', 5)->default('day'); // day | night

            $table->string('emp_id', 50)->nullable();
            $table->string('emp_name', 200)->nullable(); // snapshot

            $table->string('created_by', 50)->nullable();
            $table->string('updated_by', 50)->nullable();
            $table->timestamps();

            $table->index(['hourly_sheet_id', 'shift', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('boxing_hourly_rows');
    }
};
