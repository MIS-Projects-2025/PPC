<?php

namespace App\Repositories;

use Illuminate\Database\Eloquent\Collection;
use App\Models\LotPosition;
use App\Models\Lot;
use App\Repositories\Interfaces\LotPositionRepositoryInterface;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

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

  public function assign(int $lotId, int $rackSlotId, string $by, int $productionLineId): LotPosition
  {
    return LotPosition::create([
      'lot_id'       => $lotId,
      'rack_slot_id' => $rackSlotId,
      'production_line_id' => $productionLineId,
      'assigned_at'  => now(),
      'assigned_by'  => $by,
    ]);
  }

  public function releaseByLot(int $lotId, string $by): void
  {
    DB::transaction(function () use ($lotId, $by) {
      LotPosition::where('lot_id', $lotId)
        ->whereNull('released_at')
        ->update([
          'released_at' => Carbon::now('UTC'),
          'released_by' => $by,
        ]);

      Lot::where('id', $lotId)->update([
        'released_by' => $by,
        'released_at' => Carbon::now('UTC')
      ]);
    });
  }

  public function getOccupancyByProductionLine(int $productionLineId): Collection
  {
    return LotPosition::with('lot:id,lot_id,partname,qty,status')
      ->whereNull('released_at')
      ->whereHas('rackSlot', fn($q) => $q->whereHas(
        'rack',
        fn($q) =>
        $q->where('production_line_id', $productionLineId)
      ))
      ->select('rack_slot_id', 'lot_id')
      ->get()
      ->groupBy('rack_slot_id');
  }
}
