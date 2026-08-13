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
            $table->id();
            $table->string('parent_lot_id', 64);
            $table->string('child_lot_id', 64);
            $table->string('root_lot_id', 64); // original lot_id before any splitting, for lineage queries
            $table->date('scheduled_date');
            $table->integer('child_qty');
            $table->decimal('split_percentage', 5, 2); // child's share at time of split, for display/audit
            $table->string('created_by', 45)->nullable();
            $table->timestamp('reverted_at')->nullable();
            $table->string('reverted_by', 45)->nullable();
            $table->timestamps();

            // Indexes
            $table->index(['parent_lot_id', 'scheduled_date']);
            $table->index('root_lot_id');
            $table->unique('child_lot_id'); // a generated lot_id can only ever be produced once
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
