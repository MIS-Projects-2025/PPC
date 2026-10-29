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
        Schema::create('masterlist_cache', function (Blueprint $table) {
            $table->id();
            $table->string('emp_id')->unique();
            $table->string('password_hash');
            $table->json('payload'); // Full masterlist row, minus PASSWRD
            $table->timestamp('cached_at')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('masterlist_cache');
    }
};
