<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('downtime_code', function (Blueprint $table) {
            $table->id();
            $table->string('code', 255)->unique();
            $table->string('bg_color', 7)->nullable();   // hex, e.g. #FF0000
            $table->boolean('is_downtime')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('downtime_code');
    }
};
