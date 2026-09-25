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
        Schema::create('scheduler_runs', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('location');
            $table->date('date');
            $table->string('employee_id')->nullable();
            $table->string('status');
            $table->unsignedInteger('pickup_count')->nullable();
            $table->unsignedInteger('assigned_count')->nullable();
            $table->unsignedInteger('unassigned_count')->nullable();
            $table->json('unmatched_parts')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();

            $table->index(['location', 'date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('scheduler_runs');
    }
};
