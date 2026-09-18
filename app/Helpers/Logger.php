<?php

use Illuminate\Contracts\Support\Arrayable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Log;

if (!function_exists('log_entities')) {
    /**
     * Generic line-by-line logger that handles flat, nested, or grouped collections/arrays.
     */
    function log_entities(mixed $data, string $label = 'Logged Entities', string $level = 'info'): void
    {
        // 1. Convert collection to array if needed
        if ($data instanceof Collection) {
            $data = $data->all();
        }

        // 2. Flatten nested arrays (e.g., $plan[$machineId][]) into a single flat array
        $items = is_array($data) ? Arr::flatten($data, 1) : [$data];

        Log::log($level, "=== [{$label}] Count: " . count($items) . " ===");

        foreach ($items as $index => $item) {
            if ($item instanceof Model) {
                $attributes = $item->getAttributes();
            } elseif ($item instanceof Arrayable) {
                $attributes = $item->toArray();
            } elseif (is_object($item)) {
                $attributes = (array) $item;
            } elseif (is_array($item)) {
                $attributes = $item;
            } else {
                Log::log($level, "[#{$index}] {$item}");
                continue;
            }

            $pairs = [];
            foreach ($attributes as $key => $value) {
                if (is_null($value)) {
                    $valString = 'null';
                } elseif (is_bool($value)) {
                    $valString = $value ? 'true' : 'false';
                } elseif (is_array($value) || is_object($value)) {
                    $valString = json_encode($value, JSON_UNESCAPED_SLASHES);
                } else {
                    $valString = (string) $value;
                }

                $pairs[] = "{$key}: {$valString}";
            }

            Log::log($level, implode(' | ', $pairs));
        }
    }
}
