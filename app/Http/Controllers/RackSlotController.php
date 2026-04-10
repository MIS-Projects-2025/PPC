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

    public function store(int $rackId): RedirectResponse
    {
        request()->validate([
            'label' => "required|string|max:10|unique:rack_slots,label,NULL,id,rack_id,{$rackId}",
        ]);

        $this->repo->create([
            'rack_id' => $rackId,
            'label'   => strtoupper(request('label')),
        ]);

        return back();
    }

    public function update(int $id): RedirectResponse
    {
        request()->validate([
            'label' => 'required|string|max:10',
        ]);

        $this->repo->update($id, ['label' => strtoupper(request('label'))]);

        return back();
    }

    public function destroy(int $id): RedirectResponse
    {
        $this->repo->delete($id);
        return back();
    }

    // POST /rack-slots/{id}/mark-full
    public function markFull(int $id): RedirectResponse
    {
        $by = request()->user()->employee_id ?? 'system';
        $this->service->markFull($id, $by);
        return back();
    }

    // POST /rack-slots/{id}/clear-full
    public function clearFull(int $id): RedirectResponse
    {
        $this->service->clearFull($id);
        return back();
    }
}
