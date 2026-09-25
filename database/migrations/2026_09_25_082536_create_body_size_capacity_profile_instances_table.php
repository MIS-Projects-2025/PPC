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
        Schema::create('body_size_capacity_profile_instances', function (Blueprint $table) {
            $table->integer('id', true)->comment('Primary Key');
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->string('created_by', 50)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('body_size_capacity_profile_instances');
    }
};
