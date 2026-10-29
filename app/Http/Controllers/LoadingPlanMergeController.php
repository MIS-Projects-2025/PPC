<?php

namespace App\Http\Controllers;

use App\Services\LotMergeService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use App\Exceptions\LoadingPlanDateFinalizedException;
use App\Exceptions\InvalidMergeException;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\Eloquent\ModelNotFoundException;

class LoadingPlanMergeController extends Controller
{
    public function __construct(private LotMergeService $mergeService) {}

    public function store(Request $request)
    {
        $data = $request->validate([
            'entry_id_a' => 'required|integer|exists:loading_plan_entries,id',
            'entry_id_b' => 'required|integer|exists:loading_plan_entries,id',
        ]);

        try {
            $result = $this->mergeService->merge(
                (int) $data['entry_id_a'],
                (int) $data['entry_id_b'],
                $request->user()?->emp_name ?? null,
            );

            return response()->json($result, 201);
        } catch (InvalidMergeException $e) {
            return response()->json([
                'error'   => 'invalid_merge',
                'message' => $e->getMessage(),
            ], 422);
        } catch (LoadingPlanDateFinalizedException $e) {
            return response()->json([
                'error'          => 'finalized',
                'message'        => $e->getMessage(),
                'scheduled_date' => $e->scheduledDate,
            ], 422);
        } catch (\InvalidArgumentException $e) {
            return response()->json([
                'error'   => 'bad_request',
                'message' => $e->getMessage(),
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
                'affected_timings' => $result['affected_timings'],
            ]);
        } catch (LoadingPlanDateFinalizedException $e) {
            return response()->json(['error' => 'finalized', 'message' => $e->getMessage(), 'scheduled_date' => $e->scheduledDate], 422);
        } catch (InvalidMergeException $e) {                       // moved above Throwable
            return response()->json(['error' => 'invalid_merge', 'message' => $e->getMessage()], 422);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['error' => 'not_found', 'message' => 'That merge does not exist or is already reverted.'], 404);
        } catch (ModelNotFoundException $e) {
            return response()->json(['error' => 'not_found', 'message' => 'That row no longer exists.'], 404);
        } catch (\Throwable $e) {
            Log::error('lot merge revert failed', ['merge_id' => $merge, 'message' => $e->getMessage()]);
            return response()->json(['error' => 'server_error', 'message' => 'Could not revert this merge.'], 500);
        }
    }

    public function history(string $targetLotId): JsonResponse
    {
        return response()->json($this->mergeService->historyFor($targetLotId));
    }

    public function unrevertMerge(int $merge, Request $request): JsonResponse
    {
        try {
            $result = app(LotMergeService::class)->unrevert($merge, $request->user()?->id);

            return response()->json($result);
        } catch (InvalidMergeException $e) {
            return response()->json([
                'error'   => 'invalid_merge',
                'message' => $e->getMessage(),
            ], 422);
        } catch (LoadingPlanDateFinalizedException $e) {
            return response()->json([
                'error'          => 'finalized',
                'message'        => $e->getMessage(),
                'scheduled_date' => $e->scheduledDate,
            ], 422);
        } catch (ModelNotFoundException $e) {
            return response()->json([
                'error'   => 'not_found',
                'message' => 'That row no longer exists.',
            ], 404);
        } catch (\Throwable $e) {
            Log::error('lot merge unrevert failed', ['merge_id' => $merge, 'message' => $e->getMessage()]);
            return response()->json(['error' => 'server_error', 'message' => 'Could not unrevert this merge.'], 500);
        }
    }
}
