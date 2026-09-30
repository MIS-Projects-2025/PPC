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
        Schema::create('loading_plan_bucket_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('bucket_id')->constrained('loading_plan_buckets')->cascadeOnDelete();
            $t->string('lot_id', 64);
            $t->date('scheduled_date');
            $t->decimal('position', 14, 4)->default(0);
            $t->timestamps();

            $t->unique(['lot_id', 'scheduled_date']);

            // Pass a custom short index name as the second parameter
            $t->index(['bucket_id', 'scheduled_date', 'position'], 'lpbi_bucket_date_pos_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('loading_plan_bucket_items');
    }
};
