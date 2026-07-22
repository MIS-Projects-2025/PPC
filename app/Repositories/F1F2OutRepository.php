<?php

namespace App\Repositories;

use App\Constants\WipConstants;
use App\Repositories\AnalogCalendarRepository;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Helpers\MergeAndAggregate;
use App\Helpers\SqlDebugHelper;
use App\Models\F1F2Out;
use App\Services\PackageFilters\PackageFilterService;
use App\Helpers\WipTrendParser;
use App\Traits\NormalizeStringTrait;
use App\Traits\TrendAggregationTrait;
use App\Traits\ApplyDateOrWorkWeekFilter;
use App\Traits\PackageAliasTrait;
use App\Traits\ShiftObjectDates;
use Carbon\Carbon;
use DateTime;

class F1F2OutRepository
{
  use NormalizeStringTrait;
  use TrendAggregationTrait;
  use PackageAliasTrait;
  use ApplyDateOrWorkWeekFilter;
  use ShiftObjectDates;


  protected $analogCalendarRepo;
  protected $packageFilterService;
  protected $packageGroupRepo;

  public function __construct(
    PackageFilterService $packageFilterService,
    PackageGroupRepository $packageGroupRepo,
    AnalogCalendarRepository $analogCalendarRepo,
  ) {
    $this->packageFilterService = $packageFilterService;
    $this->packageGroupRepo = $packageGroupRepo;
    $this->analogCalendarRepo = $analogCalendarRepo;
  }

  public const F1F2_OUTS_TABLE = "customer_data_wip_out";

  public function doesExist($column, $value)
  {
    return !DB::table(self::F1F2_OUTS_TABLE)
      ->where($column, $value)
      ->exists();
  }

  public function filterByPackageName($query, ?array $packageNames, $factories)
  {
    $query = $this->packageFilterService->applyPackageFilter($query, $packageNames, $factories, 'out.package', "OUT");
    return $query;
  }

  public function applyF2Filter($query, ?string $alias)
  {
    $prefix = $alias ? "{$alias}." : '';

    $query->whereIn("{$prefix}focus_group", WipConstants::F2_OUT_FOCUS_GROUP_INCLUSION);

    return $query;
  }
  public function applyF1Filter($query, ?string $alias)
  {
    $prefix = $alias ? "{$alias}." : '';

    $query->whereNotIn("{$prefix}focus_group", WipConstants::F1_OUT_FOCUS_GROUP_EXCLUSION);

    return $query;
  }

  public function joinPL($query, $partName = [], $joinPpc = '')
  {
    // $query->join(self::PPC_TABLE . ' as plref', 'out.package', '=', 'plref.Package');

    if ($joinPpc == 'PL1') {
      // $query->where(function ($q) use ($partName) {
      $query->Where('out.production_line', 'PL1');
      // ->orwhereIn('out.part_name', $partName);
      // });
    }

    if ($joinPpc == 'PL6') {
      // $query->where(function ($q) use ($partName) {
      $query->where('out.production_line', 'PL6');
      // ->whereNotIn('out.part_name', $partName);
      // });
    }

    return $query;
  }

  private function overallByDate(string $fType, ?string $joinPpc, bool $useWorkweek, $workweek, string $startDate, string $endDate)
  {
    $query = strtolower($fType) === 'f1' ? $this->getF1QueryByPackage([]) : $this->getF2QueryByPackage([]);

    if ($joinPpc) {
      $query = $this->joinPL($query, joinPpc: $joinPpc);
    }

    $data = $this->analogCalendarRepo->getDatesByWorkWeekRange($workweek);
    $weekRange = $this->shiftRangeByOneDayForward($data['range']);

    $query = $this->applyDateOrWorkweekOutFilter($query, 'out.import_date', $useWorkweek, $weekRange, $startDate, $endDate);
    return $query;
  }

  public function overallQty(string $fType, ?string $joinPpc, bool $useWorkweek, $workweek, string $startDate, string $endDate): int
  {
    $query = $this->overallByDate($fType, $joinPpc, $useWorkweek, $workweek, $startDate, $endDate);
    return $query->sum('qty');
  }

  public function overallQtyAndLotIdByPackage(string $fType, ?string $joinPpc, bool $useWorkweek, $workweek, string $startDate, string $endDate)
  {
    $query = $this->overallByDate($fType, $joinPpc, $useWorkweek, $workweek, $startDate, $endDate);
    return $query->selectRaw(
      "out.package, SUM(out.qty) as {$fType}_total_out, SUM(out.qty) as total_out, COUNT(DISTINCT out.lot_id) as {$fType}_total_lots, COUNT(DISTINCT out.lot_id) as total_lots"
    )
      ->groupBy('out.package')
      ->get();
  }

  public static function getImportKey()
  {
    return "f1f2_out";
  }

  public function getF1QueryByPackage($packageName)
  {
    $f1QueryOuts = DB::table(self::F1F2_OUTS_TABLE . ' as out');
    $f1QueryOuts = $this->applyF1Filter($f1QueryOuts, 'out');

    return $f1QueryOuts;
  }

  public function getF2QueryByPackage($packageName)
  {
    $f2QueryOuts = DB::table(self::F1F2_OUTS_TABLE . ' as out');
    $f2QueryOuts = $this->applyF2Filter($f2QueryOuts, 'out');

    return $f2QueryOuts;
  }

  public function getF3QueryByPackage($packageName)
  {
    $f3QueryOuts = DB::table(self::F1F2_OUTS_TABLE . ' as out');

    $f3QueryOuts->whereRaw('1 = 0');

    $f3QueryOuts = $this->joinPL($f3QueryOuts);

    return $f3QueryOuts;
  }

  public function filterFactory($factories = null)
  {
    if (in_array("F1", $factories)) {

      return fn($q) => $q->whereNotIn('out.focus_group', WipConstants::F1_OUT_FOCUS_GROUP_EXCLUSION);
    }

    if (in_array("F2", $factories)) {
      return fn($q) => $q->whereIn('out.focus_group', WipConstants::F2_OUT_FOCUS_GROUP_INCLUSION);
    }

    return null;
  }

  public function buildTrend($factories, $packageName, $period, $startDate, $endDate, $workweeks, $aggregateColumns = WipConstants::FACTORY_AGGREGATES['F1F2']['out']['out-lot'], $aggregate = true)
  {
    $query = DB::table(self::F1F2_OUTS_TABLE . ' as out');
    $query = $this->filterByPackageName($query, $packageName, $factories);

    if ($filter = $this->filterFactory($factories)) {
      $query->where($filter);
    }

    $data = $this->analogCalendarRepo->getDatesByWorkWeekRange($workweeks);
    $weekRange = $this->shiftRangeByOneDayForward($data['range']);

    if ($aggregate) {
      $query = $this->applyTrendAggregation(
        $query,
        $period,
        $startDate,
        $endDate,
        'out.import_date',

        // continue not yet tested
        aggregateColumns: $aggregateColumns,
        workRange: $weekRange,
      );
    } else {
      $query->whereBetween('out.import_date', [$startDate, $endDate]);
    }

    return $query;
  }

  public function getOverallTrend($packageName, $period, $startDate, $endDate, $workweeks, $aggregateColumns = null, $pl = null)
  {
    $f1Trend = $this->buildTrend(
      ['F1'],
      $packageName,
      $period,
      $startDate,
      $endDate,
      $workweeks,
      ...($aggregateColumns !== null ? ['aggregateColumns' => $aggregateColumns] : [])
    )
      ->when($pl, function ($q) use ($pl) {
        $this->joinPL($q, joinPpc: $pl);
      })
      ->get();

    $f2Trend = $this->buildTrend(
      ['F2'],
      $packageName,
      $period,
      $startDate,
      $endDate,
      $workweeks,
      ...($aggregateColumns !== null ? ['aggregateColumns' => $aggregateColumns] : [])
    )
      ->when($pl, function ($q) use ($pl) {
        $this->joinPL($q, joinPpc: $pl);
      })
      ->get();

    $periodGroupBy = WipConstants::PERIOD_GROUP_BY[$period];
    $this->shiftOneDayBack($f1Trend, $period);
    $this->shiftOneDayBack($f2Trend, $period);

    $overallTrend = MergeAndAggregate::mergeAndAggregate([$f1Trend, $f2Trend], $periodGroupBy);

    return [
      'f1_trend' => $f1Trend,
      'f2_trend' => $f2Trend,
      'overall_trend' => $overallTrend,
    ];
  }

  public function deleteTodayRecords($date = null)
  {
    $date = $date ?? Carbon::today();
    return F1F2Out::where('import_date', $date)->delete();
  }


  public function insertCustomer(array $data)
  {
    F1F2Out::create($data);
  }

  public function insertManyCustomers(array $data)
  {
    $data = array_map(function ($row) {
      if (isset($row['date_loaded'])) {
        $row['date_loaded'] = \Carbon\Carbon::parse($row['date_loaded'])->format('Y-m-d H:i:s');
      }
      return $row;
    }, $data);

    F1F2Out::insert($data);
  }
}
