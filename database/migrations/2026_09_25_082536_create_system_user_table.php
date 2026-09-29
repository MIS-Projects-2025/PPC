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
        Schema::create('system_user', function (Blueprint $table) {
            $table->integer('id', true);
            $table->string('log_user', 250);
            $table->string('log_username', 25);
            $table->string('log_password', 150);
            $table->smallInteger('log_category');
            $table->dateTime('date_created')->useCurrent();
            $table->dateTime('date_updated')->useCurrentOnUpdate()->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('system_user');
    }
};
