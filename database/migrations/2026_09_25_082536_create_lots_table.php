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
        Schema::create('lots', function (Blueprint $table) {
            $table->increments('id');
            $table->string('lot_id', 50)->index('idx_lots_lot_id');
            $table->string('partname')->nullable();
            $table->unsignedInteger('qty')->nullable();
            $table->enum('status', ['staged', 'released'])->default('staged')->index('idx_lots_status');
            $table->timestamp('received_at')->useCurrent()->index('idx_lots_received_at');
            $table->string('received_by', 10);
            $table->string('modified_by', 10)->nullable();
            $table->timestamps();
            $table->timestamp('released_at')->nullable();
            $table->string('released_by', 10)->nullable();
            $table->string('staged_key', 310)->nullable()->virtualAs('if((`status` = _utf8mb4\'staged\'),concat(`lot_id`,_utf8mb4\'||\',`partname`),NULL)')->unique('uq_one_staged_per_lot');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lots');
    }
};
