<?php

namespace App\Repositories\Interfaces;

use Illuminate\Database\Eloquent\Collection;
use App\Models\Rack;

interface RackRepositoryInterface
{
    public function all(): Collection;
    public function byProductionLine(int $productionLineId): Collection;
    public function getAllByProductionLine(int $productionLineId): Collection;
    public function existByLabel(string $label): bool;
    public function find(int $id): Rack;
    public function findWithSlots(int $id): Rack;
    public function create(array $data): Rack;
    public function update(int $id, array $data): Rack;
    public function delete(int $id): void;
}
