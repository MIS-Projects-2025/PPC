<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use App\Models\Lot;
use App\Models\LotStaging;
use App\Repositories\Interfaces\LotRepositoryInterface;
use App\Repositories\Interfaces\LotPositionRepositoryInterface;
use App\Repositories\Interfaces\RackSlotRepositoryInterface;
use Carbon\Carbon;
use App\Traits\ExportTrait;
use Illuminate\Support\Facades\Cache;

class LotService
{
    use ExportTrait;

    public function __construct(
        protected LotRepositoryInterface         $lots,
        protected LotPositionRepositoryInterface $positions,
        protected RackSlotRepositoryInterface    $slots,
    ) {}

    /**
     * Receive a lot into the WCO room.
     * Creates the lot record and assigns it to one or more rack slots.
     *
     * @param  array  $data  { lot_id, partname, qty, date_code, slot_ids[], received_by }
     * @return array
     */
    public function receive(array $data)
    {
        return DB::transaction(function () use ($data) {
            // 1. Validate each slot is available before writing anything
            foreach ($data['slot_ids'] as $slotId) {
                $slot = $this->slots->find($slotId);

                if (!$slot->isAvailable()) {
                    throw ValidationException::withMessages([
                        'slot_ids' => "Slot {$slot->label} is marked full.",
                    ]);
                }
            }

            $productionLineIds = collect($data['slot_ids'])
                ->map(function ($slotId) {
                    return $this->slots->find($slotId)
                        ->rack
                        ->production_line_id;
                })
                ->unique();

            if ($productionLineIds->count() > 1) {
                throw ValidationException::withMessages([
                    'slot_ids' => 'All selected slots must belong to the same production line.',
                ]);
            }

            $productionLineId = $productionLineIds->first();

            $alreadyStaged = Lot::where('lot_id', $data['lot_id'])
                ->where('partname', $data['partname'])
                ->where('status', 'staged')
                ->exists();

            if ($alreadyStaged) {
                if ($alreadyStaged) {
                    throw ValidationException::withMessages([
                        'lot_id' => 'Lot is already staged.',
                    ]);
                }
            }

            // 2. Create the lot record
            // $lot = $this->lots->create([
            //     'lot_id'      => $data['lot_id'],
            //     'partname'   => $data['partname'],
            //     'qty'         => $data['qty'],
            //     'status'      => 'staged',
            //     'received_by' => $data['received_by'],
            //     'received_at' => Carbon::now('UTC'),
            // ]);

            $wasCreated = false;

            $lot = Lot::where('lot_id', $data['lot_id'])
                ->where('partname', $data['partname'])
                ->first();

            if ($lot) {
                $lot->update([
                    'qty'         => $data['qty'],
                    'status'      => 'staged',
                    'received_by' => $data['received_by'],
                    'received_at' => Carbon::now('UTC'),
                    'released_at' => null,
                    'released_by' => null,
                ]);
            } else {
                $wasCreated = true;
                $lot = $this->lots->create([
                    'lot_id'      => $data['lot_id'],
                    'partname'    => $data['partname'],
                    'qty'         => $data['qty'],
                    'status'      => 'staged',
                    'received_by' => $data['received_by'],
                    'received_at' => Carbon::now('UTC'),
                ]);
            }

            $this->lots->createStaging($lot, $data['slot_ids'], $data['received_by'], Carbon::now('UTC'));

            return ['lot' => $lot->fresh(['stagings.positions.rackSlot.rack', 'modifiedBy', 'receivedBy']), 'created' => $wasCreated];
        });
    }

    /**
     * Remove a lot from the rack manually (outside normal release flow).
     * Frees all slots the lot occupies. Requires a reason for audit.
     *
     * @param  int     $lotId
     * @param  string  $removedBy
     * @param  string  $reason
     * @return void
     */
    public function remove(int $lotId, string $removedBy, string $reason): void
    {
        DB::transaction(function () use ($lotId, $removedBy, $reason) {
            $lot = $this->lots->find($lotId);

            if ($lot->status === 'released') {
                throw ValidationException::withMessages([
                    'lot' => 'This lot has already been released and cannot be removed.',
                ]);
            }

            // Free all slot positions
            $this->positions->releaseByLot($lotId, $removedBy);

            // Mark lot as cancelled
            $this->lots->update($lotId, ['status' => 'cancelled']);

            // Log the removal — extend this to write to a lot_removal_logs table
            // when that table is added to the schema
            Log::info('Lot manually removed from rack', [
                'lot_id'     => $lot->lot_id,
                'removed_by' => $removedBy,
                'reason'     => $reason,
            ]);
        });
    }

    /**
     * Release a lot to the MH (normal flow through loading plan).
     * Frees all slots and flips status to released.
     *
     * @param  string  $lotId
     * @param  string  $releasedBy
     * @return Lot
     */
    public function release(string $lotId, string $releasedBy): Lot
    {
        $cacheKey = "releasing_lot_{$lotId}";

        if (Cache::has($cacheKey)) {
            throw ValidationException::withMessages([
                'lot' => 'Release already in progress for this lot.',
            ]);
        }

        Cache::put($cacheKey, true, ttl: 4);

        return DB::transaction(function () use ($lotId, $releasedBy) {
            $lot = $this->lots->findLastStaged($lotId);

            if (!$lot) {
                throw ValidationException::withMessages([
                    'lot' => 'No staged lot found for this scan. It may have already been released.',
                ]);
            }

            if ($lot->status !== 'staged') {
                throw ValidationException::withMessages([
                    'lot' => "Lot is not in staged status (current: {$lot->status}).",
                ]);
            }

            $rackSlotIds = $lot->activePositions->pluck('rack_slot_id')->filter()->all();

            LotStaging::where('lot_id', $lot->id)
                ->whereNull('released_at')
                ->latest('staged_at')
                ->first()
                ?->update([
                    'released_at' => Carbon::now('UTC'),
                    'released_by' => $releasedBy,
                ]);

            $this->positions->releaseByLot($lot->id, $releasedBy);

            $updated = $this->lots->update($lot->id, [
                'status'      => 'released',
                'released_by' => $releasedBy,
                'released_at' => Carbon::now('UTC'),
            ])->fresh(['activePositions']);

            if (!empty($rackSlotIds)) {
                $this->slots->clearManyFull($rackSlotIds);
            }

            return $updated->fresh(['stagings.positions.rackSlot.rack', 'modifiedBy', 'receivedBy']);
        });
    }

    public function downloadFilteredExport(array $filters, $productionLineId)
    {
        $sheets = [
            'LOTS' => function () use ($filters, $productionLineId) {
                return $this->lots->buildLotQuery($filters, null)
                    ->whereHas('stagings.positions', fn($q) => $q->where('production_line_id', $productionLineId))
                    ->with([
                        'positions' => fn($q) => $q->with(['staging', 'rackSlot.rack.productionLine'])->orderBy('assigned_at'),
                    ])
                    ->cursor()
                    ->flatMap(function ($lot) {
                        return $lot->positions
                            ->map(function ($pos) use ($lot) {
                                $slot = $pos->rackSlot;
                                $releasedAt = $pos->getRawOriginal('released_at')
                                    ? Carbon::createFromFormat('Y-m-d H:i:s', $pos->getRawOriginal('released_at'), 'UTC')
                                    ->setTimezone('Asia/Manila')
                                    ->toDateTimeString()
                                    : null;
                                $assignedAt = Carbon::createFromFormat('Y-m-d H:i:s', $pos->getRawOriginal('assigned_at'), 'UTC')
                                    ->setTimezone('Asia/Manila')
                                    ->toDateTimeString();

                                return [
                                    'Lot ID'      => $lot->lot_id,
                                    'Part Name'   => $lot->partname,
                                    'Quantity'    => $lot->qty,
                                    'Line'        => $slot?->rack?->productionLine?->name,
                                    'Status'      => $pos->getRawOriginal('released_at') ? 'Released' : 'Staged',
                                    'Rack'        => $slot?->rack?->label,
                                    'Slot'        => $slot?->label,
                                    'Cycle' => $pos->staging?->cycle,
                                    'Received At' => $assignedAt,
                                    'Received By' => $pos->assigned_by,
                                    'Released At' => $releasedAt,
                                    'Released By' => $pos->released_by,
                                ];
                            });
                    })
                    ->sortBy(fn($row) => [
                        strtolower($row['Lot ID'] ?? ''),
                        strtolower($row['Received At'] ?? ''),
                        strtolower($row['Released At'] ?? ''),
                    ])
                    ->values();
            },
        ];

        return $this->downloadRawXlsx($sheets, 'lots_' . now()->format('Y-m-d'));
    }
}
