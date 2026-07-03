<?php

namespace App\Repositories;

use App\Models\CustomerDataWip;
use App\Models\F3Wip;
use App\Traits\PackageAliasTrait;
use App\Traits\TrendAggregationTrait;
use Illuminate\Database\Query\Builder;
use App\Repositories\PackageGroupRepository;
use App\Repositories\AnalogCalendarRepository;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use App\Constants\WipConstants;
use App\Services\PackageFilters\PackageFilterService;
use Illuminate\Support\Facades\Log;
use App\Helpers\SqlDebugHelper;
use Carbon\Carbon;

class F1F2WipRepository
{
  use PackageAliasTrait;
  use TrendAggregationTrait;

  private const F1F2_TABLE = "customer_data_wip";
  private const DISTINCT_PACKAGE_CACHE_KEY = 'distinct_packages';
  private const DISTINCT_STATION_CACHE_KEY = 'f1f2_distinct_stations';
  private const CACHE_HOURS = 23;
  private const PPC_TABLE = "ppc_productionline_packagereference";
  protected $packageFilterService;
  protected $packageGroupRepo;
  protected $analogCalendarRepo;


  public function __construct(
    PackageFilterService $packageFilterService,
    AnalogCalendarRepository $analogCalendarRepo,
    PackageGroupRepository $packageGroupRepo
  ) {
    $this->packageFilterService = $packageFilterService;
    $this->analogCalendarRepo = $analogCalendarRepo;
    $this->packageGroupRepo = $packageGroupRepo;
  }

  private const KEYS = [
    'Plant',
    'Part_Name',
    'Lead_Count',
    'Package_Name',
    'Lot_Id',
    'Station',
    'Qty',
    'Lot_Type',
    'Prod_Area',
    'Lot_Status',
    'Date_Loaded',
    'Start_Time',
    'Part_Type',
    'Part_Class',
    'Date_Code',
    'Focus_Group',
    'Process_Group',
    'Bulk',
    'Reqd_Time',
    'Lot_Entry_Time',
    'Stage',
    'Stage_Start_Time',
    'CCD',
    'Stage_Run_Days',
    'Lot_Entry_Time_Days',
    'Tray',
    'Backend_Leadtime',
    'OSL_Days',
    'BE_Group',
    'Strategy_Code',
    'CR3',
    'BE_Starttime',
    'BE_OSL_Days',
    'Body_Size',
    'Auto_Part',
    'Ramp_Time',
    'End_Customer',
    'Bake',
    'Bake_Count',
    'Test_Lot_Id',
    'Stock_Position',
    'Assy_Site',
    'Bake_Time_Temp',
    'imported_by'
  ];

  public static function getImportKey()
  {
    return "f1f2_wip";
  }

  public static function getKeys(): array
  {
    return self::KEYS;
  }

  public function insertCustomer(array $data)
  {
    CustomerDataWip::create($data);
  }

  public function insertF3(array $data)
  {
    F3Wip::create($data);
  }

  // public function insertManyCustomers(array $data)
  // {
  //   $uniqueKeys = ['Lot_Id', 'Date_Loaded'];;

  //   $allColumns = array_keys($data[0]);
  //   $updateColumns = array_diff($allColumns, $uniqueKeys);

  //   CustomerDataWip::upsert(
  //     $data,
  //     $uniqueKeys,
  //     $updateColumns
  //   );
  // }

  public function insertManyCustomers(array $data)
  {
    $data = array_map(function ($row) {
      if (isset($row['Date_Loaded'])) {
        $row['Date_Loaded'] = \Carbon\Carbon::parse($row['Date_Loaded'])->format('Y-m-d H:i:s');
      }
      return $row;
    }, $data);

    CustomerDataWip::insert($data);

    $this->upsertLotRegistry($data);
  }

  private function upsertLotRegistry(array $data): void
  {
    $now = now();
    $rows = [];
    $seen = [];

    foreach ($data as $row) {
      $lotId = $row['Lot_Id'] ?? null;
      if (!$lotId || isset($seen[$lotId])) {
        continue; // guard against duplicate Lot_Id within the same chunk
      }
      $seen[$lotId] = true;

      $rows[] = [
        'Lot_Id'       => $lotId,
        'Part_Name'    => $row['Part_Name'] ?? null,
        'Package_Name' => $row['Package_Name'] ?? null,
        'Qty'          => $row['Qty'] ?? null,
        'first_seen'   => $now,
        'last_seen'    => $now,
      ];
    }

    if (!empty($rows)) {
      DB::table('lot_registry')->upsert(
        $rows,
        ['Lot_Id'],
        ['Part_Name', 'Package_Name', 'Qty', 'last_seen']
      );
    }
  }

  public function applyStationFilter($query, array $includeStations = [], array $excludeStations = []): Builder
  {
    // $query->where(function ($q) use ($includeStations, $excludeStations) {
    //   $q->whereIn('wip.Station', $includeStations)
    //     ->orWhere(function ($q2) use ($excludeStations) {
    //       $q2->where('wip.station_suffix', '=', '_T')
    //         ->whereNotIn('wip.Station', $excludeStations);
    //     });
    // });

    $query->whereIn('wip.Station', $includeStations);

    return $query;
  }

  public function joinPL($query, $partName = [], $joinPpc = ''): Builder
  {
    // $query->join(self::PPC_TABLE . ' as plref', 'wip.Package_Name', '=', 'plref.Package');

    if ($joinPpc == 'PL1') {
      $query->Where('wip.production_line', 'PL1');
    }

    if ($joinPpc == 'PL6') {
      $query->where('wip.production_line', 'PL6');
    }

    return $query;
  }

  public static function applyF1Filters($query, $excludedPlant, ?string $alias)
  {
    $prefix = $alias ? "{$alias}." : '';

    return $query
      ->where("{$prefix}f1_focus_group_flag", true)
      ->where("{$prefix}Plant", '!=', $excludedPlant);
  }

  public function applyF2Filters($query, array $excludedStation = [], ?string $alias = null)
  {
    $prefix = $alias ? "{$alias}." : '';

    $stations = $this->getDistinctStations();
    $stations = array_diff($stations, $excludedStation);

    $query->where("{$prefix}f2_focus_group_flag", true);

    if (!empty($excludedStation)) {
      // $query->whereNotIn("{$prefix}Station", $excludedStation);
      $query->whereIn("{$prefix}Station", $stations);
    }

    return $query;
  }

  public function f1Filters($query, $includedStations = [], $excludedStations = [], ?string $alias = null)
  {
    $query = $this->applyF1Filters($query, WipConstants::F1_EXCLUDED_PLANT, $alias);

    $stations = array_merge($this->getSuffixStation_T(), $includedStations);
    $stations = array_diff($stations, WipConstants::EXCLUDED_F1F2_STATIONS);

    $query = $this->applyStationFilter($query, $stations, $excludedStations);
    return $query;
  }

  public function filterByPackageName($query, ?array $packageNames, $factories): Builder
  {
    $query = $this->packageFilterService->applyPackageFilter($query, $packageNames, $factories, 'wip.Package_Name');
    return $query;
  }

  public function deleteTodayRecords($date = null)
  {
    $date = $date ?? Carbon::today();
    return CustomerDataWip::where('import_date', $date)->delete();
  }

  public function getTrend(
    $factory,
    $packageName,
    $period,
    $startDate,
    $endDate,
    $workweeks = "",
    $selectColumns = ['wip.Date_Loaded as date_loaded', 'wip.Qty as qty', 'wip.Lot_Id as lot_id', 'wip.Package_Name as package_name'],
    $aggregateColumns = null,
    $additionalFields = [],
  ) {
    $selectColumns = !empty($selectColumns) ? implode(', ', $selectColumns) : "1";

    if ($aggregateColumns === null) {
      $aggregateColumns = WipConstants::FACTORY_AGGREGATES[$factory]['wip']['wip-lot'];
    }

    switch ($factory) {
      case 'F1F2':
        $f1f2 = DB::table(self::F1F2_TABLE . ' as wip')
          ->selectRaw($selectColumns)
          ->where(function ($sub) {
            $sub->orWhere(fn($q) => $this->f1Filters(
              $q,
              WipConstants::REEL_TRANSFER_B3,
              WipConstants::REEL_TRANSFER_EXCLUDED_STATIONS_F1,
              'wip'
            ));

            $sub->orWhere(fn($q) => $this->applyF2Filters(
              $q,
              WipConstants::EWAN_PROCESS,
              'wip'
            ));
          });
        $query = $this->filterByPackageName($f1f2, $packageName, [$factory]);
        break;

      case 'F1':
        $query = DB::table(self::F1F2_TABLE . ' as wip')
          ->selectRaw($selectColumns);
        $query = $this->f1Filters(
          $query,
          WipConstants::REEL_TRANSFER_B3,
          WipConstants::REEL_TRANSFER_EXCLUDED_STATIONS_F1,
          'wip'
        );
        $query = $this->filterByPackageName($query, $packageName, [$factory]);
        break;

      case 'F2':
        $query = DB::table(self::F1F2_TABLE . ' as wip')
          ->selectRaw($selectColumns);
        $query = $this->applyF2Filters($query, WipConstants::EWAN_PROCESS, 'wip');
        $query = $this->filterByPackageName($query, $packageName, [$factory]);
        break;

      default:
        throw new \InvalidArgumentException("Unknown factory: $factory");
    }

    if ($aggregateColumns === false) {
      // just apply date filters
      $dateColumn = WipConstants::FACTORY_AGGREGATES[$factory]['wip']['dateColumn'];
      $query = $query->where($dateColumn, '>=', $startDate)
        ->where($dateColumn, '<', $endDate);
      return $query;
    }

    return $this->applyTrendAggregation(
      $query,
      $period,
      $startDate,
      $endDate,
      column: WipConstants::FACTORY_AGGREGATES[$factory]['wip']['dateColumn'],
      aggregateColumns: $aggregateColumns,
      additionalFields: $additionalFields,
      workRange: $this->analogCalendarRepo->getDatesByWorkWeekRange($workweeks)['range'],
    );
  }

  public function refreshDistinctPackagesCache(): void
  {
    Cache::forget(self::DISTINCT_PACKAGE_CACHE_KEY);

    $packages = DB::table(self::F1F2_TABLE)
      ->select('Package_Name')
      ->distinct()
      ->pluck('Package_Name');

    Cache::put(self::DISTINCT_PACKAGE_CACHE_KEY, $packages, now()->addHours(value: self::CACHE_HOURS));
  }

  // TODO ? refreshDistinctStationsCache

  public function getDistinctPackages()
  {
    return Cache::remember(self::DISTINCT_PACKAGE_CACHE_KEY, now()->addHours(self::CACHE_HOURS), function () {
      return DB::table(self::F1F2_TABLE)
        ->whereNotNull('Package_Name')
        ->where('Package_Name', '!=', '')
        ->distinct()
        ->orderBy('Package_Name')
        ->pluck('Package_Name')
        ->toArray();
    });
  }

  public function getDistinctStations()
  {
    return Cache::remember(
      self::DISTINCT_STATION_CACHE_KEY,
      now()->addHours(self::CACHE_HOURS),
      function () {

        return DB::table(self::F1F2_TABLE)
          ->select('Station')
          ->distinct()
          ->orderBy('Station')
          ->pluck('Station')
          ->toArray();
      }
    );
  }

  public function getSuffixStation_T()
  {
    $stations = $this->getDistinctStations();

    return array_filter($stations, function ($station) {
      return str_ends_with($station, '_T');
    });
  }
}
