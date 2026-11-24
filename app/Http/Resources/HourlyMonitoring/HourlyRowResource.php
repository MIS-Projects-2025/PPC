<?php

namespace App\Http\Resources\HourlyMonitoring;

use App\Models\HourlyRow;
use Illuminate\Http\Resources\Json\JsonResource;

/** @property HourlyRow $resource */
class HourlyRowResource extends JsonResource
{
    public function toArray($request): array
    {
        $row = $this->resource;

        // hour slot => display value (the downtime code text, or the integer output)
        $cells = [];
        foreach ($row->cells as $cell) {
            $cells[$cell->hour] = $cell->downtimeCode?->code ?? (string) $cell->output_qty;
        }

        return [
            'id'         => $row->id,
            'sort_order' => $row->sort_order,
        ] + $row->only(array_merge(array_keys($row::editableRules()), $row::readOnlyFields()))
          + ['cells' => (object) $cells];
    }
}
