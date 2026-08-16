<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class CustomerDataWip extends Model
{
    protected $table = 'customer_data_wip';
    public $timestamps = false;

    protected $fillable = [
        'Plant',
        'Part_Name',
        'Lead_Count',
        'Package_Name',
        'Lot_Id',
        'Station',
        'Qty',
        'Lot_Type',
        'Prod_Area',
        'Lot_Status',
        'Date_Loaded',
        'Start_Time',
        'Part_Type',
        'Part_Class',
        'Date_Code',
        'Focus_Group',
        'Process_Group',
        'Bulk',
        'Reqd_Time',
        'Lot_Entry_Time',
        'Stage',
        'Stage_Start_Time',
        'CCD',
        'Stage_Run_Days',
        'Lot_Entry_Time_Days',
        'Tray',
        'Backend_Leadtime',
        'OSL_Days',
        'BE_Group',
        'Strategy_Code',
        'CR3',
        'BE_Starttime',
        'BE_OSL_Days',
        'Body_Size',
        'Auto_Part',
        'Ramp_Time',
        'End_Customer',
        'Bake',
        'Bake_Count',
        'Test_Lot_Id',
        'Stock_Position',
        'Assy_Site',
        'Bake_Time_Temp',
        'imported_by',
        'import_date',
        'production_line',
    ];

    // ---- Scopes for the WIP Loading Plan filtration ----

    // keep only Station names that are tape-and-reel ("_T") stations except for GTTRES_T (which is a tape-and-reel station but not part of the WIP Loading Plan)
    public function scopeTapeReelStations(Builder $q): Builder
    {
        return $q->whereIn('Station', config('wip.tape_reel_stations'))
            ->where('Station', '!=', 'GTTRES_T');
    }

    // the 3 stations pulled into the "Post TNR WIP" block
    public function scopePostTnrStations(Builder $q): Builder
    {
        return $q->whereIn('Station', ['GTTFVI_T', 'GTTOQA_T', 'GTTBOX_T']);
    }

    public function scopeExcludingPostTnr(Builder $q): Builder
    {
        return $q->whereNotIn('Station', ['GTTFVI_T', 'GTTOQA_T', 'GTTBOX_T']);
    }

    public function scopeForDate(Builder $q, string|array $date): Builder
    {
        return is_array($date)
            ? $q->whereIn('import_date', $date)
            : $q->where('import_date', $date);
    }

    // CT = Date_Loaded - BE_Starttime, in fractional days
    public function scopeWithCt(Builder $q): Builder
    {
        return $q->selectRaw(
            '*, (UNIX_TIMESTAMP(Date_Loaded) - UNIX_TIMESTAMP(BE_Starttime)) / 86400 AS ct_days'
        );
    }

    public function scopeSortByCtDesc(Builder $q): Builder
    {
        return $q->orderByRaw('ct_days IS NULL, ct_days DESC');
    }

    // "For Bake" set — Bake = For Bake, specific stations, Bake_Count = 0
    public function scopeBakeReady(Builder $q): Builder
    {
        return $q->where('Bake', 'For Bake')
            ->whereIn('Station', ['GTBKLDBE_T', 'GTIQA_T', 'GTLPI_T', 'GTTRANS_T', 'GTBRAND_T'])
            ->where('Bake_Count', 0);
    }

    // CR3 = RES, sorted by Lot_Entry_Time_Days desc
    public function scopeCr3Res(Builder $q): Builder
    {
        return $q->where('CR3', 'RES');
    }

    public function scopeSortByLotEntryDaysDesc(Builder $q): Builder
    {
        return $q->orderByRaw('Lot_Entry_Time_Days IS NULL, Lot_Entry_Time_Days DESC');
    }
}
