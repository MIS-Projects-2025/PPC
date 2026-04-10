<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use App\Models\Lot;
use App\Repositories\Interfaces\LotRepositoryInterface;
use App\Repositories\Interfaces\LotPositionRepositoryInterface;
use App\Repositories\Interfaces\RackSlotRepositoryInterface;
use Carbon\Carbon;

class LotService
{
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
     * @return Lot
     */
    public function receive(array $data): Lot
    {
        return DB::transaction(function () use ($data) {
            // 1. Validate each slot is available before writing anything
            foreach ($data['slot_ids'] as $slotId) {
                $slot = $this->slots->find($slotId);

                if (!$slot->isAvailable()) {
                    throw ValidationException::withMessages([
                        'slot_ids' => "Slot {$slot->label} is already occupied or marked full.",
                    ]);
                }
            }

            // 2. Create the lot record
            $lot = $this->lots->create([
                'lot_id'      => $data['lot_id'],
                'partname'   => $data['partname'],
                'qty'         => $data['qty'],
                'status'      => 'staged',
                'received_by' => $data['received_by'],
                'received_at' => Carbon::now('UTC'),
            ]);

            // 3. Assign all slots atomically
            foreach ($data['slot_ids'] as $slotId) {
                $this->positions->assign($lot->id, $slotId, $data['received_by']);
            }

            return $lot->load('activePositions.rackSlot');
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
     * @param  int     $lotId
     * @param  string  $releasedBy
     * @return Lot
     */
    public function release(int $lotId, string $releasedBy): Lot
    {
        return DB::transaction(function () use ($lotId, $releasedBy) {
            $lot = $this->lots->find($lotId);

            if ($lot->status !== 'staged') {
                throw ValidationException::withMessages([
                    'lot' => "Lot is not in staged status (current: {$lot->status}).",
                ]);
            }

            $this->positions->releaseByLot($lotId, $releasedBy);

            return $this->lots->update($lotId, ['status' => 'released']);
        });
    }
}
