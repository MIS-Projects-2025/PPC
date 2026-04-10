<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use App\Repositories\Interfaces\RackRepositoryInterface;
use App\Repositories\Interfaces\ProductionLineRepositoryInterface;
use App\Repositories\Interfaces\RackSlotRepositoryInterface;
use Laravel\Reverb\Concerns\InteractsWithApplications;

class RackController extends Controller
{
    public function __construct(
        protected RackRepositoryInterface         $repo,
        protected ProductionLineRepositoryInterface $productionLines,
        protected RackSlotRepositoryInterface $rackSlotRepo,
    ) {}

    public function index(): Response
    {
        return Inertia::render('Racks/Index', [
            'racks'           => $this->repo->all(),
            'slots' => fn() => $this->rackSlotRepo->all()->keyBy('id'),
            'productionLines' => $this->productionLines->allActive(),
        ]);
    }

    public function all()
    {
        $racks = $this->repo->all();

        return Inertia::render('RackBarcode', [
            'racks' => $racks
        ]);

        // return Inertia::render('RackBarcode', compact('racks'))
        //     ->withViewData(['layout' => null]);
    }

    // Full rack view with all slots and their current lot occupants
    public function show(int $id): Response
    {
        return Inertia::render('Racks/Show', [
            'rack' => $this->repo->findWithSlots($id),
        ]);
    }

    public function store()
    {
        $data = request()->validate([
            'production_line_id' => 'required|exists:production_lines,id',
            'label'              => 'required|string|max:50',
            'description'        => 'nullable|string|max:255',
        ]);

        $rack = $this->repo->create(request()->only('production_line_id', 'label', 'description'));

        return response()->json([
            'status'  => 'success',
            'message' => "Rack '{$rack->label}' created successfully.",
            'data'    => $rack
        ], 201);
    }

    public function update(int $id)
    {
        request()->validate([
            'label'       => 'required|string|max:50',
            'description' => 'nullable|string|max:255',
        ]);

        $updated = $this->repo->update($id, request()->only('label', 'description'));

        return response()->json([
            'status'  => 'success',
            'message' => "Rack updated successfully.",
            'data'    => $updated
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
}
