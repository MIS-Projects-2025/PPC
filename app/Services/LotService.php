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
use App\Models\LotPosition;

class LotService
{
    use ExportTrait;

    public function __construct(
        protected LotRepositoryInterface         $lots,
        protected LotPositionRepositoryInterface $positions,
        protected RackSlotRepositoryInterface    $slots,
        protected RecommendationService $recommendations,
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
            $now = Carbon::now('UTC');

            // Same physical boxes as lots already in the rack: location and box facts come from the
            // group, never from the form.
            $group = !empty($data['box_group_id'])
                ? $this->resolveSharedGroup((int) $data['box_group_id'])
                : null;

            if ($group) {
                $data['slot_ids']     = $group['slot_ids'];
                $data['dimension_id'] = $group['dimension_id'];
                $data['box_count']    = $group['box_count'];
            }

            // lots can be placed in multiple slots, in different racks.

            $data['slot_ids'] = array_values(array_unique($data['slot_ids'] ?? []));

            if (empty($data['slot_ids'])) {
                throw ValidationException::withMessages([
                    'slot_ids' => 'At least one slot must be selected.',
                ]);
            }

            foreach ($data['slot_ids'] as $slotId) {
                $slot = $this->slots->find($slotId);

                if (!$slot->rack) {
                    throw ValidationException::withMessages([
                        'slot_ids' => "Slot {$slot->label} belongs to a deleted rack.",
                    ]);
                }

                if (!$slot->is_active) {
                    throw ValidationException::withMessages([
                        'slot_ids' => "Slot {$slot->label} is disabled.",
                    ]);
                }

                // A full slot must not block a lot joining boxes that are already there.
                if (!$group && !$slot->isAvailable()) {
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

            $wasCreated = false;

            $data['partname'] = filled($data['partname'] ?? null) ? trim($data['partname']) : null;

            $lot = $this->resolveLot($data['lot_id'], $data['partname']);

            // A blank scan must never wipe a known partname on a re-stock.
            if ($lot && $data['partname'] === null) {
                $data['partname'] = $lot->partname;
            }

            $data['qty'] = $data['qty'] ?? $lot?->qty;

            if ($lot && $lot->status === 'staged') {
                throw ValidationException::withMessages([
                    'lot_id' => 'Lot is already staged.',
                ]);
            }

            if ($lot) {
                $lot->update([
                    'qty'         => $data['qty'],
                    'partname'    => $data['partname'],
                    'status'      => 'staged',
                    'received_by' => $data['received_by'],
                    'received_at' => $now,
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
                    'received_at' => $now,
                ]);
            }

            // Shadow mode: evaluate against the state BEFORE this placement. Never throws.
            $shadow = $this->recommendations->shadow(
                $data['slot_ids'],
                $data['dimension_id'] ?? null,
                $data['box_count'] ?? null,
                $lot->id,
                sharesBoxes: (bool) $group,
            );

            $staging = $this->lots->createStaging(
                $lot,
                $data['slot_ids'],
                $data['received_by'],
                $now,
                [
                    'dimension_id' => $data['dimension_id'] ?? null,
                    'box_count'    => $data['box_count'] ?? null,
                    'box_group_id' => $group['id'] ?? null, // null = new boxes = new group
                ],
            );

            $this->recommendations->record($staging, $shadow, $group ? null : ($data['recommendation_id'] ?? null));

            return ['lot' => $lot->fresh(['stagings.withdrawer', 'stagings.positions.rackSlot.rack', 'modifiedBy', 'receivedBy']), 'created' => $wasCreated];
        });
    }

    // The unique key is lot_id + partname, so match on both. A blank partname falls back to lot_id
    // alone (as before). A lot first stocked without a partname is adopted, not duplicated.
    private function resolveLot(string $lotId, ?string $partname): ?Lot
    {
        $query = Lot::where('lot_id', $lotId)->lockForUpdate();

        if ($partname === null) {
            return $query->orderByRaw("status = 'staged' desc")->orderByDesc('id')->first();
        }

        return (clone $query)->where('partname', $partname)->latest('id')->first()
            ?? $query->whereNull('partname')->latest('id')->first();
    }

    /**
     * Remove a lot from the rack manually (outside normal release flow).
     * Frees all slots the lot occupies. Requires a reason for audit.
     *
     * @param  int     $lotId
     * @param  string  $removedBy
     * @param  string  $reason
     * @return void
     * 
     * @deprecated This method is not used and may be removed in future versions.
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
    public function release(string $lotId, string $withdrawerId, string $releasedBy, ?string $partname = null): Lot
    {
        $lock = Cache::lock("releasing_lot_{$lotId}", 10);

        if (!$lock->get()) {
            throw ValidationException::withMessages([
                'lot' => 'Release already in progress for this lot.',
            ]);
        }
        try {
            return DB::transaction(function () use ($lotId, $withdrawerId, $releasedBy, $partname) {
                $now = Carbon::now('UTC');
                $lot = $this->lots->findLastStaged($lotId, $partname);

                if (!$lot) {
                    throw ValidationException::withMessages([
                        'lot' => $this->releasedTogetherNote($lotId, $now)
                            ?? 'No staged lot found for this scan. It may have already been released.',
                    ]);
                }

                if ($lot->status !== 'staged') {
                    throw ValidationException::withMessages([
                        'lot' => "Lot is not in staged status (current: {$lot->status}).",
                    ]);
                }

                $rackSlotIds = $lot->activePositions->pluck('rack_slot_id')->filter()->all();

                $staging = LotStaging::where('lot_id', $lot->id)
                    ->whereNull('released_at')
                    ->latest('staged_at')
                    ->lockForUpdate()
                    ->first();

                if (!$staging) {
                    throw ValidationException::withMessages([
                        'lot' => 'No active staging record found for this lot.',
                    ]);
                }

                // Boxes shared by several lots leave the rack together: release the whole group with the same
                // withdrawer, in this one transaction.
                // FUTURE: a "release only this lot" option would skip this block. If it is ever added, it
                // needs an "unlink from group" action too, or the remaining lots are left staged in a slot
                // whose boxes are gone.
                $siblings = $staging->box_group_id
                    ? LotStaging::where('box_group_id', $staging->box_group_id)
                        ->where('id', '!=', $staging->id)
                        ->whereNull('released_at')
                        ->lockForUpdate()
                        ->get()
                    : collect();

                if ($siblings->isNotEmpty()) {
                    // Their slots must be known before their positions are released below.
                    $rackSlotIds = array_values(array_unique(array_merge(
                        $rackSlotIds,
                        LotPosition::whereIn('lot_staging_id', $siblings->pluck('id'))
                            ->whereNull('released_at')
                            ->pluck('rack_slot_id')
                            ->all(),
                    )));
                }

                foreach ($siblings as $sibling) {
                    $sibling->update([
                        'released_at'   => $now,
                        'released_by'   => $releasedBy,
                        'withdrawer_id' => $withdrawerId,
                    ]);

                    $this->positions->releaseByLot($sibling->lot_id, $releasedBy);
                    $this->lots->update($sibling->lot_id, [
                        'status'      => 'released',
                        'released_by' => $releasedBy,
                        'released_at' => $now,
                    ]);
                }

                $staging->update([
                    'released_at' => $now,
                    'released_by' => $releasedBy,
                    'withdrawer_id' => $withdrawerId
                ]);

                $this->positions->releaseByLot($lot->id, $releasedBy);
                $updated = $this->lots->update($lot->id, [
                    'status'      => 'released',
                    'released_by' => $releasedBy,
                    'released_at' => $now,
                ])->fresh(['activePositions']);

                // Own positions are already released above, so what is left belongs to other lots.
                $stillOccupied = LotPosition::whereIn('rack_slot_id', $rackSlotIds)
                    ->whereNull('released_at')
                    ->pluck('rack_slot_id')
                    ->all();

                $toClear = array_values(array_diff($rackSlotIds, $stillOccupied));

                if (!empty($toClear)) {
                    $this->slots->clearManyFull($toClear);
                }

                $fresh = ['stagings.withdrawer', 'stagings.positions.rackSlot.rack', 'modifiedBy', 'receivedBy'];

                $result = $updated->fresh($fresh);

                // The other lots released with it, so the frontend can update their rows.
                $result->setAttribute(
                    'also_released',
                    $siblings->isEmpty()
                        ? collect()
                        : Lot::with($fresh)->whereIn('id', $siblings->pluck('lot_id'))->get(),
                );

                return $result;
            });
        } finally {
            $lock->release();
        }
    }

    // The chosen group must still have lots in the rack. Location and box facts come from it.
    private function resolveSharedGroup(int $groupId): array
    {
        $positions = LotPosition::whereNull('released_at')
            ->whereHas('staging', fn($q) => $q->where('box_group_id', $groupId))
            ->get(['rack_slot_id', 'lot_staging_id']);

        if ($positions->isEmpty()) {
            throw ValidationException::withMessages([
                'box_group_id' => 'Those boxes are no longer in the rack. Stock this lot normally.',
            ]);
        }

        $facts = LotStaging::whereIn('id', $positions->pluck('lot_staging_id'))
            ->orderByDesc('box_count') // a staging with unknown box facts sorts last
            ->first(['dimension_id', 'box_count']);

        return [
            'id'           => $groupId,
            'slot_ids'     => $positions->pluck('rack_slot_id')->unique()->values()->all(),
            'dimension_id' => $facts?->dimension_id,
            'box_count'    => $facts?->box_count,
        ];
    }

    // A scan of a lot that was just released together with others (e.g. LOT-B scanned after LOT-A
    // released both) gets a clear message instead of the generic "not found".
    private function releasedTogetherNote(string $lotId, Carbon $now): ?string
    {
        $recent = LotStaging::join('lots', 'lots.id', '=', 'lot_stagings.lot_id')
            ->where('lots.lot_id', $lotId)
            ->whereNotNull('lot_stagings.box_group_id')
            ->where('lot_stagings.released_at', '>=', $now->copy()->subMinutes(10))
            ->orderByDesc('lot_stagings.released_at')
            ->first(['lot_stagings.id', 'lot_stagings.box_group_id']);

        if (!$recent) {
            return null;
        }

        $others = LotStaging::join('lots', 'lots.id', '=', 'lot_stagings.lot_id')
            ->where('lot_stagings.box_group_id', $recent->box_group_id)
            ->where('lot_stagings.id', '!=', $recent->id)
            ->pluck('lots.lot_id')
            ->unique()
            ->values()
            ->all();

        return $others
            ? "{$lotId} was already released together with " . implode(', ', $others) . '.'
            : null;
    }

    public function downloadFilteredExport(array $filters, $rackPageId)
    {
        $sheets = [
            'LOTS' => function () use ($filters, $rackPageId) {
                return $this->lots->buildLotQuery($filters, null)
                    ->whereHas('stagings.positions', fn($q) => $q->where('rack_page_id', $rackPageId))
                    ->with([
                        'positions' => fn($q) => $q
                            ->with(['staging', 'rackSlot.rack.productionLine'])
                            ->orderBy('assigned_at'),
                    ])
                    ->get()
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
