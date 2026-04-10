<?php

namespace App\Observers;

use App\Models\Lot;
use App\Events\LotChanged;

class LotObserver
{
    public function created(Lot $item): void
    {
        $item->loadMissing('receivedBy');
        LotChanged::dispatch($item, 'created');
    }

    public function updated(Lot $item): void
    {
        $item->loadMissing('modifiedBy');
        LotChanged::dispatch($item, 'updated');
    }

    public function deleted(Lot $item): void
    {
        $item->loadMissing('modifiedBy');
        LotChanged::dispatch($item, 'deleted');
    }
}
