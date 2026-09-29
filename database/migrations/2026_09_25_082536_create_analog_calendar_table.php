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
        Schema::create('analog_calendar', function (Blueprint $table) {
            $table->integer('id', true);
            $table->integer('cal_year')->nullable();
            $table->integer('cal_quarter')->nullable();
            $table->integer('cal_month')->nullable();
            $table->integer('cal_workweek')->nullable();
            $table->date('cal_date')->nullable();
            $table->dateTime('date_created')->nullable()->useCurrent();
            $table->dateTime('date_updated')->useCurrentOnUpdate()->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('analog_calendar');
    }
};
