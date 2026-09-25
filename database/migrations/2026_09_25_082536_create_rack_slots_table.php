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
        Schema::create('rack_slots', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('rack_id')->index('idx_rack_slots_rack');
            $table->string('label', 10);
            $table->tinyInteger('is_manually_full')->default(0);
            $table->string('marked_full_by', 10)->nullable();
            $table->timestamp('marked_full_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->boolean('is_active')->default(true);

            $table->unique(['rack_id', 'label'], 'uq_rack_slots_rack_label');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rack_slots');
    }
};
