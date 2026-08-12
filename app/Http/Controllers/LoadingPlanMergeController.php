<?php

namespace App\Http\Controllers;

use App\Services\LotMergeService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Exceptions\LoadingPlanDateFinalizedException;
use App\Exceptions\InvalidMergeException;
use Illuminate\Support\Facades\Log;

class LoadingPlanMergeController extends Controller
{
    public function __construct(private LotMergeService $mergeService) {}

    public function store(Request $request)
    {
        $data = $request->validate([
            'lot_id_a'       => 'required|string',
            'lot_id_b'       => 'required|string',
            'scheduled_date' => 'required|date',
        ]);

        try {
            $result = $this->mergeService->merge(
                $data['lot_id_a'],
                $data['lot_id_b'],
                $data['scheduled_date'],
                $request->user()?->emp_name ?? null, // adjust to match your auth user shape
            );

            return response()->json($result, 201);
        } catch (InvalidMergeException $e) {
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

    public function destroy(int $merge, Request $request)
    {
        $data = $request->validate([
            'reverted_by' => 'sometimes|string|nullable',
        ]);

        try {
            $result = $this->mergeService->revert($merge, $data['reverted_by'] ?? null);

            return response()->json([
                'merge'  => $result['merge'],
                'target' => $result['target'],
                'source' => $result['source'],
            ]);
        } catch (LoadingPlanDateFinalizedException $e) {
            return response()->json([
                'error'          => 'finalized',
                'message'        => $e->getMessage(),
                'scheduled_date' => $e->scheduledDate,
            ], 422);
        } catch (\Throwable $e) {
            Log::error('lot merge revert failed', ['merge_id' => $merge, 'message' => $e->getMessage()]);
            return response()->json([
                'error'   => 'server_error',
                'message' => 'Could not revert this merge.',
            ], 500);
        }
    }

    public function history(string $targetLotId): JsonResponse
    {
        return response()->json($this->mergeService->historyFor($targetLotId));
    }
}
