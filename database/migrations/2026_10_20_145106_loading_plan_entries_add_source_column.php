<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 'wip' = CustomerDataWip (F1/F2), 'f3' = ProcessTraveler.
        // Existing rows are all F1/F2, so the default backfills correctly.
        Schema::table('loading_plan_entries', function (Blueprint $t) {
            $t->string('source', 8)->default('wip')->after('entry_type');
            $t->index(['scheduled_date', 'source']);
        });

        // Where recipe_used came from: 'package_list' (recipe_source_id = package_list.id)
        // or 'process_traveler' (recipe_source_id = process_travelers.id).
        Schema::table('lot_quantities', function (Blueprint $t) {
            $t->string('recipe_source_type', 16)->default('package_list');
        });
    }

    public function down(): void
    {
        Schema::table('loading_plan_entries', function (Blueprint $t) {
            $t->dropIndex(['scheduled_date', 'source']);
            $t->dropColumn('source');
        });
        Schema::table('lot_quantities', fn(Blueprint $t) => $t->dropColumn('recipe_source_type'));
    }
};

/*
 * DARWIN (run separately, on the process_travelers database).
 * Validate first, the cast fails on non-numeric values:
 *
 *   SELECT id, process_rqmt FROM process_travelers WHERE process_rqmt NOT REGEXP '^[0-9]+$';
 *
 *   ALTER TABLE process_travelers
 *     MODIFY process_rqmt INT UNSIGNED NOT NULL DEFAULT 0;
 *
 * 0 means "no recipe" (computeMetrics already treats recipe <= 0 as no_recipe).
 */