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
        Schema::create('machine_capability_dimensions', function (Blueprint $table) {
            $table->unsignedBigInteger('capability_package_id');
            $table->string('body_size', 20);

            $table->primary(['capability_package_id', 'body_size']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('machine_capability_dimensions');
    }
};
