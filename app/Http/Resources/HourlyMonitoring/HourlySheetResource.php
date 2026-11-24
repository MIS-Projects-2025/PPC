<?php

namespace App\Http\Resources\HourlyMonitoring;

use App\Models\HourlySheet;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property HourlySheet $resource  (machineRows/fviRows with cells.downtimeCode must be loaded) */
class HourlySheetResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'   => $this->id,
            'type' => $this->type,
            'line' => $this->line,
            'date' => $this->sheet_date->toDateString(),
            'urls' => [
                'show' => route('hourly-monitoring.sheets.show', $this->id),
                'rows' => route('hourly-monitoring.sheets.rows.store', $this->id), // POST add, PATCH changes, DELETE {url}/{id}
            ],
            'rows' => HourlyRowResource::collection($this->resource->loadedRows())->resolve(),
        ];
    }
}
