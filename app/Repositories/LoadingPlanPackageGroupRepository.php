<?php

namespace App\Repositories;

use App\Models\LoadingPlanPackageGroup;
use Illuminate\Database\Eloquent\Collection;

class LoadingPlanPackageGroupRepository
{
    public function all(?string $group = null, ?string $search = null): Collection
    {
        return LoadingPlanPackageGroup::query()
            ->when($group, fn($q) => $q->where('group_name', $group))
            ->when($search, fn($q) => $q->where('package_name', 'like', "%{$search}%"))
            ->orderBy('group_name')
            ->orderBy('package_name')
            ->orderBy('id')
            ->get();
    }

    public function find(int $id): ?LoadingPlanPackageGroup
    {
        return LoadingPlanPackageGroup::find($id);
    }

    public function findOrFail(int $id): LoadingPlanPackageGroup
    {
        return LoadingPlanPackageGroup::findOrFail($id);
    }

    public function create(array $data): LoadingPlanPackageGroup
    {
        return LoadingPlanPackageGroup::create($data);
    }

    public function update(LoadingPlanPackageGroup $model, array $data): LoadingPlanPackageGroup
    {
        $model->update($data);

        return $model;
    }

    public function delete(LoadingPlanPackageGroup $model): bool
    {
        return (bool) $model->delete();
    }
}
