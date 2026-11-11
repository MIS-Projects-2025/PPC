<?php

namespace App\Services;

use App\Models\BoxDimension;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Validation\ValidationException;

class BoxDimensionService
{
    public function all(): Collection
    {
        return BoxDimension::withCount('stagings')->orderBy('name')->get();
    }

    public function create(array $data): BoxDimension
    {
        return BoxDimension::create($data);
    }

    public function update(int $id, array $data): BoxDimension
    {
        $box = BoxDimension::findOrFail($id);
        $box->update($data);

        return $box;
    }

    public function delete(int $id): void
    {
        $box = BoxDimension::findOrFail($id);

        if ($box->stagings()->exists()) {
            throw ValidationException::withMessages([
                'box' => "{$box->name} is used by existing lots and cannot be deleted.",
            ]);
        }

        $box->delete();
    }
}
