<?php

namespace App\Repositories;

use App\Models\LotRun;
use App\Repositories\Interfaces\LotRunRepositoryInterface;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

class LotRunRepository implements LotRunRepositoryInterface
{
    public function latestForLots(array $lotIds): Collection
    {
        if (empty($lotIds)) {
            return collect();
        }

        try {
            return $this->fetchLatestForLots($lotIds);
        } catch (Throwable $e) {
            // output_monitoring is a secondary data source — if it's down,
            // slow, or the schema/table is missing, the primary lots page
            // must still render. Log it so the outage is visible to us,
            // but degrade silently for the user (per requirement: blank).
            Log::warning('lot_runs lookup failed, degrading silently', [
                'error' => $e->getMessage(),
            ]);

            return collect();
        }
    }

    /**
     * One query: latest LotRun per lot_no, restricted to the given lot_ids.
     * Uses a correlated subquery (MAX(id) per lot_no) rather than N queries.
     */
    protected function fetchLatestForLots(array $lotIds): Collection
    {
        $runs = LotRun::query()
            ->valid()
            ->whereIn('lot_no', $lotIds)
            ->whereIn('id', function ($query) use ($lotIds) {
                $query->selectRaw('MAX(id)')
                    ->from('lot_runs')
                    ->where('is_valid', true)
                    ->whereIn('lot_no', $lotIds)
                    ->groupBy('lot_no');
            })
            ->get();

        return $runs->keyBy(fn(LotRun $run) => Str::lower($run->lot_no));
    }
}
