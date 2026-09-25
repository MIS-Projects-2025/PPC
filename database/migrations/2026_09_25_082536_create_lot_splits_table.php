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
        Schema::create('lot_splits', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('parent_lot_id', 64);
            $table->string('child_lot_id', 64);
            $table->string('root_lot_id', 64)->index();
            $table->date('scheduled_date');
            $table->integer('child_qty');
            $table->decimal('split_percentage', 5);
            $table->string('target_machine', 64)->nullable();
            $table->decimal('sequence_order_at_split', 14, 4)->nullable();
            $table->string('created_by', 45)->nullable();
            $table->timestamp('reverted_at')->nullable();
            $table->string('reverted_by', 45)->nullable();
            $table->timestamps();

            $table->index(['child_lot_id', 'scheduled_date'], 'idx_splits_child_date');
            $table->index(['parent_lot_id', 'scheduled_date'], 'idx_splits_parent_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lot_splits');
    }
};
