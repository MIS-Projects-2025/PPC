<?php

namespace App\Services;

use App\Models\FocusGroupFactory;
use Illuminate\Support\Facades\Cache;

class FocusGroupFactoryService
{
    private const CACHE_TTL = 86400; // 24 hours
    private const CACHE_KEY = 'focus_group_factory_map';
    private const CACHE_STORE = 'file';

    private static ?array $runtimeMap = null;

    public function resolveFactory(?string $focusGroup): ?string
    {
        if (!$focusGroup) {
            return null;
        }

        return $this->getMap()[$focusGroup] ?? null;
    }

    public function getMap(): array
    {
        return self::$runtimeMap ??= Cache::store(self::CACHE_STORE)->remember(
            self::CACHE_KEY,
            self::CACHE_TTL,
            fn() => FocusGroupFactory::pluck('factory', 'focus_group')->toArray()
        );
    }

    public function clearCache(): void
    {
        self::$runtimeMap = null;
        Cache::store(self::CACHE_STORE)->forget(self::CACHE_KEY);
    }
}
