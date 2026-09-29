<?php

namespace App\Services;

use App\Models\LoadingPlanPackageGroup;
use App\Repositories\LoadingPlanPackageGroupRepository;
use Illuminate\Support\Facades\Cache;

class PackageGroups
{
    public const CACHE_REVERSE = 'package_groups:reverse_map';
    public const CACHE_GROUPED = 'package_groups:grouped';

    public function __construct(private LoadingPlanPackageGroupRepository $repo) {}

    /** Backward-compatible static entry point: PackageGroups::groupOf('QSOP') */
    public static function groupOf(?string $packageName): ?string
    {
        return app(self::class)->resolve($packageName);
    }

    public static function flushCache(): void
    {
        Cache::forget(self::CACHE_REVERSE);
        Cache::forget(self::CACHE_GROUPED);
    }

    /** Group for a package, or the package name itself if unmapped. */
    public function resolve(?string $packageName): ?string
    {
        if (!$packageName) {
            return $packageName;
        }

        return $this->reverseMap()[$packageName] ?? $packageName;
    }

    /** [package_name => group_name] (cached) */
    public function reverseMap(): array
    {
        return Cache::rememberForever(self::CACHE_REVERSE, function () {
            return $this->repo->all()
                ->sortBy('id')
                ->pluck('group_name', 'package_name')
                ->all();
        });
    }

    /** [group_name => [package_name, ...]] (cached), same shape as the old GROUPS const */
    public function grouped(): array
    {
        return Cache::rememberForever(self::CACHE_GROUPED, function () {
            return $this->repo->all()
                ->groupBy('group_name')
                ->map(fn($rows) => $rows->pluck('package_name')->values()->all())
                ->all();
        });
    }

    public function list(?string $group = null, ?string $search = null)
    {
        return $this->repo->all($group, $search);
    }

    public function find(int $id): LoadingPlanPackageGroup
    {
        return $this->repo->findOrFail($id);
    }

    // Mutations: cache is flushed by the model's saved/deleted events.

    public function create(array $data): LoadingPlanPackageGroup
    {
        return $this->repo->create($data);
    }

    public function update(LoadingPlanPackageGroup $model, array $data): LoadingPlanPackageGroup
    {
        return $this->repo->update($model, $data);
    }

    public function delete(LoadingPlanPackageGroup $model): bool
    {
        return $this->repo->delete($model);
    }
}
