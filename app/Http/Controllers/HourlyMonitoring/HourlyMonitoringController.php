<?php

namespace App\Http\Controllers\HourlyMonitoring;

use App\Http\Controllers\Controller;
use App\Http\Requests\HourlyMonitoring\DateRequest;
use App\Http\Resources\HourlyMonitoring\DowntimeCodeResource;
use App\Http\Resources\HourlyMonitoring\HourlySheetResource;
use App\Models\DowntimeCode;
use App\Services\HourlyMonitoring\SheetService;
use Inertia\Inertia;
use Inertia\Response;

class HourlyMonitoringController extends Controller
{
    public function index(DateRequest $request, SheetService $sheets): Response
    {
        $date = $request->day();

        return Inertia::render('HourlyMonitoring/Index', [
            'date'          => $date,
            'sheets'        => HourlySheetResource::collection($sheets->openDay($date))->resolve(),
            // FUTURE: codes get a maintenance page; for now they are managed by DowntimeCodeSeeder.
            'downtimeCodes' => DowntimeCodeResource::collection(DowntimeCode::orderBy('code')->get())->resolve(),
            'config'        => [
                'cap_divisor' => config('hourly_monitoring.cap_divisor'),
                'lines'       => config('hourly_monitoring.lines'),
                'day_hours'   => config('hourly_monitoring.day_hours'),
                'night_hours' => config('hourly_monitoring.night_hours'),
            ],
            'urls'          => [
                'index'     => route('hourly-monitoring.index'),
                'employees' => route('hourly-monitoring.employees.search'),
                'summary'   => route('hourly-monitoring.summary'),
            ],
        ]);
    }
}
