<?php

namespace App\Console\Commands;

use App\Models\Lot;
use App\Models\LotPosition;
use App\Models\LotStaging;
use App\Services\LotService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Process\Process;

class SimulateRace extends Command
{
    protected $signature = 'simulate:race 
                        {--slot_id=623}
                        {--cycles=5 : Number of concurrent release+receive pairs}';

    protected $description = 'Simulate concurrent release + receive race condition';

    public function handle(LotService $lotService)
    {
        $slotId = $this->option('slot_id');
        $cycles = (int) $this->option('cycles');
        $testLotId = 'RACE-TEST-' . now()->format('His');

        // ── 1. Setup ──────────────────────────────────────────
        $this->info("Setting up test lot: {$testLotId}");

        $result = $lotService->receive([
            'lot_id'      => $testLotId,
            'partname'    => 'race-test-part',
            'qty'         => 1,
            'slot_ids'    => [$slotId],
            'received_by' => 'sim_user',
        ]);

        $lotDbId = $result['lot']->id;
        $this->info("Lot created — DB id: {$lotDbId}");

        // ── 2. Rapid concurrent cycles ─────────────────────────
        $this->info("Firing {$cycles} release+receive cycles simultaneously...");

        $processes = [];

        for ($i = 0; $i < $cycles; $i++) {
            $release = new Process(['php', 'artisan', 'simulate:release-worker', $testLotId, '--delay=0']);
            $receive = new Process(['php', 'artisan', 'simulate:receive-worker', $testLotId, "--slot_id={$slotId}", '--delay=0']);

            $release->start();
            $receive->start();

            $processes[] = ['release' => $release, 'receive' => $receive, 'cycle' => $i + 1];
        }

        // wait for all
        foreach ($processes as $pair) {
            $pair['release']->wait();
            $pair['receive']->wait();

            $releaseOut = trim($pair['release']->getOutput());
            $receiveOut = trim($pair['receive']->getOutput());
            $releaseErr = trim($pair['release']->getErrorOutput());
            $receiveErr = trim($pair['receive']->getErrorOutput());

            $this->line("Cycle {$pair['cycle']}:");
            $this->line("  [RELEASE] " . ($releaseOut ?: $releaseErr));
            $this->line("  [RECEIVE] " . ($receiveOut ?: $receiveErr));
        }

        // ── 3. Final state ─────────────────────────────────────
        $lot      = Lot::find($lotDbId);
        $stagings = LotStaging::where('lot_id', $lotDbId)->orderBy('staged_at')->get();
        $positions = LotPosition::where('lot_id', $lotDbId)->orderBy('assigned_at')->get();

        $this->info('');
        $this->info('=== FINAL STATE ===');
        $this->line("lots.status        : {$lot->status}");
        $this->line("lot_stagings count : {$stagings->count()}");
        $stagings->each(fn($s) => $this->line(
            "  staging #{$s->id} cycle={$s->cycle} staged_at={$s->staged_at} released_at=" . ($s->released_at ?? 'NULL')
        ));
        $this->line("lot_positions count: {$positions->count()}");
        $positions->each(fn($p) => $this->line(
            "  position #{$p->id} slot={$p->rack_slot_id} assigned_at={$p->assigned_at} released_at=" . ($p->released_at ?? 'NULL')
        ));

        // ── 4. Integrity checks ────────────────────────────────
        $this->info('');
        $this->info('=== INTEGRITY CHECKS ===');

        $orphanedPositions  = $positions->whereNull('released_at');
        $unreleasedStagings = $stagings->whereNull('released_at');
        $bugs = 0;

        // every staging should be released except at most one (the active one)
        if ($unreleasedStagings->count() > 1) {
            $this->error("BUG: {$unreleasedStagings->count()} unreleased stagings (expected at most 1)");
            $bugs++;
        }

        // if lot is released, no staging should be unreleased
        if ($lot->status === 'released' && $unreleasedStagings->count() > 0) {
            $this->error("BUG: lot is released but has {$unreleasedStagings->count()} unreleased staging(s)");
            $bugs++;
        }

        // if lot is staged, exactly one staging should be unreleased
        if ($lot->status === 'staged' && $unreleasedStagings->count() !== 1) {
            $this->error("BUG: lot is staged but has {$unreleasedStagings->count()} unreleased staging(s) (expected 1)");
            $bugs++;
        }

        // no orphaned positions regardless of lot status
        if ($orphanedPositions->count() > 0 && $lot->status === 'released') {
            $this->error("BUG: lot is released but {$orphanedPositions->count()} position(s) have no released_at");
            $bugs++;
        }

        // staging count should match cycle count (each receive = one staging)
        if ($stagings->count() !== $cycles + 1) { // +1 for initial setup
            $this->warn("WARN: expected " . ($cycles + 1) . " stagings, got {$stagings->count()} — some cycles may have failed");
        }

        if ($bugs === 0) {
            $this->info("All checks passed ✅");
        }

        // ── 5. Cleanup ─────────────────────────────────────────
        if ($this->confirm('Clean up test lot?', true)) {
            DB::statement('SET FOREIGN_KEY_CHECKS=0');
            LotPosition::where('lot_id', $lotDbId)->delete();
            LotStaging::where('lot_id', $lotDbId)->delete();
            Lot::find($lotDbId)->delete();
            DB::statement('SET FOREIGN_KEY_CHECKS=1');
            $this->info('Cleaned up.');
        }
    }
}
