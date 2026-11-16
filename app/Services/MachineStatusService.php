<?php

namespace App\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Read-only machine status from the output_monitoring schema.
 * Never throws: if the schema/tables are unreachable the plan still loads.
 */
class MachineStatusService
{
    private const CONNECTION  = 'output_monitoring';
    private const BREAKER_KEY = 'machine-status:unavailable';
    private const BREAKER_TTL = 60;   // seconds before we try the schema again
    private const CHUNK       = 500;

    private const RUN_COLS = 'lot_no, machine_id, operator_id, start_time, end_time, lot_duration, lot_qty,
        total_process, sprint_uph, total_inspected, total_passed, is_valid, invalid_reason, parsed_at';
    private const REPORT_COLS = 'lot_no, machine_id, operator_id, start_time, end_time, lot_duration, lot_qty,
        lot_ave_uph, lot_sprint_uph, total_inspect, total_pass, total_fail, total_yield, is_valid, invalid_reason, parsed_at';

    /** @return array{available: bool, byLot: array<string, array>} only lots that have data are in byLot */
    public function forLots(iterable $lotIds): array
    {
        $down = ['available' => false, 'byLot' => []];

        if (!config('database.connections.' . self::CONNECTION . '.database')) {
            return $down;
        }

        $ids = collect($lotIds)->map(fn($i) => trim((string) $i))->filter()->unique()->values()->all();
        if (!$ids) {
            return ['available' => true, 'byLot' => []];
        }

        if (rescue(fn() => Cache::has(self::BREAKER_KEY), false, false)) {
            return $down;
        }

        $runs    = $this->safely(fn() => $this->latest('lot_runs', self::RUN_COLS, $ids));
        $reports = $this->safely(fn() => $this->latest('lot_reports', self::REPORT_COLS, $ids));

        if ($runs === null && $reports === null) {   // both tables unreachable
            rescue(fn() => Cache::put(self::BREAKER_KEY, true, now()->addSeconds(self::BREAKER_TTL)), null, false);
            return $down;
        }

        $runs    ??= collect();
        $reports ??= collect();

        $byLot = [];
        foreach ($runs->keys()->merge($reports->keys())->unique() as $key) {
            $byLot[$key] = $this->present($runs->get($key), $reports->get($key));
        }

        return ['available' => true, 'byLot' => $byLot];
    }

    private function safely(callable $fn): ?Collection
    {
        try {
            return $fn();
        } catch (\Throwable $e) {
            Log::warning('Machine status source unavailable.', ['error' => $e->getMessage()]);
            return null;
        }
    }

    /** Latest row per lot_no by parsed_at, keyed by normalized lot id. */
    private function latest(string $table, string $cols, array $ids): Collection
    {
        $db   = DB::connection(self::CONNECTION);
        $rows = collect();

        foreach (array_chunk($ids, self::CHUNK) as $chunk) {
            $in = implode(',', array_fill(0, count($chunk), '?'));
            $rows = $rows->concat($db->select(
                "SELECT * FROM (
                    SELECT {$cols},
                           ROW_NUMBER() OVER (PARTITION BY lot_no ORDER BY parsed_at DESC, id DESC) AS rn
                    FROM {$table}
                    WHERE lot_no IN ({$in})
                 ) t WHERE rn = 1",
                $chunk,
            ));
        }

        return $rows->keyBy(fn($r) => $this->key($r->lot_no));
    }

    private function key(string $lotId): string
    {
        return strtoupper(trim($lotId));
    }

    private function present(?object $run, ?object $report): array
    {
        $candidates = array_values(array_filter([
            $run ? $this->normalize('Run log', $run, [
                ['Lot qty', $this->num($run->lot_qty)],
                ['Processed', $this->num($run->total_process)],
                ['Sprint UPH', $this->num($run->sprint_uph)],
                ['Inspected / passed', $run->total_inspected !== null
                    ? $this->num($run->total_inspected) . ' / ' . $this->num($run->total_passed) : null],
            ]) : null,
            $report ? $this->normalize('Report', $report, [
                ['Lot qty', $this->num($report->lot_qty)],
                ['Avg UPH', $report->lot_ave_uph],
                ['Sprint UPH', $report->lot_sprint_uph],
                ['Inspect / pass / fail', $report->total_inspect !== null
                    ? "{$report->total_inspect} / {$report->total_pass} / {$report->total_fail}" : null],
                ['Yield', $report->total_yield],
            ]) : null,
        ]));

        // valid first, then newest parse; usort is stable so the run log wins ties
        usort($candidates, fn($a, $b) => [$b['valid'], $b['parsed_at']] <=> [$a['valid'], $a['parsed_at']]);

        [$main, $other] = [$candidates[0], $candidates[1] ?? null];

        return array_filter([
            'state'   => $main['state'],
            'machine' => $main['machine'],
            'source'  => $main['source'],
            'details' => $main['details'],
            'also'    => $other
                ? "{$other['source']} also found: {$other['state']}" . ($other['machine'] ? " on {$other['machine']}" : '')
                . ", parsed {$other['parsed_at']}"
                : null,
        ], fn($v) => $v !== null);
    }

    private function normalize(string $source, object $r, array $extra): array
    {
        $valid = (int) $r->is_valid === 1;

        $state = match (true) {
            !$valid                                           => 'invalid',
            $r->end_time !== null                             => 'ended',
            $r->start_time !== null                           => 'started',
            default                                           => 'unknown',
        };

        $lines = [
            ['Source', $source],
            ...(!$valid ? [['Invalid reason', $r->invalid_reason ?? 'not given']] : []),
            ['Machine', $r->machine_id],
            ['Operator', $r->operator_id],
            ['Start', $this->dt($r->start_time)],
            ['End', $this->dt($r->end_time)],
            ['Duration', $r->lot_duration],
            ...$extra,
            ['Parsed', $this->dt($r->parsed_at)],
        ];

        return [
            'source'    => $source,
            'state'     => $state,
            'valid'     => (int) $valid,
            'machine'   => $r->machine_id,
            'parsed_at' => $this->dt($r->parsed_at),
            'details'   => array_values(array_filter($lines, fn($l) => $l[1] !== null && $l[1] !== '')),
        ];
    }

    private function dt(?string $v): ?string
    {
        return $v === null ? null : substr($v, 0, 16);   // 'Y-m-d H:i', no timezone shifting
    }

    private function num($v): ?string
    {
        return $v === null ? null : number_format((float) $v);
    }
}
