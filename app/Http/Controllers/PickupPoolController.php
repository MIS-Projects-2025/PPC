<?php

namespace App\Http\Controllers;

use App\Exceptions\LoadingPlanDateFinalizedException;
use App\Services\PickupPoolService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PickupPoolController extends Controller
{
    private const DEFAULT_DAYS = 7;

    public function __construct(private PickupPoolService $pool) {}

    /** Older F1/F2 pickups that can still be brought into $date's Unassigned. */
    public function available(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date'     => 'required|date_format:Y-m-d',
            'location' => 'required|in:PL1,PL6',   // F3 is always pool-based, nothing to fetch
            'days'     => 'nullable|integer|min:1|max:' . PickupPoolService::MAX_DAYS,
        ]);

        try {
            return response()->json(
                $this->pool->available($data['date'], $data['location'], (int) ($data['days'] ?? self::DEFAULT_DAYS))
            );
        } catch (\Throwable $e) {
            Log::error('pickup pool available failed', ['exception' => $e]);
            return response()->json([
                'error'   => 'server_error',
                'message' => 'Could not load earlier pickups.',
            ], 500);
        }
    }

    /** Creates unassigned entries on $date for the chosen pickups. */
    public function pull(Request $request): JsonResponse
    {
        $data = $request->validate([
            'date'         => 'required|date_format:Y-m-d',
            'location'     => 'required|in:PL1,PL6',
            'pickup_ids'   => 'required|array|min:1|max:500',
            'pickup_ids.*' => 'integer|distinct',
        ]);

        try {
            $result = $this->pool->pull($data['pickup_ids'], $data['date'], $data['location']);

            // ids that were filtered out server-side: already placed, pulled by someone else, wrong location
            $requested = count($data['pickup_ids']);
            $added     = count($result['entries']);

            return response()->json([
                ...$result,
                'requested' => $requested,
                'skipped'   => $requested - $added,
            ], 201);
        } catch (LoadingPlanDateFinalizedException $e) {
            return response()->json([
                'error'          => 'finalized',
                'message'        => $e->getMessage(),
                'scheduled_date' => $e->scheduledDate,
            ], 422);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => 'bad_request', 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Log::error('pickup pool pull failed', ['exception' => $e, 'ids' => $data['pickup_ids']]);
            return response()->json([
                'error'   => 'server_error',
                'message' => 'Could not add the pickups. Nothing was saved.',
            ], 500);
        }
    }
}
