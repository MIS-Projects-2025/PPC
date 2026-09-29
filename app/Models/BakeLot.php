<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class BakeLot extends Model
{
    protected $connection = 'bms_db';

    protected $table = 'dbakeformtable as b';

    protected $primaryKey = 'id';

    public $timestamps = false;

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('b.date_time_out', '>', now());
    }

    public function scopeWithWip(Builder $query): Builder
    {
        $latestWip = DB::table('ppc.customer_data_wip AS wip')
            ->select([
                'wip.Lot_Id',
                DB::raw('MAX(wip.customer_data_id) AS max_id'),
            ])
            ->join(
                'bms_db.dbakeformtable AS b',
                'b.lotid',
                '=',
                'wip.Lot_Id'
            )
            ->where('b.date_time_out', '>', now())
            ->groupBy('wip.Lot_Id');

        return $query
            ->leftJoinSub($latestWip, 'latest_wip', function ($join) {
                $join->on('latest_wip.Lot_Id', '=', 'b.lotid');
            })
            ->leftJoin('ppc.customer_data_wip AS wip', function ($join) {
                $join
                    ->on('wip.Lot_Id', '=', 'latest_wip.Lot_Id')
                    ->on('wip.customer_data_id', '=', 'latest_wip.max_id');
            });
    }
}
