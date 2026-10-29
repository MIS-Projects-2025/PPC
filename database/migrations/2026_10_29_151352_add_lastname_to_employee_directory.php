<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employee_directory', function (Blueprint $table) {
            $table->string('LASTNAME')->nullable()->after('FIRSTNAME');
        });
    }

    public function down(): void
    {
        Schema::table('employee_directory', function (Blueprint $table) {
            $table->dropColumn('LASTNAME');
        });
    }
};
