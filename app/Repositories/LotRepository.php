<?php

namespace App\Repositories;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use App\Models\Lot;
use App\Repositories\Interfaces\LotRepositoryInterface;
use Carbon\Carbon;
use App\Models\LotPosition;
use App\Models\RackSlot;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;

class LotRepository implements LotRepositoryInterface
{
  public function find(int $id): Lot
  {
    return Lot::with('activePositions.rackSlot')->findOrFail($id);
  }

  public function findById(int $id): ?Lot
  {
    return Lot::where('id', $id)->latest('received_at')->first();
  }

  public function findLastStaged(string $lotId, string $partname): ?Lot
  {
    $lot = Lot::where('lot_id', $lotId)
      ->where('partname', $partname)
      ->where('status', 'staged')
      ->first();

    return $lot;
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

  public function buildLotQuery(array $filters, ?int $productionLineId)
  {
    $query = Lot::query();

    if (!empty($filters['status'])) {
      $query->where('status', $filters['status']);
    }

    if (!empty($filters['aging'])) {
      $query->aging();
    }

    if ($productionLineId) {
      $query->whereHas('latestPosition', function ($q) use ($productionLineId) {
        $q->where('production_line_id', $productionLineId);
      });
    }

    if (!empty($filters['search'])) {
      $query->where(function ($q) use ($filters) {
        $q->where('lot_id', 'like', "%{$filters['search']}%")
          ->orWhere('partname', 'like', "%{$filters['search']}%");
      });
    }

    foreach (['received', 'released'] as $type) {
      if (!empty($filters["{$type}_date_from"]) && !empty($filters["{$type}_date_to"])) {
        $from = Carbon::parse($filters["{$type}_date_from"], 'Asia/Manila')->startOfDay()->utc();
        $to   = Carbon::parse($filters["{$type}_date_to"], 'Asia/Manila')->endOfDay()->utc();
        $query->whereBetween("{$type}_at", [$from, $to]);
      }
    }

    if (!empty($filters['unslotted'])) {
      $query->whereDoesntHave('activePositions');
    }

    return $query;
  }

  public function paginate(array $filters, int $productionLineId): LengthAwarePaginator
  {
    return $this->buildLotQuery($filters, $productionLineId)
      ->latest('received_at')
      ->paginate($filters['per_page'] ?? 20);
  }

  public function create(array $data): Lot
  {
    return Lot::create($data);
  }

  public function update(int $id, array $data): Lot
  {
    $lot = Lot::findOrFail($id);

    return DB::transaction(function () use ($lot, $data) {
      $slotIds    = array_key_exists('slot_ids', $data) ? $data['slot_ids'] : null;
      $modifiedBy = $data['modified_by'] ?? null;
      unset($data['slot_ids']);
      $lot->update($data);

      if ($slotIds !== null) {
        $currentlyOccupiedSlotIds = LotPosition::where('lot_id', $lot->id)
          ->whereNull('released_at')
          ->pluck('rack_slot_id')
          ->all();

        foreach ($slotIds as $slotId) {
          if (in_array($slotId, $currentlyOccupiedSlotIds)) {
            continue;
          }

          $slot = RackSlot::with('rack')->find($slotId);

          if (!$slot->isAvailable()) {
            throw ValidationException::withMessages([
              'slot_ids' => "Slot {$slot->label} is marked full.",
            ]);
          }
        }

        $now = Carbon::now('UTC');

        LotPosition::where('lot_id', $lot->id)
          ->whereNull('released_at')
          ->whereNotIn('rack_slot_id', $slotIds)
          ->delete();

        $activeSlotIds = LotPosition::where('lot_id', $lot->id)
          ->whereNull('released_at')
          ->pluck('rack_slot_id')
          ->all();

        foreach (array_diff($slotIds, $activeSlotIds) as $slotId) {
          LotPosition::create([
            'lot_id'       => $lot->id,
            'rack_slot_id' => $slotId,
            'production_line_id' => $slot->rack->production_line_id,
            'assigned_at'  => $now,
            'assigned_by'  => $modifiedBy,
          ]);
        }
      }

      return $lot->fresh([
        'modifiedBy',
      ]);
    });
  }
}
