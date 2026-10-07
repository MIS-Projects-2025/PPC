<?php

namespace App\Services;

/**
 * The ONE place that decides what group membership implies for a move
 * between two states. SchedulerService::transitionCost() and the explorer's
 * pair tester both call this, so the page can never disagree with the scheduler.
 *
 * Rules:
 *  - a state in no group is not covered: returns null (existing logic decides)
 *  - sharing at least one group means the move is free
 *  - otherwise the most specific group rule wins: fewest member states across
 *    its two groups; on a tie, the longer duration (the safe side for planning)
 *  - no applicable rule: returns null (existing logic decides)
 */
final class TransitionGroupResolver
{
    /**
     * @param  int[]     $fromGroups  group ids of the from-state
     * @param  int[]     $toGroups    group ids of the to-state
     * @param  iterable  $rules       rows with from_group_id, to_group_id, symmetric, operation_type, est_duration_minutes
     * @param  array     $sizes       group_id => member count
     * @return array{kind: string, rule: ?object, shared: int[]}|null
     */
    public static function resolve(array $fromGroups, array $toGroups, iterable $rules, array $sizes): ?array
    {
        if ($fromGroups === [] || $toGroups === []) {
            return null;
        }

        $shared = array_values(array_intersect($fromGroups, $toGroups));
        if ($shared) {
            return ['kind' => 'free', 'rule' => null, 'shared' => $shared];
        }

        $best = null;
        $bestSize = null;

        foreach ($rules as $r) {
            $forward = in_array($r->from_group_id, $fromGroups) && in_array($r->to_group_id, $toGroups);
            $reverse = $r->symmetric && in_array($r->from_group_id, $toGroups) && in_array($r->to_group_id, $fromGroups);
            if (! $forward && ! $reverse) {
                continue;
            }

            $size = ($sizes[$r->from_group_id] ?? 0) + ($sizes[$r->to_group_id] ?? 0);
            if (
                $best === null
                || $size < $bestSize
                || ($size === $bestSize && $r->est_duration_minutes > $best->est_duration_minutes)
            ) {
                $best = $r;
                $bestSize = $size;
            }
        }

        return $best ? ['kind' => 'rule', 'rule' => $best, 'shared' => []] : null;
    }
}
