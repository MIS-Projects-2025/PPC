<?php

namespace App\Services;

use Carbon\Carbon;

class LoadingPlanFormulas
{
    /** CT = Date_Loaded - BE_Starttime in days, 2 dp. Both params expected as Carbon|null. */
    public static function computeCT($dateLoaded, $beStarttime): ?float
    {
        $loaded = self::toCarbon($dateLoaded);
        $start  = self::toCarbon($beStarttime);

        if (!$loaded || !$start) {
            return null;
        }

        return round(($loaded->timestamp - $start->timestamp) / 86400, 2);
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
        } catch (\Exception $e) {
            return null;
        }
    }
    /** OSL = CT - Backend_Leadtime, 2 dp. */
    public static function computeOSL(?float $ct, $backendLeadtime): ?float
    {
        if ($ct === null || $backendLeadtime === null) {
            return null;
        }

        return round($ct - (float) $backendLeadtime, 2);
    }
}
