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
use Box\Spout\Writer\Common\Creator\Style\StyleBuilder;

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
            if (empty($data['slot_ids'])) {
                throw ValidationException::withMessages([
                    'slot_ids' => 'At least one slot must be selected.',
                ]);
            }

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
                // ->where('partname', $data['partname'])
                ->where('status', 'staged')
                ->exists();

            if ($alreadyStaged) {
                throw ValidationException::withMessages([
                    'lot_id' => 'Lot is already staged.',
                ]);
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

            $lot = Lot::where('lot_id', $data['lot_id'])->first();
            // $lot = Lot::where('lot_id', $data['lot_id'])
            //     ->where('partname', $data['partname'])
            //     ->first();

            if ($lot) {
                $lot->update([
                    'qty'         => $data['qty'],
                    'partname'    => $data['partname'],
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
    public function release(string $lotId, string $withdrawerId, string $releasedBy): Lot
    {
        $cacheKey = "releasing_lot_{$lotId}";

        if (Cache::has($cacheKey)) {
            throw ValidationException::withMessages([
                'lot' => 'Release already in progress for this lot.',
            ]);
        }

        Cache::put($cacheKey, true, ttl: 4);

        return DB::transaction(function () use ($lotId, $withdrawerId, $releasedBy) {
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
                    'withdrawer_id' => $withdrawerId
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

            return $updated->fresh(['stagings.withdrawer', 'stagings.positions.rackSlot.rack', 'modifiedBy', 'receivedBy']);
        });
    }

    public function downloadFilteredExport(array $filters, $productionLineId)
    {
        $sheets = [
            'LOTS' => function () use ($filters, $productionLineId) {
                return $this->lots->buildLotQuery($filters, null)
                    ->whereHas('stagings.positions', fn($q) => $q->where('production_line_id', $productionLineId))
                    ->with([
                        'positions' => fn($q) => $q
                            ->with(['staging', 'rackSlot.rack.productionLine'])
                            ->orderBy('assigned_at'),
                    ])
                    ->cursor()
                    ->sortBy(fn($lot) => strtolower($lot->lot_id))
                    ->flatMap(function ($lot) {
                        return $lot->positions
                            ->groupBy(fn($pos) => $pos->staging?->cycle ?? '?')
                            ->map(function ($cyclePositions, $cycle) use ($lot) {
                                $first   = $cyclePositions->first();
                                $staging = $first->staging;

                                $slots = $cyclePositions
                                    ->map(fn($p) => ($p->rackSlot?->rack?->label ?? '—') . '/' . ($p->rackSlot?->label ?? '—'))
                                    ->join(', ');

                                $assignedAt = Carbon::createFromFormat('Y-m-d H:i:s', $first->getRawOriginal('assigned_at'), 'UTC')
                                    ->setTimezone('Asia/Manila')
                                    ->toDateTimeString();

                                $rawReleased = $first->getRawOriginal('released_at');
                                $releasedAt  = $rawReleased
                                    ? Carbon::createFromFormat('Y-m-d H:i:s', $rawReleased, 'UTC')
                                    ->setTimezone('Asia/Manila')
                                    ->toDateTimeString()
                                    : null;

                                $isFullyReleased     = $cyclePositions->every(fn($p) => $p->getRawOriginal('released_at'));
                                $isPartiallyReleased = !$isFullyReleased && $cyclePositions->some(fn($p) => $p->getRawOriginal('released_at'));

                                return [
                                    'Lot ID'      => $lot->lot_id,
                                    'Cycle'       => $cycle,
                                    'Part Name'   => $staging?->partname ?? $lot->partname,
                                    'Quantity'    => $staging?->qty ?? $lot->qty,
                                    'Line'        => $first->rackSlot?->rack?->productionLine?->name,
                                    'Slots'       => $slots,
                                    'Received At' => $assignedAt,
                                    'Received By' => $first->assigned_by,
                                    'Released At' => $releasedAt,
                                    'Released By' => $first->released_by,
                                    'Status'      => $isFullyReleased ? 'Released' : ($isPartiallyReleased ? 'Partial' : 'Staged'),
                                ];
                            })
                            ->values();
                    })
                    ->values();
            },
        ];

        return $this->downloadRawXlsx(
            $sheets,
            'lots_' . now()->format('Y-m-d'),
            function (array $row) {
                return match ($row['Status'] ?? null) {
                    'Released' => (new StyleBuilder())
                        ->setShouldWrapText(false)
                        ->setBackgroundColor('D8F0D8')
                        ->setFontColor('1E6B1E')
                        ->build(),
                    'Staged' => (new StyleBuilder())
                        ->setShouldWrapText(false)
                        ->setBackgroundColor('FFF3CD')
                        ->setFontColor('856404')
                        ->build(),
                    'Partial' => (new StyleBuilder())
                        ->setShouldWrapText(false)
                        ->setBackgroundColor('FFE0B2')
                        ->setFontColor('7B3F00')
                        ->build(),
                    default => null,
                };
            }
        );
    }
}
