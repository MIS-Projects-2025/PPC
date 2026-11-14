<?php

use Illuminate\Support\Facades\Route;
use App\Http\Middleware\SessionMiddleware;

use App\Http\Controllers\{
    LoadingPlanController,
    LoadingPlanEntryHistoryController,
    LoadingPlanEntryController,
    LoadingPlanBucketController,
    LoadingPlanSettingsController,
    LoadingPlanPackageGroupController,
    MachineCapacityController,
    MachinePlatformCapacityBandController,
    NonMachineController,
    BoschPartController,
    PickupPoolController,
    LoadingPlanSplitController,
    LoadingPlanMergeController,
    F3PackageCodeController,
};

// Settings
Route::get('settings/{section?}', [LoadingPlanSettingsController::class, 'index'])
    ->whereIn('section', LoadingPlanSettingsController::SECTIONS)
    ->name('settings');

// Pickups
Route::get('/pickups/available', [PickupPoolController::class, 'available'])->name('pickups.available');
Route::post('/pickups/pull', [PickupPoolController::class, 'pull'])->name('pickups.pull');

// Package Groups
Route::prefix('package-groups')->name('package-groups.')->group(function () {
    Route::get('grouped', [LoadingPlanPackageGroupController::class, 'grouped'])->name('grouped');
    Route::get('resolve', [LoadingPlanPackageGroupController::class, 'resolve'])->name('resolve');
});

Route::apiResource('package-groups', LoadingPlanPackageGroupController::class)
    ->parameters(['package-groups' => 'packageGroup']);

// Machine Capacities
Route::prefix('machine-capacities')->name('machine-capacities.')->group(function () {
    Route::get('current/{machineId}', [MachineCapacityController::class, 'current'])->name('current');
});

// Entries
Route::patch('entries/{id}/doable', [LoadingPlanEntryController::class, 'updateDoable'])->name('entries.doable');
Route::patch('part-recipe', [LoadingPlanEntryController::class, 'updatePartRecipe'])->name('part-recipe.update');
Route::get('missing-parts', [LoadingPlanEntryController::class, 'missingParts'])->name('missing-parts');
Route::post('parts/recalculate', [LoadingPlanEntryController::class, 'recalculateParts'])->name('parts.recalculate');

Route::post('entries/{id}/rework', [LoadingPlanEntryController::class, 'rework'])->name('entries.rework');
Route::post('entries/bulk-move', [LoadingPlanEntryController::class, 'bulkMove'])->name('bulk-move');
Route::post('move', [LoadingPlanEntryController::class, 'move'])->name('move');
Route::post('transfer', [LoadingPlanEntryController::class, 'transfer'])->name('transfer');
Route::post('bulk-transfer', [LoadingPlanEntryController::class, 'bulkTransfer'])->name('bulk-transfer');
Route::post('blocks', [LoadingPlanEntryController::class, 'addBlock'])->name('blocks.store');
Route::delete('entries/{id}', [LoadingPlanEntryController::class, 'destroy'])->name('entries.destroy');
Route::post('bulk-delete', [LoadingPlanEntryController::class, 'bulkDestroy'])->name('bulk-delete');

Route::patch('entries/{id}', [LoadingPlanEntryController::class, 'updateField'])->name('entries.update');
Route::get('/entries/{entryId}/history', [LoadingPlanEntryHistoryController::class, 'index'])
    ->name('entries.history');

Route::post('bulk-update', [LoadingPlanEntryController::class, 'bulkUpdateField'])->name('bulk-update');
Route::post('batch-sync', [LoadingPlanEntryController::class, 'batchSync'])->name('batch-sync');
Route::post('manual-lots', [LoadingPlanEntryController::class, 'createManualLot'])->name('manual-lots.store');

// Non-machines
Route::post('non-machines', [NonMachineController::class, 'store'])->name('non-machines.store');
Route::patch('non-machines/{nonMachine}', [NonMachineController::class, 'update'])->name('non-machines.update');
Route::delete('non-machines/{nonMachine}', [NonMachineController::class, 'destroy'])->name('non-machines.destroy');
Route::patch('non-machines/{nonMachine}/start', [NonMachineController::class, 'setStart'])->name('non-machines.start');

// Bosch Parts
Route::get('bosch-parts', [BoschPartController::class, 'index'])->name('bosch-parts.index');
Route::post('bosch-parts', [BoschPartController::class, 'store'])->name('bosch-parts.store');
Route::patch('bosch-parts/{boschPart}', [BoschPartController::class, 'update'])->name('bosch-parts.update');
Route::delete('bosch-parts/{boschPart}', [BoschPartController::class, 'destroy'])->name('bosch-parts.destroy');

Route::apiResource('f3-package-codes', F3PackageCodeController::class)
    ->except(['show'])
    ->parameters(['f3-package-codes' => 'f3PackageCode']);

// Auto Sort
Route::post('auto-sort/{machine}', [LoadingPlanEntryController::class, 'autoSortCycleTime'])->name('auto-sort');

// Buckets
Route::post('buckets/park', [LoadingPlanBucketController::class, 'park'])->name('buckets.park');
Route::post('buckets/unpark', [LoadingPlanBucketController::class, 'unpark'])->name('buckets.unpark');
Route::post('buckets', [LoadingPlanBucketController::class, 'store'])->name('buckets.store');
Route::patch('buckets/{bucket}', [LoadingPlanBucketController::class, 'update'])->name('buckets.update');
Route::delete('buckets/{bucket}', [LoadingPlanBucketController::class, 'destroy'])->name('buckets.destroy');

// Capacity
Route::apiResource('machine-capacities', MachineCapacityController::class)
    ->parameters(['machine-capacities' => 'id'])
    ->names('machine-capacities');

Route::apiResource('capacity-bands', MachinePlatformCapacityBandController::class)
    ->except(['show'])
    ->parameters(['capacity-bands' => 'capacityBand']);

// Scheduler
Route::post('run-scheduler', [LoadingPlanController::class, 'runScheduler'])->name('run-scheduler');

Route::get('view', [LoadingPlanController::class, 'readOnly'])->name('readonly');

Route::get('machine-view/{machine?}', [LoadingPlanController::class, 'machineView'])
    ->withoutMiddleware([SessionMiddleware::class])
    ->name('machine-view');

Route::post('schedule-pickup', [LoadingPlanController::class, 'schedulePickup'])->name('schedule-pickup');
Route::post('transfer-candidates', [LoadingPlanController::class, 'transferCandidates'])->name('transfer-candidates');

// Main pages
Route::get('/', [LoadingPlanController::class, 'index'])->name('index');
Route::get('deemo', [LoadingPlanController::class, 'deemo'])->name('deemo');

// Splits
Route::prefix('splits')->name('splits.')->group(function () {
    Route::post('/', [LoadingPlanSplitController::class, 'store'])->name('store');
    Route::delete('{splitId}', [LoadingPlanSplitController::class, 'destroy'])->name('destroy');
    Route::get('{rootLotId}/history', [LoadingPlanSplitController::class, 'history'])->name('history');
    Route::post('{splitId}/unrevert', [LoadingPlanSplitController::class, 'unrevertSplit'])->name('unrevert');
});

// Merges
Route::prefix('merges')->name('merges.')->group(function () {
    Route::post('/', [LoadingPlanMergeController::class, 'store'])->name('store');
    Route::delete('{mergeId}', [LoadingPlanMergeController::class, 'destroy'])->name('destroy');
    Route::get('{targetLotId}/history', [LoadingPlanMergeController::class, 'history'])->name('history');
    Route::post('{mergeId}/unrevert', [LoadingPlanMergeController::class, 'unrevertMerge'])->name('unrevert');
});
