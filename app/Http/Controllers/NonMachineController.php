<?php

namespace App\Http\Controllers;

use App\Exceptions\LoadingPlanDateFinalizedException;
use App\Models\NonMachine;
use App\Services\LoadingPlanEntryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NonMachineController extends Controller
{
    public function __construct(private LoadingPlanEntryService $service) {}

    private function present(NonMachine $n): array
    {
        return [
            'id'             => $n->id,
            'key'            => $n->key(),
            'name'           => $n->name,
            'location'       => $n->location,
        ];
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'           => 'required|string|max:64',
            'location'       => 'required|in:PL1,PL6',
        ]);

        return response()->json($this->present(NonMachine::create($data)), 201);
    }

    public function update(Request $request, NonMachine $nonMachine): JsonResponse
    {
        $nonMachine->update($request->validate([
            'name' => 'required|string|max:64',
        ]));

        return response()->json($this->present($nonMachine));
    }

    /** Lots go back to Unassigned, blocks (and rework rows) are deleted. */
    public function destroy(NonMachine $nonMachine): JsonResponse
    {
        try {
            return response()->json($this->service->deleteNonMachine($nonMachine->id));
        } catch (\Throwable $e) {
            return response()->json([
                'error'   => 'bad_request',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    /** The first row's start IS the lane start; editing it re-chains the whole lane. */
    public function setStart(Request $request, NonMachine $nonMachine): JsonResponse
    {
        $data = $request->validate([
            'time_start' => 'required|date_format:Y-m-d H:i:s',
            'scheduled_date'      => ['required', 'date'],
        ]);

        try {
            return response()->json($this->service->setNonMachineStart($nonMachine->id, $data['time_start'], $data['scheduled_date']));
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => 'bad_request', 'message' => $e->getMessage()], 422);
        }
    }
}
