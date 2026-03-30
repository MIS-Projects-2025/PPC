<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Middleware\{ApiAuthMiddleware, ApiPermissionMiddleware};
use App\Http\Controllers\{
    AutoImportController,
    BodySizeController,
    DashboardController,
    F3Controller,
    F3PackageNamesController,
    F3RawPackageController,
    AnalogCalendarController,
    ImportTraceController,
    MachineController,
    PackageBodySizeCapacityController,
    PackageCapacityController,
    PackageController,
    PackageGroupController,
    PartNameController,
    PickupController,
    PlPackageMasterController,
    PlRuleController,
    WipController,
};
use App\Http\Controllers\General\{AdminController, ProfileController};

$app_name = env('APP_NAME', '');
Route::redirect('/', "/$app_name");

require __DIR__ . '/auth.php';

/*
|--------------------------------------------------------------------------
| XHR / Data API Routes
|--------------------------------------------------------------------------
*/
Route::middleware(ApiAuthMiddleware::class)->group(function () {

    // WIP
    Route::prefix('wip')->name('api.wip.')->group(function () {
        Route::get('/today',               [WipController::class, 'getTodayWip'])->name('today');
        Route::get('/overall',             [WipController::class, 'getOverallWip'])->name('overall');
        Route::get('/distinct-packages',   [WipController::class, 'getDistinctPackages'])->name('distinctPackages');
        Route::get('/overall-package',     [WipController::class, 'getOverallWipByPackage'])->name('overallByPackage');
        Route::get('/filter-summary-trend', [WipController::class, 'getWIPStationTrend'])->name('filterSummaryTrend');
        Route::get('/residual',            [WipController::class, 'getOverallResidual'])->name('residual');
        Route::get('/residual-summary',    [WipController::class, 'getPackageResidualSummary'])->name('residualSummary');
        Route::get('/wip-lot-totals',      [WipController::class, 'getWIPQuantityAndLotsTotal'])->name('wipLotTotals');
        Route::get('/body-size',           [WipController::class, 'getWipAndLotsByBodySize'])->name('wipAndLotsByBodySize');
        Route::get('/body-size-trend',     [WipController::class, 'getWipAndLotsByBodySizeTrend'])->name('wipAndLotsByBodySizeTrend');
    });

    // Outs
    Route::prefix('out')->name('api.out.')->group(function () {
        Route::get('/overall',       [WipController::class, 'getOverallOuts'])->name('overall');
        Route::get('/out-lot-totals', [WipController::class, 'getOutQuantityAndLotsTotal'])->name('outLotTotals');
        Route::get('/overall-package', [WipController::class, 'getOverallOutByPackage'])->name('overallByPackage');
    });

    // WIP-Out
    Route::prefix('wip-out')->name('api.wip.')->group(function () {
        Route::get('/trend', [WipController::class, 'getWipOutCapacitySummaryTrend'])->name('out.trend');
    });

    // Part Names
    Route::prefix('partname')->name('api.partname.')->group(function () {
        Route::patch('/create-many', [PartNameController::class, 'bulkUpdate'])->name('bulkUpdate');
        Route::post('/',             [PartNameController::class, 'store'])->name('store');
        Route::middleware(ApiPermissionMiddleware::class . ':partname_mutate')->group(function () {
            Route::patch('/{id}',  [PartNameController::class, 'update'])->name('update');
            Route::delete('/{id}', [PartNameController::class, 'destroy'])->name('delete');
        });
    });

    // Pickup
    Route::prefix('pickup')->name('api.pickup.')->group(function () {
        Route::get('/pickup',                 [PickupController::class, 'getOverallPickUp'])->name('overall');
        Route::get('/pickup-summary-trend',   [PickupController::class, 'getPackagePickUpTrend'])->name('pickupSummaryTrend');
        Route::get('/package-pickup-summary', [PickupController::class, 'getPackagePickUpSummary'])->name('packagePickupSummary');
        Route::middleware(ApiPermissionMiddleware::class . ':pickup_mutate')->group(function () {
            Route::delete('/bulk-delete', [PickupController::class, 'massGenocide'])->name('massGenocide');
        });
    });

    // F3 Raw Package
    Route::prefix('f3-raw-package')->name('api.f3.raw.package.')->group(function () {
        Route::post('/',      [F3RawPackageController::class, 'store'])->name('store');
        Route::get('/list',   [F3RawPackageController::class, 'index'])->name('index');
        Route::middleware(ApiPermissionMiddleware::class . ':f3_raw_package_mutate')->group(function () {
            Route::patch('/create-many', [F3RawPackageController::class, 'bulkUpdate'])->name('bulkUpdate');
            Route::patch('/{id}',        [F3RawPackageController::class, 'update'])->name('update');
            Route::delete('/{id}',       [F3RawPackageController::class, 'destroy'])->name('delete');
        });
    });

    // PL Reference
    Route::prefix('pl-ref')->name('api.pl-ref.')->group(function () {
        Route::patch('/master/bulk-update',  [PlPackageMasterController::class, 'bulkUpdate'])->name('master.bulkUpdate');
        Route::delete('/master/mass-delete', [PlPackageMasterController::class, 'massDelete'])->name('master.massDelete');
        Route::patch('/rules/bulk-update',   [PlRuleController::class, 'bulkUpdate'])->name('rules.bulkUpdate');
        Route::delete('/rules/mass-delete',  [PlRuleController::class, 'massDelete'])->name('rules.massDelete');
    });

    // F3 WIP-Out
    Route::prefix('f3-wip-out')->name('api.f3.')->group(function () {
        Route::middleware(ApiPermissionMiddleware::class . ':f3_mutate')->group(function () {
            Route::patch('/', [F3Controller::class, 'bulkUpdate'])->name('bulkUpdate');
        });
    });

    // Machines
    Route::prefix('machines')->name('api.machines.')->group(function () {
        Route::middleware(ApiPermissionMiddleware::class . ':machine_mutate')->group(function () {
            Route::patch('/',             [MachineController::class, 'bulkUpdate'])->name('bulkUpdate');
            Route::delete('/mass-delete', [MachineController::class, 'massGenocide'])->name('massGenocide');
        });
    });

    // Body Sizes
    Route::prefix('body-sizes')->name('api.body-sizes.')->group(function () {
        Route::middleware(ApiPermissionMiddleware::class . ':body_size_mutate')->group(function () {
            Route::patch('/',             [BodySizeController::class, 'bulkUpdate'])->name('bulkUpdate');
            Route::delete('/mass-delete', [BodySizeController::class, 'massGenocide'])->name('massGenocide');
        });
        Route::prefix('/capacity')->name('capacity.')->group(function () {
            Route::middleware(ApiPermissionMiddleware::class . ':body_size_capacity_mutate')->group(function () {
                Route::patch('/bulkUpsert', [PackageBodySizeCapacityController::class, 'bulkUpsert'])->name('bulkUpsert');
            });
        });
    });

    // F3 Package Names
    Route::prefix('f3-package-names')->name('api.f3.package.names.')->group(function () {
        Route::get('/', [F3PackageNamesController::class, 'getAll'])->name('getAll');
        Route::middleware(ApiPermissionMiddleware::class . ':f3_package_mutate')->group(function () {
            Route::post('/',       [F3PackageNamesController::class, 'store'])->name('store');
            Route::patch('/{id}',  [F3PackageNamesController::class, 'update'])->name('update');
            Route::delete('/{id}', [F3PackageNamesController::class, 'destroy'])->name('delete');
        });
    });

    // Packages & Groups
    Route::prefix('package')->name('api.package.')->group(function () {
        Route::get('/packages',      [PackageController::class, 'getAllPackages'])->name('all');
        Route::get('/package-groups', [PackageGroupController::class, 'index'])->name('packageGroups');
        Route::middleware(ApiPermissionMiddleware::class . ':package_group_mutate')->group(function () {
            Route::post('/',       [PackageGroupController::class, 'saveGroup'])->name('store');
            Route::patch('/{id}',  [PackageGroupController::class, 'saveGroup'])->name('update');
            Route::delete('/{id}', [PackageGroupController::class, 'destroy'])->name('delete');
        });
    });

    // Import Trace
    Route::prefix('import-trace')->name('api.import.trace.')->group(function () {
        Route::get('/imports',       [ImportTraceController::class, 'getAllLatestImports'])->name('getAllLatestImports');
        Route::get('/imports/{type}', [ImportTraceController::class, 'getImport'])->name('getImport');
        Route::post('/imports/{type}', [ImportTraceController::class, 'upsertImport'])->name('upsertImport');
    });

    // Analog Calendar
    Route::prefix('analog-calendar')->name('api.analog.calendar.')->group(function () {
        Route::get('/analog-calendar', [AnalogCalendarController::class, 'getWorkWeek'])->name('workweek');
    });

    // Package Capacity
    Route::prefix('package-capacity')->name('api.package.capacity')->group(function () {
        Route::get('/get-trend', [PackageCapacityController::class, 'getTrend'])->name('getTrend');
        Route::middleware(ApiPermissionMiddleware::class . ':capacity_upload')->group(function () {
            Route::get('/insert',    [PackageCapacityController::class, 'storeCapacity'])->name('insert');
            Route::patch('/{id}/edit', [PackageCapacityController::class, 'updateCapacity'])->name('update');
        });
    });

    // Data Import
    Route::prefix('import')->name('import.')
        ->middleware(ApiPermissionMiddleware::class . ':import_data_all')
        ->group(function () {
            Route::post('/ftpRootImportWIP',  [AutoImportController::class, 'ftpRootImportWIP'])->name('ftpRootImportWIP');
            Route::post('/ftpRootImportOUTS', [AutoImportController::class, 'ftpRootImportOUTS'])->name('ftpRootImportOUTS');
            Route::post('/manualImportWIP',   [AutoImportController::class, 'manualImportWIP'])->name('manualImportWIP');
            Route::post('/manualImportOUTS',  [AutoImportController::class, 'manualImportOUTS'])->name('manualImportOUTS');
            Route::post('/importF3',          [AutoImportController::class, 'importF3'])->name('importF3');
            Route::post('/importPickUp',      [AutoImportController::class, 'importPickUp'])->name('importPickUp');
            Route::post('/importF3PickUp',    [AutoImportController::class, 'importF3PickUp'])->name('importF3PickUp');
            Route::post('/capacity',          [AutoImportController::class, 'importCapacity'])->name('capacity');
        });

    // Downloads
    Route::prefix('download')->name('api.download.')->group(function () {
        Route::get('/factoryWipOutTrendRaw',    [WipController::class,    'getWipOutTrendRawData'])->name('factoryWipOutTrendRaw');
        Route::get('/factoryPickUpTrendRaw',    [PickupController::class,  'getPickUpTrendRawData'])->name('factoryPickUpTrendRaw');
        Route::get('/downloadCapacityTemplate', [WipController::class,    'downloadCapacityTemplate'])->name('downloadCapacityTemplate');
        Route::get('/downloadPickUpTemplate',   [PickupController::class,  'downloadPickUpTemplate'])->name('downloadPickUpTemplate');
        Route::get('/downloadF3PickUpTemplate', [PickupController::class,  'downloadF3PickUpTemplate'])->name('downloadF3PickUpTemplate');
    });
});

/*
|--------------------------------------------------------------------------
| Inertia Page Routes
|--------------------------------------------------------------------------
*/

// Dashboards
Route::get('/',                  [DashboardController::class, 'index'])->name('dashboard');
Route::get('/wip-trend',         [DashboardController::class, 'wipDashboardIndex'])->name('wip.trend');
Route::get('/out-trend',         [DashboardController::class, 'outDashboardIndex'])->name('out.trend');
Route::get('/pickup-dashboard',  [DashboardController::class, 'pickupDashboardIndex'])->name('pickup.dashboard');
Route::get('/residual-dashboard', [DashboardController::class, 'residualDashboardIndex'])->name('residual.dashboard');
Route::get('/wip-station',       [WipController::class, 'wipStation'])->name('wipTable');
Route::get('/body-size',         [WipController::class, 'bodySize'])->name('bodySize');
Route::get('/pickup-list',       [PickupController::class, 'index'])->name('pickup.index');

// Profile
Route::get('/profile',          [ProfileController::class, 'index'])->name('profile.index');
Route::post('/change-password', [ProfileController::class, 'changePassword'])->name('changePassword');

// Admin
Route::get('/admin',             [AdminController::class, 'index'])->name('admin');
Route::get('/new-admin',         [AdminController::class, 'index_addAdmin'])->name('index_addAdmin');
Route::post('/add-admin',        [AdminController::class, 'addAdmin'])->name('addAdmin');
Route::post('/remove-admin',     [AdminController::class, 'removeAdmin'])->name('removeAdmin');
Route::patch('/change-admin-role', [AdminController::class, 'changeAdminRole'])->name('changeAdminRole');

// Part Names
Route::prefix('partname')->name('partname.')->group(function () {
    Route::get('/',            [PartNameController::class, 'index'])->name('index');
    Route::get('/create',      [PartNameController::class, 'upsert'])->name('create');
    Route::get('/create-many', [PartNameController::class, 'insertMany'])->name('createMany');
    Route::post('/create-many', [PartNameController::class, 'insertMany'])->name('createManyPrefill');
    Route::get('/{id}/edit',   [PartNameController::class, 'upsert'])->name('edit');
});

// Package Groups
Route::prefix('package')->name('package.')->group(function () {
    Route::prefix('group')->name('group.')->group(function () {
        Route::get('/',          [PackageGroupController::class, 'index'])->name('index');
        Route::get('/create',    [PackageGroupController::class, 'upsert'])->name('create');
        Route::get('/{id}/edit', [PackageGroupController::class, 'upsert'])->name('edit');
    });
});

// PL Reference
Route::prefix('pl-ref')->name('pl-ref.')->group(function () {
    Route::get('/master', [PlPackageMasterController::class, 'index'])->name('master.index');
    Route::get('/rules',  [PlRuleController::class, 'index'])->name('rules.index');
});

// F3
Route::prefix('f3')->name('f3.')->group(function () {
    Route::prefix('package')->name('package.')->group(function () {
        Route::get('/',          [F3PackageNamesController::class, 'index'])->name('index');
        Route::get('/create',    [F3PackageNamesController::class, 'upsert'])->name('create');
        Route::get('/{id}/edit', [F3PackageNamesController::class, 'upsert'])->name('edit');
    });
    Route::prefix('raw-package')->name('raw.package.')->group(function () {
        Route::get('/',            [F3RawPackageController::class, 'index'])->name('index');
        Route::get('/create',      [F3RawPackageController::class, 'upsert'])->name('create');
        Route::get('/create-many', [F3RawPackageController::class, 'insertMany'])->name('createMany');
        Route::post('/create-many', [F3RawPackageController::class, 'insertMany'])->name('createManyPrefill');
        Route::get('/{id}/edit',   [F3RawPackageController::class, 'upsert'])->name('edit');
    });
});

// F3 WIP-Out List (Inertia page)
Route::prefix('f3-wip-out')->name('f3.')->group(function () {
    Route::prefix('list')->name('list.')->group(function () {
        Route::get('/', [F3Controller::class, 'index'])->name('index');
    });
});

// Package Body Size Capacity
Route::prefix('package-body-size-capacity')->name('package.body_size.capacity.')->group(function () {
    Route::get('/',          [PackageBodySizeCapacityController::class, 'index'])->name('index');
    Route::get('/body-sizes', [BodySizeController::class, 'index'])->name('body-sizes');
    Route::get('/machines',  [MachineController::class, 'index'])->name('machines');
});

// Package Capacity
Route::prefix('package-capacity')->name('package.capacity.')->group(function () {
    Route::get('/',       [PackageCapacityController::class, 'getSummaryLatestAndPrevious'])->name('index');
    Route::get('/upload', [PackageCapacityController::class, 'upload'])->name('upload.index');
});

// Import Pages
Route::prefix('import')->name('import.')->group(function () {
    Route::get('/f1f2',      [AutoImportController::class, 'renderF1F2ImportPage'])->name('index');
    Route::get('/f3',        [AutoImportController::class, 'renderF3ImportPage'])->name('f3.index');
    Route::get('/pickup',    [AutoImportController::class, 'renderPickUpImportPage'])->name('pickup.index');
    Route::get('/f3-pickup', [AutoImportController::class, 'renderF3PickUpImportPage'])->name('f3.pickup.index');
});

Route::fallback(fn() => Inertia::render('404'))->name('404');
