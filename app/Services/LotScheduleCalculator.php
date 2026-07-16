<?php

namespace App\Services;

use App\Models\MachinePlatformCapacityBand;
use App\Models\QdnMachine;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

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

    public function doable(string $lotId, int $qty): ?int
    {
        return null;
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

    public function accuTime(?int $doable, ?int $capacityUph): ?float
    {
        return ($doable && $capacityUph) ? round($doable / $capacityUph, 2) : null;
    }
}
