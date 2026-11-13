<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class BoschPart extends Model
{
    protected $fillable = ['partname', 'badges'];

    protected $casts = ['badges' => 'array'];

    // bumped from v1: the cached shape changed (bool -> badge list)
    public const CACHE_KEY = 'part-badges:v2';

    /**
     * UPPER(partname) => list of badge names, only for parts that have at least one.
     * Cached for 5 minutes; busted automatically on save/delete.
     */
    public static function lookup(): array
    {
        return Cache::remember(self::CACHE_KEY, 300, function () {
            return static::query()
                ->whereNotNull('badges')
                ->get(['partname', 'badges'])
                ->filter(fn($p) => !empty($p->badges))
                ->mapWithKeys(fn($p) => [strtoupper(trim($p->partname)) => array_values($p->badges)])
                ->all();
        });
    }

    /** Every badge name currently in use (case-insensitive unique), sorted. */
    public static function distinctBadges(): array
    {
        return collect(static::lookup())
            ->flatten()
            ->unique(fn($b) => mb_strtoupper($b))
            ->sort(SORT_NATURAL | SORT_FLAG_CASE)
            ->values()
            ->all();
    }

    protected static function booted(): void
    {
        static::saved(fn() => Cache::forget(self::CACHE_KEY));
        static::deleted(fn() => Cache::forget(self::CACHE_KEY));
    }
}
