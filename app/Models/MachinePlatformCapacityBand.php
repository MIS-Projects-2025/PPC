<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class MachinePlatformCapacityBand extends Model
{
    protected $connection = 'qdn_db';
    protected $table = 'machine_platform_capacity_bands';

    protected $fillable = [
        'band_group',
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

    public function scopeForGroup(Builder $query, string $group): Builder
    {
        return $query->where('band_group', $group);
    }

    public function scopeForPlatform(Builder $query, string $platform): Builder
    {
        return $query->where('platform', $platform);
    }

    public function scopeForQty(Builder $query, int $qty): Builder
    {
        return $query->where('qty_min', '<=', $qty)
            ->where('qty_max', '>=', $qty);
    }

    public static function getCapacity(string $platform, int $qty, string $group = CapacityBandGroup::F1F2): ?int
    {
        return static::forGroup($group)
            ->forPlatform($platform)
            ->forQty($qty)
            ->value('capacity_uph');
    }
}
