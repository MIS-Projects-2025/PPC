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

    public function __construct()
    {
        $this->machinePlatforms = QdnMachine::pluck('machine_platform', 'machine_num');

        $this->capacityBands = MachinePlatformCapacityBand::orderByDesc('qty_min')
            ->get()
            ->groupBy('platform');
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

    public function bulkRefreshCapacitySnapshots(array $updates): void
    {
        if (empty($updates)) return;

        $ids = array_keys($updates);
        $cases = collect($updates)
            ->map(fn($value, $id) => "WHEN {$id} THEN " . (is_null($value) ? 'NULL' : $value))
            ->implode(' ');

        LoadingPlanEntry::whereIn('id', $ids)
            ->whereNull('finalized_at')
            ->update([
                'capacity_uph_snapshot' => DB::raw("CASE id {$cases} END"),
            ]);
    }
}
