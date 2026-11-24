<?php

namespace App\Helpers;

use Carbon\Carbon;

class ShiftDay
{
    private const CUTOFF_HOUR = 6; // 6:00 AM

    /**
     * The "business date" for right now. Before 6 AM, we're still inside
     * the previous calendar day's shift (e.g. 2 AM on July 17 is still
     * "July 16" for scheduling purposes).
     */
    public static function current(?string $location = null): string
    {
        return self::forTimestamp(now(), $location === 'F3' ? 12 : self::CUTOFF_HOUR);
    }

    public static function forTimestamp(Carbon $timestamp, int $cutoffHour = self::CUTOFF_HOUR): string
    {
        return $timestamp->hour < $cutoffHour
            ? $timestamp->copy()->subDay()->toDateString()
            : $timestamp->toDateString();
    }

    /**
     * [from, to) timestamps that belong to $date's business day
     * (non-F3: 06:00 -> 06:00 next day, same cutoff as current()).
     * TODO: clarify: are pickups created at 2:00 AM still belongs to the previous day?
     * well they are going to transact this to MIPS anyway, so they will be available for the next day's shift's import.
     * semi-confirmed (80% sure)
     * you fetch non-F3 pickups for the current shift day from ppc_pickupdb because they are not included on current shift day import (will be only available on the next shift day import)
     */
    public static function window(string $date): array
    {
        $from = Carbon::parse($date)->setTime(self::CUTOFF_HOUR, 0, 0);

        return [$from, $from->copy()->addDay()];
    }

    /**
     * The most recent shift day that has fully closed — the day whose
     * 6 AM cutoff just passed. Intended to be called by a job running
     * once daily at exactly 6:00 AM.
     */
    public static function lastClosed(): string
    {
        return self::forTimestamp(now()->subMinute());
    }
}
