<?php

namespace App\Services\HourlyMonitoring;

use Illuminate\Support\Facades\DB;

/**
 * Summary tab. TNR (F1/F2/F3 = STD + TRAY), Pickup (F1/F2/F3), FVI (PL1/PL6) and Boxing (F1/F2/F3).
 * Only numeric output counts; downtime / non-downtime code cells and "No of lots" contribute 0.
 * Pickup is not sheet data: its hourly quantities are the lot quantities computed by PickupService.
 * The read-only package-type subtotal rows and the grand total of the TNR grid exist only in the browser.
 * Computed on the server, never stored.
 *
 * Column keys of a row: "<type>:<family>" per column ("tnr:F1", "boxing:F1", "fvi:PL1") and "<type>" for the group total.
 */
class SummaryService
{
    private const SOURCES = [
        'machine' => ['table' => 'machine_hourly_rows', 'type' => 'tnr'],
        'fvi'     => ['table' => 'fvi_hourly_rows',     'type' => 'fvi'],
        'boxing'  => ['table' => 'boxing_hourly_rows',  'type' => 'boxing'],
    ];

    /** type => [totals block title, hourly block title, detail table title] */
    private const TITLES = [
        'tnr'    => ['Tape and Reel', 'TNR Outs',    'TNR'],
        'pickup' => ['Pickup',        'Pickup',      'PICKUP'],
        'fvi'    => ['FVI Outs',      'FVI Outs',    'FVI OUTS'],
        'boxing' => ['Boxing',        'Boxing Outs', 'BOXING OUTS'],
    ];

    /** Order of the per-line detail tables under each shift (Pickup goes below FVI OUTS). */
    private const DETAIL_ORDER = ['tnr', 'boxing', 'fvi', 'pickup'];

    public function __construct(private PickupService $pickup)
    {
    }

    public function forDate(string $date): array
    {
        $groups = $this->groups();
        $matrix = $this->outputs($date); // [type][line][hour] => qty

        $day   = $this->shift(config('hourly_monitoring.day_hours'), $matrix, $groups);
        $night = $this->shift(config('hourly_monitoring.night_hours'), $matrix, $groups);

        $grand = [];
        foreach ($day['total'] as $key => $value) {
            $grand[$key] = $value + $night['total'][$key];
        }

        return [
            'date'   => $date,
            'groups' => $groups,
            'shifts' => [
                'day'   => ['label' => '7am-7pm'] + $day,
                'night' => ['label' => '7pm-7am'] + $night,
            ],
            // Totals block shown on top of each shift table.
            'totals' => [
                ['label' => '7am-7pm'] + $day['total'],
                ['label' => '7pm-7am'] + $night['total'],
                ['label' => 'Total'] + $grand,
            ],
        ];
    }

    /** First word of a line: "F1 STD" and "F1 TRAY" both belong to family "F1"; "PL1" is its own family. */
    private function family(string $line): string
    {
        return explode(' ', $line)[0];
    }

    /**
     * Type => lines of every summary group, in config('hourly_monitoring.summary_order').
     * Pickup is not a sheet type, so its lines live under hourly_monitoring.pickup.
     *
     * @return array<string, list<string>>
     */
    private function lineMap(): array
    {
        $configured = config('hourly_monitoring.lines') + ['pickup' => config('hourly_monitoring.pickup.lines')];
        $map        = [];

        foreach (config('hourly_monitoring.summary_order') as $type) {
            $map[$type] = $configured[$type];
        }

        return $map;
    }

    /** Column layout of the summary tables, in summary_order. */
    private function groups(): array
    {
        $colors = config('hourly_monitoring.line_colors', []);
        $groups = [];

        foreach ($this->lineMap() as $type => $lines) {
            $columns = [];

            foreach ($lines as $line) {
                $family = $this->family($line);

                $columns[$family] ??= [
                    'key'   => "$type:$family",
                    'label' => $family,
                    'color' => $colors[$family] ?? null,
                    'lines' => [],
                ];
                $columns[$family]['lines'][] = $line;
            }

            $groups[] = [
                'key'          => $type,
                'label'        => self::TITLES[$type][0],
                'hourly_label' => self::TITLES[$type][1],
                'columns'      => array_values($columns),
            ];
        }

        return $groups;
    }

    /** @return array<string, array<string, array<int, int>>> [type][line][hour] => qty */
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
                $matrix[$source['type']][$r->line][(int) $r->hour] = (int) $r->qty;
            }
        }

        // Pickup comes from the external pickup tables, not from hourly_cells.
        $matrix['pickup'] = $this->pickup->totals($date);

        return $matrix;
    }

    /** @param list<int> $hours */
    private function shift(array $hours, array $matrix, array $groups): array
    {
        $rows  = [];
        $total = $this->blank($groups);

        foreach ($hours as $hour) {
            $row = $this->blank($groups);

            foreach ($groups as $group) {
                foreach ($group['columns'] as $column) {
                    $qty = 0;
                    foreach ($column['lines'] as $line) {
                        $qty += $matrix[$group['key']][$line][$hour] ?? 0;
                    }

                    $row[$column['key']] = $qty;
                    $row[$group['key']] += $qty;
                }
            }

            foreach ($row as $key => $value) {
                $total[$key] += $value;
            }

            $rows[] = ['label' => $this->hourLabel($hour)] + $row;
        }

        return [
            'hours'  => array_map(fn ($h) => $this->hourLabel($h), $hours),
            'rows'   => $rows,
            'total'  => $total,
            'detail' => $this->detail($hours, $matrix),
        ];
    }

    /**
     * Per-line tables (hours across): TNR per family (STD + TRAY + Total), then Boxing, then FVI.
     *
     * @param list<int> $hours
     */
    private function detail(array $hours, array $matrix): array
    {
        $colors   = config('hourly_monitoring.line_colors', []);
        $lines    = $this->lineMap();
        $sections = [];

        foreach (self::DETAIL_ORDER as $type) {
            $blocks = [];

            foreach ($this->detailBlocks($type, $lines[$type]) as $blockLines) {
                $rows = [];
                $sum  = array_fill(0, count($hours), 0);

                foreach ($blockLines as $line) {
                    $values = [];

                    foreach ($hours as $i => $hour) {
                        $qty      = $matrix[$type][$line][$hour] ?? 0;
                        $values[] = $qty;
                        $sum[$i] += $qty;
                    }

                    $rows[] = [
                        'label'  => $line,
                        'color'  => $colors[$this->family($line)] ?? null,
                        'values' => $values,
                        'total'  => array_sum($values),
                    ];
                }

                $blocks[] = [
                    'rows'  => $rows,
                    'total' => ['label' => 'Total', 'values' => $sum, 'total' => array_sum($sum)],
                ];
            }

            $sections[] = ['key' => $type, 'title' => self::TITLES[$type][2], 'blocks' => $blocks];
        }

        return $sections;
    }

    /** TNR: one table per family (F1 STD + F1 TRAY). Boxing / FVI: one table with all lines. */
    private function detailBlocks(string $type, array $lines): array
    {
        if ($type !== 'tnr') {
            return [$lines];
        }

        $byFamily = [];
        foreach ($lines as $line) {
            $byFamily[$this->family($line)][] = $line;
        }

        return array_values($byFamily);
    }

    private function hourLabel(int $hour): string
    {
        return sprintf('%02d:00', $hour);
    }

    private function blank(array $groups): array
    {
        $blank = [];

        foreach ($groups as $group) {
            foreach ($group['columns'] as $column) {
                $blank[$column['key']] = 0;
            }
            $blank[$group['key']] = 0; // group subtotal ('tnr' / 'fvi' / 'boxing')
        }

        return $blank;
    }
}
