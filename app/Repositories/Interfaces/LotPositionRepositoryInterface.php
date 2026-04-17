<?php

namespace App\Repositories\Interfaces;

use Illuminate\Database\Eloquent\Collection;
use App\Models\LotPosition;

interface LotPositionRepositoryInterface
{
    public function activeByLot(int $lotId): Collection;
    public function activeBySlot(int $rackSlotId): ?LotPosition;
    public function assign(int $lotId, int $rackSlotId, string $by, int $productionLineId): LotPosition;
    public function releaseByLot(int $lotId, string $by): void;    // frees all slots for a lot
}
