<?php

namespace App\Jobs;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RefreshLoadingPlanSnapshots
{
    public function __construct(private array $snapshotUpdates) {}

    public function handle(): void
    {
        if (empty($this->snapshotUpdates)) return;

        $columns = ['capacity_uph_snapshot', 'accu_time'];
        $ids = array_keys($this->snapshotUpdates);

        $sets = [];
        $bindings = [];

        foreach ($columns as $column) {
            $cases = [];
            foreach ($this->snapshotUpdates as $id => $values) {
                if (!array_key_exists($column, $values)) continue;
                $cases[] = "WHEN ? THEN ?";
                $bindings[] = $id;
                $bindings[] = $values[$column];
            }
            if (empty($cases)) continue;

            $casesSql = implode(' ', $cases);
            $sets[] = "{$column} = CASE id {$casesSql} ELSE {$column} END";
        }

        if (empty($sets)) return;

        $idsPlaceholder = implode(',', array_fill(0, count($ids), '?'));
        $bindings = array_merge($bindings, $ids);

        $sql = "UPDATE loading_plan_entries
            SET " . implode(', ', $sets) . "
            WHERE id IN ({$idsPlaceholder}) AND finalized_at IS NULL";

        $affected = DB::update($sql, $bindings);

        if ($affected < count($ids)) {
            Log::info('RefreshLoadingPlanSnapshots: some rows skipped (likely finalized mid-flight)', [
                'expected' => count($ids),
                'affected' => $affected,
                'ids'      => $ids,
            ]);
        }
    }
}
