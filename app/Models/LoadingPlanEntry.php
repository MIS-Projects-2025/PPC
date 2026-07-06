<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoadingPlanEntry extends Model
{
    protected $table = 'loading_plan_entries';

    protected $fillable = [
        'entry_type',
        'lot_id',
        'scheduled_date',
        'machine',
        'sequence_order',
        'status',
        'tag',
        'remarks',
        'block_label',
        'accu_time',
        'lock_version',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
        'sequence_order' => 'float',
    ];

    public function lot()
    {
        return $this->belongsTo(LotRegistry::class, 'lot_id', 'Lot_Id');
    }
}
