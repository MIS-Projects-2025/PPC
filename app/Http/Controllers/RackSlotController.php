<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Inertia\Response;
use Inertia\Inertia;
use App\Repositories\Interfaces\RackSlotRepositoryInterface;
use App\Repositories\Interfaces\RackRepositoryInterface;
use App\Services\RackSlotService;

class RackSlotController extends Controller
{
    public function __construct(
        protected RackSlotRepositoryInterface $repo,
        protected RackRepositoryInterface     $racks,
        protected RackSlotService             $service,
    ) {}

    public function index(int $rackId): Response
    {
        return Inertia::render('RackSlots/Index', [
            'rack'  => $this->racks->findWithSlots($rackId),
            'slots' => $this->repo->byRack($rackId),
        ]);
    }

    public function all()
    {
        return $this->repo->all();
    }

    public function store(int $rackId)
    {
        request()->validate([
            'label' => "required|string|max:10|unique:rack_slots,label,NULL,id,rack_id,{$rackId}",
        ]);

        $this->repo->create([
            'rack_id' => $rackId,
            'label'   => strtoupper(request('label')),
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => "Rack updated successfully.",
        ]);
    }

    public function update(int $id)
    {
        request()->validate([
            'label' => 'required|string|max:10',
        ]);

        $updated = $this->repo->update($id, ['label' => strtoupper(request('label'))]);

        return response()->json([
            'status'  => 'success',
            'message' => "Rack updated successfully.",
            'data'    => $updated,
        ]);
    }

    public function destroy(int $id)
    {
        $this->repo->delete($id);
        return response()->json([
            'status'  => 'success',
            'message' => "Rack deleted successfully.",
            'id'      => $id
        ]);
    }

    public function markFull(int $id)
    {
        $by = session('emp_data')['emp_id'] ?? 'system';
        $this->service->markFull($id, $by);
        return response()->json([
            'status'  => 'success',
            'message' => "Rack updated successfully.",
        ]);
    }

    public function clearFull(int $id)
    {
        $this->service->clearFull($id);
        return response()->json([
            'status'  => 'success',
            'message' => "Rack updated successfully.",
        ]);
    }
}
