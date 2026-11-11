<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RackFloorBlock extends Model
{
    protected $fillable = ['rack_floor_map_id', 'rack_id', 'shelf_label', 'x', 'y', 'w', 'h'];

    protected $casts = [
        'rack_floor_map_id' => 'integer',
        'rack_id'           => 'integer',
        'x'                 => 'integer',
        'y'                 => 'integer',
        'w'                 => 'integer',
        'h'                 => 'integer',
    ];

    public function floorMap(): BelongsTo
    {
        return $this->belongsTo(RackFloorMap::class, 'rack_floor_map_id');
    }

    public function rack(): BelongsTo
    {
        return $this->belongsTo(Rack::class);
    }
}
