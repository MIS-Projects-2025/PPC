<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LotSplit extends Model
{
    protected $fillable = [
        'parent_lot_id',
        'child_lot_id',
        'root_lot_id',
        'scheduled_date',
        'child_qty',
        'split_percentage',
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
