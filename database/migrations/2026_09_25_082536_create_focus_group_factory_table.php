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
        Schema::create('focus_group_factory', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('focus_group', 20)->unique('idx_focus_group');
            $table->string('factory', 10)->index('idx_factory');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('focus_group_factory');
    }
};
