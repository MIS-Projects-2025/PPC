<?php

namespace App\Http\Controllers\HourlyMonitoring;

use App\Http\Controllers\Controller;
use App\Http\Requests\HourlyMonitoring\ApplyRowChangesRequest;
use App\Http\Resources\HourlyMonitoring\HourlyRowResource;
use App\Models\HourlySheet;
use App\Services\HourlyMonitoring\HourlyRowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SheetRowController extends Controller
{
    public function __construct(private HourlyRowService $rows)
    {
    }

    /** Boxing sends {"shift": "day"|"night"} so the row lands in the right table; other sheets send nothing. */
    public function store(Request $request, HourlySheet $sheet): JsonResponse
    {
        $data = $request->validate(['shift' => ['nullable', Rule::in(['day', 'night'])]]);

        return (new HourlyRowResource($this->rows->addRow($sheet, $data['shift'] ?? null)))
            ->response()
            ->setStatusCode(201);
    }

    /** Batch edit: typed values, drag-fill and paste all arrive here. */
    public function update(ApplyRowChangesRequest $request, HourlySheet $sheet)
    {
        return HourlyRowResource::collection($this->rows->apply($sheet, $request->validated('rows')));
    }

    public function destroy(HourlySheet $sheet, int $row): JsonResponse
    {
        $this->rows->deleteRow($sheet, $row);

        return response()->json(null, 204);
    }
}
