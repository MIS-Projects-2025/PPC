<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\ValidationException;
use App\Repositories\Interfaces\LotPositionRepositoryInterface;
use App\Repositories\Interfaces\RackSlotRepositoryInterface;

class LotPositionController extends Controller
{
    public function __construct(
        protected LotPositionRepositoryInterface $repo,
        protected RackSlotRepositoryInterface    $slots,
    ) {}

    // POST /lots/{lotId}/positions
    // Add an additional slot to an already-staged lot (e.g. WCO realises it needs A3 too)
    public function store(int $lotId)
    {
        $data = request()->validate([
            'rack_slot_id' => 'required|integer|exists:rack_slots,id',
        ]);

        $slot = $this->slots->find($data['rack_slot_id']);

        if (!$slot->isAvailable()) {
            throw ValidationException::withMessages([
                'rack_slot_id' => "Slot {$slot->label} is already occupied or marked full.",
            ]);
        }

        $by = request()->user()->employee_id ?? 'system';

        $this->repo->assign($lotId, $data['rack_slot_id'], $by);

        return response()->json([
            'status' => 'success',
            'message' => "Slot {$slot->label} assigned to lot.",
            'data' => [
                'slot_id' => $slot->id,
                'label' => $slot->label
            ]
        ]);
    }

    // DELETE /lots/{lotId}/positions/{slotId}
    // Remove a specific slot from a lot without removing the lot itself
    // Useful when a lot was assigned too many slots by mistake
    public function destroy(int $lotId, int $slotId)
    {
        $by   = request()->user()->employee_id ?? 'system';
        $slot = $this->slots->find($slotId);

        // Ensure this position actually belongs to this lot
        $position = $this->repo->activeBySlot($slotId);

        if (!$position || $position->lot_id !== $lotId) {
            throw ValidationException::withMessages([
                'slot' => "Slot {$slot->label} is not currently assigned to this lot.",
            ]);
        }

        $this->repo->releaseBySlot($slotId, $by);

        return response()->json([
            'status' => 'success',
            'message' => "Slot {$slot->label} freed.",
            'data' => [
                'slot_id' => $slot->id
            ]
        ]);
    }
}
