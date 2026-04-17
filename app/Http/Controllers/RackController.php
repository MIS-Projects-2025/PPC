<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use App\Models\ProductionLine;
use App\Repositories\Interfaces\RackRepositoryInterface;
use App\Repositories\Interfaces\ProductionLineRepositoryInterface;
use App\Repositories\Interfaces\RackSlotRepositoryInterface;
use Illuminate\Support\Facades\Log;
use Laravel\Reverb\Concerns\InteractsWithApplications;

class RackController extends Controller
{
    public function __construct(
        protected RackRepositoryInterface         $repo,
        protected ProductionLineRepositoryInterface $productionLines,
        protected RackSlotRepositoryInterface $rackSlotRepo,
    ) {}

    public function index(?string $productionLine = null): Response
    {
        // Initialize $racks with a default value
        $racks = null;

        if ($productionLine) {
            $pl = ProductionLine::where('name', strtoupper($productionLine))
                ->firstOrFail();

            // Use the specific repository method if PL is provided
            $racks = $this->repo->getAllByProductionLine($pl->id);
        } else {
            // Default to all if no parameter is passed
            $racks = $this->repo->all();
        }

        Log::info("Racks count: " . $racks->count());

        return Inertia::render('Rack', [
            'racks'           => $racks,
            'slots'           => fn() => $this->rackSlotRepo->all()->keyBy('id'),
            'productionLines' => $this->productionLines->allActive(),
        ]);
    }

    public function edit()
    {
        $plines = $this->productionLines->allActive();
        $racksWithSlots = $this->repo->all();

        return Inertia::render('RackConfigurator', [
            'racks' => $racksWithSlots,
            'plines' => $plines
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
            'slots'              => 'required|array|min:1',
            'slots.*.label'      => 'required|string|max:50|distinct',
            'slots.*.is_active'  => 'required|boolean',
        ]);

        if ($this->repo->existByLabel($data['label'])) {
            return response()->json([
                'status'  => 'error',
                'message' => "Rack with label '{$data['label']}' already exists.",
            ], 400);
        }

        $rack = $this->repo->create(
            request()->only('production_line_id', 'label', 'description')
        );

        $rack->slots()->createMany(
            collect($data['slots'])->map(fn($slot) => [
                'label' => $slot['label'],
                'is_active' => $slot['is_active'],
            ])->all()
        );

        return response()->json([
            'status'  => 'success',
            'message' => "Rack '{$rack->label}' created successfully.",
            'data'    => $rack->load('slots'),
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
