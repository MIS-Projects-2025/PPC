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
    private Collection $capacityBands;    // platform => [ {qty_min, qty_max, capacity_uph}, ... ]
    private Collection $packageListByDeviceName;

    public function __construct(string $date, array $lotIds = [])
    {
        \Log::info('LotScheduleCalculator constructed', ['mb_start' => memory_get_usage(true) / 1048576]);

        $this->machinePlatforms = QdnMachine::pluck('machine_platform', 'machine_num');

        $this->capacityBands = MachinePlatformCapacityBand::orderByDesc('qty_min')
            ->get()
            ->groupBy('platform');

        Log::info('After capacityBands', ['mb' => memory_get_usage(true) / 1048576]);

        $partNames = LotQuantity::whereIn('lot_id', $lotIds)
            ->where('scheduled_date', $date)
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

    public function recalculate(string $lotId, string $scheduledDate, ?string $newPartName = null, ?string $machineOverride = null): void
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

        $machine = $machineOverride ?? LoadingPlanEntry::with('machineModel')
            ->where('lot_id', $lotId)
            ->where('scheduled_date', $scheduledDate)
            ->first()?->getMachineName();

        $capacityUph = $this->capacityUph($machine, $effectiveQty);
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
