<?php

namespace App\Repositories\Interfaces;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use App\Models\Lot;

interface LotRepositoryInterface
{
    public function find(int $id): Lot;
    public function all(): Collection;
    public function findByLotId(string $lotId): ?Lot;
    public function today(): Collection;
    public function staged(): Collection;
    public function aging(): Collection;             // received_at >= 3 days ago
    public function paginate(array $filters): LengthAwarePaginator;
    public function create(array $data): Lot;
    public function update(int $id, array $data): Lot;
}
