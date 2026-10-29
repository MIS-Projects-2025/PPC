<?php

namespace App\Http\Controllers;

use App\Exceptions\LoadingPlanDateFinalizedException;
use App\Models\NonMachine;
use App\Services\LoadingPlanEntryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\Log;

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
            'location'       => 'required|in:PL1,PL6,F3',
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
        } catch (LoadingPlanDateFinalizedException $e) {
            return response()->json(['error' => 'finalized', 'message' => $e->getMessage(), 'scheduled_date' => $e->scheduledDate], 422);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => 'bad_request', 'message' => $e->getMessage()], 422);
        } catch (ModelNotFoundException $e) {
            return response()->json(['error' => 'not_found', 'message' => 'That non-machine no longer exists.'], 404);
        } catch (\Throwable $e) {
            Log::error('non-machine delete failed', ['id' => $nonMachine->id, 'exception' => $e]);
            return response()->json(['error' => 'server_error', 'message' => 'Could not delete this non-machine.'], 500);
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
        } catch (LoadingPlanDateFinalizedException $e) {
            return response()->json(['error' => 'finalized', 'message' => $e->getMessage(), 'scheduled_date' => $e->scheduledDate], 422);
        }
    }
}
