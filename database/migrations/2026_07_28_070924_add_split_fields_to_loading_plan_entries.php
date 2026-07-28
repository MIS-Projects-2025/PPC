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
        Schema::table('loading_plan_entries', function (Blueprint $table) {
            $table->integer('qty_base')->nullable()->after('qty');
            $table->integer('qty_override')->nullable()->after('qty_base');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('loading_plan_entries', function (Blueprint $table) {
            $table->dropColumn(['qty_base', 'qty_override']);
        });
    }
};
