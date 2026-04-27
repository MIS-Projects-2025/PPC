<?php

namespace App\Repositories;

use Illuminate\Database\Eloquent\Collection;
use App\Models\Rack;
use App\Repositories\Interfaces\RackRepositoryInterface;

class RackRepository implements RackRepositoryInterface
{
  public function all(): Collection
  {
    return Rack::with([
      'productionLine',
      'slots',
      // 'slots.lots.lot',
    ])
      ->orderBy('label')
      ->get();
  }

  public function getAllByProductionLine(int $productionLineId): Collection
  {
    return Rack::with(['slots'])
      ->where('production_line_id', $productionLineId)
      ->orderBy('label')
      ->get()
      ->each->append('shelves');
  }

  public function slotMap(int $productionLineId)
  {
    return Rack::with([
      'slots.activePositions' => fn($q) => $q->with([
        'lot' => fn($q) => $q
          ->without([
            'activePositions',
            'activePositions.rackSlot',
            'activePositions.rackSlot.rack',
            'activePositions.rackSlot.rack.productionLine',
            'modifiedBy',
            'receivedBy',
            'releasedBy',
          ])
          ->select(['id', 'lot_id', 'partname', 'qty', 'status']),
      ]),
    ])
      ->where('production_line_id', $productionLineId)
      ->get()
      ->makeHidden('shelves')
      ->each(function ($rack) {
        $rack->slots->each(function ($slot) {
          $slot->activePositions->each(function ($position) {
            $position->lot?->setAppends([]);
          });
        });
      });
  }

  public function existByLabel(string $label): bool
  {
    return Rack::where('label', $label)->exists();
  }

  public function byProductionLine(int $productionLineId): Collection
  {
    return Rack::where('production_line_id', $productionLineId)
      ->orderBy('label')
      ->get();
  }

  public function find(int $id): Rack
  {
    return Rack::findOrFail($id);
  }

  public function findWithSlots(int $id): Rack
  {
    return Rack::with([
      'slots',
      'slots.activePositions.lot',
    ])->findOrFail($id);
  }

  public function create(array $data): Rack
  {
    return Rack::create($data);
  }

  public function update(int $id, array $data): Rack
  {
    $rack = $this->find($id);
    $rack->update($data);
    return $rack->fresh();
  }

  public function delete(int $id): void
  {
    $this->find($id)->delete();
  }
}
