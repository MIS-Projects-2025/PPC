<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('qdn_db')->create('package_groups', function (Blueprint $table) {
            $table->id();
            $table->string('group_name', 30);
            $table->string('package_name', 50);
            $table->timestamps();

            $table->unique(['group_name', 'package_name'], 'uniq_group_package');
            $table->index('package_name');
        });
    }

    public function down(): void
    {
        Schema::connection('qdn_db')->dropIfExists('package_groups');
    }
};
