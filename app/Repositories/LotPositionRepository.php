<?php

namespace App\Repositories;

use Illuminate\Database\Eloquent\Collection;
use App\Models\LotPosition;
use App\Repositories\Interfaces\LotPositionRepositoryInterface;

class LotPositionRepository implements LotPositionRepositoryInterface
{
  public function activeByLot(int $lotId): Collection
  {
    return LotPosition::with('rackSlot')
      ->where('lot_id', $lotId)
      ->active()
      ->get();
  }

  public function activeBySlot(int $rackSlotId): ?LotPosition
  {
    return LotPosition::with('lot')
      ->where('rack_slot_id', $rackSlotId)
      ->active()
      ->first();
  }

  public function assign(int $lotId, int $rackSlotId, string $by): LotPosition
  {
    return LotPosition::create([
      'lot_id'       => $lotId,
      'rack_slot_id' => $rackSlotId,
      'assigned_at'  => now(),
      'assigned_by'  => $by,
    ]);
  }

  public function releaseByLot(int $lotId, string $by): void
  {
    LotPosition::where('lot_id', $lotId)
      ->whereNull('released_at')
      ->update([
        'released_at' => now(),
        'released_by' => $by,
      ]);
  }

  public function releaseBySlot(int $rackSlotId, string $by): void
  {
    LotPosition::where('rack_slot_id', $rackSlotId)
      ->whereNull('released_at')
      ->update([
        'released_at' => now(),
        'released_by' => $by,
      ]);
  }
}
