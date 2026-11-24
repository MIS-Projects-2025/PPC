<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('hourly_sheets', function (Blueprint $table) {
            $table->id();
            $table->date('sheet_date');
            $table->string('type', 10);   // tnr | fvi
            $table->string('line', 10);   // F1 F2 F3 | PL1 PL6
            $table->string('created_by', 50)->nullable();
            $table->string('updated_by', 50)->nullable();
            $table->timestamps();

            $table->unique(['sheet_date', 'type', 'line']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hourly_sheets');
    }
};
