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
        $lots  = [];

        foreach ($row->cells as $cell) {
            $display = $cell->downtimeCode?->code ?? ($cell->output_qty !== null ? (string) $cell->output_qty : null);

            if ($display !== null) {
                $cells[$cell->hour] = $display;
            }

            if ($cell->lots !== null) {
                $lots[$cell->hour] = (string) $cell->lots;
            }
        }

        $data = [
            'id'         => $row->id,
            'sort_order' => $row->sort_order,
        ] + $row->only(array_merge(array_keys($row::editableRules()), $row::readOnlyFields()))
          + ['cells' => (object) $cells];

        if ($row::hasLots()) {
            $data['hour_lots'] = (object) $lots;
        }

        return $data;
    }
}
