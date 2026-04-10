<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use App\Services\LotService;
use App\Repositories\Interfaces\LotRepositoryInterface;
use App\Repositories\Interfaces\RackRepositoryInterface;
use App\Repositories\Interfaces\RackSlotRepositoryInterface;

class LotController extends Controller
{
    public function __construct(
        protected LotService              $lotService,
        protected LotRepositoryInterface  $lotRepo,
        protected RackRepositoryInterface $rackRepo,
        protected RackSlotRepositoryInterface $rackSlotRepo
    ) {}

    // GET /lots/receive
    // Lot receiving page — scan panel + today's received list
    public function receive(): Response
    {
        return Inertia::render('Lots/Receive', [
            'todayLots' => $this->lotRepo->today(),
            'racks'     => $this->rackRepo->all(),
        ]);
    }

    public function all()
    {
        return $this->lotRepo->all();
    }

    // GET /lots
    // Full inventory — filterable by status, date, search
    public function index(): Response
    {
        $filters = request()->only('status', 'search', 'date', 'per_page');

        return Inertia::render('LotsUpstream', [
            'lots'    => $this->lotRepo->paginate($filters),

            'racks' => fn() => $this->rackRepo->all(),
            'slots' => fn() => $this->rackSlotRepo->all()->keyBy('id'),

            'filters' => $filters,
        ]);
    }

    // GET /lots/aging
    // Supervisor/WCO view of all lots past the 3-day threshold
    public function aging(): Response
    {
        return Inertia::render('Lots/Aging', [
            'lots' => $this->lotRepo->aging(),
        ]);
    }

    // POST /lots
    // Called when WCO confirms a scan + slot assignment
    public function store()
    {
        $data = request()->validate([
            'lot_id'    => 'required|string|max:50',
            'partname' => 'required|string|max:255',
            'qty'       => 'required|integer|min:1',
            'slot_ids'  => 'required|array|min:1',
            'slot_ids.*' => 'required|integer|exists:rack_slots,id',
        ]);

        $data['received_by'] = session('emp_data')['emp_id'] ?? null;

        $result = $this->lotService->receive($data);

        return response()->json([
            'status'  => 'success',
            'message' => "Lot {$data['lot_id']} received successfully.",
            'data'    => $result // Optionally return the new lot data
        ]);
    }

    // POST /lots/{id}/remove
    // Manual removal from rack — outside normal release flow
    public function remove(int $id)
    {
        request()->validate([
            'reason' => 'required|string|max:500',
        ]);

        $removedBy = request()->user()->employee_id ?? 'system';

        $this->lotService->remove($id, $removedBy, request('reason'));

        return response()->json([
            'status'  => 'success',
            'message' => 'Lot removed from rack.'
        ]);
    }

    // POST /lots/{id}/release
    // Release lot to MH — called from release workflow
    public function release(int $id)
    {
        $releasedBy = request()->user()->employee_id ?? 'system';

        $this->lotService->release($id, $releasedBy);

        return response()->json([
            'status'  => 'success',
            'message' => 'Lot released to MH.'
        ]);
    }

    public function update(int $id)
    {
        $userId = session('emp_data')['emp_id'] ?? null;

        $data = request()->validate([
            'lot_id'    => 'sometimes|string|max:50',
            'partname' => 'sometimes|string|max:255',
            'qty'       => 'sometimes|integer|min:1',
            'status'    => 'sometimes|string|in:staged,removed,released',
        ]);

        $data['modified_by'] = $userId;

        $this->lotRepo->update($id, $data);

        return response()->json([
            'status' => 'success',
            'message' => 'Lot updated successfully',
            'data' => $this->lotRepo->find($id),
        ]);
    }
}
