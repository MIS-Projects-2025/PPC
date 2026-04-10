<?php

namespace App\Repositories;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use App\Models\Lot;
use App\Repositories\Interfaces\LotRepositoryInterface;
use Carbon\Carbon;

class LotRepository implements LotRepositoryInterface
{
  public function find(int $id): Lot
  {
    return Lot::with('activePositions.rackSlot')->findOrFail($id);
  }

  public function findByLotId(string $lotId): ?Lot
  {
    return Lot::where('lot_id', $lotId)->latest('received_at')->first();
  }

  public function all(): Collection
  {
    return Lot::with('position')
      ->get()
      ->map(function ($lot) {
        $lot->slot_ids = $lot->positions->pluck('rack_slot_id')->all();
        return $lot;
      });
  }

  public function today(): Collection
  {
    return Lot::with('activePositions.rackSlot')
      ->today()
      ->latest('received_at')
      ->get();
  }

  public function staged(): Collection
  {
    return Lot::with('activePositions.rackSlot')
      ->staged()
      ->latest('received_at')
      ->get();
  }

  public function aging(): Collection
  {
    return Lot::with('activePositions.rackSlot')
      ->staged()
      ->aging()
      ->oldest('received_at')
      ->get();
  }

  public function paginate(array $filters): LengthAwarePaginator
  {
    $query = Lot::with(['activePositions.rackSlot', 'positions', 'modifiedBy']);

    if (!empty($filters['status'])) {
      $query->where('status', $filters['status']);
    }

    if (!empty($filters['search'])) {
      $query->where(function ($q) use ($filters) {
        $q->where('lot_id', 'like', "%{$filters['search']}%")
          ->orWhere('partname', 'like', "%{$filters['search']}%");
      });
    }

    if (!empty($filters['date'])) {
      $date = Carbon::parse($filters['date'], 'Asia/Manila');
      $query->whereBetween('received_at', [
        $date->startOfDay()->utc(),
        $date->endOfDay()->utc(),
      ]);
    }

    return $query->latest('received_at')->paginate($filters['per_page'] ?? 20);
  }

  public function create(array $data): Lot
  {
    return Lot::create($data);
  }

  public function update(int $id, array $data): Lot
  {
    $lot = Lot::findOrFail($id);
    $lot->update($data);
    return $lot->fresh();
  }
}
