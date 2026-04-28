<?php

namespace App\Events;

use App\Models\Lot;
use App\Models\LotPosition;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class LotChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Lot $item,
        public string $action
    ) {
        $this->dontBroadcastToCurrentUser();
    }

    public function broadcastOn(): array
    {
        $productionLineId = LotPosition::where('lot_id', $this->item->id)
            ->latest('released_at')
            ->value('production_line_id');
        $channels = [new Channel('lot-updates')];

        if ($productionLineId) {
            $channels[] = new Channel("lot-updates.{$productionLineId}");
        }

        return $channels;
    }

    public function broadcastWith(): array
    {
        return [
            'action' => $this->action,
            'id'     => $this->item->id,
            'data'   => $this->item->toArray(),
            'system_source' => config('app.name'),
        ];
    }
}
