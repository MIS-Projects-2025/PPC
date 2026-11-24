<?php

namespace App\Services\HourlyMonitoring;

use Illuminate\Support\Facades\DB;

/**
 * Summary tab. TNR F1/F2/F3 come from the machine rows, FVI PL1/PL6 from the employee rows.
 * Only numeric output counts; downtime / non-downtime code cells contribute 0.
 * Computed on the server, never stored.
 */
class SummaryService
{
    private const SOURCES = [
        'machine' => ['table' => 'machine_hourly_rows', 'type' => 'tnr'],
        'fvi'     => ['table' => 'fvi_hourly_rows',     'type' => 'fvi'],
    ];

    public function forDate(string $date): array
    {
        $lines  = config('hourly_monitoring.lines');
        $matrix = $this->outputs($date); // [line][hour] => qty

        $day   = $this->shift(config('hourly_monitoring.day_hours'), $matrix, $lines);
        $night = $this->shift(config('hourly_monitoring.night_hours'), $matrix, $lines);

        $grand = [];
        foreach ($day['total'] as $key => $value) {
            $grand[$key] = $value + $night['total'][$key];
        }

        return [
            'date'    => $date,
            'columns' => $lines,
            'shifts'  => [
                'day'   => ['label' => '7am-7pm'] + $day,
                'night' => ['label' => '7pm-7am'] + $night,
            ],
            // Totals block shown on top of each shift table.
            'totals'  => [
                ['label' => '7am-7pm'] + $day['total'],
                ['label' => '7pm-7am'] + $night['total'],
                ['label' => 'Total'] + $grand,
            ],
        ];
    }

    /** @return array<string, array<int, int>> */
    private function outputs(string $date): array
    {
        $matrix = [];

        foreach (self::SOURCES as $morph => $source) {
            $rows = DB::table('hourly_cells as c')
                ->join("{$source['table']} as r", 'r.id', '=', 'c.rowable_id')
                ->join('hourly_sheets as s', 's.id', '=', 'r.hourly_sheet_id')
                ->where('c.rowable_type', $morph)
                ->where('s.sheet_date', $date)
                ->where('s.type', $source['type'])
                ->whereNotNull('c.output_qty')
                ->groupBy('s.line', 'c.hour')
                ->selectRaw('s.line as line, c.hour as hour, SUM(c.output_qty) as qty')
                ->get();

            foreach ($rows as $r) {
                $matrix[$r->line][(int) $r->hour] = (int) $r->qty;
            }
        }

        return $matrix;
    }

    /** @param list<int> $hours */
    private function shift(array $hours, array $matrix, array $lines): array
    {
        $rows  = [];
        $total = $this->blank($lines);

        foreach ($hours as $hour) {
            $row = $this->blank($lines);

            foreach ($lines as $type => $typeLines) {
                foreach ($typeLines as $line) {
                    $qty = $matrix[$line][$hour] ?? 0;
                    $row[$line] = $qty;
                    $row[$type] += $qty;
                }
            }

            foreach ($row as $key => $value) {
                $total[$key] += $value;
            }

            $rows[] = ['label' => sprintf('%02d:00', $hour)] + $row;
        }

        return ['rows' => $rows, 'total' => $total];
    }

    private function blank(array $lines): array
    {
        $blank = [];
        foreach ($lines as $type => $typeLines) {
            foreach ($typeLines as $line) {
                $blank[$line] = 0;
            }
            $blank[$type] = 0; // 'tnr' / 'fvi' subtotal
        }

        return $blank;
    }
}
