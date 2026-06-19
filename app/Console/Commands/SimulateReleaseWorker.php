<?php

namespace App\Console\Commands;

use App\Services\LotService;
use Illuminate\Console\Command;

class SimulateReleaseWorker extends Command
{
    protected $signature = 'simulate:release-worker {lot_id} {--delay=0}';
    protected $description = 'Worker: release a lot (used by simulate:race)';

    public function handle(LotService $lotService)
    {
        sleep((int) $this->option('delay'));

        try {
            $lot = $lotService->release($this->argument('lot_id'), '', 'sim_user');
            $this->info("[RELEASE] Done — status: {$lot->status}");
        } catch (\Throwable $e) {
            $this->error("[RELEASE] Failed: {$e->getMessage()}");
        }
    }
}
