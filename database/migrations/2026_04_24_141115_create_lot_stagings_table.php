<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lot_stagings', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('lot_id');
            $table->foreign('lot_id')->references('id')->on('lots')->cascadeOnDelete();
            $table->unsignedInteger('cycle');
            $table->string('staged_by');
            $table->timestamp('staged_at');
            $table->string('released_by')->nullable();
            $table->timestamp('released_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lot_stagings');
    }
};
