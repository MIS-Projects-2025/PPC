<?php

namespace App\Services;

use App\Models\MachinePlatformCapacityBand;
use App\Models\QdnMachine;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use App\Models\LoadingPlanEntry;
use Illuminate\Support\Facades\DB;

class LotScheduleCalculator
{
    private Collection $machinePlatforms; // machine_num => machine_platform
    private Collection $capacityBands;    // platform => [ {qty_min, qty_max, capacity_uph}, ... ]
    private Collection $packageListByDeviceName;

    public function __construct()
    {
        $this->machinePlatforms = QdnMachine::pluck('machine_platform', 'machine_num');

        $this->capacityBands = MachinePlatformCapacityBand::orderByDesc('qty_min')
            ->get()
            ->groupBy('platform');

        $this->packageListByDeviceName = DB::connection('qdn_db')
            ->table('package_list')
            ->get()
            ->keyBy('devicename');
    }

    /**
     * @param  int  $customerDataId
     * @param  Collection  $commitsByCustomerDataId  keyed by customer_data_id (ppc.lot_commits rows)
     * @param  Collection  $packageListById          keyed by id (qdn_db.package_list rows)
     */
    public function doable(
        int $customerDataId,
        Collection $commitsByCustomerDataId,
        Collection $packageListById
    ): array {
        $commit = $commitsByCustomerDataId->get($customerDataId);

        if (!$commit) {
            return [
                'value' => null,
                'status' => 'unknown',
                'recipeSource' => null,
            ];
        }

        $status = match (true) {
            $commit->recipe_status === 'no_recipe' => 'no_recipe',
            $commit->commit === 0 => 'qty_below_recipe',
            default => 'ok',
        };

        $recipeSource = null;
        if ($commit->recipe_source_id) {
            $packageListRow = $packageListById->get($commit->recipe_source_id);

            if ($packageListRow) {
                $recipeSource = [
                    'id' => $packageListRow->id,
                    'devicename' => $packageListRow->devicename,
                    'recipe' => $commit->recipe_used,
                    'packageType' => $packageListRow->package_type,
                ];
            }
        }

        return [
            'value' => $commit->commit,
            'status' => $status,
            'recipeSource' => $recipeSource,
        ];
    }

    /** Manual lots / split children: no customer_data_id, no trigger, no
     *  lot_commits row — replicate the trigger's own logic here instead,
     *  keyed by part_name (devicename) since that's all these lots have. */
    public function doableForManualLot(?string $partName, int $qty): array
    {
        if (!$partName) {
            return ['value' => null, 'status' => 'unknown', 'recipeSource' => null];
        }

        $packageListRow = $this->packageListByDeviceName->get($partName);

        if (!$packageListRow || !$packageListRow->recipe || $packageListRow->recipe <= 0) {
            return ['value' => null, 'status' => 'no_recipe', 'recipeSource' => null];
        }

        $commit = (int) floor($qty / $packageListRow->recipe) * $packageListRow->recipe;

        return [
            'value' => $commit,
            'status' => $commit === 0 ? 'qty_below_recipe' : 'ok',
            'recipeSource' => [
                'id' => $packageListRow->id,
                'devicename' => $packageListRow->devicename,
                'recipe' => $packageListRow->recipe,
                'packageType' => $packageListRow->package_type,
            ],
        ];
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

    public function accuTime(?int $doable, ?int $capacityUph): ?int
    {
        return ($doable && $capacityUph) ? ceil(($doable / $capacityUph) * 60) : null;
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
