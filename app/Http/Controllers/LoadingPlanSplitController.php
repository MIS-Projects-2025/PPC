<?php

namespace App\Http\Controllers;

use App\Exceptions\InvalidSplitException;
use App\Exceptions\LoadingPlanDateFinalizedException;
use App\Services\LotSplitService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class LoadingPlanSplitController extends Controller
{
    public function __construct(private LotSplitService $service) {}

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'parent_entry_lot_id'   => 'required|int',
            'child_qty'             => 'required|integer|min:1',
            'target_machine'        => 'required|string',
            'before_entry_id'       => 'nullable|integer',
            'after_entry_id'        => 'nullable|integer',
            'child_lot_id'          => 'nullable|string',
        ]);

        try {
            $result = $this->service->split(
                $data['parent_entry_lot_id'],
                $data['child_qty'],
                $data['target_machine'],
                $data['before_entry_id'] ?? null,
                $data['after_entry_id'] ?? null,
                $data['child_lot_id'] ?? null,
                $request->user()?->name,
            );

            return response()->json($result, 201);
        } catch (InvalidSplitException $e) {
            return response()->json([
                'error'   => 'invalid_split',
                'message' => $e->getMessage(),
            ], 422);
        } catch (LoadingPlanDateFinalizedException $e) {
            return response()->json([
                'error'          => 'finalized',
                'message'        => $e->getMessage(),
                'scheduled_date' => $e->scheduledDate,
            ], 422);
        }
    }

    public function destroy(Request $request, int $splitId): JsonResponse
    {
        try {
            $result = $this->service->revert($splitId, $request->user()?->name);

            return response()->json($result);
        } catch (LoadingPlanDateFinalizedException $e) {
            return response()->json([
                'error'          => 'finalized',
                'message'        => $e->getMessage(),
                'scheduled_date' => $e->scheduledDate,
            ], 422);
        } catch (InvalidSplitException $e) {
            return response()->json([
                'error'   => 'invalid_split',
                'message' => $e->getMessage(),
            ], 422);
        } catch (\Throwable $e) {
            Log::error('lot split revert failed', ['split_id' => $splitId, 'message' => $e->getMessage()]);
            return response()->json([
                'error'   => 'server_error',
                'message' => 'Could not revert this split.',
            ], 500);
        }
    }

    public function history(string $rootLotId): JsonResponse
    {
        return response()->json($this->service->historyFor($rootLotId));
    }
}
