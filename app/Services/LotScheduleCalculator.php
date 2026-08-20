<?php

namespace App\Services;

use App\Models\MachinePlatformCapacityBand;
use App\Models\QdnMachine;
use App\Models\LotQuantity;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use App\Models\LoadingPlanEntry;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class LotScheduleCalculator
{
    private Collection $machinePlatforms; // machine_num => machine_platform
    private Collection $machineNumById;
    private Collection $capacityBands;    // platform => [ {qty_min, qty_max, capacity_uph}, ... ]
    private ?Collection $packageListByDeviceName = null;
    private array $dates;
    private array $lotIds;

    public function __construct(array|Collection $dates = [], array|Collection $lotIds = [])
    {
        $this->machinePlatforms = QdnMachine::pluck('machine_platform', 'machine_num');
        $this->machineNumById = QdnMachine::pluck('machine_num', 'id');

        $this->capacityBands = MachinePlatformCapacityBand::orderByDesc('qty_min')
            ->get()
            ->groupBy('platform');

        // Converts Collection or array into a plain array
        $this->dates = collect($dates)->all();
        $this->lotIds = collect($lotIds)->all();
    }

    /**
     * Explicitly loads the devicename => package_list row map. Must be called
     * before recalculate()/recalculateAndRetime() — those throw otherwise.
     * Scoped to the $lotIds/$dates passed to the constructor when both were
     * non-empty; loads the full package_list table (~20k rows) unfiltered
     * otherwise. Callers that never touch recalculate() should skip calling
     * this entirely — it's the expensive part of this class.
     */
    public function loadPackageList(): static
    {
        if ($this->packageListByDeviceName !== null) {
            return $this; // already loaded, no-op
        }

        $partNames = LotQuantity::whereIn('lot_id', $this->lotIds)
            ->whereIn('scheduled_date', $this->dates)
            ->pluck('part_name')
            ->filter()
            ->unique()
            ->all();

        $query = DB::connection('qdn_db')->table('package_list')->select('id', 'devicename', 'recipe');

        if (! empty($partNames)) {
            $query->whereIn('devicename', $partNames);
        }

        $this->packageListByDeviceName = $query->get()->keyBy('devicename');

        return $this;
    }

    /**
     * Recomputes a lot's quantity/capacity-derived accu_time, then propagates
     * that change forward through the machine's timeline. Always call this
     * together — recomputeTimeStartAndEnd depends on accu_time being current,
     * so calling it standalone after a stale/skipped recalculate() silently
     * computes wrong timing.
     */
    public function recalculateAndRetime(
        LoadingPlanEntry|int $lotEntryId,
        ?int $machineId,
        ?string $newPartName = null,
    ): void {
        $entry = $lotEntryId instanceof LoadingPlanEntry
            ? $lotEntryId
            : LoadingPlanEntry::findOrFail($lotEntryId);

        $machineName = $machineId !== null ? $this->machineNumById->get($machineId) : null;

        $this->recalculate($entry, $machineName, $newPartName);

        if ($machineId === null) {
            return;
        }

        $this->recomputeTimeStartAndEnd($entry, $machineId);
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
        $date = $affectedEntry->scheduled_date->toDateString();

        DB::table('loading_plan_entries')
            ->where('machine_id', $machineId)
            ->where('scheduled_date', '>=', $affectedEntry->scheduled_date)
            ->lockForUpdate()
            ->get();

        $predecessor = $this->findPredecessor($affectedEntry);

        $cursor = ($predecessor && $predecessor->time_end !== null)
            ? $predecessor->time_end
            : $this->getOrCreateDayStart($machineId, $date);
        // var_dump('predecessor:', $predecessor?->id, $predecessor?->time_end, 'cursor:', $cursor);
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
    public function findPredecessor(LoadingPlanEntry $entry): ?LoadingPlanEntry
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
     * If this machine+date already has a stored start, returns it. Otherwise,
     * this is genuinely the first row ever placed for this machine+date — its
     * own chosen/computed start time becomes the stored anchor going forward.
     */
    private function getOrCreateDayStart(int $machineId, string $date, ?Carbon $firstLotStart = null): Carbon
    {
        $row = DB::table('machine_day_starts')
            ->where('machine_id', $machineId)
            ->where('scheduled_date', $date)
            ->first();

        if ($row) {
            return Carbon::parse("{$date} {$row->day_start_time}");
        }

        // No predecessor row exists on ANY prior date for this machine either —
        // this really is the very first lot this machine has ever had. Anchor
        // to midnight only in that bootstrap case.
        $anchor = $firstLotStart ?? Carbon::parse("{$date} 00:00:00");

        DB::table('machine_day_starts')->insert([
            'machine_id' => $machineId,
            'scheduled_date' => $date,
            'day_start_time' => $anchor->format('H:i:s'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $anchor;
    }

    private function recalculate(LoadingPlanEntry $entry, ?string $machineName, ?string $newPartName = null): void
    {
        if ($this->packageListByDeviceName === null) {
            throw new \LogicException(
                'LotScheduleCalculator::recalculate() called without loadPackageList() first. '
                    . 'Call $calculator->loadPackageList() after construction if this instance needs recalculation.'
            );
        }

        $lotQuantity = $entry->getQuantityRow();
        if (!$lotQuantity) return;

        if ($newPartName !== null) {
            $lotQuantity->part_name = $newPartName;
        }

        $effectiveQty = $lotQuantity->effectiveQty();
        $packageListRow = $this->packageListByDeviceName->get($lotQuantity->part_name);

        $recipe = $packageListRow?->recipe;
        $commit = ($recipe && $recipe > 0) ? (int) floor($effectiveQty / $recipe) * $recipe : null;

        $lotQuantity->recipe_used = $recipe;
        $lotQuantity->recipe_source_id = $packageListRow?->id;
        $lotQuantity->commit = $commit;
        $lotQuantity->recipe_status = match (true) {
            $recipe && $recipe > 0 && $commit === 0 => 'qty_below_recipe',
            $recipe && $recipe > 0                  => 'ok',
            default                                 => 'no_recipe',
        };

        $capacityUph = $this->capacityUph($machineName, $effectiveQty);
        $lotQuantity->capacity_uph_snapshot = $capacityUph;

        $lotQuantity->save();

        // write directly onto the caller's instance, not a separate query —
        // keeps $entry->accu_time correct in-memory for whatever runs next
        $entry->accu_time = $this->accuTime($commit, $capacityUph);
        $entry->save();
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
