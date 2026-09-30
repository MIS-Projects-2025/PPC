<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('loading_plan_entries', function (Blueprint $table) {
            $table->boolean('is_scm')
                ->default(false)
                ->after('is_pickup');

            $table->boolean('rework')
                ->default(false)
                ->after('is_scm');
        });
    }

    public function down(): void
    {
        Schema::table('loading_plan_entries', function (Blueprint $table) {
            $table->dropColumn(['is_scm', 'rework']);
        });
    }
};
