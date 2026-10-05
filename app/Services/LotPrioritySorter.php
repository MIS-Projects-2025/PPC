<?php

namespace App\Services;

use Illuminate\Support\Collection;

/**
 * Each item must carry a 'sort' array:
 *   manual_expedite, cycle_time_exceed, cycle_time_exceed_residual (bool),
 *   is_res (bool), ct (?float), entry_days (?float), seq (int|float)
 * Blocks are segment boundaries and are never moved.
 */
class LotPrioritySorter
{
    public static function sortSegments(Collection $items, callable $isBlock): Collection
    {
        $result = collect();
        $segment = collect();

        foreach ($items as $item) {
            if ($isBlock($item)) {
                $result = $result->concat(self::sortSegment($segment))->push($item);
                $segment = collect();
            } else {
                $segment->push($item);
            }
        }

        return $result->concat(self::sortSegment($segment))->values();
    }

    public static function sortSegment(Collection $segment): Collection
    {
        $s = fn($row) => $row['sort'];

        $rank = fn($row) => match (true) {
            $s($row)['is_manual_expedite']         => 0,
            $s($row)['cycle_time_exceed']          => 1,
            $s($row)['cycle_time_exceed_residual'] => 2,
            default                                => 3,
        };

        $metric = fn($row) => (float) (($s($row)['is_res']
            ? $s($row)['entry_days']
            : $s($row)['ct']) ?? PHP_INT_MIN);

        $ct = fn($row) => (float) ($s($row)['ct'] ?? PHP_INT_MIN);

        return $segment->sortBy([
            fn($a, $b) => (int) ($s($b)['is_running_gtreel'] ?? false) <=> (int) ($s($a)['is_running_gtreel'] ?? false),
            fn($a, $b) => (int) $s($a)['is_res'] <=> (int) $s($b)['is_res'],
            fn($a, $b) => $rank($a) <=> $rank($b),
            fn($a, $b) => $metric($b) <=> $metric($a),
            fn($a, $b) => $ct($b) <=> $ct($a),
            fn($a, $b) => $s($a)['seq'] <=> $s($b)['seq'],
        ])->values();
    }
}
