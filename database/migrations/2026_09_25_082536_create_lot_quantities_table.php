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
        Schema::create('lot_quantities', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('lot_id');
            $table->date('scheduled_date');
            $table->string('part_name');
            $table->unsignedInteger('qty_base');
            $table->integer('split_adjustment')->default(0);
            $table->integer('merge_adjustment')->default(0);
            $table->unsignedInteger('qty_override')->nullable();
            $table->unsignedInteger('commit')->nullable();
            $table->unsignedInteger('recipe_used')->nullable();
            $table->unsignedBigInteger('recipe_source_id')->nullable();
            $table->enum('recipe_status', ['ok', 'no_recipe', 'qty_below_recipe'])->default('no_recipe');
            $table->unsignedInteger('capacity_uph_snapshot')->nullable();
            $table->timestamps();

            $table->unique(['lot_id', 'scheduled_date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lot_quantities');
    }
};
