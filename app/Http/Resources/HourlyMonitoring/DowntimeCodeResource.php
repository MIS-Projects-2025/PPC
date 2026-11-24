<?php

namespace App\Http\Resources\HourlyMonitoring;

use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\DowntimeCode */
class DowntimeCodeResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'          => $this->id,
            'code'        => $this->code,
            'bg_color'    => $this->bg_color,
            'text_color'  => $this->textColor(),
            'is_downtime' => $this->is_downtime,
        ];
    }
}
