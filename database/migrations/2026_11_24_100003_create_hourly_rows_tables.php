<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('machine_hourly_rows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hourly_sheet_id')->constrained('hourly_sheets')->cascadeOnDelete();
            $table->unsignedInteger('sort_order')->default(0);

            // FUTURE: machine -> qdn_db.machine_list (dropdown); capacity -> qdn_db.machine_capacies (dropdown)
            $table->string('machine', 100)->nullable();
            $table->unsignedInteger('capacity')->nullable();
            $table->unsignedInteger('plan')->nullable();
            $table->string('package_type', 100)->nullable();
            $table->string('setup', 100)->nullable();

            // Employee ID + name SNAPSHOT (old days must not change when the masterlist does).
            $table->string('day_emp_id', 50)->nullable();
            $table->string('day_emp_name', 200)->nullable();
            $table->unsignedInteger('day_lots')->nullable();
            $table->string('night_emp_id', 50)->nullable();
            $table->string('night_emp_name', 200)->nullable();
            $table->unsignedInteger('night_lots')->nullable();

            $table->string('reason')->nullable();
            $table->string('action')->nullable();
            $table->string('who')->nullable();
            $table->string('when_at')->nullable();
            $table->string('status')->nullable();

            $table->string('created_by', 50)->nullable();
            $table->string('updated_by', 50)->nullable();
            $table->timestamps();

            $table->index(['hourly_sheet_id', 'sort_order']);
        });

        Schema::create('fvi_hourly_rows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hourly_sheet_id')->constrained('hourly_sheets')->cascadeOnDelete();
            $table->unsignedInteger('sort_order')->default(0);

            // FUTURE: designation will probably become a reference table too.
            $table->string('day_emp_id', 50)->nullable();
            $table->string('day_emp_name', 200)->nullable();
            $table->string('day_designation', 100)->nullable();
            $table->unsignedInteger('day_lots')->nullable();
            $table->string('night_emp_id', 50)->nullable();
            $table->string('night_emp_name', 200)->nullable();
            $table->string('night_designation', 100)->nullable();
            $table->unsignedInteger('night_lots')->nullable();

            $table->string('created_by', 50)->nullable();
            $table->string('updated_by', 50)->nullable();
            $table->timestamps();

            $table->index(['hourly_sheet_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fvi_hourly_rows');
        Schema::dropIfExists('machine_hourly_rows');
    }
};
