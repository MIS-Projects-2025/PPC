<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_directory', function (Blueprint $table) {
            $table->string('EMPLOYID')->primary();
            $table->string('EMPNAME')->nullable();
            $table->string('FIRSTNAME')->nullable();
            $table->string('JOB_TITLE')->nullable();
            $table->string('DEPARTMENT')->nullable();
            $table->string('PRODLINE')->nullable();
            $table->string('STATION')->nullable();
            $table->string('EMPPOSITION')->nullable();
            $table->string('EMAIL')->nullable();
            $table->date('DATEHIRED')->nullable();
            $table->tinyInteger('ACCSTATUS')->default(1);
            $table->timestamp('synced_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_directory');
    }
};
