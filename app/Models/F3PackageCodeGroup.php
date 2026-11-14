<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class F3PackageCodeGroup extends Model
{
    protected $table = 'f3_package_code_group';

    protected $fillable = ['package_code', 'package_type'];

    public const CACHE_KEY = 'f3-package-types:v1';

    /** UPPER(package_code) => package_type. Cached 5 min; busted on save/delete. */
    public static function lookup(): array
    {
        return Cache::remember(self::CACHE_KEY, 300, fn() => static::query()
            ->get(['package_code', 'package_type'])
            ->mapWithKeys(fn($r) => [strtoupper(trim($r->package_code)) => $r->package_type])
            ->all());
    }

    protected static function booted(): void
    {
        static::saved(fn() => Cache::forget(self::CACHE_KEY));
        static::deleted(fn() => Cache::forget(self::CACHE_KEY));
    }
}
