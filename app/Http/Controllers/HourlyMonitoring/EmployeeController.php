<?php

namespace App\Http\Controllers\HourlyMonitoring;

use App\Http\Controllers\Controller;
use App\Http\Requests\HourlyMonitoring\EmployeeSearchRequest;
use App\Services\HourlyMonitoring\EmployeeLookupService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class EmployeeController extends Controller
{
    public function search(EmployeeSearchRequest $request, EmployeeLookupService $employees): JsonResponse
    {
        try {
            return response()->json(['data' => $employees->search($request->validated('q'))]);
        } catch (\Throwable $e) {
            Log::warning('Employee search failed', ['error' => $e->getMessage()]);

            return response()->json(['message' => 'The employee masterlist is unreachable. Try again shortly.'], 503);
        }
    }
}
