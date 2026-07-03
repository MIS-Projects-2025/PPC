<?php

namespace App\Services;

use App\Models\CapacityBand;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class LotScheduleCalculator
{
    private Collection $machinePlatforms; // machine_num => machine_platform
    private Collection $capacityBands;    // platform => [ {qty_min, qty_max, capacity_uph}, ... ] sorted desc by qty_min

    public function __construct()
    {
        // $this->machinePlatforms = DB::connection('qdn')
        //     ->table('machine_list')
        //     ->pluck('machine_platform', 'machine_num');

        $this->capacityBands = CapacityBand::orderByDesc('qty_min')
            ->get()
            ->groupBy('platform');
    }

    public function doable(string $lotId, int $qty): ?int
    {
        // recipe table doesn't exist yet
        return null;
    }

    public function capacityUph(?string $machine, int $qty): ?int
    {
        if (!$machine) return null;

        // $platform = $this->machinePlatforms->get($machine);
        // if (!$platform) return null;
        $platform = null;

        $band = $this->capacityBands->get($platform, collect())
            ->first(fn($b) => $qty >= $b->qty_min && ($b->qty_max === null || $qty <= $b->qty_max));

        return $band?->capacity_uph;
    }

    public function accuTime(?int $doable, ?int $capacityUph): ?float
    {
        return ($doable && $capacityUph) ? round($doable / $capacityUph, 2) : null;
    }
}
