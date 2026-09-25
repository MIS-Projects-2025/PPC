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
        Schema::create('lot_quantity_history', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('lot_quantity_id');
            $table->string('lot_id');
            $table->date('scheduled_date');
            $table->timestamp('changed_at')->useCurrent();
            $table->unsignedBigInteger('changed_by')->nullable();
            $table->enum('change_type', ['created', 'updated', 'deleted'])->default('updated');
            $table->json('changed_columns')->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();

            $table->index(['lot_id', 'scheduled_date', 'changed_at'], 'idx_lqh_lot_date');
            $table->index(['lot_quantity_id', 'changed_at'], 'idx_lqh_lot_quantity');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lot_quantity_history');
    }
};
