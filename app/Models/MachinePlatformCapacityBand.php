<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class MachinePlatformCapacityBand extends Model
{
    protected $connection = 'qdn_db';
    protected $table = 'machine_platform_capacity_bands';

    protected $fillable = [
        'platform',
        'qty_min',
        'qty_max',
        'capacity_uph',
    ];

    protected $casts = [
        'qty_min' => 'integer',
        'qty_max' => 'integer',
        'capacity_uph' => 'integer',
    ];

    /**
     * Scope: filter by platform
     */
    public function scopeForPlatform(Builder $query, string $platform): Builder
    {
        return $query->where('platform', $platform);
    }

    /**
     * Scope: filter by quantity falling within qty_min/qty_max range
     */
    public function scopeForQty(Builder $query, int $qty): Builder
    {
        return $query->where('qty_min', '<=', $qty)
            ->where('qty_max', '>=', $qty);
    }

    /**
     * Static helper: get capacity_uph for a given platform + qty
     */
    public static function getCapacity(string $platform, int $qty): ?int
    {
        return static::forPlatform($platform)
            ->forQty($qty)
            ->value('capacity_uph');
    }
}
