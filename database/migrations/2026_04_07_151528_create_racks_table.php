<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('racks', function (Blueprint $table) {
            $table->unsignedInteger('id')->autoIncrement();
            $table->unsignedInteger('production_line_id');
            $table->string('label', 50);
            $table->timestamps();

            $table->unique(['production_line_id', 'label'], 'uq_racks_pl_label');

            $table->foreign('production_line_id', 'fk_racks_production_line')
                ->references('id')
                ->on('production_lines')
                ->onUpdate('cascade')
                ->onDelete('restrict');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('racks');
    }
};
