<?php

namespace App\Repositories;

use Illuminate\Database\Eloquent\Collection;
use App\Models\ProductionLine;
use App\Repositories\Interfaces\ProductionLineRepositoryInterface;

class ProductionLineRepository implements ProductionLineRepositoryInterface
{
  public function all(): Collection
  {
    return ProductionLine::orderBy('name')->get();
  }

  public function allActive(): Collection
  {
    return ProductionLine::where('is_active', true)->orderBy('name')->get();
  }

  public function find(int $id): ProductionLine
  {
    return ProductionLine::findOrFail($id);
  }

  public function create(array $data): ProductionLine
  {
    return ProductionLine::create($data);
  }

  public function update(int $id, array $data): ProductionLine
  {
    $pl = $this->find($id);
    $pl->update($data);
    return $pl->fresh();
  }

  public function delete(int $id): void
  {
    $this->find($id)->delete();
  }
}
