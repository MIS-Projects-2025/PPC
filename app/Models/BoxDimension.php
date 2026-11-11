<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BoxDimension extends Model
{
    protected $fillable = ['name', 'length', 'height', 'depth_units'];

    protected $casts = [
        'length'      => 'float',
        'height'      => 'float',
        'depth_units' => 'integer',
    ];

    protected $appends = ['label', 'is_mini'];

    public function stagings(): HasMany
    {
        return $this->hasMany(LotStaging::class, 'dimension_id');
    }

    // Mini-pizza = half depth, two fit across the slot depth.
    protected function isMini(): Attribute
    {
        return Attribute::make(get: fn() => $this->depth_units === 1);
    }

    // What operators see in the dropdown. The name already carries the dimensions.
    protected function label(): Attribute
    {
        return Attribute::make(
            get: fn() => $this->name . ($this->is_mini ? ' (mini)' : ''),
        );
    }
}
