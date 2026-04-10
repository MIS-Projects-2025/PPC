<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lot_positions', function (Blueprint $table) {
            $table->unsignedInteger('id')->autoIncrement();
            $table->unsignedInteger('lot_id');
            $table->unsignedInteger('rack_slot_id');
            $table->timestamp('assigned_at')->useCurrent();
            $table->string('assigned_by', 10);
            $table->timestamp('released_at')->nullable();
            $table->string('released_by', 10)->nullable();

            $table->index('lot_id',       'idx_lot_positions_lot');
            $table->index('rack_slot_id', 'idx_lot_positions_slot');
            $table->index('released_at',  'idx_lot_positions_released');

            $table->foreign('lot_id', 'fk_lot_positions_lot')
                ->references('id')
                ->on('lots')
                ->onUpdate('cascade')
                ->onDelete('restrict');

            $table->foreign('rack_slot_id', 'fk_lot_positions_rack_slot')
                ->references('id')
                ->on('rack_slots')
                ->onUpdate('cascade')
                ->onDelete('restrict');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lot_positions');
    }
};
