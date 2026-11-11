<?php

namespace App\Repositories;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use App\Models\Lot;
use App\Repositories\Interfaces\LotRepositoryInterface;
use Carbon\Carbon;
use App\Models\LotPosition;
use App\Models\LotStaging;
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

    public function findLastStaged(string $lotId, ?string $partname = null): ?Lot
    {
        return Lot::where('lot_id', $lotId)
            ->where('status', 'staged')
            ->when(filled($partname), fn($q) => $q->where('partname', $partname))
            ->latest('id')
            ->lockForUpdate()
            ->first();
    }

    public function all(): Collection
    {
        return Lot::with('positions')
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

    public function buildLotQuery(array $filters, ?int $rackPageId)
    {
        $query = Lot::query();

        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (!empty($filters['aging'])) {
            $query->staged()->aging();
        }

        if ($rackPageId) {
            $query->whereHas('latestPosition', function ($q) use ($rackPageId) {
                $q->where('rack_page_id', $rackPageId);
            });
        }

        if (!empty($filters['search'])) {
            $query->where(function ($q) use ($filters) {
                $q->where('lot_id', 'like', "%{$filters['search']}%")
                    ->orWhere('partname', 'like', "%{$filters['search']}%");
            });
        }

        foreach (['received', 'released'] as $type) {
            if (!empty($filters["{$type}_date_from"]) || !empty($filters["{$type}_date_to"])) {
                $from = !empty($filters["{$type}_date_from"]) ? Carbon::parse($filters["{$type}_date_from"], 'Asia/Manila')->startOfDay()->utc() : Carbon::create(1970, 1, 2, 0, 0, 0, 'UTC');
                $to = !empty($filters["{$type}_date_to"]) ? Carbon::parse($filters["{$type}_date_to"], 'Asia/Manila')->endOfDay()->utc() : Carbon::create(2037, 12, 31, 23, 59, 59, 'UTC');
                $query->whereBetween("{$type}_at", [$from, $to]);
            }
        }

        if (!empty($filters['restocked'])) {
            $query->restocked();
        }

        if (!empty($filters['unslotted'])) {
            $query->whereDoesntHave('activePositions');
        }

        $direction = in_array($filters['sort'] ?? '', ['asc', 'desc']) ? $filters['sort'] : 'asc';
        $query->orderBy('received_at', $direction)->orderBy('id', $direction);

        return $query;
    }

    public function paginate(array $filters, int $rackPageId): LengthAwarePaginator
    {
        return $this->buildLotQuery($filters, null)
            ->whereHas('stagings.positions', fn($q) => $q->where('rack_page_id', $rackPageId))
            ->with([
                'stagings' => fn($q) => $q->with('withdrawer')->orderBy('cycle'),
                'stagings.positions.rackSlot.rack.productionLine',
                'stagings.positions.rackSlot.rack.rackPage',
            ])
            ->with(['positions' => function ($q) {
                $q->orderBy('assigned_at');
            }, 'positions.rackSlot.rack.productionLine', 'positions.rackSlot.rack.rackPage'])
            ->paginate(min(max((int) ($filters['per_page'] ?? 0) ?: 20, 1), 200));
    }

    public function create(array $data): Lot
    {
        return Lot::create($data);
    }

    public function createStaging(Lot $lot, array $slotIds, string $actorEmployId, Carbon $now, array $extra = []): LotStaging
    {
        $cycle    = LotStaging::where('lot_id', $lot->id)->count() + 1;
        $boxCount = $extra['box_count'] ?? null;

        $staging = LotStaging::create([
            'lot_id'       => $lot->id,
            'partname'     => $lot->partname,
            'qty'          => $lot->qty,
            'cycle'        => $cycle,
            'staged_by'    => $actorEmployId,
            'staged_at'    => $now,
            'dimension_id' => $extra['dimension_id'] ?? null,
            'box_count'    => $boxCount,
        ]);

        $slots = RackSlot::with('rack')->whereIn('id', $slotIds)->get()->keyBy('id');

        foreach ($slotIds as $slotId) {
            $slot = $slots[$slotId];

            LotPosition::create([
                'lot_id'             => $lot->id,
                'lot_staging_id'     => $staging->id,
                'rack_slot_id'       => $slotId,
                'production_line_id' => $slot->rack->production_line_id,
                'rack_page_id'       => $slot->rack->rack_page_id,
                // Only a single-slot placement knows its box split. Multi-slot stays NULL (= untracked slot).
                'box_count'          => count($slotIds) === 1 ? $boxCount : null,
                'assigned_at'        => $now,
                'assigned_by'        => $actorEmployId,
            ]);
        }

        return $staging;
    }

    public function update(int $id, array $data): Lot
    {
        return DB::transaction(function () use ($id, $data) {
            $lot = Lot::lockForUpdate()->findOrFail($id);
            $slotIds    = array_key_exists('slot_ids', $data) && $lot->status !== 'released' ? array_values(array_unique($data['slot_ids'])) : null;
            $modifiedBy = $data['modified_by'] ?? null;
            unset($data['slot_ids']);
            $lot->update($data);

            if (isset($data['partname']) || isset($data['qty'])) {
                LotStaging::where('lot_id', $lot->id)
                    ->whereNull('released_at')
                    ->latest('staged_at')
                    ->first()
                    ?->update(array_filter([
                        'partname' => $data['partname'] ?? null,
                        'qty'      => $data['qty'] ?? null,
                    ], fn($v) => $v !== null));
            }

            if ($slotIds !== null) {
                $activeStaging = LotStaging::where('lot_id', $lot->id)
                    ->whereNull('released_at')
                    ->latest('staged_at')
                    ->first();

                if ($activeStaging) {
                    $currentlyOccupiedSlotIds = LotPosition::where('lot_staging_id', $activeStaging->id)
                        ->whereNull('released_at')
                        ->pluck('rack_slot_id')
                        ->all();

                    foreach ($slotIds as $slotId) {
                        if (in_array($slotId, $currentlyOccupiedSlotIds)) {
                            continue;
                        }

                        $slot = RackSlot::with('rack')->find($slotId);

                        if (!$slot || !$slot->rack || !$slot->is_active) {
                            throw ValidationException::withMessages([
                                'slot_ids' => 'A selected slot no longer exists or is disabled. Refresh and try again.',
                            ]);
                        }

                        if (!$slot->isAvailable()) {
                            throw ValidationException::withMessages([
                                'slot_ids' => "Slot {$slot->label} is marked full.",
                            ]);
                        }
                    }

                    $now = Carbon::now('UTC');

                    // Remove positions no longer in the list
                    LotPosition::where('lot_staging_id', $activeStaging->id)
                        ->whereNull('released_at')
                        ->whereNotIn('rack_slot_id', $slotIds)
                        ->delete();

                    // Add new positions to the same staging
                    $activeSlotIds = LotPosition::where('lot_staging_id', $activeStaging->id)
                        ->whereNull('released_at')
                        ->pluck('rack_slot_id')
                        ->all();

                    foreach (array_diff($slotIds, $activeSlotIds) as $slotId) {
                        $slot = RackSlot::with('rack')->find($slotId);

                        LotPosition::create([
                            'lot_id'            => $lot->id,
                            'lot_staging_id'    => $activeStaging->id,  // key addition
                            'rack_slot_id'      => $slotId,
                            'production_line_id' => $slot->rack->production_line_id,
                            'rack_page_id'      => $slot->rack->rack_page_id,
                            'assigned_at'       => $now,
                            'assigned_by'       => $modifiedBy,
                        ]);
                    }

                    $remaining = LotPosition::where('lot_staging_id', $activeStaging->id)->whereNull('released_at')->get();
                    $remaining->each->update([
                        'box_count' => $remaining->count() === 1 ? $activeStaging->box_count : null,
                    ]);
                } else {
                    $lot->update([
                        'status' => 'staged',
                        'released_at' => null,
                        'released_by' => null,
                        'modified_by' => $modifiedBy
                    ]);
                    $this->createStaging($lot, $slotIds, $modifiedBy, Carbon::now('UTC'));
                }
            }

            return $lot->fresh(['stagings.withdrawer', 'stagings.positions.rackSlot.rack', 'modifiedBy', 'receivedBy']);
        });
    }
}
