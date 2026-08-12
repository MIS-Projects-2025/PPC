<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lot_commits', function (Blueprint $table) {
            $table->id();
            $table->string('Lot_Id', 50);
            $table->integer('Qty');
            $table->integer('recipe_used');
            $table->integer('commit');
            $table->timestamp('computed_at')->useCurrent()->useCurrentOnUpdate();

            $table->unique('Lot_Id', 'uq_lot_commits_lot_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lot_commits');
    }
};
