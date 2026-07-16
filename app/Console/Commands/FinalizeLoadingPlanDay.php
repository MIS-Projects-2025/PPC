<?php

namespace App\Console\Commands;

use App\Models\LoadingPlanEntry;
use App\Services\LotScheduleCalculator;
use App\Support\ShiftDay;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class FinalizeLoadingPlanDay extends Command
{
    protected $signature = 'loading-plan:finalize {date? : Y-m-d, defaults to the shift day that just closed}';
    protected $description = 'Freeze machine + capacity_uph snapshots for a closed loading plan day';

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

        foreach ($entries as $entry) {
            $machineName = $entry->getMachineName();

            $entry->update([
                'machine_snapshot'      => $machineName,
                'capacity_uph_snapshot' => $calc->capacityUph($machineName, $entry->qty ?? 0),
                'finalized_at'          => now(),
            ]);
        }

        Log::info('Finalized loading plan day', ['date' => $date, 'count' => $entries->count()]);
        $this->info("Finalized {$entries->count()} entries for {$date}.");

        return self::SUCCESS;
    }
}
