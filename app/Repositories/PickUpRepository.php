<?php

namespace App\Repositories;

use App\Traits\TrendAggregationTrait;

use Illuminate\Support\Facades\DB;
use App\Constants\WipConstants;
use App\Helpers\WipTrendParser;
use Illuminate\Support\Facades\Log;
use App\Helpers\SqlDebugHelper;
use App\Helpers\MergeAndAggregate;
use Carbon\Carbon;
use App\Models\PickUp;
use App\Models\F3Pickup;
use App\Services\BulkUpserter;

class PickUpRepository
{
  use TrendAggregationTrait;
  protected $analogCalendarRepo;
  private const aggregateColumn = [
    'SUM(pickup.QTY)' => 'total_wip',
    'COUNT(DISTINCT pickup.LOTID)' => 'total_lots'
  ];

  public function __construct(
    AnalogCalendarRepository $analogCalendarRepo,
  ) {
    $this->analogCalendarRepo = $analogCalendarRepo;
  }

  private const TABLE_NAME = 'ppc_pickupdb';
  private const PART_NAME_TABLE = 'ppc_partnamedb';

  public function getTotalQuantity($startDate, $endDate)
  {
    return DB::table(self::TABLE_NAME . ' as pickup')
      ->where('pickup.DATE_CREATED', '>=', $startDate)
      ->where('pickup.DATE_CREATED', '<', $endDate)
      ->whereIn('pickup.PARTNAME', function ($q) {
        $q->select('Partname')
          ->from(self::PART_NAME_TABLE)
          ->whereIn('PL', ['PL1', 'PL6']);
      })
      ->sum('pickup.QTY');
  }

  public function getFactoryTotalQuantityRanged($factory, $startDate, $endDate)
  {
    $factory = strtoupper($factory);

    $query = DB::table(self::TABLE_NAME . ' as pickup')
      ->where('pickup.DATE_CREATED', '>=', $startDate)
      ->where('pickup.DATE_CREATED', '<', $endDate)
      ->whereIn('pickup.PARTNAME', function ($q) use ($factory) {
        $q->select('Partname')
          ->from(self::PART_NAME_TABLE)
          ->where('Factory', $factory)
          ->whereIn('PL', ['PL1', 'PL6']);
      });

    return $query->sum('pickup.QTY');
  }

  public function getFactoryPlTotalQuantity($factory, $pl, $startDate, $endDate)
  {
    $factory = strtoupper($factory);

    $query = DB::table(self::TABLE_NAME . ' as pickup')
      ->where('pickup.DATE_CREATED', '>=', $startDate)
      ->where('pickup.DATE_CREATED', '<', $endDate)
      ->whereIn('pickup.PARTNAME', function ($q) use ($factory, $pl) {
        $q->select('Partname')
          ->from(self::PART_NAME_TABLE)
          ->where('Factory', $factory)
          ->where('PL', $pl);
      });

    return $query->sum('pickup.QTY');
  }

  public function filterByPackageName($query, ?array $packageNames)
  {
    if (is_string($packageNames)) {
      $packageNames = explode(',', $packageNames);
    }
    $packageNames = array_filter((array) $packageNames, fn($p) => !empty($p));

    if (empty($packageNames)) return $query;

    return $query->whereIn('pickup.PACKAGE', $packageNames);

    // TODO should i do this too
    // if (!empty($packageNames)) {
    //   $query->where(function ($q) use ($packageNames) {
    //     $q->where($this->wherePackageAlias('f3_pkg.package_name', $packageNames))
    //       ->orWhereIn('raw.dimension', $packageNames);
    //   });
    // }
  }


  public function getPackageSummary($chartStatus, $startDate, $endDate)
  {
    $query = DB::table(self::TABLE_NAME . ' as pickup')
      ->selectRaw('pickup.PACKAGE, SUM(pickup.QTY) as total_wip, COUNT(DISTINCT pickup.LOTID) as total_lots')
      ->where('pickup.DATE_CREATED', '>=', $startDate)
      ->where('pickup.DATE_CREATED', '<', $endDate);

    $chartStatus = strtoupper($chartStatus);

    if (in_array($chartStatus, ['F1', 'F2'])) {
      $query->whereIn('pickup.PARTNAME', function ($q) use ($chartStatus) {
        $q->select('Partname')
          ->from(self::PART_NAME_TABLE)
          ->where('Factory', $chartStatus);
      });
    } elseif ($chartStatus === 'F3') {
      $query->join('f3_pickup', 'f3_pickup.ppc_pickup_id', '=', 'pickup.id_pickup');
    } elseif (in_array($chartStatus, ['PL1', 'PL6'])) {
      $query->whereIn('pickup.PARTNAME', function ($q) use ($chartStatus) {
        $q->select('Partname')
          ->from(self::PART_NAME_TABLE)
          ->where('PL', $chartStatus);
      });
    }

    return $query
      ->groupBy('pickup.PACKAGE')
      ->orderByDesc('total_wip')
      ->get();
  }

  public function getBaseTrend($factory, $packageName, $period, $startDate, $endDate, $workweeks, $aggregate = true, $pl = null)
  {
    $query = DB::table(self::TABLE_NAME . ' as pickup');
    $query = $this->filterByPackageName($query, $packageName);

    $factory = strtoupper($factory);

    $query->whereIn('pickup.PARTNAME', function ($q) use ($factory, $pl) {
      $q->select('Partname')
        ->from(self::PART_NAME_TABLE)
        ->where('Factory', $factory);
      if ($pl) {
        $q->where('PL', strtoupper($pl));
      }
    });

    if ($aggregate) {
      $query = $this->applyTrendAggregation(
        $query,
        $period,
        $startDate,
        $endDate,
        'pickup.DATE_CREATED',
        self::aggregateColumn,
        ['pickup.PACKAGE as package'],
        workRange: $this->analogCalendarRepo->getDatesByWorkWeekRange($workweeks)['range'],
        shiftHours: 6,
      );
    } else {
      $query->where('pickup.DATE_CREATED', '>=', $startDate)
        ->where('pickup.DATE_CREATED', '<', $endDate)
        ->select('pickup.PARTNAME', 'pickup.LOTID', 'pickup.QTY', 'pickup.PACKAGE', 'pickup.LC', 'pickup.ADDED_BY', 'pickup.DATE_CREATED');
    }

    return $query;
  }

  public function getPickUpTrend($packageName, $period, $startDate, $endDate, $workweeks)
  {
    $trends = [];
    $trendsPl1 = [];
    $trendsPl6 = [];

    $prefixMapPL1 = [
      'f1_trend' => 'f1_pl1',
      'f2_trend' => 'f2_pl1',
      'f3_trend' => 'f3_pl1',
      'overall_trend' => 'overall_pl1',
    ];

    $prefixMapPL6 = [
      'f1_trend' => 'f1_pl6',
      'f2_trend' => 'f2_pl6',
      'f3_trend' => 'f3_pl6',
      'overall_trend' => 'overall_pl6',
    ];

    // $startDate = Carbon::parse($startDate)->setTime(6, 0, 0);
    // $endDate   = Carbon::parse($endDate)->addDay()->setTime(6, 0, 0);

    foreach (WipConstants::FACTORIES as $factory) {
      $key = strtolower($factory) . '_trend';
      $trends[$key]    = $this->getBaseTrend($factory, $packageName, $period, $startDate, $endDate, $workweeks);
      $trendsPl1[$key] = $this->getBaseTrend($factory, $packageName, $period, $startDate, $endDate, $workweeks, pl: 'PL1');
      $trendsPl6[$key] = $this->getBaseTrend($factory, $packageName, $period, $startDate, $endDate, $workweeks, pl: 'PL6');
    }

    $groupByOrderBy = WipConstants::PERIOD_GROUP_BY[$period];

    // --- overall union ---
    $f1Sub = DB::query()->fromSub(clone($trends['f1_trend']), 'f1')->select([...$groupByOrderBy, ...self::aggregateColumn])->selectRaw("'F1' as factory, package");
    $f2Sub = DB::query()->fromSub(clone($trends['f2_trend']), 'f2')->select([...$groupByOrderBy, ...self::aggregateColumn])->selectRaw("'F2' as factory, package");
    $f3Sub = DB::query()->fromSub(clone($trends['f3_trend']), 'f3')->select([...$groupByOrderBy, ...self::aggregateColumn])->selectRaw("'F3' as factory, package");

    $combined = $f1Sub->unionAll($f2Sub)->unionAll($f3Sub);
    $finalResults = DB::query()->fromSub($combined, 'wip_union')->select([...$groupByOrderBy, ...self::aggregateColumn, 'factory']);
    foreach ([...$groupByOrderBy, 'factory'] as $col) {
      $finalResults->orderBy($col);
    }

    // --- pl1 union ---
    $f1Pl1Sub = DB::query()->fromSub(clone($trendsPl1['f1_trend']), 'f1')->select([...$groupByOrderBy, ...self::aggregateColumn])->selectRaw("'F1' as factory, package");
    $f2Pl1Sub = DB::query()->fromSub(clone($trendsPl1['f2_trend']), 'f2')->select([...$groupByOrderBy, ...self::aggregateColumn])->selectRaw("'F2' as factory, package");
    $f3Pl1Sub = DB::query()->fromSub(clone($trendsPl1['f3_trend']), 'f3')->select([...$groupByOrderBy, ...self::aggregateColumn])->selectRaw("'F3' as factory, package");

    $combinedPl1 = $f1Pl1Sub->unionAll($f2Pl1Sub)->unionAll($f3Pl1Sub);
    $finalPl1 = DB::query()->fromSub($combinedPl1, 'wip_union_pl1')->select([...$groupByOrderBy, ...self::aggregateColumn, 'factory']);
    foreach ([...$groupByOrderBy, 'factory'] as $col) {
      $finalPl1->orderBy($col);
    }

    // --- pl6 union ---
    $f1Pl6Sub = DB::query()->fromSub(clone($trendsPl6['f1_trend']), 'f1')->select([...$groupByOrderBy, ...self::aggregateColumn])->selectRaw("'F1' as factory, package");
    $f2Pl6Sub = DB::query()->fromSub(clone($trendsPl6['f2_trend']), 'f2')->select([...$groupByOrderBy, ...self::aggregateColumn])->selectRaw("'F2' as factory, package");
    $f3Pl6Sub = DB::query()->fromSub(clone($trendsPl6['f3_trend']), 'f3')->select([...$groupByOrderBy, ...self::aggregateColumn])->selectRaw("'F3' as factory, package");

    $combinedPl6 = $f1Pl6Sub->unionAll($f2Pl6Sub)->unionAll($f3Pl6Sub);
    $finalPl6 = DB::query()->fromSub($combinedPl6, 'wip_union_pl6')->select([...$groupByOrderBy, ...self::aggregateColumn, 'factory']);
    foreach ([...$groupByOrderBy, 'factory'] as $col) {
      $finalPl6->orderBy($col);
    }

    // --- merge ---
    $trends['f1_trend']      = MergeAndAggregate::mergeAndAggregate([$trends['f1_trend']->get()], $groupByOrderBy);
    $trends['f2_trend']      = MergeAndAggregate::mergeAndAggregate([$trends['f2_trend']->get()], $groupByOrderBy);
    $trends['f3_trend']      = MergeAndAggregate::mergeAndAggregate([$trends['f3_trend']->get()], $groupByOrderBy);
    $trends['overall_trend'] = MergeAndAggregate::mergeAndAggregate([$finalResults->get()], $groupByOrderBy, ['factory']);

    $trendsPl1['f1_trend']      = MergeAndAggregate::mergeAndAggregate([$trendsPl1['f1_trend']->get()], $groupByOrderBy);
    $trendsPl1['f2_trend']      = MergeAndAggregate::mergeAndAggregate([$trendsPl1['f2_trend']->get()], $groupByOrderBy);
    $trendsPl1['f3_trend']      = MergeAndAggregate::mergeAndAggregate([$trendsPl1['f3_trend']->get()], $groupByOrderBy);
    $trendsPl1['overall_trend'] = MergeAndAggregate::mergeAndAggregate([$finalPl1->get()], $groupByOrderBy, ['factory']);

    $trendsPl6['f1_trend']      = MergeAndAggregate::mergeAndAggregate([$trendsPl6['f1_trend']->get()], $groupByOrderBy);
    $trendsPl6['f2_trend']      = MergeAndAggregate::mergeAndAggregate([$trendsPl6['f2_trend']->get()], $groupByOrderBy);
    $trendsPl6['f3_trend']      = MergeAndAggregate::mergeAndAggregate([$trendsPl6['f3_trend']->get()], $groupByOrderBy);
    $trendsPl6['overall_trend'] = MergeAndAggregate::mergeAndAggregate([$finalPl6->get()], $groupByOrderBy, ['factory']);

    $mergedTrends    = WipTrendParser::parseTrendsByPeriod($trends);
    $mergedTrendsPl1 = WipTrendParser::parseTrendsByPeriod($trendsPl1, $prefixMapPL1);
    $mergedTrendsPl6 = WipTrendParser::parseTrendsByPeriod($trendsPl6, $prefixMapPL6);

    $merged = $this->mergeTrendsByKey(
      'dateKey',
      ['label'],
      $mergedTrends,
    );

    $plMerged = $this->mergeTrendsByKey(
      'dateKey',
      ['label'],
      $mergedTrendsPl1,
      $mergedTrendsPl6
    );

    return response()->json([
      'data'       => $merged,
      'pl_data'    => $plMerged,
      'status'     => 'success',
      'message'    => 'Data retrieved successfully',
    ]);
  }

  private function upsertPickup($data = null)
  {
    $upserter = new BulkUpserter(
      new PickUp(),
      [
        'LC' => 'required|integer',
        'QTY' => 'required|integer',
        'PARTNAME' => 'required',
        'PACKAGE' => 'required',
        'LOTID' => 'required',
      ],
      attributeNames: [
        'LC' => 'LC',
        'QTY' => 'QTY',
        'PARTNAME' => 'PARTNAME',
        'PACKAGE' => 'PACKAGE',
        'LOTID' => 'LOTID',
      ]
    );

    $result = $upserter->update($data);

    if (!empty($result['errors'])) {
      throw new \Exception(
        'Some rows failed validation: ' . implode('; ', $result['errorMessages'])
      );
    }

    return $result;
  }

  public function insertMany(array $data)
  {
    $result = $this->upsertPickup($data);
    return ['status' => 'success', 'inserted' => $result['inserted'], 'updated' => $result['updated']];
  }

  public function insertF3Many(array $data)
  {
    $result = $this->upsertPickup($data);

    $rows = collect($result['inserted'])
      ->map(fn($model) => [
        'ppc_pickup_id' => $model->getKey(),
      ])
      ->toArray();

    F3Pickup::insert($rows);

    return ['status' => 'success', 'inserted' => $result['inserted'], 'updated' => $result['updated']];
  }

  public function detectDuplicates(array $rows)
  {
    $startDate = now()->subDay();
    $endDate = now();

    $query = PickUp::with(['addedBy:EMPLOYID,FIRSTNAME'])
      ->whereBetween('DATE_CREATED', [$startDate, $endDate])
      ->where(function ($q) use ($rows) {
        foreach ($rows as $row) {
          $q->orWhere(function ($q2) use ($row) {
            $q2->whereRaw('LOWER(TRIM(PARTNAME)) = ?', [strtolower(trim($row['PARTNAME']))])
              ->whereRaw('LOWER(TRIM(LOTID)) = ?', [strtolower(trim($row['LOTID']))])
              ->whereRaw('LOWER(TRIM(PACKAGE)) = ?', [strtolower(trim($row['PACKAGE']))]);
          });
        }
      })
      ->select(
        DB::raw('MIN(id_pickup) as id_pickup'),
        'PARTNAME',
        'LOTID',
        'PACKAGE',
        DB::raw('MAX(DATE_CREATED) as DATE_CREATED'),
        'ADDED_BY'
      )
      ->groupBy('PARTNAME', 'LOTID', 'PACKAGE', 'ADDED_BY')
      ->get();

    return $query->map(function ($pickup) {
      return [
        'id_pickup' => $pickup->id_pickup,
        'PARTNAME' => $pickup->PARTNAME,
        'LOTID' => $pickup->LOTID,
        'PACKAGE' => $pickup->PACKAGE,
        'DATE_CREATED' => $pickup->DATE_CREATED,
        'addedBy' => $pickup->addedBy ? [
          'EMPLOYID' => $pickup->addedBy->EMPLOYID,
          'FIRSTNAME' => $pickup->addedBy->FIRSTNAME,
        ] : null,
      ];
    });
  }
}
