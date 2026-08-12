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
    public static function current(): string
    {
        return self::forTimestamp(now());
    }

    public static function forTimestamp(Carbon $timestamp): string
    {
        return $timestamp->hour < self::CUTOFF_HOUR
            ? $timestamp->copy()->subDay()->toDateString()
            : $timestamp->toDateString();
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
