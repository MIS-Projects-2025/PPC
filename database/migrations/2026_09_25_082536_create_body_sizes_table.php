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
        Schema::create('body_sizes', function (Blueprint $table) {
            $table->bigInteger('id', true);
            $table->string('name', 100)->unique('name_unique');
            $table->timestamp('modified_at')->nullable()->useCurrent();
            $table->string('modified_by', 7)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('body_sizes');
    }
};
