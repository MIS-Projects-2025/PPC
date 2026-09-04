<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lot_quantity_history', function (Blueprint $table) {
            $table->id();

            // Plain indexed column, not a FK — same reasoning as
            // loading_plan_entry_history: history must survive a hard delete.
            $table->unsignedBigInteger('lot_quantity_id');

            // Denormalized so the merged timeline can be queried/joined
            // against loading_plan_entries without re-fetching the parent row.
            $table->string('lot_id');
            $table->date('scheduled_date');

            $table->timestamp('changed_at')->useCurrent();
            $table->unsignedBigInteger('changed_by')->nullable();
            $table->enum('change_type', ['created', 'updated', 'deleted'])->default('updated');

            $table->json('changed_columns')->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();

            $table->index(['lot_quantity_id', 'changed_at'], 'idx_lqh_lot_quantity');
            $table->index(['lot_id', 'scheduled_date', 'changed_at'], 'idx_lqh_lot_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lot_quantity_history');
    }
};
