<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('f3_package_code_group', function (Blueprint $t) {
            $t->id();
            $t->string('package_code', 100)->unique();
            $t->string('package_type', 100);
            $t->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('f3_package_code_group');
    }
};
