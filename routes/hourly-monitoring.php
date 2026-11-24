<?php

use App\Http\Controllers\HourlyMonitoring\EmployeeController;
use App\Http\Controllers\HourlyMonitoring\HourlyMonitoringController;
use App\Http\Controllers\HourlyMonitoring\PickupController;
use App\Http\Controllers\HourlyMonitoring\SheetController;
use App\Http\Controllers\HourlyMonitoring\SheetRowController;
use App\Http\Controllers\HourlyMonitoring\SummaryController;
use Illuminate\Support\Facades\Route;

/*
 | Loaded from routes/web.php:
 |
 |   Route::prefix('hourly-monitoring')
 |       ->name('hourly-monitoring.')
 |       ->group(__DIR__ . '/hourly-monitoring.php');
 |
 | FOR NOW there is no authorization: nothing here is guarded. Add middleware to that group later.
 |
 | FUTURE: a maintenance page (CRUD) for the downtime_code table. Deliberately not built yet for
 | simplicity: codes are seeded by DowntimeCodeSeeder.
 */

Route::get('/', [HourlyMonitoringController::class, 'index'])->name('index');
Route::get('employees', [EmployeeController::class, 'search'])->name('employees.search');
Route::get('summary', [SummaryController::class, 'show'])->name('summary');
Route::get('pickup', [PickupController::class, 'show'])->name('pickup');

Route::get('sheets/{sheet}', [SheetController::class, 'show'])->whereNumber('sheet')->name('sheets.show');
Route::post('sheets/{sheet}/rows', [SheetRowController::class, 'store'])->whereNumber('sheet')->name('sheets.rows.store');
Route::patch('sheets/{sheet}/rows', [SheetRowController::class, 'update'])->whereNumber('sheet')->name('sheets.rows.update');
Route::delete('sheets/{sheet}/rows/{row}', [SheetRowController::class, 'destroy'])
    ->whereNumber(['sheet', 'row'])->name('sheets.rows.destroy');
