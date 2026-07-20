<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::connection('qdn_db')->table('package_list', function (Blueprint $table) {
            $table->integer('recipe')->nullable()->after('drypack');
        });
    }

    public function down(): void
    {
        Schema::connection('qdn_db')->table('package_list', function (Blueprint $table) {
            $table->dropColumn('recipe');
        });
    }
};
