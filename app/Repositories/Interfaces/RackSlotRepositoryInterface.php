<?php

namespace App\Repositories\Interfaces;

use Illuminate\Database\Eloquent\Collection;
use App\Models\RackSlot;

interface RackSlotRepositoryInterface
{
    public function find(int $id): RackSlot;
    public function all(?int $productionLineId = null): Collection;
    public function byRack(int $rackId): Collection;
    public function availableByRack(int $rackId): Collection;
    public function create(array $data): RackSlot;
    public function update(int $id, array $data): RackSlot;
    public function delete(int $id): void;
    public function markFull(int $id, string $by): RackSlot;
    public function markManyFull(array $id, string $by);
    public function clearFull(int $id): RackSlot;
    public function clearManyFull(array $ids);
}
