<?php

namespace App\Services;

use App\Models\CustomerDataWip;
use App\Models\PpcPackageMaster;

class LoadingPlanPackageCoverage
{
    /**
     * Package names present in today's WIP data (regardless of production line)
     * that have no corresponding record in ppc_package_master at all.
     *
     * Runs its own unfiltered WIP query rather than reusing LoadingPlanController's
     * $wipRows, since that collection is already scoped to known packages only —
     * a row with an unknown package would never survive that filter to be flagged here.
     */
    public function findUnknownPackages(string $date): array
    {
        $wipPackages = CustomerDataWip::query()
            ->forDate($date)
            ->tapeReelStations()
            ->excludingPostTnr()
            ->pluck('Package_Name')
            ->filter()
            ->map(fn($p) => trim($p))
            ->unique()
            ->values();

        if ($wipPackages->isEmpty()) {
            return [];
        }

        $knownPackages = PpcPackageMaster::query()
            ->pluck('package')
            ->map(fn($p) => trim($p))
            ->unique();

        return $wipPackages
            ->reject(fn($pkg) => $knownPackages->contains($pkg))
            ->values()
            ->all();
    }
}
