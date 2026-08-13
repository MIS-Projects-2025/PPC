<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CapacityBand extends Model
{
    protected $table = 'capacity_bands';

    protected $fillable = [
        'platform',
        'qty_min',
        'qty_max',
        'capacity_uph',
    ];

    protected $casts = [
        'qty_min'      => 'integer',
        'qty_max'      => 'integer',
        'capacity_uph' => 'integer',
    ];
}
