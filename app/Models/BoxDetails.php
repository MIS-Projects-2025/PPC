<?php

namespace App\Support;

use Illuminate\Support\Collection;

/**
 * box_details is either one box name ("15", legacy, count in no_of_box)
 * or a list of boxes, one entry per physical box: "[15, 15, 18]" ("," or ";" both accepted).
 */
class BoxDetails
{
    public static function isList(string $raw): bool
    {
        return (bool) preg_match('/^\[.*\]$/s', trim($raw));
    }

    private static function split(string $raw): array
    {
        $raw   = trim($raw);
        $inner = self::isList($raw) ? substr($raw, 1, -1) : $raw;

        return array_values(array_filter(array_map('trim', preg_split('/[;,]/', $inner)), fn($t) => $t !== ''));
    }

    /** Identity of a box set. Unbracketed text keeps the old rule (lower + trim), so existing keys and override rows stay valid. */
    public static function key(?string $raw): string
    {
        $raw = trim((string) $raw);

        if ($raw === '' || !self::isList($raw)) {
            return mb_strtolower($raw);
        }

        $t = array_map('mb_strtolower', self::split($raw));
        sort($t, SORT_STRING);

        return '[' . implode(', ', $t) . ']';
    }

    /** One name per physical box. $dims is keyed by lower(trim(name)). */
    public static function tokens(?string $raw, ?Collection $dims = null): array
    {
        $raw = trim((string) $raw);

        if ($raw === '') {
            return [];
        }

        // A legacy name that itself contains , or ; stays one box name.
        if ($dims && $dims->has(mb_strtolower($raw))) {
            return [$raw];
        }

        return self::split($raw);
    }

    /** @return array<int, array{name:string,label:string,dimension_id:?int,boxes:int}> */
    public static function items(?string $raw, ?int $declared = null, ?Collection $dims = null): array
    {
        $tokens = self::tokens($raw, $dims);
        $items  = [];

        foreach ($tokens as $t) {
            $k = mb_strtolower($t);
            $items[$k] ??= [
                'name'         => $t,
                'label'        => $dims?->get($k)?->label ?? $t,
                'dimension_id' => $dims?->get($k)?->id,
                'boxes'        => 0,
            ];
            $items[$k]['boxes']++;
        }

        // One name only: the count column says how many ("15" x 4, or "[15]" x 4).
        if (count($tokens) === 1 && !self::isList((string) $raw)) {
            $only = array_key_first($items);
            $items[$only]['boxes'] = ($declared ?? 0) > 0 ? $declared : (self::isList((string) $raw) ? 1 : 0);
        }

        return array_values($items);
    }

    public static function label(array $items): string
    {
        return collect($items)
            ->map(fn($i) => ($i['label'] ?? $i['name']) . ($i['boxes'] > 1 ? " ×{$i['boxes']}" : ''))
            ->implode(' + ');
    }
}
