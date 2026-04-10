<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use App\Repositories\Interfaces\ProductionLineRepositoryInterface;

class ProductionLineController extends Controller
{
    public function __construct(
        protected ProductionLineRepositoryInterface $repo,
    ) {}

    // public function index(): Response
    // {
    //     return Inertia::render('ProductionLines/Index', [
    //         'productionLines' => $this->repo->all(),
    //     ]);
    // }

    public function store()
    {
        $data = request()->validate([
            'name'        => 'required|string|max:50|unique:production_lines,name',
            'description' => 'nullable|string|max:255',
            'is_active'   => 'boolean',
        ]);

        $line = $this->repo->create(request()->only('name', 'description', 'is_active'));

        return response()->json([
            'status'  => 'success',
            'message' => "Production line '{$line->name}' created successfully.",
            'data'    => $line
        ], 201); // 201 Created is semantically better for store
    }

    public function update(int $id)
    {
        request()->validate([
            'name'        => "required|string|max:50|unique:production_lines,name,{$id}",
            'description' => 'nullable|string|max:255',
            'is_active'   => 'boolean',
        ]);

        $updated = $this->repo->update($id, request()->only('name', 'description', 'is_active'));

        return response()->json([
            'status'  => 'success',
            'message' => "Production line updated successfully.",
            'data'    => $updated
        ]);
    }

    public function destroy(int $id)
    {
        $this->repo->delete($id);

        return response()->json([
            'status'  => 'success',
            'message' => "Production line deleted successfully.",
            'id'      => $id // Useful for frontend to filter out the deleted item from state
        ]);
    }
}
