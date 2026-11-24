<?php

namespace App\Http\Controllers\HourlyMonitoring;

use App\Http\Controllers\Controller;
use App\Http\Requests\HourlyMonitoring\DateRequest;
use App\Services\HourlyMonitoring\SummaryService;
use Illuminate\Http\JsonResponse;

class SummaryController extends Controller
{
    public function show(DateRequest $request, SummaryService $summary): JsonResponse
    {
        return response()->json($summary->forDate($request->day()));
    }
}
