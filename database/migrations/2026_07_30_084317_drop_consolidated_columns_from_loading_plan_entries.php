<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * These columns have been consolidated into the `lot_quantities` table
     * (keyed by lot_id + scheduled_date), which is now the single source of
     * truth for qty, part_name, commit/recipe info, and capacity_uph for
     * every lot type (WIP-backed, manual, split).
     *
     * Only run this AFTER:
     *   - lot_quantities table exists and is populated (trigger + backfill)
     *   - buildPlanRows() reads from lot_quantities
     *   - all write paths (editLotField, bulkEditField, createManualLot,
     *     LotSplitService, moveEntry/transferEntry/bulkTransfer/applyBulkReorder)
     *     write to lot_quantities instead of these columns
     *   - production has been stable on the new path for a few days
     */
    public function up(): void
    {
        Schema::table('loading_plan_entries', function (Blueprint $table) {
            $table->dropColumn([
                'qty',
                'qty_base',
                'qty_override',
                'part_name',
                'capacity_uph_snapshot',
            ]);
        });
    }

    /**
     * Restores the columns as nullable — original NOT NULL/default constraints
     * are not recreated here since the data is gone. If you need to roll back
     * meaningfully, restore from a backup taken before running `up()`.
     */
    public function down(): void
    {
        Schema::table('loading_plan_entries', function (Blueprint $table) {
            $table->unsignedInteger('qty')->nullable()->after('lot_id');
            $table->unsignedInteger('qty_base')->nullable()->after('qty');
            $table->unsignedInteger('qty_override')->nullable()->after('qty_base');
            $table->string('part_name')->nullable()->after('qty_override');
            $table->unsignedInteger('capacity_uph_snapshot')->nullable()->after('accu_time');
        });
    }
};
