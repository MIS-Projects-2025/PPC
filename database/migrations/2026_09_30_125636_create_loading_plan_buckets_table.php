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
        Schema::create('loading_plan_buckets', function (Blueprint $t) {
            $t->id();
            $t->string('location', 10);
            $t->string('label', 64);
            $t->unsignedInteger('machine_id')->nullable(); // null = top-level group
            $t->unsignedInteger('sort_order')->default(0);
            $t->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('loading_plan_buckets');
    }
};
