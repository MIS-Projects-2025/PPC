<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class BoschPart extends Model
{
    protected $fillable = ['partname', 'is_bosch'];

    protected $casts = ['is_bosch' => 'boolean'];

    public const CACHE_KEY = 'bosch-partnames:v1';

    /**
     * Upper-cased partname => true, for O(1) lookups.
     * Cached for 5 minutes; busted automatically on save/delete.
     */
    public static function lookup(): array
    {
        return Cache::remember(self::CACHE_KEY, 300, function () {
            return static::where('is_bosch', true)
                ->pluck('partname')
                ->mapWithKeys(fn($p) => [strtoupper(trim($p)) => true])
                ->all();
        });
    }

    protected static function booted(): void
    {
        static::saved(fn() => Cache::forget(self::CACHE_KEY));
        static::deleted(fn() => Cache::forget(self::CACHE_KEY));
    }
}
