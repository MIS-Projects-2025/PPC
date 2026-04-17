<?php

namespace App\Events;

use App\Models\Lot;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class LotChanged implements ShouldBroadcastNow
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
        return [new Channel('lot-updates')];
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
