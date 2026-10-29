<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bosch_parts', function (Blueprint $table) {
            $table->id();
            $table->string('partname', 100)->unique();
            $table->boolean('is_bosch')->default(true)->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bosch_parts');
    }
};
