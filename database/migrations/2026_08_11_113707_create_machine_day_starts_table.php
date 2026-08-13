<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('machine_day_starts', function (Blueprint $table) {
            $table->unsignedBigInteger('machine_id');
            $table->date('scheduled_date');
            $table->time('day_start_time');
            $table->timestamps();

            $table->primary(['machine_id', 'scheduled_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('machine_day_starts');
    }
};
