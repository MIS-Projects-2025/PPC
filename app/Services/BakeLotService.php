<?php

namespace App\Services;

use App\Models\BakeLot;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class BakeLotService
{
    /**
     * lotid => oven_num for the lots in the plan. Never throws: if the bake
     * source is unreachable or the schema/table is missing, returns [].
     */
    public function lotOvensForPlan(iterable $planLotIds): array
    {
        $driver = config('bake.driver', 'real');

        if ($driver === 'off') {
            return [];
        }

        if ($driver === 'fake' && ! app()->isProduction()) {
            return $this->fakeActiveLotOvens(
                $planLotIds,
                (float) config('bake.fake_ratio', 0.10),
                (int) config('bake.fake_oven_count', 6),
            );
        }

        // circuit breaker: after a failure, don't pay the connect timeout on every request
        // (rescue() so a broken cache can't throw either)
        if (rescue(fn() => Cache::has('bake:unavailable'), false, false)) {
            return [];
        }

        try {
            return $this->getActiveLotOvens();
        } catch (\Throwable $e) {
            rescue(
                fn() => Cache::put('bake:unavailable', true, now()->addSeconds((int) config('bake.retry_after', 60))),
                null,
                false,
            );
            Log::warning('Bake source unavailable; baking badges disabled.', ['error' => $e->getMessage()]);

            return [];
        }
    }

    public function getActiveLotOvens(): array
    {
        return BakeLot::query()
            ->active()
            ->whereNotNull('b.lotid')
            ->pluck('b.oven_num', 'b.lotid')
            ->all();
    }

    /**
     * DEV ONLY: pretend ~$ratio of the given lots are in an oven.
     * Deterministic (hash of the lot id), so results are stable between requests.
     *
     * @return array<string, int> lotid => oven_num
     */
    public function fakeActiveLotOvens(iterable $lotIds, float $ratio = 0.50, int $ovenCount = 6): array
    {
        $threshold = (int) round($ratio * 100);
        $ovens = [];

        foreach ($lotIds as $lotId) {
            $lotId = trim((string) $lotId);
            if ($lotId === '') {
                continue;
            }

            $hash = crc32($lotId);
            if ($hash % 100 < $threshold) {
                $ovens[$lotId] = intdiv($hash, 100) % $ovenCount + 1;
            }
        }

        return $ovens;
    }

    /* Get all currently active bake lots with their latest WIP details. */

    public function getActiveBake(): Collection
    {
        return BakeLot::query()
            ->active()
            ->withWip()
            ->select([
                // =====================================================
                // BAKE — SOURCE OF TRUTH
                // =====================================================

                'b.id',
                'b.oven_num',
                'b.lotid',

                'b.package',
                'b.partname',
                'b.quantity',

                'b.chamber',
                'b.input_type',
                'b.approved_status',
                'b.temperature',
                'b.hours',

                'b.date_time_in',
                'b.operator_in',
                'b.date_time_out',
                'b.operator_out',

                'b.bake_status',
                'b.approved_by',
                'b.added_by',

                'b.cooldown_by',
                'b.cooldown_end',

                'b.factory',

                // =====================================================
                // WIP — SUPPLEMENTAL DATA
                // =====================================================

                'wip.customer_data_id AS wip_id',

                'wip.Plant AS plant',
                'wip.Station AS station',

                'wip.Lot_Type AS lot_type',
                'wip.Prod_Area AS prod_area',
                'wip.Lot_Status AS lot_status',

                'wip.Date_Loaded AS date_loaded',
                'wip.Start_Time AS start_time',

                'wip.Part_Type AS part_type',
                'wip.Part_Class AS part_class',
                'wip.Date_Code AS date_code',

                'wip.Focus_Group AS focus_group',
                'wip.Process_Group AS process_group',

                'wip.End_Customer AS end_customer',

                'wip.Bake AS bake',
                'wip.Bake_Count AS bake_count',

                'wip.Test_Lot_Id AS test_lot_id',
                'wip.Assy_Site AS assy_site',
                'wip.Bake_Time_Temp AS bake_time_temp',
            ])
            ->get();
    }

    public function getAllOvenWithActiveBake(): Collection
    {
        return BakeLot::query()
            ->active()
            ->select('b.oven_num')
            ->whereNotNull('b.oven_num')
            ->distinct()
            ->orderBy('b.oven_num')
            ->get();
    }
}
