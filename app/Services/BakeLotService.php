<?php

namespace App\Services;

use App\Models\BakeLot;
use Illuminate\Support\Collection;

class BakeLotService
{
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
