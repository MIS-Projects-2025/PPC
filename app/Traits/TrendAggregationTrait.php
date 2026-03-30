<?php

namespace App\Traits;

use Illuminate\Database\Query\Builder;
use Illuminate\Support\Str;
use App\Constants\WipConstants;
use Illuminate\Support\Facades\Log;

trait TrendAggregationTrait
{
  // public function applyTrendAggregation(
  //   Builder $query,
  //   string $period = 'daily',
  //   $startDate,
  //   $endDate,
  //   string $column = 'Date_Loaded',
  //   array $aggregateColumns = [
  //     'SUM(Qty)' => 'total_wip',
  //     'COUNT(DISTINCT Lot_Id)' => 'total_lots'
  //   ],
  //   array $additionalFields = [],
  //   array $workRange = [],
  // ): Builder {
  //   $query = clone $query;
  //   $query->select([]);

  //   $groupByOrderBy = WipConstants::PERIOD_GROUP_BY[$period];

  //   $aggSelects = collect($aggregateColumns)->map(function ($alias, $expr) {
  //     if (is_int($expr)) {
  //       return str_contains($alias, ' as ') ? $alias : $alias . ' as ' . Str::slug($alias, '_');
  //     }
  //     return "$expr as $alias";
  //   })->implode(', ');

  //   $extraFields = !empty($additionalFields) ? implode(', ', $additionalFields) . ', ' : '';
  //   $groupByFields = collect($additionalFields)->map(fn($f) => preg_split('/\s+as\s+/i', $f)[0])->toArray();

  //   switch (strtolower($period)) {
  //     case 'daily':
  //       $query->selectRaw("
  //               $extraFields
  //               Date($column) as day,
  //               $aggSelects
  //           ");

  //       break;

  //     case 'weekly':
  //       $query->where(function ($q) use ($column, $workRange) {
  //         foreach ($workRange as $range) {
  //           $q->orWhere(function ($query) use ($column, $range) {
  //             $query->where($column, '>=', $range->startDate)
  //               ->where($column, '<', $range->endDate);
  //           });
  //         };
  //       });

  //       $case = implode(' ', array_map(function ($range) use ($column) {
  //         return "WHEN $column >= '{$range->startDate}' AND $column < '{$range->endDate}' THEN CONCAT('w', '{$range->workweek}')";
  //       }, $workRange));

  //       $weekCase = implode(' ', array_map(function ($range) use ($column) {
  //         return "WHEN $column >= '{$range->startDate}' AND $column < '{$range->endDate}' THEN '{$range->workweek}'";
  //       }, $workRange));

  //       $query->selectRaw("
  //             $extraFields
  //             CASE 
  //                 $case
  //                 ELSE NULL
  //             END as workweek,
  //             CASE 
  //                 $weekCase
  //                 ELSE NULL
  //             END as week,
  //             $aggSelects
  //         ");

  //       break;

  //     case 'monthly':
  //       $query->selectRaw("
  //               $extraFields
  //               YEAR($column) as year,
  //               MONTH($column) as month,
  //               $aggSelects
  //           ");

  //       break;

  //     case 'quarterly':
  //       $query->selectRaw("
  //               $extraFields
  //               YEAR($column) as year,
  //               QUARTER($column) as quarter,
  //               $aggSelects
  //           ");

  //       break;

  //     case 'yearly':
  //       $query->selectRaw("
  //               $extraFields
  //               YEAR($column) as year,
  //               $aggSelects
  //           ");

  //       break;
  //   }

  //   if (!empty($groupByFields)) {
  //     $query->groupByRaw(implode(', ', $groupByFields));
  //   }
  //   $query->groupBy($groupByOrderBy);

  //   foreach ($groupByOrderBy as $col) {
  //     $query->orderBy($col);
  //   }

  //   if ($period !== 'weekly') {
  //     $query->where($column, '>=', $startDate)
  //       ->where($column, '<', $endDate);
  //   }
  //   // Log::info("sql :D : " . SqlDebugHelper::prettify($query->toSql(), $query->getBindings()));

  //   return $query;
  // }

  public function applyTrendAggregation(
    Builder $query,
    string $period = 'daily',
    $startDate,
    $endDate,
    string $column = 'Date_Loaded',
    array $aggregateColumns = [
      'SUM(Qty)' => 'total_wip',
      'COUNT(DISTINCT Lot_Id)' => 'total_lots'
    ],
    array $additionalFields = [],
    array $workRange = [],
    int $shiftHours = 0,
  ): Builder {
    $query = clone $query;
    $query->select([]);

    $groupByOrderBy = WipConstants::PERIOD_GROUP_BY[$period];

    $shiftedColumn = $shiftHours !== 0
      ? "DATE_SUB($column, INTERVAL $shiftHours HOUR)"
      : $column;

    $aggSelects = collect($aggregateColumns)->map(function ($alias, $expr) {
      if (is_int($expr)) {
        return str_contains($alias, ' as ') ? $alias : $alias . ' as ' . Str::slug($alias, '_');
      }
      return "$expr as $alias";
    })->implode(', ');

    $extraFields = !empty($additionalFields) ? implode(', ', $additionalFields) . ', ' : '';
    $groupByFields = collect($additionalFields)->map(fn($f) => preg_split('/\s+as\s+/i', $f)[0])->toArray();

    switch (strtolower($period)) {
      case 'daily':
        $query->selectRaw("
                $extraFields
                DATE($shiftedColumn) as day,
                $aggSelects
            ");
        break;

      case 'weekly':
        if (!empty($workRange)) {
          $query->where(function ($q) use ($shiftedColumn, $workRange) {
            foreach ($workRange as $range) {
              $q->orWhere(function ($query) use ($shiftedColumn, $range) {
                $query->whereRaw("$shiftedColumn >= ?", [$range->startDate])
                  ->whereRaw("$shiftedColumn < ?",  [$range->endDate]);
              });
            }
          });

          $case = implode(' ', array_map(
            fn($range) =>
            "WHEN $shiftedColumn >= '{$range->startDate}' AND $shiftedColumn < '{$range->endDate}' THEN CONCAT('w', '{$range->workweek}')",
            $workRange
          ));

          $weekCase = implode(' ', array_map(
            fn($range) =>
            "WHEN $shiftedColumn >= '{$range->startDate}' AND $shiftedColumn < '{$range->endDate}' THEN '{$range->workweek}'",
            $workRange
          ));

          $workweekSelect = "CASE $case ELSE NULL END as workweek,
                           CASE $weekCase ELSE NULL END as week,";
        } else {
          $workweekSelect = "NULL as workweek, NULL as week,";
        }

        $query->selectRaw("
          $extraFields
          $workweekSelect
          $aggSelects
        ");

        break;

      case 'monthly':
        $query->selectRaw("
                $extraFields
                YEAR($shiftedColumn) as year,
                MONTH($shiftedColumn) as month,
                $aggSelects
            ");
        break;

      case 'quarterly':
        $query->selectRaw("
                $extraFields
                YEAR($shiftedColumn) as year,
                QUARTER($shiftedColumn) as quarter,
                $aggSelects
            ");
        break;

      case 'yearly':
        $query->selectRaw("
                $extraFields
                YEAR($shiftedColumn) as year,
                $aggSelects
            ");
        break;
    }

    if (!empty($groupByFields)) {
      $query->groupByRaw(implode(', ', $groupByFields));
    }
    $query->groupBy($groupByOrderBy);

    foreach ($groupByOrderBy as $col) {
      $query->orderBy($col);
    }

    if ($period !== 'weekly' || empty($workRange)) {
      $query->whereRaw("$shiftedColumn >= ?", [$startDate])
        ->whereRaw("$shiftedColumn < ?",  [$endDate]);
    }

    return $query;
  }

  /**
   * Merge multiple trend arrays by a key, summing numeric fields.
   *
   * @param string $keyField The key to merge on, e.g., 'dateKey'
   * @param array ...$arrays Arrays to merge
   * @return array Merged and sorted array
   */
  public function mergeTrendsByKey(string $keyField = 'dateKey', $ignore, array ...$arrays)
  {
    $merged = [];

    foreach (array_merge(...$arrays) as $item) {
      $item = (array) $item;
      $key = $item[$keyField];

      if (!isset($merged[$key])) {
        $merged[$key] = $item;
      } else {
        foreach ($item as $field => $value) {
          if ($field === $keyField || in_array($field, $ignore, true)) {
            continue;
          }

          if (isset($merged[$key][$field]) && is_numeric($merged[$key][$field]) && is_numeric($value)) {
            $merged[$key][$field] += $value;
          } else {
            $merged[$key][$field] = $value;
          }
        }
      }
    }

    // Sort by keyField
    usort($merged, fn($a, $b) => strcmp($a[$keyField], $b[$keyField]));

    return $merged;
  }
}
