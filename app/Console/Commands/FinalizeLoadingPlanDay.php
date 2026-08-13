<?php

namespace App\Console\Commands;

use App\Models\LoadingPlanEntry;
use App\Services\LotScheduleCalculator;
use App\Helpers\ShiftDay;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class FinalizeLoadingPlanDay extends Command
{
    // TODO: VERY STALE

    protected $signature = 'loading-plan:finalize {date? : Y-m-d, defaults to the shift day that just closed}';
    protected $description = 'Freeze machine + capacity_uph + doable snapshots for a closed loading plan day';

    public function handle(LotScheduleCalculator $calc): int
    {
        $date = $this->argument('date') ?? ShiftDay::lastClosed();

        $entries = LoadingPlanEntry::where('scheduled_date', $date)
            ->whereNull('finalized_at')
            ->with('machineModel')
            ->get();

        if ($entries->isEmpty()) {
            $this->info("No unfinalized entries for {$date}.");
            return self::SUCCESS;
        }

        // Every Lot_Id that has a real lot_commits row is WIP-backed —
        // doable() for those is already frozen at insert time by the
        // trigger, so no snapshot needed. Fetch this as a set once,
        // rather than one exists() query per entry.
        $lotIds = $entries->pluck('lot_id')->filter()->unique()->values();

        $wipBackedLotIds = DB::table('ppc.lot_commits')
            ->whereIn('Lot_Id', $lotIds)
            ->pluck('Lot_Id')
            ->flip(); // for O(1) ->has() lookups below

        foreach ($entries as $entry) {
            $machineName = $entry->getMachineName();
            $effectiveQty = $entry->qty_override ?? ($entry->qty ?? 0);

            $doableSnapshot = null;

            if ($entry->entry_type === 'lot' && $entry->lot_id && !$wipBackedLotIds->has($entry->lot_id)) {
                // Manual/split lot — doableForManualLot() reads package_list
                // live, which can drift if recipes change later. Freeze it.
                $doableSnapshot = $calc->doableForManualLot($entry->part_name, $effectiveQty)['value'];
            }
            // else: block entry (no doable concept), or WIP-backed lot
            // (already frozen in lot_commits — leave snapshot null, the
            // read path falls back to the live lot_commits lookup either way).

            $entry->update([
                'machine_snapshot'      => $machineName,
                'capacity_uph_snapshot' => $calc->capacityUph($machineName, $effectiveQty),
                'doable_snapshot'       => $doableSnapshot,
                'finalized_at'          => now(),
            ]);
        }

        Log::info('Finalized loading plan day', ['date' => $date, 'count' => $entries->count()]);
        $this->info("Finalized {$entries->count()} entries for {$date}.");

        return self::SUCCESS;
    }
}
