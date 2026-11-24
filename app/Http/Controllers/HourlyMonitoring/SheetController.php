<?php

namespace App\Http\Controllers\HourlyMonitoring;

use App\Http\Controllers\Controller;
use App\Http\Resources\HourlyMonitoring\HourlySheetResource;
use App\Models\HourlySheet;

class SheetController extends Controller
{
    /** Fresh copy of one sheet (used by the grid to recover after a failed save). */
    public function show(HourlySheet $sheet): HourlySheetResource
    {
        return new HourlySheetResource($sheet->load(HourlySheet::EAGER));
    }
}
