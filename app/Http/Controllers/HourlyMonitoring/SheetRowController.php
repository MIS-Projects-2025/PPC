<?php

namespace App\Http\Controllers\HourlyMonitoring;

use App\Http\Controllers\Controller;
use App\Http\Requests\HourlyMonitoring\ApplyRowChangesRequest;
use App\Http\Resources\HourlyMonitoring\HourlyRowResource;
use App\Models\HourlySheet;
use App\Services\HourlyMonitoring\HourlyRowService;
use Illuminate\Http\JsonResponse;

class SheetRowController extends Controller
{
    public function __construct(private HourlyRowService $rows)
    {
    }

    public function store(HourlySheet $sheet): JsonResponse
    {
        return (new HourlyRowResource($this->rows->addRow($sheet)))->response()->setStatusCode(201);
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
