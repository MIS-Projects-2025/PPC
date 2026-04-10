<?php

namespace App\Repositories\Interfaces;

use Illuminate\Database\Eloquent\Collection;
use App\Models\ProductionLine;

interface ProductionLineRepositoryInterface
{
    public function all(): Collection;
    public function allActive(): Collection;
    public function find(int $id): ProductionLine;
    public function create(array $data): ProductionLine;
    public function update(int $id, array $data): ProductionLine;
    public function delete(int $id): void;
}
