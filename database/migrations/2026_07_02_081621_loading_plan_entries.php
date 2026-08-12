<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('loading_plan_entries', function (Blueprint $table) {
            $table->id();
            $table->enum('entry_type', ['lot', 'block'])->default('lot');

            $table->string('lot_id', 64)->nullable();

            $table->date('scheduled_date');
            $table->string('machine', 64)->nullable();
            $table->integer('sequence_order');
            $table->string('status', 32)->nullable();
            $table->string('tag', 16)->nullable();
            $table->text('remarks')->nullable();

            $table->string('block_label', 128)->nullable();

            $table->timestamps();

            $table->unique(['lot_id', 'scheduled_date'], 'uniq_lot_per_day');
            $table->unique(['machine', 'scheduled_date', 'sequence_order'], 'uniq_machine_sequence_per_day');

            $table->foreign('lot_id')
                ->references('Lot_Id')->on('lot_registry')
                ->onUpdate('cascade')
                ->onDelete('restrict');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('loading_plan_entries');
    }
};
