<?php

namespace App\Console\Commands;

use App\Services\LotService;
use Illuminate\Console\Command;

class SimulateReceiveWorker extends Command
{
    protected $signature = 'simulate:receive-worker {lot_id} {--slot_id=623} {--delay=0}';
    protected $description = 'Worker: receive/re-stage a lot (used by simulate:race)';

    public function handle(LotService $lotService)
    {
        sleep((int) $this->option('delay'));

        try {
            $result = $lotService->receive([
                'lot_id'      => $this->argument('lot_id'),
                'partname'    => 'race-test-part',
                'qty'         => 1,
                'slot_ids'    => [(int) $this->option('slot_id')],
                'received_by' => 'sim_user',
            ]);
            $this->info("[RECEIVE] Done — status: {$result['lot']->status}");
        } catch (\Throwable $e) {
            $this->error("[RECEIVE] Failed: {$e->getMessage()}");
        }
    }
}
