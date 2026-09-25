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
        Schema::create('body_size_capacity_profiles', function (Blueprint $table) {
            $table->bigInteger('id', true);
            $table->bigInteger('body_size_id')->index('body_size_id');
            $table->decimal('capacity', 10)->nullable();
            $table->string('factory', 50)->nullable();
            $table->dateTime('effective_from');
            $table->dateTime('effective_to')->nullable();
            $table->bigInteger('machine_id')->nullable()->index('machine');
            $table->integer('body_size_capacity_profile_instance_id')->nullable()->index('body_size_capacity_profile_instance_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('body_size_capacity_profiles');
    }
};
