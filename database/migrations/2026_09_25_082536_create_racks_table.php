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
        Schema::create('racks', function (Blueprint $table) {
            $table->increments('id');
            $table->unsignedInteger('production_line_id');
            $table->unsignedBigInteger('rack_page_id')->index('racks_rack_page_id_foreign');
            $table->string('label', 50);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['production_line_id', 'label'], 'uq_racks_pl_label');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('racks');
    }
};
