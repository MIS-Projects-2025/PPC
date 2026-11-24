<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('machine_hourly_rows', function (Blueprint $table) {
            $table->string('night_setup', 100)->nullable()->after('night_lots');
        });
    }

    public function down(): void
    {
        Schema::table('machine_hourly_rows', function (Blueprint $table) {
            $table->dropColumn('night_setup');
        });
    }
};
