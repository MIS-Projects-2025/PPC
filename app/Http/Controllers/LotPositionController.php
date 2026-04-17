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
                'rack_slot_id' => "Slot {$slot->label} is marked full.",
            ]);
        }

        $productionLineId = $slot->rack->production_line_id;

        $by = session('emp_data')['emp_id'] ?? 'system';

        $this->repo->assign($lotId, $data['rack_slot_id'], $by, $productionLineId);

        return response()->json([
            'status' => 'success',
            'message' => "Slot {$slot->label} assigned to lot.",
            'data' => [
                'slot_id' => $slot->id,
                'label' => $slot->label
            ]
        ]);
    }
}
