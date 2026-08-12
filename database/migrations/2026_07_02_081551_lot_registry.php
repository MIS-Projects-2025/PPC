<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lot_registry', function (Blueprint $table) {
            $table->id();
            $table->string('Lot_Id', 64)->unique();
            $table->string('Part_Name', 100)->nullable();
            $table->string('Package_Name', 50)->nullable();
            $table->integer('Qty')->nullable();
            $table->timestamp('first_seen')->useCurrent();
            $table->timestamp('last_seen')->useCurrent()->useCurrentOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lot_registry');
    }
};
