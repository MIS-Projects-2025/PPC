<?php

namespace App\Services\HourlyMonitoring;

use App\Models\PartName;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Pickup tab + the Pickup columns of the Summary tab. Read-only: nothing is stored, everything is computed from the
 * existing pickup tables of the default connection:
 *
 *   F1 / F2 : ppc_pickupdb. The factory of a lot is package_list.areas (qdn_db) of its PARTNAME (= devicename), via PartName.
 *   F3      : process_travelers. No reference needed, qty as is.
 *
 * Quantities are summed per lot and per hour slot. A slot is the hour *ending* at that time (same convention as the
 * hourly sheets: 0800H = 07:00-08:00), so the day of a sheet date runs from 07:00 to 07:00 the next morning and the
 * night shift stays with the day shift of the same sheet date.
 */
class PickupService
{
    /** The line fed by process_travelers. */
    private const TRAVELER_LINE = 'F3';

    /**
     * Lots per line, each with its quantity per hour slot.
     *
     * @return array{date: string, lines: array<string, array{rows: list<array>}>}
     */
    public function forDate(string $date): array
    {
        $byLine = array_fill_keys(config('hourly_monitoring.pickup.lines'), []);

        foreach ($this->lotSlots($date) as $r) {
            $line = (string) $r->area;

            if (! array_key_exists($line, $byLine)) {
                continue; // a part without a known factory (F1/F2/F3)
            }

            $id   = "{$line}|{$r->lot_id}|{$r->part_name}";
            $slot = (int) $r->slot;

            $byLine[$line][$id] ??= [
                'id'        => $id,
                'lot_id'    => (string) $r->lot_id,
                'part_name' => (string) $r->part_name,
                'package'   => $r->package,
                'cells'     => [],
            ];
            $byLine[$line][$id]['package'] ??= $r->package;
            $byLine[$line][$id]['cells'][$slot] = ($byLine[$line][$id]['cells'][$slot] ?? 0) + (int) $r->qty;
        }

        $lines = [];

        foreach ($byLine as $line => $rows) {
            $rows = array_values($rows);
            usort($rows, fn ($a, $b) => [$a['part_name'], $a['lot_id']] <=> [$b['part_name'], $b['lot_id']]);

            $lines[$line] = ['rows' => array_map(fn ($row) => ['cells' => (object) $row['cells']] + $row, $rows)];
        }

        return ['date' => $date, 'lines' => $lines];
    }

    /**
     * Total quantity per line and hour slot (what the Summary tab adds up).
     *
     * @return array<string, array<int, int>> [line][slot] => qty
     */
    public function totals(string $date): array
    {
        $matrix = [];

        foreach ($this->lotSlots($date) as $r) {
            $slot = (int) $r->slot;
            $matrix[$r->area][$slot] = ($matrix[$r->area][$slot] ?? 0) + (int) $r->qty;
        }

        return $matrix;
    }

    /** @return Collection<int, object{area: ?string, lot_id: string, part_name: string, package: ?string, slot: int, qty: int}> */
    private function lotSlots(string $date): Collection
    {
        [$from, $to] = $this->window($date);

        return $this->ppc($from, $to)->concat($this->travelers($from, $to));
    }

    /** [from, to) of the sheet date: slot 8 is 07:00-08:00, so the day starts at (first day slot - 1):00. */
    private function window(string $date): array
    {
        $from = CarbonImmutable::parse($date)->setTime(min(config('hourly_monitoring.day_hours')) - 1, 0);

        return [$from->toDateTimeString(), $from->addDay()->toDateTimeString()];
    }

    /** F1 / F2 (and whatever else package_list says): ppc_pickupdb joined to the part's area. */
    private function ppc(string $from, string $to): Collection
    {
        // One area per part name: package_list may repeat a devicename, which would double the quantities.
        $areas = DB::table(PartName::qualifiedTable())
            ->selectRaw('devicename, MIN(UPPER(TRIM(areas))) as area')
            ->groupBy('devicename');

        $slot = '((HOUR(p.DATE_CREATED) + 1) % 24)';

        return DB::table('ppc_pickupdb as p')
            ->joinSub($areas, 'pl', 'pl.devicename', '=', 'p.PARTNAME')
            ->where('p.DATE_CREATED', '>=', $from)
            ->where('p.DATE_CREATED', '<', $to)
            ->selectRaw("pl.area as area, p.LOTID as lot_id, p.PARTNAME as part_name, MAX(p.PACKAGE) as package, {$slot} as slot, SUM(p.QTY) as qty")
            ->groupByRaw("pl.area, p.LOTID, p.PARTNAME, {$slot}")
            ->get();
    }

    /** F3: process_travelers (soft-deleted travelers are ignored). */
    private function travelers(string $from, string $to): Collection
    {
        $slot = '((HOUR(date_created) + 1) % 24)';

        return DB::table('process_travelers')
            ->whereNull('deleted_at')
            ->where('date_created', '>=', $from)
            ->where('date_created', '<', $to)
            ->selectRaw("'" . self::TRAVELER_LINE . "' as area, lot_number as lot_id, part_number as part_name, MAX(pkg_code) as package, {$slot} as slot, SUM(qty) as qty")
            ->groupByRaw("lot_number, part_number, {$slot}")
            ->get();
    }
}
