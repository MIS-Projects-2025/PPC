<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LotMerge extends Model
{
    protected $fillable = [
        'target_lot_id',
        'source_lot_id',
        'scheduled_date',
        'transferred_qty',
        'created_by',
        'reverted_at',
        'reverted_by',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
        'reverted_at'    => 'datetime',
    ];

    public function scopeActive($query)
    {
        return $query->whereNull('reverted_at');
    }
}
