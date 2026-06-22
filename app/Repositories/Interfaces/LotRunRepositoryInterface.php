<?php

namespace App\Repositories\Interfaces;

use App\Models\LotRun;
use Illuminate\Support\Collection;

interface LotRunRepositoryInterface
{
    /**
     * Latest run per lot_id for a batch of lots, keyed by lowercased
     * lot_id for case-insensitive lookup by the caller.
     *
     * Must NEVER throw — on any failure (connection down, timeout,
     * schema missing, etc.) this returns an empty Collection so the
     * caller can treat "unavailable" the same as "no runs found".
     *
     * @param  array<string>  $lotIds
     * @return Collection<string, LotRun>
     */
    public function latestForLots(array $lotIds): Collection;
}
