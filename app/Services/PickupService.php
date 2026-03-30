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
    [$startDate, $endDate] = $this->translateToBusinessRange($startDate, $endDate);

    $result = new \stdClass();

    $result->total_wip = $this->pickUpRepo->getTotalQuantity($startDate, $endDate);

    foreach (WipConstants::FACTORIES as $factory) {
      $key = strtolower($factory) . '_total_wip';
      $result->{$key} = $this->pickUpRepo->getFactoryTotalQuantityRanged($factory, $startDate, $endDate);
    }

    foreach (WipConstants::FACTORIES as $factory) {
      foreach (WipConstants::PRODUCTION_LINES as $pl) {
        $key = strtolower($factory) . strtolower(string: $pl) . '_total_wip';
        $result->{$key} = $this->pickUpRepo->getFactoryPlTotalQuantity($factory, $pl, $startDate, $endDate);
      }
    }

    $pl1_total_wip = (int) $result->f1pl1_total_wip + (int) $result->f2pl1_total_wip + (int) $result->f3pl1_total_wip;
    $pl6_total_wip = (int) $result->f1pl6_total_wip + (int) $result->f2pl6_total_wip + (int) $result->f3pl6_total_wip;

    return response()->json([
      'total_wip'    => (int) $result->f1_total_wip + (int) $result->f2_total_wip + (int) $result->f3_total_wip,
      'f1_total_wip' => (int) $result->f1_total_wip,
      'f2_total_wip' => (int) $result->f2_total_wip,
      'f3_total_wip' => (int) $result->f3_total_wip,
      'total_f1_pl1'      => (int) $result->f1pl1_total_wip,
      'total_f1_pl6'      => (int) $result->f1pl6_total_wip,
      'total_f2_pl1'      => (int) $result->f2pl1_total_wip,
      'total_f2_pl6'      => (int) $result->f2pl6_total_wip,
      'total_f3_pl1'      => (int) $result->f3pl1_total_wip,
      'total_f3_pl6'      => (int) $result->f3pl6_total_wip,
      'total_pl1'         => $pl1_total_wip,
      'total_pl6'         => $pl6_total_wip,
      'status'            => 'success',
      'message'           => 'Data retrieved successfully',
    ]);
  }

  public function getPackagePickUpTrend($packageName, $period, $startDate, $endDate, $workweeks)
  {
    [$startDate, $endDate] = $this->translateToBusinessRange($startDate, $endDate);
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
    // [$startDate, $endDate] = $this->translateToBusinessRange($startDate, $endDate);
    $results = $this->pickUpRepo->getPackageSummary($chartStatus, $startDate, $endDate);

    return response()->json([
      'data' => $results,
      'status' => 'success',
      'message' => 'Data retrieved successfully'
    ]);
  }
}
