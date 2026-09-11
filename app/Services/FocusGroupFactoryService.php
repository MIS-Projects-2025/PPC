<?php

namespace App\Services;

use App\Models\FocusGroupFactory;
use Illuminate\Support\Facades\Cache;

class FocusGroupFactoryService
{
    private const CACHE_TTL = 86400; // 24 hours
    private const CACHE_KEY = 'focus_group_factory_map';

    /**
     * In-memory cache for the current lifecycle.
     */
    private static ?array $runtimeMap = null;

    public function resolveFactory(?string $focusGroup): ?string
    {
        if (!$focusGroup) {
            return null;
        }

        $map = $this->getMap();

        return $map[$focusGroup] ?? null;
    }

    public function getMap(): array
    {
        // 1. If already loaded in memory during this request, return immediately
        if (self::$runtimeMap !== null) {
            return self::$runtimeMap;
        }

        // 2. Fetch from Cache (or DB if cache expired/missed)
        self::$runtimeMap = Cache::remember(self::CACHE_KEY, self::CACHE_TTL, function () {
            return FocusGroupFactory::pluck('factory', 'focus_group')->toArray();
        });

        return self::$runtimeMap;
    }

    public function clearCache(): void
    {
        self::$runtimeMap = null;
        Cache::forget(self::CACHE_KEY);
    }
}
