<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * qty_override was sufficient when split was the only mechanism that
     * could adjust a lot's effective qty away from qty_base. Now that merge
     * is a second, independent mechanism, both were writing to the same
     * column as a full overwrite — each blind to the other — which silently
     * discards whichever adjustment was written first whenever the other
     * recalculates. Splitting into two signed adjustment columns lets both
     * mechanisms coexist: effective qty = qty_base + split_adjustment + merge_adjustment.
     */
    public function up(): void
    {
        Schema::table('lot_quantities', function (Blueprint $table) {
            $table->integer('split_adjustment')->default(0)->after('qty_base');
            $table->integer('merge_adjustment')->default(0)->after('split_adjustment');
        });

        // Backfill: best-effort migration of existing qty_override values.
        // Since we can't know retroactively whether an existing qty_override
        // came from a split or a merge (or both, already collided), we
        // attribute it to split_adjustment by default — matching prior
        // behavior for the common case (split-only usage) — and leave a
        // log of any lots that also have active merges, since those rows'
        // historical qty_override may already be wrong and worth a manual
        // review rather than a blind backfill.
        DB::table('lot_quantities')
            ->whereNotNull('qty_override')
            ->update([
                'split_adjustment' => DB::raw('CAST(qty_override AS SIGNED) - CAST(qty_base AS SIGNED)'),
            ]);

        $suspect = DB::table('lot_quantities as lq')
            ->join('lot_merges as lm', function ($join) {
                $join->on('lm.target_lot_id', '=', 'lq.lot_id')
                    ->orOn('lm.source_lot_id', '=', 'lq.lot_id');
            })
            ->whereNull('lm.reverted_at')
            ->whereNotNull('lq.qty_override')
            ->select('lq.lot_id', 'lq.scheduled_date')
            ->distinct()
            ->get();

        if ($suspect->isNotEmpty()) {
            \Illuminate\Support\Facades\Log::warning(
                'lot_quantities backfill: lots with both qty_override and an active merge — split_adjustment backfill may be inaccurate, review manually.',
                ['lots' => $suspect->toArray()]
            );
        }
    }

    public function down(): void
    {
        Schema::table('lot_quantities', function (Blueprint $table) {
            $table->dropColumn(['split_adjustment', 'merge_adjustment']);
        });
    }
};
