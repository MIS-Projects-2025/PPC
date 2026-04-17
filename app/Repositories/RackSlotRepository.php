<?php

namespace App\Repositories;

use Illuminate\Database\Eloquent\Collection;
use App\Models\RackSlot;
use App\Repositories\Interfaces\RackSlotRepositoryInterface;

class RackSlotRepository implements RackSlotRepositoryInterface
{
  public function all(): Collection
  {
    return RackSlot::with('rack.productionLine')->get();
  }

  public function find(int $id): RackSlot
  {
    return RackSlot::findOrFail($id);
  }

  public function byRack(int $rackId): Collection
  {
    return RackSlot::with('activePositions.lot')
      ->where('rack_id', $rackId)
      ->orderBy('label')
      ->get();
  }

  public function availableByRack(int $rackId): Collection
  {
    return RackSlot::where('rack_id', $rackId)
      ->where('is_manually_full', false)
      ->whereDoesntHave('activePositions')
      ->orderBy('label')
      ->get();
  }

  public function create(array $data): RackSlot
  {
    return RackSlot::create($data);
  }

  public function update(int $id, array $data): RackSlot
  {
    $slot = $this->find($id);
    $slot->update($data);
    return $slot->fresh();
  }

  public function delete(int $id): void
  {
    $this->find($id)->delete();
  }

  public function markFull(int $id, string $by): RackSlot
  {
    $slot = $this->find($id);
    $slot->update([
      'is_manually_full' => true,
      'marked_full_by'   => $by,
      'marked_full_at'   => now(),
    ]);
    return $slot->fresh();
  }

  public function clearFull(int $id): RackSlot
  {
    $slot = $this->find($id);
    $slot->update([
      'is_manually_full' => false,
      'marked_full_by'   => null,
      'marked_full_at'   => null,
    ]);
    return $slot->fresh();
  }
}
