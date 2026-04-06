<?php

namespace App\Http\Controllers;

use App\Constants\WipConstants;
use App\Repositories\PackageGroupRepository;
use App\Traits\ParseDateTrait;
use App\Traits\ParseRequestTrait;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Services\WipService;
use App\Repositories\F1F2WipRepository;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;
use Illuminate\Support\Facades\Storage;

class WipController extends Controller
{
  use ParseRequestTrait;

  protected $wipService;
  protected $f1f2WipRepo;
  protected $packageGroupRepo;

  public function __construct(
    WipService $wipService,
    F1F2WipRepository $f2f2WipRepo,
    PackageGroupRepository $packageGroupRepo
  ) {
    $this->packageGroupRepo = $packageGroupRepo;
    $this->wipService = $wipService;
    $this->f1f2WipRepo = $f2f2WipRepo;
  }

  private function validateChartStatus(string $status): bool
  {
    return in_array($status, WipConstants::SUMMARY_CATEGORY_FILTER);
  }

  // ------------------------
  // API Methods
  // ------------------------
  public function getDistinctPackages()
  {
    // TODO: use a separate table, perhaps use the excel file from PPC portal at 'downloads' folder

    $packages = $this->wipService->getAllPackages();
    return response()->json([
      'data' => $packages,
      // 'data' => WipConstants::DISTINCT_PACKAGES,
      // 'data' => ["TSSOP (240 mils)", "150 mils"],
      'status' => 'success',
      'message' => 'Data retrieved successfully',
    ]);
  }

  public function getWIPStationTrend(Request $request)
  {
    $filteringCondition = trim($request->input('filteringCondition', '') ?? '');
    $packageName = $this->parsePackageName($request);
    $periodParams = $this->parsePeriodParams($request);
    $workweekParams = $this->parseWorkweek($request);

    return $this->wipService->getWIPStationSummaryTrend(
      $packageName,
      $periodParams['period'],
      $periodParams['startDate'],
      $periodParams['endDate'],
      $workweekParams['workweek'],
      $filteringCondition
    );
  }

  public function getTodayWip()
  {
    return $this->wipService->getTodayWip();
  }

  public function getOverallWip(Request $request)
  {
    $workweekParams = $this->parseWorkweek($request);
    $dates = $this->parseDateRangeFromRequest($request);

    // return response()->json([
    //   'status' => 'error',
    //   'message' => 'Invalid chart status: ',
    // ], 400);

    return $this->wipService->getOverallWip(
      $dates['start'],
      $dates['end'],
      $workweekParams['useWorkweek'],
      $workweekParams['workweek']
    );
  }

  public function getOverallOuts(Request $request)
  {
    $workweekParams = $this->parseWorkweek($request);
    $dates = $this->parseDateRangeFromRequest($request);

    return $this->wipService->getOverallOuts(
      $dates['start'],
      $dates['end'],
      $workweekParams['useWorkweek'],
      $workweekParams['workweek']
    );
  }

  public function getOverallOutByPackage(Request $request)
  {
    $workweekParams = $this->parseWorkweek($request);
    $packageName = $this->parsePackageName($request);
    $periodParams = $this->parsePeriodParams($request, 3);
    $dates = $this->parseDateRangeFromRequest($request);
    return $this->wipService->getAllOutTrendByPackage(
      $workweekParams['workweek'],
      $packageName,
      $periodParams['period'],
      $periodParams['startDate'],
      $periodParams['endDate']
    );
  }

  public function getOverallWipByPackage(Request $request)
  {
    $workweekParams = $this->parseWorkweek($request);
    $packageName = $this->parsePackageName($request);
    $periodParams = $this->parsePeriodParams($request, 3);
    $dates = $this->parseDateRangeFromRequest($request);
    return $this->wipService->getAllWipTrendByPackage(
      $workweekParams['workweek'],
      $packageName,
      $periodParams['period'],
      $periodParams['startDate'],
      $periodParams['endDate']
    );
  }

  public function getOverallResidual(Request $request)
  {
    $dates = $this->parseDateRangeFromRequest($request);
    return $this->wipService->getOverallResidual($dates['start'], $dates['end']);
  }

  public function getPackageResidualSummary(Request $request)
  {
    $dates = $this->parseDateRangeFromRequest($request);
    $chartStatus = $request->input('chartStatus', 'all') ?? 'all';

    if (!$this->validateChartStatus($chartStatus)) {
      return response()->json([
        'status' => 'error',
        'message' => 'Invalid chart status: ' . $chartStatus,
      ], 400);
    }

    return $this->wipService->getPackageResidualSummary($chartStatus, $dates['start'], $dates['end']);
  }

  public function getOUTQuantityAndLotsTotal(Request $request)
  {
    $workweekParams = $this->parseWorkweek($request);
    $dates = $this->parseDateRangeFromRequest($request);
    $includePL = $request->input('includePL', true) ?? true;

    return $this->wipService->getOUTQuantityAndLotsTotal(
      $workweekParams['useWorkweek'],
      $workweekParams['workweek'],
      $dates['start'],
      $dates['end'],
      $includePL
    );
  }

  public function getWIPQuantityAndLotsTotal(Request $request)
  {
    $workweekParams = $this->parseWorkweek($request);
    $dates = $this->parseDateRangeFromRequest($request);
    $includePL = $request->input('includePL', true) ?? true;

    return $this->wipService->getWIPQuantityAndLotsTotal(
      $workweekParams['useWorkweek'],
      $workweekParams['workweek'],
      $dates['start'],
      $dates['end'],
      $includePL
    );
  }

  public function getWipAndLotsByBodySize(Request $request)
  {
    $packageName = $this->parsePackageName($request);
    $periodParams = $this->parsePeriodParams($request);
    $workweekParams = $this->parseWorkweek($request);
    $dates = $this->parseDateRangeFromRequest($request);
    // $includePL = $request->input('includePL', true) ?? true;
    Log::info("workweekParams: " . json_encode($workweekParams));
    return $this->wipService->getWipAndLotsByBodySize(
      $packageName,
      $periodParams['startDate'],
      $periodParams['endDate'],
      $workweekParams['useWorkweek'],
      $workweekParams['workweek'],
    );
  }

  public function getWipAndLotsByBodySizeTrend(Request $request)
  {
    $packageName = $this->parsePackageName($request);
    $periodParams = $this->parsePeriodParams($request);
    $workweekParams = $this->parseWorkweek($request);
    return $this->wipService->getWipAndLotsByBodySizeTrend(
      $packageName,
      $periodParams['period'],
      $periodParams['startDate'],
      $periodParams['endDate'],
      $workweekParams['useWorkweek'],
      $workweekParams['workweek'],
    );
  }

  public function getWipOutCapacitySummaryTrend(Request $request)
  {

    $packageName = $this->parsePackageName($request);
    $periodParams = $this->parsePeriodParams($request);
    $workweeks = $this->parseWorkweek($request);

    return $this->wipService->getWipOutCapacitySummaryTrend(
      $packageName,
      $periodParams['period'],
      $periodParams['startDate'],
      $periodParams['endDate'],
      $workweeks['workweek']
    );
  }

  public function getWipOutTrendRawData(Request $request)
  {

    $packageName = $this->parsePackageName($request);
    $periodParams = $this->parsePeriodParams($request);
    return $this->wipService->downloadAllFactoriesRawXlsx(
      $packageName,
      $periodParams['startDate'],
      $periodParams['endDate'],
    );
  }


  public function downloadCapacityTemplate()
  {
    $relativePath = 'excels/TSPI_Capacity.xlsx';

    if (!Storage::disk('public')->exists($relativePath)) {
      return response()->json(['error' => 'Template file not found.'], 404);
    }

    $filename = "tspi_capacity_template_" . now()->format('Ymd_His_u') . ".xlsx";

    if (ob_get_level()) {
      ob_end_clean();
    }

    return response()->download(Storage::disk('public')->path($relativePath), $filename);
  }

  public function wipStation()
  {
    return Inertia::render('WIPStation');
  }

  public function bodySize()
  {
    return Inertia::render('BodySize');
  }
}
