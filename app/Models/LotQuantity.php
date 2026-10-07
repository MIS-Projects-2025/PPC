<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Awobaz\Compoships\Compoships;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class LotQuantity extends Model
{
    use HasFactory;
    use Compoships;

    protected $table = 'lot_quantities';

    protected $fillable = [
        'lot_id',
        'scheduled_date',
        'part_name',
        'qty_base',
        'split_adjustment',
        'merge_adjustment',
        'commit',
        'rework_seq',
        'recipe_used',
        'recipe_source_id',
        'recipe_status',
        'commit_override',
        'commit_override_qty',
        'capacity_uph_snapshot',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
    ];

    public function effectiveQty(): int
    {
        return $this->qty_base + $this->split_adjustment + $this->merge_adjustment;
    }

    public function packageListEntry()
    {
        return $this->belongsTo(PartName::class, 'recipe_source_id');
    }
}
