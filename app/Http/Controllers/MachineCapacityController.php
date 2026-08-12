<?php

namespace App\Http\Controllers;

use App\Models\MachineCapacity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class MachineCapacityController extends Controller
{
    /**
     * Display capacity history for a machine, or lookup by specific date / current.
     * GET /api/machine-capacities?machine_id=1&date=2026-05-01
     */
    public function index(Request $request)
    {
        $request->validate([
            // Validates against qdn_db.machine_list table
            'machine_id' => 'required|integer|exists:qdn_db.machine_list,id',
            'date'       => 'nullable|date',
        ]);

        $query = MachineCapacity::with('machine')->where('machine_id', $request->machine_id);

        if ($request->has('date')) {
            $capacity = $query->asOf($request->date)->firstOrFail();
            return response()->json($capacity);
        }

        return response()->json($query->orderBy('effective_from', 'desc')->get());
    }

    /**
     * Get current active capacity for a machine.
     * GET /api/machine-capacities/current/{machineId}
     */
    public function current($machineId)
    {
        $current = MachineCapacity::with('machine')
            ->where('machine_id', $machineId)
            ->current()
            ->firstOrFail();

        return response()->json($current);
    }

    /**
     * Store a new capacity version. Closes the previous active record automatically.
     * POST /api/machine-capacities
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'machine_id'     => 'required|integer|exists:qdn_db.machine_list,id',
            'capacity'       => 'nullable|integer|min:0',
            'effective_from' => 'required|date',
        ]);

        $effectiveFrom = Carbon::parse($validated['effective_from']);

        return DB::connection('qdn_db')->transaction(function () use ($validated, $effectiveFrom) {
            // 1. Close current open-ended row (if any) to effective_from - 1 day
            MachineCapacity::where('machine_id', $validated['machine_id'])
                ->current()
                ->update([
                    'effective_to' => $effectiveFrom->copy()->subDay()->toDateString()
                ]);

            // 2. Insert new open-ended row
            $newCapacity = MachineCapacity::create([
                'machine_id'     => $validated['machine_id'],
                'capacity'       => $validated['capacity'],
                'effective_from' => $effectiveFrom->toDateString(),
                'effective_to'   => null,
            ]);

            return response()->json($newCapacity->load('machine'), 201);
        });
    }

    /**
     * Show a specific capacity record by ID with machine details.
     * GET /api/machine-capacities/{id}
     */
    public function show($id)
    {
        $record = MachineCapacity::with('machine')->findOrFail($id);
        return response()->json($record);
    }

    /**
     * Direct update of an existing version record.
     * PUT /api/machine-capacities/{id}
     */
    public function update(Request $request, $id)
    {
        $capacityRecord = MachineCapacity::findOrFail($id);

        $validated = $request->validate([
            'capacity'       => 'sometimes|nullable|integer|min:0',
            'effective_from' => 'sometimes|date',
            'effective_to'   => 'sometimes|nullable|date',
        ]);

        $capacityRecord->update($validated);

        return response()->json($capacityRecord->load('machine'));
    }

    /**
     * Delete a capacity record.
     * DELETE /api/machine-capacities/{id}
     */
    public function destroy($id)
    {
        $capacityRecord = MachineCapacity::findOrFail($id);
        $capacityRecord->delete();

        return response()->json(['message' => 'Capacity record deleted successfully.']);
    }
}
