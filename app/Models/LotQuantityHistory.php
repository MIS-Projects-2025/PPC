<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LotQuantityHistory extends Model
{
    public $timestamps = false;

    protected $table = 'lot_quantity_history';

    protected $fillable = [
        'lot_quantity_id',
        'lot_id',
        'scheduled_date',
        'changed_by',
        'change_type',
        'changed_columns',
        'old_values',
        'new_values',
    ];

    protected $casts = [
        'changed_at'       => 'datetime',
        'scheduled_date'   => 'date',
        'changed_columns'  => 'array',
        'old_values'       => 'array',
        'new_values'       => 'array',
    ];

    public function lotQuantity()
    {
        return $this->belongsTo(LotQuantity::class, 'lot_quantity_id');
    }
}
