<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class Probe
{
    private static float $t = 0;
    private static int $q = 0;
    private static float $qms = 0;
    private static bool $listening = false;

    public static function start(string $label = 'start'): void
    {
        if (!self::$listening) {
            DB::listen(function ($query) {
                self::$q++;
                self::$qms += $query->time;
            });
            self::$listening = true;
        }
        self::$t = microtime(true);
        self::$q = 0;
        self::$qms = 0;
        Log::info("[PROBE] ---- {$label} ----");
    }

    public static function mark(string $label): void
    {
        $now = microtime(true);
        Log::info(sprintf(
            '[PROBE] %-45s %6dms | %4d queries | %6dms in SQL',
            $label,
            round(($now - self::$t) * 1000),
            self::$q,
            round(self::$qms)
        ));
        self::$t = microtime(true);
        self::$q = 0;
        self::$qms = 0;
    }
}
