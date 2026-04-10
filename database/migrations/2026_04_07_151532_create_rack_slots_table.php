<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rack_slots', function (Blueprint $table) {
            $table->unsignedInteger('id')->autoIncrement();
            $table->unsignedInteger('rack_id');
            $table->string('label', 10);
            $table->tinyInteger('is_manually_full')->default(0);
            $table->string('marked_full_by', 10)->nullable();
            $table->timestamp('marked_full_at')->nullable();
            $table->timestamps();

            $table->unique(['rack_id', 'label'], 'uq_rack_slots_rack_label');

            $table->index('rack_id', 'idx_rack_slots_rack');

            $table->foreign('rack_id', 'fk_rack_slots_rack')
                ->references('id')
                ->on('racks')
                ->onUpdate('cascade')
                ->onDelete('restrict');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rack_slots');
    }
};
