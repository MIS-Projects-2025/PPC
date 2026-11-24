<?php

namespace App\Http\Controllers\HourlyMonitoring;

use App\Http\Controllers\Controller;
use App\Http\Requests\HourlyMonitoring\DateRequest;
use App\Services\HourlyMonitoring\PickupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class PickupController extends Controller
{
    /** Read-only pickup lots of one day, per line (F1 / F2 / F3). */
    public function show(DateRequest $request, PickupService $pickup): JsonResponse
    {
        try {
            return response()->json($pickup->forDate($request->day()));
        } catch (\Throwable $e) {
            Log::warning('Pickup lookup failed', ['error' => $e->getMessage()]);

            return response()->json(['message' => 'The pickup tables are unreachable. Try again shortly.'], 503);
        }
    }
}
