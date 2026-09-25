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
        Schema::create('lot_stagings', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('withdrawer_id')->nullable();
            $table->unsignedInteger('lot_id')->index('lot_stagings_lot_id_foreign');
            $table->string('partname')->nullable();
            $table->unsignedInteger('qty')->nullable();
            $table->unsignedInteger('cycle');
            $table->string('staged_by');
            $table->timestamp('staged_at');
            $table->string('released_by')->nullable();
            $table->timestamp('released_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lot_stagings');
    }
};
