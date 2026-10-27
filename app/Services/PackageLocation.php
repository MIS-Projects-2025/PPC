<?php

namespace App\Services;

class PackageLocation
{
    private static ?\Illuminate\Support\Collection $memo = null;

    private const OVERRIDES = [
        ['package' => 'LCC',   'focus_group' => 'MPD', 'leadcount' => 8,  'location' => 'PL1', 'group' => 'MPD'],
        ['package' => 'LFCSP', 'focus_group' => 'MPD', 'leadcount' => 32, 'location' => 'PL1', 'group' => 'MPD'],
    ];

    private static function override(?string $package, ?string $focusGroup, $leadcount): ?array
    {
        $package = $package === null ? null : trim($package);

        foreach (self::OVERRIDES as $o) {
            if (
                $o['package'] === $package
                && ($o['focus_group'] === null || $o['focus_group'] === $focusGroup)
                && ($o['leadcount'] === null || (string) $o['leadcount'] === (string) $leadcount)
            ) {
                return $o;
            }
        }

        return null;
    }

    /** Row-level location: override first, then the package default. */
    public static function resolve(?string $package, ?string $focusGroup = null, $leadcount = null): ?string
    {
        return self::override($package, $focusGroup, $leadcount)['location'] ?? self::for($package);
    }

    /** Row-level group override, or null if no rule matches. */
    public static function groupOverride(?string $package, ?string $focusGroup = null, $leadcount = null): ?string
    {
        return self::override($package, $focusGroup, $leadcount)['group'] ?? null;
    }

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
