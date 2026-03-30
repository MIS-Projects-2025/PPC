<?php

namespace App\Services;

use App\Repositories\AnalogCalendarRepository;
use App\Repositories\PickUpRepository;
use App\Services\PackageCapacityService;
use App\Constants\WipConstants;
use App\Traits\ApplyDateOrWorkWeekFilter;
use App\Traits\BusinessShiftOffset;
use App\Traits\NormalizeStringTrait;
use App\Traits\ExportTrait;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Traits\TrendAggregationTrait;
use Carbon\Carbon;

class PickupService
{
  use TrendAggregationTrait;
  use NormalizeStringTrait;
  use ExportTrait;
  use ApplyDateOrWorkWeekFilter;
  use BusinessShiftOffset;
  protected $analogCalendarRepo;
  protected $capacityRepo;
  protected $pickUpRepo;

  public function __construct(
    AnalogCalendarRepository $analogCalendarRepo,
    PickUpRepository $pickUpRepo,
    PackageCapacityService $packageCapacityService,
  ) {
    $this->analogCalendarRepo = $analogCalendarRepo;
    $this->pickUpRepo = $pickUpRepo;
    $this->capacityRepo = $packageCapacityService;
  }

  public function getOverallPickUp($startDate, $endDate)
  {
    $endDate = Carbon::parse($endDate)->addDay()->startOfDay();

    $plTotals = [];
    foreach (WipConstants::FACTORIES as $factory) {
      foreach (WipConstants::PRODUCTION_LINES as $pl) {
        $key = strtolower($factory) . strtolower($pl);
        $plTotals[$key] = (int) $this->pickUpRepo->getFactoryPlTotalQuantity($factory, $pl, $startDate, $endDate);
      }
    }

    $f1_total = $plTotals['f1pl1'] + $plTotals['f1pl6'];
    $f2_total = $plTotals['f2pl1'] + $plTotals['f2pl6'];
    $f3_total = $plTotals['f3pl1'] + $plTotals['f3pl6'];
    $pl1_total = $plTotals['f1pl1'] + $plTotals['f2pl1'] + $plTotals['f3pl1'];
    $pl6_total = $plTotals['f1pl6'] + $plTotals['f2pl6'] + $plTotals['f3pl6'];

    return response()->json([
      'total_wip'    => $f1_total + $f2_total + $f3_total,
      'f1_total_wip' => $f1_total,
      'f2_total_wip' => $f2_total,
      'f3_total_wip' => $f3_total,
      'total_f1_pl1' => $plTotals['f1pl1'],
      'total_f1_pl6' => $plTotals['f1pl6'],
      'total_f2_pl1' => $plTotals['f2pl1'],
      'total_f2_pl6' => $plTotals['f2pl6'],
      'total_f3_pl1' => $plTotals['f3pl1'],
      'total_f3_pl6' => $plTotals['f3pl6'],
      'total_pl1'    => $pl1_total,
      'total_pl6'    => $pl6_total,
      'status'       => 'success',
      'message'      => 'Data retrieved successfully',
    ]);
  }

  public function getPackagePickUpTrend($packageName, $period, $startDate, $endDate, $workweeks)
  {
    $endDate   = Carbon::parse($endDate)->addDay()->startOfDay();
    return $this->pickUpRepo->getPickUpTrend($packageName, $period, $startDate, $endDate, $workweeks);
  }

  public function downloadPickUpRawXlsx($packageName, $startDate, $endDate)
  {
    [$startDate, $endDate] = $this->translateToBusinessRange($startDate, $endDate);
    $sheets = [
      'F1 PickUp' => fn() => $this->pickUpRepo
        ->getBaseTrend('F1', $packageName, null, $startDate, $endDate, null, false)
        ->cursor(),

      'F2 PickUp' => fn() => $this->pickUpRepo
        ->getBaseTrend('F2', $packageName, null, $startDate, $endDate, null, false)
        ->cursor(),

      'F3 PickUp' => fn() => $this->pickUpRepo
        ->getBaseTrend('F3', $packageName, null, $startDate, $endDate, null, false)
        ->cursor(),
    ];

    return $this->downloadRawXlsx($sheets, 'pickup_trends');
  }

  public function getPackagePickUpSummary($chartStatus, $startDate, $endDate)
  {
    $results = $this->pickUpRepo->getPackageSummary($chartStatus, $startDate, $endDate);
    Log::info("startDate", $startDate);
    Log::info("endDate", $endDate);
    return response()->json([
      'data' => $results,
      'status' => 'success',
      'message' => 'Data retrieved successfully'
    ]);
  }
}
