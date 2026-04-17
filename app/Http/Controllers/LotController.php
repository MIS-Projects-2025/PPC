<?php

namespace App\Http\Controllers;

use App\Models\Lot;
use App\Models\ProductionLine;
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
    public function index(string $productionLine): Response
    {
        $pl = ProductionLine::where('name', strtoupper($productionLine))
            ->firstOrFail();

        $filters = request()->only([
            'status',
            'search',
            'date',
            'received_date_from',
            'received_date_to',
            'released_date_from',
            'released_date_to',
            'aging',
            'unslotted',
            'per_page',
        ]);

        return Inertia::render('LotsUpstream', [
            'lots' => Inertia::always(
                fn() =>
                $this->lotRepo->paginate($filters, $pl->id)
            ),
            'racks' => fn() => $this->rackRepo->getAllByProductionLine($pl->id),
            'slots' => fn() => $this->rackSlotRepo->all()->keyBy('id'),
            'filters' => $filters,
            'productionLine' => $pl->name,
            'totalEntries' => Lot::count(),
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
            'partname' => 'nullable|string|max:255',
            'qty'       => 'nullable|integer|min:1',
            'slot_ids'  => 'sometimes|array|min:0',
            'slot_ids.*' => 'sometimes|integer|exists:rack_slots,id',
        ]);

        $data['received_by'] = session('emp_data')['emp_id'] ?? 'system';

        $result = $this->lotService->receive($data);

        return response()->json([
            'status'  => 'success',
            'message' => "Lot {$data['lot_id']} received successfully.",
            'data'    => $result,
        ]);
    }

    // POST /lots/{id}/remove
    // Manual removal from rack — outside normal release flow
    public function remove(int $id)
    {
        request()->validate([
            'reason' => 'required|string|max:500',
        ]);

        $removedBy = session('emp_data')['emp_id'] ?? 'system';

        $this->lotService->remove($id, $removedBy, request('reason'));

        return response()->json([
            'status'  => 'success',
            'message' => 'Lot removed from rack.'
        ]);
    }

    // POST /lots/{id}/release
    // Release lot to MH — called from release workflow
    public function release()
    {
        $releasedBy = session('emp_data')['emp_id'] ?? 'system';

        $data = request()->validate([
            'lot_id'    => 'required|string|max:50',
            'partname' => 'required|string|max:255',
        ]);

        $releasedLot = $this->lotService->release($data['lot_id'], $data['partname'], $releasedBy);

        return response()->json([
            'status'  => 'success',
            'message' => 'Lot released to MH.',
            'data'    => $releasedLot

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
            'slot_ids'  => 'sometimes|array|min:0',
            'slot_ids.*' => 'sometimes|integer|exists:rack_slots,id',
        ]);

        $data['modified_by'] = $userId;

        $updated = $this->lotRepo->update($id, $data);

        return response()->json([
            'status' => 'success',
            'message' => 'Lot updated successfully',
            'data' => $updated,
        ]);
    }
}
