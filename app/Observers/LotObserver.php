<?php

namespace App\Observers;

use App\Models\Lot;
use App\Events\LotChanged;
use Illuminate\Support\Facades\Log;
use Throwable;

class LotObserver
{
    public function created(Lot $item): void
    {
        try {
            // Eager load relationships for the broadcast payload
            $item->load(['activePositions.rackSlot', 'positions', 'modifiedBy', 'receivedBy']);

            LotChanged::dispatch($item, 'created');
        } catch (Throwable $e) {
            Log::error("Broadcast failed on created for Lot {$item->id}: " . $e->getMessage());
        }
    }

    public function updated(Lot $item): void
    {
        try {
            $action = ($item->wasChanged('status') && $item->status === 'released')
                ? 'released'
                : 'updated';

            $item->load(['activePositions.rackSlot', 'positions', 'modifiedBy', 'receivedBy', 'releasedBy']);

            LotChanged::dispatch($item, $action);
        } catch (Throwable $e) {
            Log::error("Broadcast failed on updated for Lot {$item->id}: " . $e->getMessage());
        }
    }

    public function deleted(Lot $item): void
    {
        try {
            LotChanged::dispatch($item, 'deleted');
        } catch (Throwable $e) {
            Log::error("Broadcast failed on deleted for Lot {$item->id}: " . $e->getMessage());
        }
    }
}
