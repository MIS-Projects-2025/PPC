<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Isolated on purpose: Laravel/Doctrine's ->change() can silently fail
     * to apply new attributes (like ->nullable()) when mixed with other
     * column operations (additions, etc.) in the same Schema::table()
     * closure — see the earlier migration in this project where nullable()
     * didn't take effect for exactly this reason. Column modifications via
     * ->change() should always live alone in their own closure/migration.
     */
    public function up(): void
    {
        Schema::table('loading_plan_entries', function (Blueprint $table) {
            $table->decimal('sequence_order', 14, 4)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('loading_plan_entries', function (Blueprint $table) {
            $table->decimal('sequence_order', 14, 4)->nullable(false)->change();
        });
    }
};
