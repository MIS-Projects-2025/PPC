<?php

namespace App\Repositories\Interfaces;

use Illuminate\Database\Eloquent\Collection;
use App\Models\LotPosition;

interface LotPositionRepositoryInterface
{
    public function activeByLot(int $lotId): Collection;
    public function activeBySlot(int $rackSlotId): ?LotPosition;
    public function assign(int $lotId, int $rackSlotId, int $lotStagingId, string $by, int $productionLineId, int $rackPageId): LotPosition;
    public function releaseByLot(int $lotId, string $by): void;    // frees all slots for a lot
    public function getOccupancyByRackPage(int $rackPageId);
    public function getOccupancyByProductionLine(int $productionLineId): Collection;
}
