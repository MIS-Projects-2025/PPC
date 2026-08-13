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
        Schema::create('capacity_bands', function (Blueprint $table) {
            $table->id();
            $table->string('platform', 50);
            $table->unsignedInteger('qty_min');
            $table->unsignedInteger('qty_max')->nullable();
            $table->unsignedInteger('capacity_uph');
            $table->timestamps();

            $table->unique(['platform', 'qty_min']);

            $table->index(['platform', 'qty_min', 'qty_max']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('capacity_bands');
    }
};
