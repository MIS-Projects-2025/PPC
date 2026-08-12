<?php

namespace App\Services;

use App\Models\F3;
use App\Models\CustomerDataWip;
use App\Repositories\AnalogCalendarRepository;
use App\Repositories\F1F2WipRepository;
use App\Repositories\F1F2OutRepository;
use App\Repositories\F3WipRepository;
use App\Repositories\F3OutRepository;
use App\Repositories\PickUpRepository;
use App\Services\PackageCapacityService;
use App\Helpers\SqlDebugHelper;
use App\Helpers\WipTrendParser;
use App\Helpers\MergeAndAggregate;
use App\Constants\WipConstants;
use App\Traits\AlignByKeyTrait;
use App\Traits\ApplyDateOrWorkWeekFilter;
use App\Traits\NormalizeStringTrait;
use App\Traits\ExportTrait;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use App\Traits\TrendAggregationTrait;
use App\Repositories\PackageGroupRepository;
use App\Repositories\F3PackageNamesRepository;

class WipService
{
  use TrendAggregationTrait;
  use NormalizeStringTrait;
  use ExportTrait;
  use ApplyDateOrWorkWeekFilter;
  use AlignByKeyTrait;

  protected $analogCalendarRepo;
  protected $capacityRepo;
  protected $f1f2WipRepo;
  protected $f1f2OutRepo;
  protected $f3WipRepo;
  protected $f3OutRepo;
  protected $pickUpRepo;

  protected $packageGroupRepo;

  protected $f3packageNamesRepo;
  private const F1F2_TABLE = "customer_data_wip";
  private const F1F2_OUT_TABLE = "customer_data_wip";
  public function __construct(
    AnalogCalendarRepository $analogCalendarRepo,
    F1F2WipRepository $f1f2WipRepo,
    F1F2OutRepository $f1f2WipOutRepo,
    F3WipRepository $f3WipRepo,
    F3OutRepository $f3OutRepo,
    PickUpRepository $pickUpRepo,
    PackageCapacityService $packageCapacityService,
    PackageGroupRepository $packageGroupRepo,
    F3PackageNamesRepository $f3PackageNamesRepo
  ) {
    $this->analogCalendarRepo = $analogCalendarRepo;
    $this->f1f2WipRepo = $f1f2WipRepo;
    $this->f1f2OutRepo = $f1f2WipOutRepo;
    $this->f3WipRepo = $f3WipRepo;
    $this->f3OutRepo = $f3OutRepo;
    $this->pickUpRepo = $pickUpRepo;
    $this->capacityRepo = $packageCapacityService;
    $this->packageGroupRepo = $packageGroupRepo;
    $this->f3packageNamesRepo = $f3PackageNamesRepo;
  }

  public function getTodayWip()
  {
    $endDate   = Carbon::now()->endOfDay();
    $startDate = Carbon::now()->subDays(25)->startOfDay();

    /*
  |--------------------------------------------------------------------------
  | F3
  |--------------------------------------------------------------------------
  */
    $f3DataRaw = $this->f3WipRepo->baseF3Query(false)
      ->selectRaw('DATE(date_loaded) AS report_date, SUM(f3.qty) AS f3')
      ->where('date_loaded', '>=', $startDate)
      ->where('date_loaded', '<',  $endDate)
      ->groupBy(DB::raw('DATE(date_loaded)'))
      ->get();

    $f3ByDate = [];
    foreach ($f3DataRaw as $row) {
      $f3ByDate[$row->report_date] = (int) $row->f3;
    }

    /*
  |--------------------------------------------------------------------------
  | F1
  |--------------------------------------------------------------------------
  */
    $f1Query = DB::table(self::F1F2_TABLE . ' as wip')
      ->selectRaw('DATE(wip.Date_Loaded) AS report_date, SUM(wip.Qty) AS f1_wip')
      ->whereNotIn('wip.Focus_Group', ['DLT', 'WLT', 'SOF'])
      ->where('wip.Date_Loaded', '>=', $startDate)
      ->where('wip.Date_Loaded', '<',  $endDate);

    $f1Data = $this->f1f2WipRepo->f1Filters(
      $f1Query,
      WipConstants::TODAY_WIP_INCLUDED_STATIONS,
      WipConstants::TODAY_WIP_EXCLUDED_STATIONS,
    )
      ->groupBy(DB::raw('DATE(wip.Date_Loaded)'));

    /*
  |--------------------------------------------------------------------------
  | F2
  |--------------------------------------------------------------------------
  */
    $f2Query = DB::table(self::F1F2_TABLE . ' as wip')
      ->selectRaw('DATE(wip.Date_Loaded) AS report_date, SUM(wip.Qty) AS f2_wip')
      ->where('wip.Date_Loaded', '>=', $startDate)
      ->where('wip.Date_Loaded', '<',  $endDate);

    $f2Data = $this->f1f2WipRepo->applyF2Filters(
      $f2Query,
      [...WipConstants::EWAN_PROCESS, 'Q-PITRANS1', 'GTTRANS_BE'],
      'wip'
    )
      ->groupBy(DB::raw('DATE(wip.Date_Loaded)'));

    /*
  |--------------------------------------------------------------------------
  | FULL OUTER JOIN (F1 + F2)
  |--------------------------------------------------------------------------
  */
    $f1f2Left = DB::query()
      ->fromSub($f1Data, 'f1')
      ->leftJoinSub($f2Data, 'f2', function ($join) {
        $join->on('f1.report_date', '=', 'f2.report_date');
      })
      ->selectRaw('
      f1.report_date as report_date,
      f1.f1_wip,
      COALESCE(f2.f2_wip, 0) as f2_wip
    ');

    $f1f2Right = DB::query()
      ->fromSub($f2Data, 'f2')
      ->leftJoinSub($f1Data, 'f1', function ($join) {
        $join->on('f1.report_date', '=', 'f2.report_date');
      })
      ->whereNull('f1.report_date')
      ->selectRaw('
      f2.report_date as report_date,
      0 as f1_wip,
      f2.f2_wip
    ');

    $f1f2Rows = $f1f2Left
      ->unionAll($f1f2Right)
      ->get();

    /*
  |--------------------------------------------------------------------------
  | INDEX F1 + F2 BY DATE
  |--------------------------------------------------------------------------
  */
    $f1f2ByDate = [];
    foreach ($f1f2Rows as $row) {
      $f1f2ByDate[$row->report_date] = [
        'f1' => (int) $row->f1_wip,
        'f2' => (int) $row->f2_wip,
      ];
    }

    /*
  |--------------------------------------------------------------------------
  | GAPLESS CALENDAR MERGE (F1 + F2 + F3)
  |--------------------------------------------------------------------------
  */
    $data = [];
    $cursor = $startDate->copy();

    while ($cursor->lte($endDate)) {
      $date = $cursor->toDateString();

      $f1 = $f1f2ByDate[$date]['f1'] ?? 0;
      $f2 = $f1f2ByDate[$date]['f2'] ?? 0;
      $f3 = $f3ByDate[$date] ?? 0;

      $data[] = [
        'date'  => $date,
        'total' => $f1 + $f2 + $f3,
        'f1'    => $f1,
        'f2'    => $f2,
        'f3'    => $f3,
      ];

      $cursor->addDay();
    }

    return response()->json($data);
  }


  public function getOverallOuts($startDate, $endDate, $useWorkweek, $workweek)
  {
    $startAddOneDay = Carbon::parse($startDate)->addDay()->format('Y-m-d H:i:s');
    $endAddOneDay = Carbon::parse($endDate)->addDay()->format('Y-m-d H:i:s');

    $f1_total_out = $this->f1f2OutRepo->overallQty('F1', null, $useWorkweek, $workweek, $startAddOneDay, $endAddOneDay);
    $f2_total_out = $this->f1f2OutRepo->overallQty('F2', null, $useWorkweek, $workweek, $startAddOneDay, $endAddOneDay);
    $f3_total_out = $this->f3OutRepo->overallQty(null, $useWorkweek, $workweek, $startAddOneDay, $endAddOneDay);

    $total_f1_pl1 = $this->f1f2OutRepo->overallQty('F1', 'PL1', $useWorkweek, $workweek, $startAddOneDay, $endAddOneDay);
    $total_f1_pl6 = $this->f1f2OutRepo->overallQty('F1', 'PL6', $useWorkweek, $workweek, $startAddOneDay, $endAddOneDay);
    $total_f2_pl1 = $this->f1f2OutRepo->overallQty('F2', 'PL1', $useWorkweek, $workweek, $startAddOneDay, $endAddOneDay);
    $total_f2_pl6 = $this->f1f2OutRepo->overallQty('F2', 'PL6', $useWorkweek, $workweek, $startAddOneDay, $endAddOneDay);

    $total_f3_pl1 = $this->f3OutRepo->overallQty('PL1', $useWorkweek, $workweek, $startAddOneDay, $endAddOneDay);
    $total_f3_pl6 = $this->f3OutRepo->overallQty('PL6', $useWorkweek, $workweek, $startAddOneDay, $endAddOneDay);

    return response()->json([
      'f1_total_out' => $f1_total_out,
      'f2_total_out' => $f2_total_out,
      'f3_total_out' => $f3_total_out,
      'total_f1_pl1' => $total_f1_pl1,
      'total_f1_pl6' => $total_f1_pl6,
      'total_f2_pl1' => $total_f2_pl1,
      'total_f2_pl6' => $total_f2_pl6,
      'total_f3_pl1' => $total_f3_pl1,
      'total_f3_pl6' => $total_f3_pl6,
      'total_out' => $f1_total_out + $f2_total_out + $f3_total_out,
      'status' => 'success',
      'message' => 'Data retrieved successfully'
    ]);
  }

  public function getOverallWip($startDate, $endDate, $useWorkweek, $workweek)
  {
    $f1Query = DB::table(self::F1F2_TABLE . ' as wip')
      ->selectRaw('SUM(wip.Qty) AS f1_total_wip');
    $f1Query = $this->f1f2WipRepo->f1Filters($f1Query, ['GTREEL'], WipConstants::REEL_EXCLUDED_STATIONS_F1_OVERALL, 'wip');

    $f1Query = $this->applyDateOrWorkweekWipFilter($f1Query, 'wip.Date_Loaded', $useWorkweek, $workweek, $startDate, $endDate);
    $f1QueryResult = $f1Query->first();

    $f2Query = DB::table(self::F1F2_TABLE . ' as wip')
      ->selectRaw('SUM(wip.Qty) AS f2_total_wip');
    $f2Query = $this->f1f2WipRepo->applyF2Filters($f2Query, WipConstants::EXCLUDED_STATIONS_F2, 'wip');

    $f2Query = $this->applyDateOrWorkweekWipFilter($f2Query, 'wip.Date_Loaded', $useWorkweek, $workweek, $startDate, $endDate);
    $f2QueryResult = $f2Query->first();

    $f1pl6Query = DB::table(self::F1F2_TABLE . ' as wip')
      ->selectRaw('SUM(wip.Qty) AS f1pl6_total_wip');
    $f1pl6Query = $this->f1f2WipRepo->f1Filters($f1pl6Query, ['GTREEL'], WipConstants::REEL_EXCLUDED_STATIONS_F1_PL, 'wip');
    $f1pl6Query = $this->f1f2WipRepo->joinPL($f1pl6Query, WipConstants::SPECIAL_PART_NAMES, 'PL6');

    $f1pl6Query = $this->applyDateOrWorkweekWipFilter($f1pl6Query, 'wip.Date_Loaded', $useWorkweek, $workweek, $startDate, $endDate);

    // Log::info("f1pl6Query: ");
    // Log::info(SqlDebugHelper::prettify($f1pl6Query->toSql(), $f1pl6Query->getBindings()));
    $f1pl6QueryResult = $f1pl6Query->first();

    $f1pl1Query = DB::table(self::F1F2_TABLE . ' as wip')
      ->selectRaw('SUM(wip.Qty) AS f1pl1_total_wip');
    $f1pl1Query = $this->f1f2WipRepo->f1Filters($f1pl1Query, ['GTREEL'], WipConstants::REEL_EXCLUDED_STATIONS_F1_PL, 'wip');
    $f1pl1Query = $this->f1f2WipRepo->joinPL($f1pl1Query, WipConstants::SPECIAL_PART_NAMES, 'PL1');

    $f1pl1Query = $this->applyDateOrWorkweekWipFilter($f1pl1Query, 'wip.Date_Loaded', $useWorkweek, $workweek, $startDate, $endDate);
    $f1pl1QueryResult = $f1pl1Query->first();

    $f2pl6Query = DB::table(self::F1F2_TABLE . ' as wip')
      ->selectRaw('SUM(wip.Qty) AS f2pl6_total_wip');
    $f2pl6Query = $this->f1f2WipRepo->applyF2Filters($f2pl6Query, WipConstants::EWAN_PROCESS, 'wip');
    $f2pl6Query = $this->f1f2WipRepo->joinPL($f2pl6Query, WipConstants::SPECIAL_PART_NAMES, 'PL6');

    $f2pl6Query = $this->applyDateOrWorkweekWipFilter($f2pl6Query, 'wip.Date_Loaded', $useWorkweek, $workweek, $startDate, $endDate);
    $f2pl6QueryResult = $f2pl6Query->first();

    $f2pl1Query = DB::table(self::F1F2_TABLE . ' as wip')
      ->selectRaw('SUM(wip.Qty) AS f2pl1_total_wip');
    $f2pl1Query = $this->f1f2WipRepo->applyF2Filters($f2pl1Query, WipConstants::EXCLUDED_STATIONS_F2, 'wip');
    $f2pl1Query = $this->f1f2WipRepo->joinPL($f2pl1Query, WipConstants::SPECIAL_PART_NAMES, 'PL1');

    $f2pl1Query = $this->applyDateOrWorkweekWipFilter($f2pl1Query, 'wip.Date_Loaded', $useWorkweek, $workweek, $startDate, $endDate);
    $f2pl1QueryResult = $f2pl1Query->first();

    $f3Total = $this->f3WipRepo->baseF3Query()
      ->selectRaw("SUM(f3.Qty) AS f3_total_wip");

    $f3Total = $this->applyDateOrWorkweekWipFilter($f3Total, 'f3.date_loaded', $useWorkweek, $workweek, $startDate, $endDate)
      ->first();

    $f3PlTotals = $this->f3WipRepo->baseF3Query(true)
      ->selectRaw("
          SUM(CASE WHEN f3.production_line = 'PL1' THEN f3.Qty ELSE 0 END) AS f3pl1_total_wip,
          SUM(CASE WHEN f3.production_line = 'PL6' THEN f3.Qty ELSE 0 END) AS f3pl6_total_wip
      ");

    $f3PlTotals = $this->applyDateOrWorkweekWipFilter($f3PlTotals, 'f3.date_loaded', $useWorkweek, $workweek, $startDate, $endDate)
      ->first();

    $f3TotalQty = (int) $f3Total->f3_total_wip;

    $f1Total = (int) ($f1QueryResult->f1_total_wip ?? 0);
    $f2Total = (int) ($f2QueryResult->f2_total_wip ?? 0);

    $grandTotal = $f1Total + $f2Total + $f3TotalQty;

    return response()->json([
      'f1_total_wip' => $f1Total,
      'f2_total_wip' => $f2Total,
      'f3_total_wip' => $f3TotalQty,
      'total_f1_pl1' => (int) $f1pl1QueryResult->f1pl1_total_wip,
      'total_f1_pl6' => (int) $f1pl6QueryResult->f1pl6_total_wip,
      'total_f2_pl1' => (int) $f2pl1QueryResult->f2pl1_total_wip,
      'total_f2_pl6' => (int) $f2pl6QueryResult->f2pl6_total_wip,
      'total_f3_pl1' => (int) $f3PlTotals->f3pl1_total_wip,
      'total_f3_pl6' => (int) $f3PlTotals->f3pl6_total_wip,
      'total_wip' => $grandTotal,
      'status' => 'success',
      'message' => 'Data retrieved successfully'
    ]);
  }

  public function getAllOutTrendByPackage($workweeks, $packageName, $period, $startDate, $endDate)
  {
    $startAddOneDay = Carbon::parse($startDate)->addDay()->format('Y-m-d H:i:s');
    $endAddOneDay = Carbon::parse($endDate)->addDay()->format('Y-m-d H:i:s');

    $trends = [];

    $f1f2outTrend = $this->f1f2OutRepo->getOverallTrend($packageName, $period, $startAddOneDay, $endAddOneDay, $workweeks);
    $f1f2out = WipTrendParser::parseTrendsByPeriod($f1f2outTrend);
    $f3outTrend = $this->f3OutRepo->getOverallTrend($packageName, $period, $startAddOneDay, $endAddOneDay, $workweeks);
    $f3out = WipTrendParser::parseTrendsByPeriod($f3outTrend);

    $merged = $this->mergeTrendsByKey('dateKey', ['label'], $trends, $f1f2out, $f3out);

    // Log::info("getAllWipTrendByPackage trends: " . json_encode($trends));
    // $periodGroupBy = WipConstants::PERIOD_GROUP_BY[$period];
    // $trends['overall_trend'] = MergeAndAggregate::mergeAndAggregate([$trends['f1_trend'], $trends['f2_trend'], $trends['f3_trend']], $periodGroupBy);

    // $mergedTrends = WipTrendParser::parseTrendsByPeriod($trends);
    // Log::info("Overall WIP By Package Trend: " . json_encode($mergedTrends));
    return response()->json(array_merge($trends, [
      'data' => $merged,
      'status' => 'success',
      'message' => 'Data retrieved successfully',
    ]));
  }

  public function getAllWipTrendByPackage($workweeks, $packageName, $period, $startDate, $endDate)
  {
    $trends = [];

    $trends["f1_trend"] = $this->f1f2WipRepo->getTrend("F1", $packageName, $period, $startDate, $endDate, workweeks: $workweeks)->get();
    $trends["f2_trend"] = $this->f1f2WipRepo->getTrend("F2", $packageName, $period, $startDate, $endDate, workweeks: $workweeks)->get();
    $trends['f3_trend'] = $this->f3WipRepo->getTrend($packageName, $period, $startDate, $endDate, $workweeks)->get();

    // Log::info("getAllWipTrendByPackage trends: " . json_encode($trends));
    $periodGroupBy = WipConstants::PERIOD_GROUP_BY[$period];
    $trends['overall_trend'] = MergeAndAggregate::mergeAndAggregate([$trends['f1_trend'], $trends['f2_trend'], $trends['f3_trend']], $periodGroupBy);

    $mergedTrends = WipTrendParser::parseTrendsByPeriod($trends);
    // Log::info("Overall WIP By Package Trend: " . json_encode($mergedTrends));
    return response()->json(array_merge($trends, [
      'data' => $mergedTrends,
      'status' => 'success',
      'message' => 'Data retrieved successfully',
    ]));
  }

  public function getOverallResidual($startDate, $endDate)
  {
    // TODO: no f3 residual?

    $result = new \stdClass();

    $fBaseQuery = DB::table(self::F1F2_TABLE . ' as wip')
      // ->whereBetween('wip.Date_Loaded', [$startDate, $endDate])
      ->where('wip.Date_Loaded', ">=", $startDate)
      ->where('wip.Date_Loaded', "<", $endDate)
      ->where('wip.Station', 'GTTRES_T');

    $result->f1_total_wip = (clone $fBaseQuery)
      ->where(fn($q) => $this->f1f2WipRepo->applyF1Filters($q, WipConstants::F1_EXCLUDED_PLANT, 'wip'))
      ->sum('QTY');

    $result->f2_total_wip = (clone $fBaseQuery)
      ->where(fn($q) => $this->f1f2WipRepo->applyF2Filters($q, [], 'wip'))
      ->sum('QTY');

    $result->total_wip = $result->f1_total_wip + $result->f2_total_wip;

    $result->f1pl1_total_wip = $this->f1f2WipRepo->joinPL((clone $fBaseQuery), WipConstants::SPECIAL_PART_NAMES, 'PL1')
      ->where(fn($q) => $this->f1f2WipRepo->applyF1Filters($q, WipConstants::F1_EXCLUDED_PLANT, 'wip'))
      ->sum('Qty');

    $result->f2pl1_total_wip = $this->f1f2WipRepo->joinPL((clone $fBaseQuery), WipConstants::SPECIAL_PART_NAMES, 'PL1')
      ->where(fn($q) => $this->f1f2WipRepo->applyF2Filters($q, [], 'wip'))
      ->sum('Qty');

    $result->f1pl6_total_wip = $this->f1f2WipRepo->joinPL((clone $fBaseQuery), WipConstants::SPECIAL_PART_NAMES, 'PL6')
      ->where(fn($q) => $this->f1f2WipRepo->applyF1Filters($q, WipConstants::F1_EXCLUDED_PLANT, null))
      ->sum('Qty');

    $result->f2pl6_total_wip = $this->f1f2WipRepo->joinPL((clone $fBaseQuery), WipConstants::SPECIAL_PART_NAMES, 'PL6')
      ->where(fn($q) => $this->f1f2WipRepo->applyF2Filters($q, [], 'wip'))
      ->sum('Qty');


    return response()->json([
      'total_wip' => (int) $result->total_wip,
      'f1_total_wip' => (int) $result->f1_total_wip,
      'f2_total_wip' => (int) $result->f2_total_wip,
      'total_f1_pl1' => (int) $result->f1pl1_total_wip,
      'total_f1_pl6' => (int) $result->f1pl6_total_wip,
      'total_f2_pl1' => (int) $result->f2pl1_total_wip,
      'total_f2_pl6' => (int) $result->f2pl6_total_wip,
      'total_pl1' => (int) $result->f1pl1_total_wip + (int) $result->f2pl1_total_wip,
      'total_pl6' => (int) $result->f1pl6_total_wip + (int) $result->f2pl6_total_wip,
      'status' => 'success',
      'message' => 'Data retrieved successfully'
    ]);
  }

  public function getPackageResidualSummary($chartStatus, $startDate, $endDate)
  {
    switch ($chartStatus) {
      case 'all':
        $query = DB::table(self::F1F2_TABLE . ' as wip')
          ->selectRaw('wip.Package_Name AS PACKAGE, SUM(Qty) AS total_wip, COUNT(DISTINCT Lot_Id) AS total_lots')
          ->where('wip.Station', 'GTTRES_T')
          // ->whereBetween('wip.Date_Loaded', [$startDate, $endDate]);
          ->where('wip.Date_Loaded', ">=", $startDate)
          ->where('wip.Date_Loaded', "<", $endDate);

        if ($chartStatus === 'all') {
          $query->where(function ($q) {
            $q->where(function ($sub) {
              $sub->where(fn($q) => $this->f1f2WipRepo->applyF1Filters($q, WipConstants::F1_EXCLUDED_PLANT, 'wip'));
            })
              ->orWhere(function ($sub) {
                $sub->where(fn($q) => $this->f1f2WipRepo->applyF2Filters($q, [], 'wip'));
              });
          });
        }

        $query->groupBy('PACKAGE')
          ->orderByDesc('total_wip');
        break;

      case 'F1':
        $query = DB::table(self::F1F2_TABLE . ' as wip')
          ->selectRaw('wip.Package_Name AS PACKAGE, SUM(Qty) AS total_wip, COUNT(DISTINCT Lot_Id) AS total_lots')
          ->where('wip.Station', 'GTTRES_T')
          // ->whereBetween('wip.Date_Loaded', [$startDate, $endDate]);
          ->where('wip.Date_Loaded', ">=", $startDate)
          ->where('wip.Date_Loaded', "<", $endDate);
        $query->where(fn($q) => $this->f1f2WipRepo->applyF1Filters($q, WipConstants::F1_EXCLUDED_PLANT, 'wip'));

        $query->groupBy('PACKAGE')
          ->orderByDesc('total_wip');
        break;

      case 'F2':
      case 'F3':
      case 'PL1':
      case 'PL6':
        $query = DB::table('ppc_pickupdb')
          ->selectRaw('ppc_pickupdb.PACKAGE AS PACKAGE, SUM(QTY) AS total_wip, COUNT(DISTINCT LOTID) AS total_lots')
          ->join('qdn_db.package_list as partname', 'ppc_pickupdb.PARTNAME', '=', 'partname.devicename')
          // ->whereBetween('ppc_pickupdb.DATE_CREATED', [$startDate, $endDate]);
          ->where('ppc_pickupdb.DATE_CREATED', ">=", $startDate)
          ->where('ppc_pickupdb.DATE_CREATED', "<", $endDate);

        if ($chartStatus === 'F2' || $chartStatus === 'F3') {
          $query->where('partname.Factory', strtoupper($chartStatus));
        } elseif ($chartStatus === 'PL1' || $chartStatus === 'PL6') {
          $query->where('partname.PL', $chartStatus);
        }

        $query->groupBy('PACKAGE')
          ->orderByDesc('total_wip');
        break;

      default:
        $query = DB::table('ppc_pickupdb')
          ->selectRaw('PACKAGE AS PACKAGE, SUM(QTY) AS total_wip, COUNT(DISTINCT LOTID) AS total_lots')
          ->whereDate('DATE_CREATED', now())
          ->groupBy('PACKAGE')
          ->orderByDesc('total_wip');
        break;
    }

    $results = $query->get();

    return response()->json([
      'data' => $results,
      'status' => 'success',
      'message' => 'Data retrieved successfully'
    ]);
  }

  public function getOUTQuantityAndLotsTotal($useWorkweek, $workweek, $startDate = null, $endDate = null, $includePL = true)
  {
    $startAddedOneDay = Carbon::parse($startDate)->addDay()->format('Y-m-d H:i:s');
    $endAddedOneDay = Carbon::parse($endDate)->addDay()->format('Y-m-d H:i:s');

    $f1_total_out = $this->f1f2OutRepo->overallQtyAndLotIdByPackage('f1', null, $useWorkweek, $workweek, $startAddedOneDay, $endAddedOneDay);
    $f2_total_out = $this->f1f2OutRepo->overallQtyAndLotIdByPackage('f2', null, $useWorkweek, $workweek, $startAddedOneDay, $endAddedOneDay);
    $f3_total_out = $this->f3OutRepo->overallQtyAndLotIdByPackage(null, $useWorkweek, $workweek, $startAddedOneDay, $endAddedOneDay);

    $overall = MergeAndAggregate::mergeAndAggregate([$f1_total_out, $f2_total_out, $f3_total_out], ['package']);

    $f1_total_out_pl1 = $this->f1f2OutRepo->overallQtyAndLotIdByPackage('f1', 'PL1', $useWorkweek, $workweek, $startAddedOneDay, $endAddedOneDay);
    $f2_total_out_pl1 = $this->f1f2OutRepo->overallQtyAndLotIdByPackage('f2', 'PL1', $useWorkweek, $workweek, $startAddedOneDay, $endAddedOneDay);
    $f3_total_out_pl1 = $this->f3OutRepo->overallQtyAndLotIdByPackage('PL1', $useWorkweek, $workweek, $startAddedOneDay, $endAddedOneDay);

    $overall_pl1 = MergeAndAggregate::mergeAndAggregate([$f1_total_out_pl1, $f2_total_out_pl1, $f3_total_out_pl1], ['package']);

    $f1_total_out_pl6 = $this->f1f2OutRepo->overallQtyAndLotIdByPackage('f1', 'PL6', $useWorkweek, $workweek, $startAddedOneDay, $endAddedOneDay);
    $f2_total_out_pl6 = $this->f1f2OutRepo->overallQtyAndLotIdByPackage('f2', 'PL6', $useWorkweek, $workweek, $startAddedOneDay, $endAddedOneDay);
    $f3_total_out_pl6 = $this->f3OutRepo->overallQtyAndLotIdByPackage('PL6', $useWorkweek, $workweek, $startAddedOneDay, $endAddedOneDay);
    $overall_pl6 = MergeAndAggregate::mergeAndAggregate([$f1_total_out_pl6, $f2_total_out_pl6, $f3_total_out_pl6], ['package']);

    return response()->json([
      'status' => 'success',
      'message' => 'Highly optimized data retrieved successfully',
      'data' => [
        'F1' => $f1_total_out,
        'F2' => $f2_total_out,
        'F3' => $f3_total_out,
        'overall' => $overall,
        'overall_pl1' => $overall_pl1,
        'overall_pl6' => $overall_pl6
      ],
    ]);
  }

  public function getWIPQuantityAndLotsTotal($useWorkweek, $workweek, $startDate = null, $endDate = null, $includePL = true)
  {
    $f1Query = DB::table(self::F1F2_TABLE . ' as wip')
      ->selectRaw(
        $includePL
          ? 'wip.Package_Name, wip.production_line as PL, SUM(wip.Qty) AS f1_total_wip, COUNT(DISTINCT wip.Lot_Id) as f1_total_lots'
          : 'wip.Package_Name, SUM(wip.Qty) AS f1_total_wip, COUNT(DISTINCT wip.Lot_Id) as f1_total_lots'
      )
      ->where(fn($q) => $this->f1f2WipRepo->f1Filters($q, WipConstants::REEL_TRANSFER_B3, WipConstants::REEL_TRANSFER_EXCLUDED_STATIONS_F1, 'wip'))
      ->groupBy('wip.Package_Name', 'wip.production_line');
    $f1Query = $this->applyDateOrWorkweekWipFilter($f1Query, 'wip.Date_Loaded', $useWorkweek, $workweek, $startDate, $endDate);

    $f2Query = DB::table(self::F1F2_TABLE . ' as wip')
      ->selectRaw(
        $includePL
          ? 'wip.Package_Name, wip.production_line as PL, SUM(wip.Qty) AS f2_total_wip, COUNT(DISTINCT wip.Lot_Id) as f2_total_lots'
          : 'wip.Package_Name, SUM(wip.Qty) AS f2_total_wip, COUNT(DISTINCT wip.Lot_Id) as f2_total_lots'
      )
      ->where(fn($q) => $this->f1f2WipRepo->applyF2Filters($q, WipConstants::EWAN_PROCESS, 'wip'))
      ->groupBy('wip.Package_Name', 'wip.production_line');
    $f2Query = $this->applyDateOrWorkweekWipFilter($f2Query, 'wip.Date_Loaded', $useWorkweek, $workweek, $startDate, $endDate);

    $f3Query = $this->f3WipRepo->baseF3Query();
    $f3Query = $this->applyDateOrWorkweekWipFilter($f3Query, 'f3.date_loaded', $useWorkweek, $workweek, $startDate, $endDate);
    $f3Query = $f3Query->selectRaw(
      $includePL
        ? 'f3_pkg.package_name as Package_Name, f3.production_line as PL, SUM(f3.qty) AS f3_total_wip, COUNT(DISTINCT f3.lot_number) AS f3_total_lots'
        : 'f3_pkg.package_name as Package_Name, SUM(f3.qty) AS f3_total_wip, COUNT(DISTINCT f3.lot_number) AS f3_total_lots'
    );
    if ($includePL) {
      $f3Query->groupBy('f3_pkg.package_name', 'f3.production_line');
    } else {
      $f3Query->groupBy('f3_pkg.package_name');
    }

    $results = MergeAndAggregate::mergeAndAggregate([$f1Query->get(), $f2Query->get(), $f3Query->get()], ['Package_Name', 'PL']);

    return response()->json(
      [
        'status' => 'success',
        'message' => 'Highly optimized data retrieved successfully',
        // 'total_wip' => $totalwip,
        'data' => $results,
      ]
    );
  }

  public function getWipAndLotsByBodySizeTrend($packageNames, $period, $startDate, $endDate, $useWorkweek, $workweek)
  {
    // $canonicalClause = "CASE WHEN canonical_body_size REGEXP '^[0-9]+(\\.[0-9]+)?x[0-9]+(\\.[0-9]+)?' THEN SUBSTRING_INDEX(LOWER(canonical_body_size), 'x', 2) ELSE 'others/unknown' END AS size_bucket";
    $canonicalClause = "CASE WHEN canonical_body_size REGEXP '^[0-9]+(\\.[0-9]+){0,1}x[0-9]+(\\.[0-9]+){0,1}' THEN SUBSTRING_INDEX(LOWER(canonical_body_size), 'x', 2) ELSE 'others/unknown' END AS size_bucket";

    $f1AggregateColumns = WipConstants::FACTORY_AGGREGATES['F1']['wip']['wip-lot'];
    $f2AggregateColumns = WipConstants::FACTORY_AGGREGATES['F2']['wip']['wip-lot'];
    $f3AggregateColumns = WipConstants::FACTORY_AGGREGATES['F3']['wip']['wip-lot'];

    $periodKeys = WipConstants::PERIOD_GROUP_BY[$period];
    $periodGroupBy = ['label'];

    function pivotByBucket($rows, array $periodKeys, string $period, array $valueKeys = ['total_wip', 'total_lots']): array
    {
      $grouped = [];

      foreach ($rows as $row) {
        $row     = (array) $row;

        $dateKey = implode('|', array_map(fn($k) => $row[$k] ?? '', $periodKeys));
        $bucket  = $row['size_bucket'];

        if (!isset($grouped[$dateKey])) {
          // $grouped[$dateKey] = array_intersect_key($row, array_flip($periodKeys));
          $grouped[$dateKey]['label'] = match ($period) {
            'daily'     => $row['day'],
            'weekly'    => 'W' . $row['week'],
            'monthly'   => date('M Y', mktime(0, 0, 0, $row['month'], 1, $row['year'])),
            'quarterly' => 'Q' . $row['quarter'] . ' ' . $row['year'],
            'yearly'    => (string) $row['year'],
            default     => $dateKey,
          };
        }

        foreach ($valueKeys as $key) {
          $grouped[$dateKey]["{$bucket}_{$key}"] = $row[$key] ?? 0;
        }
      }

      return array_values($grouped);
    }

    function addPrefix(array $items, string $prefix, array $exclude = []): array
    {
      return array_map(function ($item) use ($prefix, $exclude) {
        $item = (array) $item;
        $result = [];

        foreach ($item as $key => $value) {
          $result[in_array($key, $exclude) ? $key : "{$prefix}_{$key}"] = $value;
        }

        return $result;
      }, $items);
    }

    $trends = [];

    $trends['f1_trend'] = MergeAndAggregate::mergeAndAggregate([
      pivotByBucket($this->f1f2WipRepo->getTrend("F1", $packageNames, $period, $startDate, $endDate, workweeks: $workweek, aggregateColumns: $f1AggregateColumns, additionalFields: [$canonicalClause])->get()->toArray(), $periodKeys, $period)
    ], $periodGroupBy);
    $trends['f2_trend'] = MergeAndAggregate::mergeAndAggregate([
      pivotByBucket($this->f1f2WipRepo->getTrend("F2", $packageNames, $period, $startDate, $endDate, workweeks: $workweek, aggregateColumns: $f2AggregateColumns, additionalFields: [$canonicalClause])->get()->toArray(), $periodKeys, $period)
    ], $periodGroupBy);
    $trends['f3_trend'] = MergeAndAggregate::mergeAndAggregate([
      pivotByBucket($this->f3WipRepo->getTrend($packageNames, $period, $startDate, $endDate, workweeks: $workweek, aggregateColumns: $f3AggregateColumns, additionalFields: [$canonicalClause])->get()->toArray(), $periodKeys, $period)
    ], $periodGroupBy);

    $trends['overall_trend'] = MergeAndAggregate::mergeAndAggregate([$trends['f1_trend'], $trends['f2_trend'], $trends['f3_trend']], $periodGroupBy);
    $trends['f1_trend'] = addPrefix($trends['f1_trend'], 'f1', exclude: ['dateKey', 'label']);
    $trends['f2_trend'] = addPrefix($trends['f2_trend'], 'f2', exclude: ['dateKey', 'label']);
    $trends['f3_trend'] = addPrefix($trends['f3_trend'], 'f3', exclude: ['dateKey', 'label']);
    $trends['overall_trend'] = addPrefix($trends['overall_trend'], 'overall', exclude: ['dateKey', 'label']);

    $merged = $this->mergeTrendsByKey('label', [], $trends['f1_trend'], $trends['f2_trend'], $trends['f3_trend'], $trends['overall_trend']);

    return response()->json([
      'status' => 'success',
      'message' => 'Highly optimized data retrieved successfully',
      'data' => $merged
    ]);
  }

  public function getWipAndLotsByBodySize($packageNames, $startDate, $endDate, $useWorkweek, $workweek)
  {
    $canonicalClause = "REGEXP '^[0-9]+(\\.[0-9]+)?x[0-9]+(\\.[0-9]+)?' THEN SUBSTRING_INDEX(LOWER(canonical_body_size), 'x', 2) ELSE 'others/unknown' END AS size_bucket";

    $baseQueryF1 = DB::table((new CustomerDataWip)->getTable() . ' as wip')
      ->selectRaw("
        CASE WHEN canonical_body_size
        " . $canonicalClause . ",
        SUM(qty) AS f1_total_wip,
        COUNT(DISTINCT lot_id) AS f1_total_lots
    ")
      ->orderBy('f1_total_wip', 'desc')
      ->groupBy('size_bucket');

    $baseQueryF2 = DB::table((new CustomerDataWip)->getTable() . ' as wip')
      ->selectRaw("
        CASE WHEN canonical_body_size
        " . $canonicalClause . ",
        SUM(qty) AS f2_total_wip,
        COUNT(DISTINCT lot_id) AS f2_total_lots
    ")
      ->orderBy('f2_total_wip', 'desc')
      ->groupBy('size_bucket');

    $baseF3Query = $this->f3WipRepo->baseF3Query();
    $baseF3Query = $baseF3Query->selectRaw("
        CASE WHEN raw.canonical_body_size
        " . $canonicalClause . ",
        SUM(f3.qty) AS f3_total_wip,
        COUNT(DISTINCT lot_number) AS f3_total_lots
    ")
      ->orderBy('f3_total_wip', 'desc')
      ->groupBy('size_bucket');

    Log::info("start date: $startDate, end date: $endDate, use workweek: $useWorkweek");

    $f1QueryWip = (clone $baseQueryF1)
      ->where(fn($q) => $this->f1f2WipRepo->f1Filters($q, WipConstants::REEL_TRANSFER_B3, WipConstants::REEL_TRANSFER_EXCLUDED_STATIONS_F1, 'wip'));

    $f1QueryWip = $this->f1f2WipRepo->filterByPackageName($f1QueryWip, $packageNames, ['f1']);
    $f1QueryWip = $this->applyDateOrWorkweekWipFilter($f1QueryWip, 'wip.Date_Loaded', $useWorkweek, $workweek, $startDate, $endDate);
    $f1QueryWip = $f1QueryWip->get();

    $f2QueryWip = (clone $baseQueryF2)
      ->where(fn($q) => $this->f1f2WipRepo->applyF2Filters($q, WipConstants::EWAN_PROCESS, 'wip'));

    $f2QueryWip = $this->f1f2WipRepo->filterByPackageName($f2QueryWip, $packageNames, ['f2']);
    $f2QueryWip = $this->applyDateOrWorkweekWipFilter($f2QueryWip, 'wip.Date_Loaded', $useWorkweek, $workweek, $startDate, $endDate);
    $f2QueryWip = $f2QueryWip->get();

    $f3QueryWip = $baseF3Query;
    $f3QueryWip = $this->f3WipRepo->filterByPackageName($f3QueryWip, $packageNames);
    $f3QueryWip = $this->applyDateOrWorkweekWipFilter($f3QueryWip, 'f3.Date_Loaded', $useWorkweek, $workweek, $startDate, $endDate);
    $f3QueryWip = $f3QueryWip->get();

    $f1Unknown = $f2QueryWip->firstWhere('size_bucket', 'others/unknown')?->f1_total_wip ?? 0;
    $f2Unknown = $f2QueryWip->firstWhere('size_bucket', 'others/unknown')?->f2_total_wip ?? 0;
    $f3Unknown = $f3QueryWip->firstWhere('size_bucket', 'others/unknown')?->f3_total_wip ?? 0;

    $f1QueryWip = $f1QueryWip->reject(fn($item) => $item->size_bucket === 'others/unknown')->values();
    $f2QueryWip = $f2QueryWip->reject(fn($item) => $item->size_bucket === 'others/unknown')->values();
    $f3QueryWip = $f3QueryWip->reject(fn($item) => $item->size_bucket === 'others/unknown')->values();

    $result = MergeAndAggregate::mergeAndAggregate([$f1QueryWip, $f2QueryWip, $f3QueryWip], ['size_bucket']);

    foreach ($result as &$item) {
      $f1_total_wip = $item['f1_total_wip'] ?? 0;
      $f2_total_wip = $item['f2_total_wip'] ?? 0;
      $f3_total_wip = $item['f3_total_wip'] ?? 0;

      $f1_total_lots = $item['f1_total_lots'] ?? 0;
      $f2_total_lots = $item['f2_total_lots'] ?? 0;
      $f3_total_lots = $item['f3_total_lots'] ?? 0;

      $item['total_wip'] = $f1_total_wip + $f2_total_wip + $f3_total_wip;
      $item['total_lots'] = $f1_total_lots + $f2_total_lots + $f3_total_lots;
    }

    $f3QueryWip = $f3QueryWip->sortByDesc('f3_total_wip')->values();

    return response()->json([
      'status' => 'success',
      'message' => 'Highly optimized data retrieved successfully',
      'data' => [
        'f1' => $f1QueryWip,
        'f2' => $f2QueryWip,
        'f3' => $f3QueryWip,
        'result' => $result,
        'f1_unknown' => $f1Unknown,
        'f2_unknown' => $f2Unknown,
        'f3_unknown' => $f3Unknown
      ]
    ]);
  }

  private function applyFilterRules(array $rules)
  {
    if (empty($rules)) {
      return null;
    }

    return function ($query) use ($rules) {
      if (isset($rules['lot_status_in'])) {
        $query->whereIn('Lot_Status', $rules['lot_status_in']);
      }

      if (isset($rules['lot_status_not_in'])) {
        $query->whereNotIn('Lot_Status', $rules['lot_status_not_in']);
      }

      if (isset($rules['stage_in'])) {
        $query->whereIn('Stage', $rules['stage_in']);
      }

      if (isset($rules['stage_not_in'])) {
        $query->whereNotIn('Stage', $rules['stage_not_in']);
      }

      if (isset($rules['station_not_in'])) {
        $query->whereNotIn('Station', $rules['station_not_in']);
      }

      if (isset($rules['station_in'])) {
        $query->whereIn('Station', $rules['station_in']);
      }

      if (isset($rules['stage_in_or_station_in'])) {
        $query->where(function ($q) use ($rules) {
          $q->whereIn('Stage', $rules['stage_in_or_station_in']['stage'])
            ->orWhereIn('Station', $rules['stage_in_or_station_in']['station']);
        });
      }

      if (isset($rules['stage_not_in_or_station_not_in'])) {
        $query->where(function ($q) use ($rules) {
          $q->whereNotIn('Stage', $rules['stage_not_in_or_station_not_in']['stage'])
            ->orWhereNotIn('Station', $rules['stage_not_in_or_station_not_in']['station']);
        });
      }

      if (isset($rules['is_for_bake'])) {
        if ($rules['is_for_bake'] === true) {
          $query->whereIn('Bake', ['For Bake'])
            ->where('Bake_Count', 0);
        } elseif ($rules['is_for_bake'] === false) {
          $query->where(function ($q) {
            $q->whereNull('Bake')
              ->orWhere('Bake', '')
              ->orWhere('Bake', '!=', 'For Bake')
              ->orWhereNotIn('Station', WipConstants::PRE_BAKE);
          });
        }
      }
    };
  }

  private function bakeConditionQuery(?string $filterType = null)
  {
    if (is_null($filterType)) {
      return null;
    }

    return function ($query) use ($filterType) {
      // Base bake query
      $query->whereIn('wip.Stage', ['TBAKEL'])
        ->whereNotIn('wip.Lot_Status', WipConstants::LOT_ON_HOLD)
        ->where(function ($q) {
          $q->whereNotIn('wip.Stage', WipConstants::BOXING_QA)
            ->orWhereNotIn('wip.Station', ['GTTFVI_T']);
        });

      // Additional filters based on type
      switch ($filterType) {
        case 'F2':
          $query->where(fn($q) => $this->f1f2WipRepo->applyF2Filters(
            $q,
            WipConstants::EWAN_PROCESS,
            'wip'
          ));
          $query->whereNotIn('wip.Station', [
            'GTTRES_T',
            'GTSUBCON',
            'GTARCH_T',
            'GTTBINLOC',
            ...WipConstants::LPI_LLI_BRAND_ERASE_SORT,
          ])->whereIn('wip.Station', WipConstants::PRE_BAKE);
          break;

        case 'F1':
          $query->whereNotIn('wip.Station', [
            ...WipConstants::LPI_LLI_BRAND_ERASE_SORT,
            ...WipConstants::PRE_BAKE
          ]);
          break;

        case 'PL1':
        case 'PL2':
          $query->whereNotIn('wip.Station', WipConstants::LPI_LLI_BRAND_ERASE_SORT)
            ->whereIn('wip.Station', WipConstants::PRE_BAKE);
          break;
      }
    };
  }

  public function getWIPStationSummaryTrend($packageName, $period, $startDate, $endDate, $workweeks, $filteringCondition)
  {
    $filterRules = $this->getFilterRules($filteringCondition);
    Log::info("Applying WIP Filter Summary Trend with condition: $filteringCondition");

    $trends = [];
    foreach (WipConstants::FACTORIES as $factory) {
      if ($factory === 'F3') {
        continue; // * NOTE: This Station is for F1/F2 only
      }

      $key = strtolower($factory) . '_trend';

      $query = $this->f1f2WipRepo->getTrend(
        $factory,
        $packageName,
        $period,
        $startDate,
        $endDate,
        $workweeks,
      );

      $query->where($this->applyFilterRules($filterRules));

      Log::info(SqlDebugHelper::prettify($query->toSql(), $query->getBindings()));

      if ($filteringCondition === 'Bake') {
        $bakeQuery = $this->f1f2WipRepo->getTrend(
          $factory,
          $packageName,
          $period,
          $startDate,
          $endDate,
          $workweeks,
        );
        // Log::info(SqlDebugHelper::prettify($query->toSql(), $query->getBindings()));
        // Log::info(SqlDebugHelper::prettify($bakeQuery->toSql(), $bakeQuery->getBindings()));
        $bakeQuery->where($this->bakeConditionQuery($filteringCondition));
        $query = $bakeQuery->unionAll($query);
      }

      $trends[$key] = $query->get();
    }

    $mergedTrends = WipTrendParser::parseTrendsByPeriod($trends);

    return response()->json(array_merge($trends, [
      'data' => $mergedTrends,
      'status' => 'success',
      'message' => 'Data retrieved successfully',
    ]));
  }

  private function getFilterRules($filteringCondition = null)
  {
    $rules = [
      'All' => [],
      'Processable' => [
        'lot_status_not_in' => WipConstants::LOT_ON_HOLD,
        'stage_not_in' => [...WipConstants::BOXING_QA, ...WipConstants::BAKE_REEL_TRANSFER],
        'station_not_in' => ['GTTFVI_T', 'GTTSORT_T', ...WipConstants::BRAND_ERASE],
        'is_for_bake' => false,
      ],
      'Hold' => [
        'lot_status_in' => WipConstants::LOT_ON_HOLD,
      ],
      'Pipeline' => [
        'lot_status_not_in' => WipConstants::LOT_ON_HOLD,
        'stage_in_or_station_in' => [
          'stage' => WipConstants::BOXING_QA,
          'station' => ['GTTFVI_T'],
        ],
      ],
      'Bake' => [
        'lot_status_not_in' => WipConstants::LOT_ON_HOLD,
        'is_for_bake' => true,
        'stage_not_in_or_station_not_in' => [
          'stage' => WipConstants::BOXING_QA,
          'station' => ['GTTFVI_T'],
        ],
        'stage_not_in' => WipConstants::BAKE_REEL_TRANSFER,
      ],
      'Detapesegregation' => [
        'lot_status_not_in' => WipConstants::LOT_ON_HOLD,
        'stage_not_in_or_station_not_in' => [
          'stage' => WipConstants::BOXING_QA,
          'station' => ['GTTFVI_T'],
        ],
        'stage_not_in' => ['TBAKEL'],
        'stage_in' => ['TDREEL', 'TRANSFER'],
      ],
      'Lpi' => [
        'lot_status_not_in' => WipConstants::LOT_ON_HOLD,
        'stage_not_in_or_station_not_in' => [
          'stage' => WipConstants::BOXING_QA,
          'station' => ['GTTFVI_T'],
        ],
        'stage_not_in' => WipConstants::BAKE_REEL_TRANSFER,
        'station_in' => ['GTLPI_T'],
      ],
      'Brand' => [
        'lot_status_not_in' => WipConstants::LOT_ON_HOLD,
        'stage_not_in_or_station_not_in' => [
          'stage' => WipConstants::BOXING_QA,
          'station' => ['GTTFVI_T'],
        ],
        'stage_not_in' => WipConstants::BAKE_REEL_TRANSFER,
        'station_not_in' => ['GTLPI_T'],
        'station_in' => WipConstants::BRAND_ERASE,
      ],
      'Lli' => [
        'lot_status_not_in' => WipConstants::LOT_ON_HOLD,
        'stage_not_in_or_station_not_in' => [
          'stage' => WipConstants::BOXING_QA,
          'station' => ['GTTFVI_T'],
        ],
        'stage_not_in' => WipConstants::BAKE_REEL_TRANSFER,
        'station_not_in' => ['GTLPI_T', ...WipConstants::BRAND_ERASE],
        'station_in' => ['GTTLLI_T'],
      ],
      'Sort' => [
        'lot_status_not_in' => WipConstants::LOT_ON_HOLD,
        'stage_not_in_or_station_not_in' => [
          'stage' => WipConstants::BOXING_QA,
          'station' => ['GTTFVI_T'],
        ],
        'stage_not_in' => WipConstants::BAKE_REEL_TRANSFER,
        'station_not_in' => ['GTLPI_T', ...WipConstants::BRAND_ERASE],
        'station_in' => ['GTTSORT_T'],
      ],
    ];

    if ($filteringCondition !== null) {
      return $rules[$filteringCondition] ?? [];
    }

    return $rules;
  }

  public function getOverallPickUp($startDate, $endDate)
  {
    // throw new Exception("test");
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
    return $this->pickUpRepo->getPickUpTrend($packageName, $period, $startDate, $endDate, $workweeks);
  }
  public function getWipOutCapacitySummaryTrend($packageName, $period, $startDate, $endDate, $workweeks)
  {
    $trends = [];
    $trendsPL1 = [];
    $trendsPL6 = [];

    $prefixMap = [
      'f1_trend' => 'f1',
      'f2_trend' => 'f2',
      'f3_trend' => 'f3',
      'f1_capacity_trend' => 'f1',
      'f2_capacity_trend' => 'f2',
      'f3_capacity_trend' => 'f3',
      'overall_trend' => 'overall',
      'overall_capacity_trend' => 'overall'
    ];

    $prefixMapPL1 = [
      'f1_trend_pl1' => 'f1_pl1',
      'f2_trend_pl1' => 'f2_pl1',
      'f3_trend_pl1' => 'f3_pl1',
      'overall_trend_pl1' => 'overall_pl1',
    ];

    $prefixMapPL6 = [
      'f1_trend_pl6' => 'f1_pl6',
      'f2_trend_pl6' => 'f2_pl6',
      'f3_trend_pl6' => 'f3_pl6',
      'overall_trend_pl6' => 'overall_pl6',
    ];

    $keyRemapPL1 = [
      'f1_trend' => 'f1_trend_pl1',
      'f2_trend' => 'f2_trend_pl1',
      'f3_trend' => 'f3_trend_pl1',
      'overall_trend' => 'overall_trend_pl1',
    ];

    $keyRemapPL6 = [
      'f1_trend' => 'f1_trend_pl6',
      'f2_trend' => 'f2_trend_pl6',
      'f3_trend' => 'f3_trend_pl6',
      'overall_trend' => 'overall_trend_pl6',
    ];

    $remap = fn($arr, $keyMap) => collect($arr)
      ->mapWithKeys(fn($val, $key) => [$keyMap[$key] ?? $key => $val])
      ->all();

    $selectColumns = ['wip.Date_Loaded as date_loaded', 'wip.Qty as qty', 'wip.Package_Name as package_name'];
    $aggregateColumnsF1Wip = WipConstants::FACTORY_AGGREGATES['F1']['wip']['wip-lot'];
    $aggregateColumnsF2Wip = WipConstants::FACTORY_AGGREGATES['F2']['wip']['wip-lot'];
    $aggregateColumnsOut = WipConstants::FACTORY_AGGREGATES['F1F2']['out']['out-lot'];
    $aggregateColumnsF3Wip = WipConstants::FACTORY_AGGREGATES['F3']['wip']['wip-lot'];
    $aggregateColumnsF3Out = WipConstants::FACTORY_AGGREGATES['F3']['out']['out-lot'];

    $additionalF3WipAggregate = [
      'SUM(CASE WHEN f3.qty >= 10000 THEN f3.qty ELSE 0 END) as big_total_wip',
      'SUM(CASE WHEN f3.qty BETWEEN 5000 AND 9999 THEN f3.qty ELSE 0 END) as medium_total_wip',
      'SUM(CASE WHEN f3.qty < 5000 THEN f3.qty ELSE 0 END) as small_total_wip',
      'COUNT(CASE WHEN f3.qty >= 10000 THEN f3.lot_number END) as big_wip_total_lots',
      'COUNT(CASE WHEN f3.qty BETWEEN 5000 AND 9999 THEN f3.lot_number END) as medium_wip_total_lots',
      'COUNT(CASE WHEN f3.qty < 5000 THEN f3.lot_number END) as small_wip_total_lots',

      'COUNT(CASE WHEN f3.qty >= 10000 THEN f3.lot_number END) as big_total_lots',
      'COUNT(CASE WHEN f3.qty BETWEEN 5000 AND 9999 THEN f3.lot_number END) as medium_total_lots',
      'COUNT(CASE WHEN f3.qty < 5000 THEN f3.lot_number END) as small_total_lots',
    ];

    $additionalF3OutAggregate = [
      'SUM(CASE WHEN f3.qty >= 10000 THEN f3.qty ELSE 0 END) as big_total_outs',
      'SUM(CASE WHEN f3.qty BETWEEN 5000 AND 9999 THEN f3.qty ELSE 0 END) as medium_total_outs',
      'SUM(CASE WHEN f3.qty < 5000 THEN f3.qty ELSE 0 END) as small_total_outs',
      'COUNT(CASE WHEN f3.qty >= 10000 THEN f3.lot_number END) as big_out_total_lots',
      'COUNT(CASE WHEN f3.qty BETWEEN 5000 AND 9999 THEN f3.lot_number END) as medium_out_total_lots',
      'COUNT(CASE WHEN f3.qty < 5000 THEN f3.lot_number END) as small_out_total_lots',

      'COUNT(CASE WHEN f3.qty >= 10000 THEN f3.lot_number END) as big_total_lots',
      'COUNT(CASE WHEN f3.qty BETWEEN 5000 AND 9999 THEN f3.lot_number END) as medium_total_lots',
      'COUNT(CASE WHEN f3.qty < 5000 THEN f3.lot_number END) as small_total_lots',
    ];

    $additionalF1F2WipAggregate = [
      'SUM(CASE WHEN wip.Qty >= 10000 THEN wip.Qty ELSE 0 END) as big_total_wip',
      'SUM(CASE WHEN wip.Qty BETWEEN 5000 AND 9999 THEN wip.Qty ELSE 0 END) as medium_total_wip',
      'SUM(CASE WHEN wip.Qty < 5000 THEN wip.Qty ELSE 0 END) as small_total_wip',
      'COUNT(CASE WHEN wip.Qty >= 10000 THEN wip.Lot_Id END) as big_wip_total_lots',
      'COUNT(CASE WHEN wip.Qty BETWEEN 5000 AND 9999 THEN wip.Lot_Id END) as medium_wip_total_lots',
      'COUNT(CASE WHEN wip.Qty < 5000 THEN wip.Lot_Id END) as small_wip_total_lots',

      'COUNT(CASE WHEN wip.Qty >= 10000 THEN wip.Lot_Id END) as big_total_lots',
      'COUNT(CASE WHEN wip.Qty BETWEEN 5000 AND 9999 THEN wip.Lot_Id END) as medium_total_lots',
      'COUNT(CASE WHEN wip.Qty < 5000 THEN wip.Lot_Id END) as small_total_lots',
    ];

    $additionalF1F2OutAggregate = [
      'SUM(CASE WHEN out.qty >= 10000 THEN out.qty ELSE 0 END) as big_total_outs',
      'SUM(CASE WHEN out.qty BETWEEN 5000 AND 9999 THEN out.qty ELSE 0 END) as medium_total_outs',
      'SUM(CASE WHEN out.qty < 5000 THEN out.qty ELSE 0 END) as small_total_outs',
      'COUNT(CASE WHEN out.qty >= 10000 THEN out.lot_id END) as big_out_total_lots',
      'COUNT(CASE WHEN out.qty BETWEEN 5000 AND 9999 THEN out.lot_id END) as medium_out_total_lots',
      'COUNT(CASE WHEN out.qty < 5000 THEN out.lot_id END) as small_out_total_lots',

      'COUNT(CASE WHEN out.qty >= 10000 THEN out.lot_id END) as big_total_lots',
      'COUNT(CASE WHEN out.qty BETWEEN 5000 AND 9999 THEN out.lot_id END) as medium_total_lots',
      'COUNT(CASE WHEN out.qty < 5000 THEN out.lot_id END) as small_total_lots',
    ];

    $aggregateColumnsF1Wip = array_merge($aggregateColumnsF1Wip, $additionalF1F2WipAggregate);
    $aggregateColumnsF2Wip = array_merge($aggregateColumnsF2Wip, $additionalF1F2WipAggregate);
    $aggregateColumnsOut = array_merge($aggregateColumnsOut, $additionalF1F2OutAggregate);
    $aggregateColumnsF3Out = array_merge($aggregateColumnsF3Out, $additionalF3OutAggregate);
    $aggregateColumnsF3Wip = array_merge($aggregateColumnsF3Wip, $additionalF3WipAggregate);

    $trends['f1_trend'] = $this->f1f2WipRepo->getTrend('F1', $packageName, $period, $startDate, $endDate, workweeks: $workweeks, selectColumns: $selectColumns, aggregateColumns: $aggregateColumnsF1Wip)->get();
    $trends['f2_trend'] = $this->f1f2WipRepo->getTrend('F2', $packageName, $period, $startDate, $endDate, workweeks: $workweeks, selectColumns: $selectColumns, aggregateColumns: $aggregateColumnsF2Wip)->get();
    $trends['f3_trend'] = $this->f3WipRepo->getTrend($packageName, $period, $startDate, $endDate, $workweeks, aggregateColumns: $aggregateColumnsF3Wip)->get();

    $query = $this->f1f2WipRepo->getTrend('F1', $packageName, $period, $startDate, $endDate, workweeks: $workweeks, selectColumns: $selectColumns, aggregateColumns: $aggregateColumnsF1Wip);
    $this->f1f2WipRepo->joinPL($query, WipConstants::SPECIAL_PART_NAMES, 'PL1');
    $trendsPL1['f1_trend_pl1'] = $query->get();

    $query = $this->f1f2WipRepo->getTrend('F2', $packageName, $period, $startDate, $endDate, workweeks: $workweeks, selectColumns: $selectColumns, aggregateColumns: $aggregateColumnsF2Wip);
    $this->f1f2WipRepo->joinPL($query, WipConstants::SPECIAL_PART_NAMES, 'PL1');
    $trendsPL1['f2_trend_pl1'] = $query->get();

    $query = $this->f1f2WipRepo->getTrend('F1', $packageName, $period, $startDate, $endDate, workweeks: $workweeks, selectColumns: $selectColumns, aggregateColumns: $aggregateColumnsF1Wip);
    $this->f1f2WipRepo->joinPL($query, WipConstants::SPECIAL_PART_NAMES, 'PL6');
    $trendsPL6['f1_trend_pl6'] = $query->get();

    $query = $this->f1f2WipRepo->getTrend('F2', $packageName, $period, $startDate, $endDate, workweeks: $workweeks, selectColumns: $selectColumns, aggregateColumns: $aggregateColumnsF2Wip);
    $this->f1f2WipRepo->joinPL($query, WipConstants::SPECIAL_PART_NAMES, 'PL6');
    $trendsPL6['f2_trend_pl6'] = $query->get();

    $trendsPL1['f3_trend_pl1'] = $this->f3WipRepo->getTrend($packageName, $period, $startDate, $endDate, $workweeks, aggregateColumns: $aggregateColumnsF3Wip, joinPpc: "PL1")
      ->get();

    $trendsPL6['f3_trend_pl6'] = $this->f3WipRepo->getTrend($packageName, $period, $startDate, $endDate, $workweeks, aggregateColumns: $aggregateColumnsF3Wip, joinPpc: "PL6")
      ->get();

    $startDateCopy = is_object($startDate) ? clone $startDate : $startDate;
    foreach (WipConstants::FACTORIES as $factory) {
      $capacity = $this->capacityRepo->getCapacityTrend($packageName, $factory, $period, $startDateCopy, $endDate, $workweeks);
      $trends[strtolower($factory) . '_capacity_trend'] = $capacity;
    }

    $periodGroupBy = WipConstants::PERIOD_GROUP_BY[$period];
    $trends['overall_capacity_trend'] = MergeAndAggregate::mergeAndAggregate([$trends['f1_capacity_trend'], $trends['f2_capacity_trend'], $trends['f3_capacity_trend']], $periodGroupBy);
    $trends['overall_trend'] = MergeAndAggregate::mergeAndAggregate([$trends['f1_trend'], $trends['f2_trend'], $trends['f3_trend']], $periodGroupBy);

    $trendsPL1['overall_trend_pl1'] = MergeAndAggregate::mergeAndAggregate([$trendsPL1['f1_trend_pl1'], $trendsPL1['f2_trend_pl1'], $trendsPL1['f3_trend_pl1']], $periodGroupBy);
    $trendsPL6['overall_trend_pl6'] = MergeAndAggregate::mergeAndAggregate([$trendsPL6['f1_trend_pl6'], $trendsPL6['f2_trend_pl6'], $trendsPL6['f3_trend_pl6']], $periodGroupBy);

    $mergedTrends = WipTrendParser::parseTrendsByPeriod($trends, $prefixMap);
    $pl1MergedTrends = WipTrendParser::parseTrendsByPeriod($trendsPL1, $prefixMapPL1);
    $pl6MergedTrends = WipTrendParser::parseTrendsByPeriod($trendsPL6, $prefixMapPL6);

    $startDatePlusOneDay = Carbon::parse($startDate)->addDay()->format('Y-m-d H:i:s');
    $endDatePlusOneDay = Carbon::parse($endDate)->addDay()->format('Y-m-d H:i:s');

    $f1f2outTrend = $this->f1f2OutRepo->getOverallTrend($packageName, $period, $startDatePlusOneDay, $endDatePlusOneDay, $workweeks, aggregateColumns: $aggregateColumnsOut);
    $f3outTrend = $this->f3OutRepo->getOverallTrend($packageName, $period, $startDatePlusOneDay, $endDatePlusOneDay, $workweeks, aggregateColumns: $aggregateColumnsF3Out);

    $f1f2outPl1Trend = $remap(
      $this->f1f2OutRepo->getOverallTrend($packageName, $period, $startDatePlusOneDay, $endDatePlusOneDay, $workweeks, aggregateColumns: $aggregateColumnsOut, pl: "PL1"),
      $keyRemapPL1
    );

    $f3outPL1Trend = $remap(
      $this->f3OutRepo->getOverallTrend($packageName, $period, $startDatePlusOneDay, $endDatePlusOneDay, $workweeks, aggregateColumns: $aggregateColumnsF3Out, pl: "PL1"),
      $keyRemapPL1
    );

    $f1f2outPl6Trend = $remap(
      $this->f1f2OutRepo->getOverallTrend($packageName, $period, $startDatePlusOneDay, $endDatePlusOneDay, $workweeks, aggregateColumns: $aggregateColumnsOut, pl: "PL6"),
      $keyRemapPL6
    );
    $f3outPL6Trend = $remap(
      $this->f3OutRepo->getOverallTrend($packageName, $period, $startDatePlusOneDay, $endDatePlusOneDay, $workweeks, aggregateColumns: $aggregateColumnsF3Out, pl: "PL6"),
      $keyRemapPL6
    );

    $f1f2out = WipTrendParser::parseTrendsByPeriod($f1f2outTrend);
    $f3out = WipTrendParser::parseTrendsByPeriod($f3outTrend);
    $f1f2outPl6 = WipTrendParser::parseTrendsByPeriod($f1f2outPl6Trend, $prefixMapPL6);
    $f3outPL6 = WipTrendParser::parseTrendsByPeriod($f3outPL6Trend, $prefixMapPL6);
    $f1f2outPl1 = WipTrendParser::parseTrendsByPeriod($f1f2outPl1Trend, $prefixMapPL1);
    $f3outPL1 = WipTrendParser::parseTrendsByPeriod($f3outPL1Trend, $prefixMapPL1);

    $merged = $this->mergeTrendsByKey('dateKey', ['label'], $mergedTrends, $f1f2out, $f3out);
    $plMerged = $this->mergeTrendsByKey('dateKey', ['label'], $pl1MergedTrends, $pl6MergedTrends, $f1f2outPl1, $f3outPL1, $f1f2outPl6, $f3outPL6);

    $dataWithUtilization = array_map(function ($item) {
      $f1_capacity = isset($item['f1_capacity']) ? (float)$item['f1_capacity'] : 0;
      $f2_capacity = isset($item['f2_capacity']) ? (float)$item['f2_capacity'] : 0;
      $f3_capacity = isset($item['f3_capacity']) ? (float)$item['f3_capacity'] : 0;
      $overall_capacity = isset($item['overall_capacity']) ? (float)$item['overall_capacity'] : 0;

      $f1_outs = isset($item['f1_total_outs']) ? (float)$item['f1_total_outs'] : 0;
      $f2_outs = isset($item['f2_total_outs']) ? (float)$item['f2_total_outs'] : 0;
      $f3_outs = isset($item['f3_total_outs']) ? (float)$item['f3_total_outs'] : 0;
      $overall_outs = isset($item['overall_total_outs']) ? (float)$item['overall_total_outs'] : 0;
      // calculate utilization only if capacity > 0
      $item['f1_utilization'] = $f1_capacity > 0 ? round(($f1_outs / $f1_capacity) * 100, 2) : 0;
      $item['f2_utilization'] = $f2_capacity > 0 ? round(($f2_outs / $f2_capacity) * 100, 2) : 0;
      $item['f3_utilization'] = $f3_capacity > 0 ? round(($f3_outs / $f3_capacity) * 100, 2) : 0;
      $item['overall_utilization'] = $overall_capacity > 0 ? round(($overall_outs / $overall_capacity) * 100, 2) : 0;

      return $item;
    }, $merged);

    [$alignedDataWithUtilization, $alignedPlMerged] = $this->align('dateKey', ['label'], $dataWithUtilization, $plMerged);

    return response()->json([
      'data'           => $alignedDataWithUtilization,
      'pl_data'        => $alignedPlMerged,
      'status'         => 'success',
      'message'        => 'Data retrieved successfully',
    ]);
  }

  public function downloadAllFactoriesRawXlsx($packageName, $startDate, $endDate)
  {
    $startAddedOneDay = Carbon::parse($startDate)->addDay()->format('Y-m-d H:i:s');
    $endAddedOneDay = Carbon::parse($endDate)->addDay()->format('Y-m-d H:i:s');

    $sheets = [
      'F1 Wip' => fn() => $this->f1f2WipRepo
        ->getTrend('F1', $packageName, null, $startDate, $endDate, null, ['*'], false)
        ->cursor(),

      'F2 Wip' => fn() => $this->f1f2WipRepo
        ->getTrend('F2', $packageName, null, $startDate, $endDate, null, ['*'], false)
        ->cursor(),

      'F3 Wip' => fn() => $this->f3WipRepo
        ->getTrend($packageName, null, $startDate, $endDate, null, false)
        ->cursor(),

      'F1 Out' => fn() => $this->f1f2OutRepo
        ->buildTrend(['F1'], $packageName, null, $startAddedOneDay, $endAddedOneDay, null, aggregate: false)
        ->cursor(),

      'F2 Out' => fn() => $this->f1f2OutRepo
        ->buildTrend(['F2'], $packageName, null, $startAddedOneDay, $endAddedOneDay, null, aggregate: false)
        ->cursor(),

      'F3 Out' => fn() => $this->f3OutRepo
        ->getOverallTrend($packageName, null, $startAddedOneDay, $endAddedOneDay, null, aggregate: false)
        ->cursor(),
    ];

    return $this->downloadRawXlsx($sheets, 'wip_out_trends');
  }

  public function downloadPickUpRawXlsx($packageName, $startDate, $endDate)
  {
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

    return response()->json([
      'data' => $results,
      'status' => 'success',
      'message' => 'Data retrieved successfully'
    ]);
  }

  public function getAllPackages()
  {
    $f1f2Packages = $this->f1f2WipRepo->getDistinctPackages();
    // $fromPackageGroup = $this->packageGroupRepo->getUniquePackageNamesByFactory(['F1', 'F2', 'F3']);
    $f3Packages = $this->f3packageNamesRepo->getAllPackageNames();

    $all = array_values(array_unique(array_merge($f1f2Packages, WipConstants::SPECIAL_FILTER_VALUE, $f3Packages)));


    return array_map('strtoupper', $this->uniqueNormalized($all));
  }
}
