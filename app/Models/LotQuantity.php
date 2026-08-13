<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LotQuantity extends Model
{
    protected $table = 'lot_quantities';

    protected $fillable = [
        'lot_id',
        'scheduled_date',
        'part_name',
        'qty_base',
        'split_adjustment',
        'merge_adjustment',
        'commit',
        'recipe_used',
        'recipe_source_id',
        'recipe_status',
        'capacity_uph_snapshot',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
    ];

    public function effectiveQty(): int
    {
        return $this->qty_base + $this->split_adjustment + $this->merge_adjustment;
    }
}
