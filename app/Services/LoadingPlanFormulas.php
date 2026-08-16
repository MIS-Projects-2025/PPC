<?php

namespace App\Services;

use App\Models\CustomerDataWip;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Model;

class LoadingPlanFormulas
{
    public const BAKE_STATIONS = [
        'GTBKLDBE_T',
        'GTIQA_T',
        'GTLPI_T',
        'GTTRANS_T',
        'GTBRAND_T',
    ];

    public ?float $ct;
    public ?float $osl;
    public bool $cycleTimeExceedResidual;
    public bool $cycleTimeExceed;
    public bool $isBakeHighlight;

    /**
     * @param Model|array|null $source A model (CustomerDataWip or similar), array, or null
     */
    public function __construct(
        Model|array|null $source = null,
        $dateLoaded = null,
        $beStarttime = null,
        $backendLeadtime = null,
        ?string $cr3 = null,
        ?float $lotEntryTimeDays = null,
        ?string $bake = null,
        ?string $station = null,
        ?int $bakeCount = null
    ) {
        // Resolve values from source object/array or explicit fallbacks
        $dateLoaded       = $dateLoaded ?? $this->resolve($source, 'Date_Loaded');
        $beStarttime      = $beStarttime ?? $this->resolve($source, 'BE_Starttime');
        $backendLeadtime  = $backendLeadtime ?? $this->resolve($source, 'Backend_Leadtime');
        $cr3              = $cr3 ?? $this->resolve($source, 'CR3');
        $lotEntryTimeDays = $lotEntryTimeDays ?? (float) $this->resolve($source, 'Lot_Entry_Time_Days');
        $bake             = $bake ?? $this->resolve($source, 'Bake');
        $station          = $station ?? $this->resolve($source, 'Station');
        $bakeCount        = $bakeCount ?? (int) $this->resolve($source, 'Bake_Count');

        // Calculations
        $this->ct = self::computeCT($dateLoaded, $beStarttime);
        $this->osl = self::computeOSL($this->ct, $backendLeadtime);

        $this->cycleTimeExceedResidual = ($cr3 === 'RES') && ($lotEntryTimeDays > 2);
        $this->cycleTimeExceed = $this->ct !== null && $this->ct > 2;

        $this->isBakeHighlight = ($bake === 'For Bake')
            && in_array($station, self::BAKE_STATIONS, true)
            && ($bakeCount === 0);
    }

    /**
     * Static factory for Model, Array, or null sources.
     */
    public static function make(Model|array|null $source = null): self
    {
        return new self($source);
    }

    /**
     * Helper to retrieve properties safely from array, Eloquent model, or object.
     */
    private function resolve(Model|array|null $source, string $key)
    {
        if (is_array($source)) {
            return $source[$key] ?? null;
        }

        if ($source instanceof Model || is_object($source)) {
            return $source->{$key} ?? null;
        }

        return null;
    }

    public static function computeCT($dateLoaded, $beStarttime): ?float
    {
        $loaded = self::toCarbon($dateLoaded);
        $start  = self::toCarbon($beStarttime);

        if (!$loaded || !$start) {
            return null;
        }

        return round(($loaded->timestamp - $start->timestamp) / 86400, 2);
    }

    public static function computeOSL(?float $ct, $backendLeadtime): ?float
    {
        if ($ct === null || $backendLeadtime === null) {
            return null;
        }

        return round($ct - (float) $backendLeadtime, 2);
    }

    public function isCycleTimeExceeded(): bool
    {
        if ($this->ct === null || $this->osl === null) {
            return false;
        }

        return $this->ct > 2 || $this->osl > 0;
    }

    private static function toCarbon($value): ?Carbon
    {
        if ($value === null || $value === '') {
            return null;
        }

        if ($value instanceof Carbon) {
            return $value;
        }

        try {
            return Carbon::parse($value);
        } catch (\Throwable $e) {
            return null;
        }
    }
}
