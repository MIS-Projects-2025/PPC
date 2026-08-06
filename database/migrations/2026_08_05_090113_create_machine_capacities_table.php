<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    protected $connection = 'qdn_db';

    public function up(): void
    {
        Schema::create('machine_capacities', function (Blueprint $table) {
            $table->id();

            // Match int NOT NULL from machine_list
            $table->integer('machine_id');
            $table->foreign('machine_id')
                ->references('id')
                ->on('machine_list')
                ->onDelete('cascade');

            $table->unsignedBigInteger('capacity')->nullable();
            $table->date('effective_from');
            $table->date('effective_to')->nullable();

            $table->index(['machine_id', 'effective_from', 'effective_to'], 'idx_machine_effective');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('machine_capacities');
    }
};
