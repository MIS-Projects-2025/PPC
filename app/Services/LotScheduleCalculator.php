<?php

namespace App\Services;

use App\Models\MachinePlatformCapacityBand;
use App\Models\QdnMachine;
use App\Models\LotQuantity;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use App\Models\LoadingPlanEntry;
use Illuminate\Support\Facades\DB;

class LotScheduleCalculator
{
    private Collection $machinePlatforms; // machine_num => machine_platform
    private Collection $machineNumById;
    private Collection $capacityBands;    // platform => [ {qty_min, qty_max, capacity_uph}, ... ]
    private Collection $packageListByDeviceName;

    public function __construct(array $dates = [], array $lotIds = [])
    {
        \Log::info('LotScheduleCalculator constructed', ['mb_start' => memory_get_usage(true) / 1048576]);

        $this->machinePlatforms = QdnMachine::pluck('machine_platform', 'machine_num');
        $this->machineNumById = QdnMachine::pluck('machine_num', 'id'); // new — id => name

        $this->capacityBands = MachinePlatformCapacityBand::orderByDesc('qty_min')
            ->get()
            ->groupBy('platform');

        Log::info('After capacityBands', ['mb' => memory_get_usage(true) / 1048576]);

        $partNames = LotQuantity::whereIn('lot_id', $lotIds)
            ->whereIn('scheduled_date', $dates)
            ->pluck('part_name')
            ->filter()
            ->unique()
            ->all();

        $query = DB::connection('qdn_db')->table('package_list')->select('id', 'devicename', 'recipe');

        if (! empty($partNames)) {
            $query->whereIn('devicename', $partNames);
        }

        $this->packageListByDeviceName = $query->get()->keyBy('devicename');

        Log::info('After packageListByDeviceName', ['mb' => memory_get_usage(true) / 1048576]);
    }

    /**
     * Recomputes a lot's quantity/capacity-derived accu_time, then propagates
     * that change forward through the machine's timeline. Always call this
     * together — recomputeTimeStartAndEnd depends on accu_time being current,
     * so calling it standalone after a stale/skipped recalculate() silently
     * computes wrong timing.
     */
    public function recalculateAndRetime(
        string $lotId,
        string $scheduledDate,
        int $machineId,
        ?string $newPartName = null,
    ): void {
        $machineName = $this->machineNumById->get($machineId);

        $this->recalculate($lotId, $scheduledDate, $machineName, $newPartName);

        $entry = LoadingPlanEntry::where('lot_id', $lotId)
            ->where('scheduled_date', $scheduledDate)
            ->first();

        if ($entry) {
            $this->recomputeTimeStartAndEnd($entry, $machineId);
        }
    }

    /**
     * Walks forward from $affectedEntry, recomputing time_start/time_end for
     * it and every row after it on the same machine — across scheduled_date
     * boundaries, since the timeline is continuous and does not reset at
     * midnight. Stops as soon as a row's newly-computed times match what's
     * already stored, since nothing downstream of that row could have changed.
     *
     * Assumes $affectedEntry.accu_time is already correct — call recalculate()
     * (or recalculateAndRetime()) before this, never after.
     */
    public function recomputeTimeStartAndEnd(LoadingPlanEntry $affectedEntry, int $machineId): void
    {
        DB::table('loading_plan_entries')
            ->where('machine_id', $machineId)
            ->where('scheduled_date', '>=', $affectedEntry->scheduled_date)
            ->lockForUpdate()
            ->get();

        $predecessor = $this->findPredecessor($affectedEntry);

        $cursor = $predecessor
            ? $predecessor->time_end
            : $this->getOrCreateDayStart($machineId, $affectedEntry->scheduled_date);

        $current = $affectedEntry;

        while ($current !== null) {
            $newStart = $cursor;
            $newEnd = (clone $cursor)->addMinutes($current->accu_time ?? 0);

            $unchanged = $current->time_start !== null
                && $current->time_end !== null
                && $current->time_start->eq($newStart)
                && $current->time_end->eq($newEnd);

            if ($unchanged) {
                break;
            }

            $current->time_start = $newStart;
            $current->time_end = $newEnd;
            $current->save();

            $cursor = $newEnd;
            $current = $this->findNextInSequence($current);
        }
    }

    /**
     * The row immediately before $entry on the same machine, chronologically —
     * may be on an earlier scheduled_date if $entry is the first row of its
     * session. Returns null if $entry is genuinely the first row this machine
     * has ever had.
     */
    private function findPredecessor(LoadingPlanEntry $entry): ?LoadingPlanEntry
    {
        return LoadingPlanEntry::where('machine_id', $entry->machine_id)
            ->where(function ($q) use ($entry) {
                $q->where('scheduled_date', '<', $entry->scheduled_date)
                    ->orWhere(function ($q2) use ($entry) {
                        $q2->where('scheduled_date', $entry->scheduled_date)
                            ->where('sequence_order', '<', $entry->sequence_order);
                    });
            })
            ->orderByDesc('scheduled_date')
            ->orderByDesc('sequence_order')
            ->first();
    }

    /**
     * The row immediately after $entry on the same machine, chronologically —
     * may be on a later scheduled_date if $entry is the last row of its session.
     * Returns null if $entry is currently the last row planned for this machine.
     */
    private function findNextInSequence(LoadingPlanEntry $entry): ?LoadingPlanEntry
    {
        return LoadingPlanEntry::where('machine_id', $entry->machine_id)
            ->where(function ($q) use ($entry) {
                $q->where('scheduled_date', '>', $entry->scheduled_date)
                    ->orWhere(function ($q2) use ($entry) {
                        $q2->where('scheduled_date', $entry->scheduled_date)
                            ->where('sequence_order', '>', $entry->sequence_order);
                    });
            })
            ->orderBy('scheduled_date')
            ->orderBy('sequence_order')
            ->first();
    }

    /**
     * The stored real start time for a machine's session on a given date.
     * Written once, the first time a row is placed for that machine+date
     * with no prior row — never overwritten after.
     */
    private function getOrCreateDayStart(int $machineId, string $scheduledDate): Carbon
    {
        $row = DB::table('machine_day_starts')
            ->where('machine_id', $machineId)
            ->where('scheduled_date', $scheduledDate)
            ->first();

        if ($row) {
            return Carbon::parse("{$scheduledDate} {$row->day_start_time}");
        }

        // No stored start yet — this is genuinely the first row ever placed
        // for this machine+date. Default anchor; adjust to your actual
        // convention (e.g. midnight, or a user-chosen time from the UI).
        $default = Carbon::parse("{$scheduledDate} 00:00:00");

        DB::table('machine_day_starts')->insert([
            'machine_id' => $machineId,
            'scheduled_date' => $scheduledDate,
            'day_start_time' => $default->format('H:i:s'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $default;
    }

    private function recalculate(string $lotId, string $scheduledDate, string $machineName, ?string $newPartName = null): void
    {
        $row = LotQuantity::where('lot_id', $lotId)
            ->where('scheduled_date', $scheduledDate)
            ->first();

        if (!$row) return;

        if ($newPartName !== null) {
            $row->part_name = $newPartName;
        }

        $effectiveQty = $row->effectiveQty();
        $packageListRow = $this->packageListByDeviceName->get($row->part_name);

        $recipe = $packageListRow?->recipe;
        $commit = ($recipe && $recipe > 0) ? (int) floor($effectiveQty / $recipe) * $recipe : null;

        $row->recipe_used = $recipe;
        $row->recipe_source_id = $packageListRow?->id;
        $row->commit = $commit;
        $row->recipe_status = match (true) {
            $recipe && $recipe > 0 && $commit === 0 => 'qty_below_recipe',
            $recipe && $recipe > 0                  => 'ok',
            default                                  => 'no_recipe',
        };

        $capacityUph = $this->capacityUph($machineName, $effectiveQty);
        $row->capacity_uph_snapshot = $capacityUph;

        $row->save();

        // accu_time stays on loading_plan_entries — lot rows only, blocks untouched
        LoadingPlanEntry::where('lot_id', $lotId)
            ->where('scheduled_date', $scheduledDate)
            ->update(['accu_time' => $this->accuTime($commit, $capacityUph)]);
    }

    public function capacityUph(?string $machine, int $qty): ?int
    {
        if (!$machine) return null;

        $platform = $this->machinePlatforms->get($machine);
        if (!$platform) {
            Log::info("capacityUph: no platform found for machine [{$machine}]");
            return null;
        }

        $band = $this->capacityBands->get($platform, collect())
            ->first(fn($b) => $qty >= $b->qty_min && ($b->qty_max === null || $qty <= $b->qty_max));

        if (!$band) {
            Log::info("capacityUph: no band matched for platform [{$platform}], qty [{$qty}]");
        }

        return $band?->capacity_uph;
    }

    public function accuTime(?int $commit, ?int $capacityUph): ?int
    {
        return ($commit && $capacityUph) ? (int) ceil(($commit / $capacityUph) * 60) : null;
    }

    public function bulkRefreshSnapshots(array $updates): void
    {
        // $updates: [entryId => ['capacity_uph_snapshot' => ?, 'accu_time' => ?]]
        if (empty($updates)) return;

        $columns = ['capacity_uph_snapshot', 'accu_time'];
        $ids = array_keys($updates);

        $sets = [];
        $bindings = [];

        foreach ($columns as $column) {
            $cases = [];
            foreach ($updates as $id => $values) {
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
            Log::info('bulkRefreshSnapshots: some rows skipped (likely finalized mid-flight)', [
                'expected' => count($ids),
                'affected' => $affected,
                'ids'      => $ids,
            ]);
        }
    }
}
