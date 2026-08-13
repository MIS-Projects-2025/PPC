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
        Schema::create('lot_merges', function (Blueprint $table) {
            $table->id();
            $table->string('target_lot_id');
            $table->string('source_lot_id');
            $table->date('scheduled_date');
            $table->unsignedInteger('transferred_qty');
            $table->string('created_by')->nullable();
            $table->timestamp('reverted_at')->nullable();
            $table->string('reverted_by')->nullable();
            $table->timestamps();

            $table->index(['source_lot_id', 'scheduled_date']);
            $table->index(['target_lot_id', 'scheduled_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lot_merges');
    }
};
