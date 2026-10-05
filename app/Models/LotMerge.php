<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class LotMerge extends Model
{
    use HasFactory;
    protected $fillable = [
        'target_lot_id',
        'source_lot_id',
        'source_machine',
        'target_machine',
        'scheduled_date',
        'transferred_qty',
        'target_qty_before',
        'source_qty_before',
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
