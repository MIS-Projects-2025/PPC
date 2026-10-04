<?php

namespace App\Services;

class PackageLocation
{
    private static ?\Illuminate\Support\Collection $memo = null;

    public static function map(): \Illuminate\Support\Collection
    {
        return self::$memo ??= \Cache::remember('package-line-map', now()->addMinutes(10), fn() =>
        \App\Models\PpcPackageMaster::query()->where('is_telford', 1)->where('is_active', 1)->get()
            ->mapWithKeys(fn($r) => [trim($r->package) => $r->default_pl]));
    }

    public static function for(?string $package): ?string
    {
        return $package === null ? null : self::map()->get(trim($package));
    }
}
