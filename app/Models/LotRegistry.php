<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LotRegistry extends Model
{
    protected $table = 'lot_registry';
    public $timestamps = false;

    protected $fillable = ['Lot_Id', 'Part_Name', 'Package_Name', 'Qty', 'first_seen', 'last_seen'];

    public function planEntry()
    {
        return $this->hasOne(LoadingPlanEntry::class, 'lot_id', 'Lot_Id');
    }
}
