<?php

namespace App\Repositories;

use App\Models\BoxDimension;
use App\Models\BoxInfoOverride;
use App\Support\BoxDetails;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Read-only lookup of a scanned lot in process_travelers and ppc_pickupdb.
 *
 * Rules:
 *  - match on lot id only (trimmed, case-insensitive); partname and qty are only compared for warnings
 *  - soft-deleted process_travelers rows are ignored; newest row per table wins
 *  - lot in both tables: the newest row decides the group (the two tables never share a group)
 *  - group = (source table, box_group_id); null box_group_id = a group of one
 *  - box set = (group, box_details); no_of_box = box count of that box set
 *
 * Never throws: resolve() answers status "error" so receiving never depends on the source.
 */
class LotSourceRepository
{
    public const PT  = 'process_travelers';
    public const PPC = 'ppc_pickupdb';

    /** @return array{status:string}|array<string,mixed>  status: found | not_found | error */
    public function resolve(string $lotId): array
    {
        try {
            return $this->doResolve($lotId);
        } catch (\Throwable $e) {
            Log::warning('Lot source lookup failed', ['error' => $e->getMessage()]);

            return ['status' => 'error'];
        }
    }

    private function doResolve(string $lotId): array
    {
        $needle = mb_strtolower(trim($lotId));

        // LOWER(TRIM()) cannot use an index. Fine at this volume; revisit if the tables get large.
        $pt = DB::table(self::PT)
            ->whereNull('deleted_at')
            ->whereRaw('LOWER(TRIM(lot_number)) = ?', [$needle])
            ->orderByDesc('date_created')->orderByDesc('id')
            ->first();

        $ppc = DB::table(self::PPC)
            ->whereRaw('LOWER(TRIM(LOTID)) = ?', [$needle])
            ->orderByDesc('DATE_CREATED')->orderByDesc('id_pickup')
            ->first();

        $hits = array_values(array_filter([
            $pt ? $this->fromTraveler($pt) : null,
            $ppc ? $this->fromPickup($ppc) : null,
        ]));

        if (!$hits) {
            return ['status' => 'not_found'];
        }

        // Newest first. usort is stable, so a tie keeps process_travelers first.
        usort($hits, fn($a, $b) => strcmp((string) $b['at'], (string) $a['at']));

        $primary = $hits[0];
        $other   = $hits[1] ?? null;

        $groupKey = $primary['box_group_id']
            ? 'g:' . $primary['box_group_id']
            : 'l:' . mb_strtolower($primary['lot_id']);

        return [
            'status'       => 'found',
            'source'       => $primary['source'],
            'group_id'     => $primary['box_group_id'],
            'group_key'    => $groupKey,
            'primary'      => $primary,
            'other'        => $other,
            'lot_set_key'  => BoxDetails::key($primary['box_details']),
            'sets'         => $this->buildSets($primary['source'], $groupKey, $this->groupRows($primary)),
        ];
    }

    /** Rows of the primary's group, one per lot (newest wins when a lot was re-run). */
    private function groupRows(array $primary): array
    {
        if (!$primary['box_group_id']) {
            return [$primary];
        }

        $rows = $primary['source'] === self::PT
            ? DB::table(self::PT)->whereNull('deleted_at')
            ->where('box_group_id', $primary['box_group_id'])
            ->orderByDesc('date_created')->orderByDesc('id')->get()
            ->map(fn($r) => $this->fromTraveler($r))
            : DB::table(self::PPC)
            ->where('box_group_id', $primary['box_group_id'])
            ->orderByDesc('DATE_CREATED')->orderByDesc('id_pickup')->get()
            ->map(fn($r) => $this->fromPickup($r));

        return $rows->unique(fn($r) => mb_strtolower($r['lot_id']))->values()->all();
    }

    private function buildSets(string $source, string $groupKey, array $rows): array
    {
        $dims = BoxDimension::all()->keyBy(fn($d) => mb_strtolower(trim($d->name)));

        $overrides = BoxInfoOverride::where('box_source', $source)
            ->where('group_key', $groupKey)
            ->get()
            ->keyBy('set_key');

        $sets = [];

        foreach (collect($rows)->groupBy(fn($r) => BoxDetails::key($r['box_details'])) as $key => $members) {
            $key    = (string) $key;
            $counts = $members->pluck('no_of_box')->filter()->unique()->values();
            $origD  = $members->first()['box_details'];
            $origN  = $counts->max();
            $ov     = $overrides->get($key);

            $details = $ov ? $ov->box_details : $origD;
            $count   = $ov ? $ov->no_of_box : $origN;
            $tokens  = BoxDetails::tokens($details, $dims);
            $items   = BoxDetails::items($details, $count ? (int) $count : null, $dims);
            $total   = (int) array_sum(array_column($items, 'boxes'));
            $unknown = $items && in_array(null, array_column($items, 'dimension_id'), true);

            $issues = [];
            if (!$details) {
                $issues[] = 'no_box_details';
            } elseif (!$items || $unknown) {
                $issues[] = 'unknown_box_details'; // one unknown name makes the whole set untracked
            }
            if ($total < 1) {
                $issues[] = 'no_box_count';
            }
            if (!$ov && $count && $tokens && (count($tokens) > 1 || BoxDetails::isList((string) $details)) && (int) $count !== count($tokens)) {
                $issues[] = 'count_mismatch'; // the list wins
            }
            if (!$ov && $counts->count() > 1) {
                $issues[] = 'count_conflict'; // rows of one box set disagree: the max is used
            }

            $sets[] = [
                'key'                  => $key,
                'original_box_details' => $origD,
                'original_no_of_box'   => $origN,
                'box_details'          => $details,
                'no_of_box'            => $total ?: null,
                'items'                => $items, // [{name,label,dimension_id,boxes}]
                // Kept for the single-size case so existing UI keeps working. Mixed sets: null, use items.
                'dimension_id'         => count($items) === 1 ? $items[0]['dimension_id'] : null,
                'dimension_label'      => $items ? (count($items) === 1 ? $items[0]['label'] : BoxDetails::label($items)) : null,
                'lots'                 => $members->pluck('lot_id')->unique()->values()->all(),
                'overridden'           => (bool) $ov,
                'issues'               => $issues,
            ];
        }

        return $sets;
    }

    /** Read-only panel warnings. Scan values are compared against the source, never written. */
    public function warnings(array $match, ?string $partname, ?int $qty): array
    {
        $status = $match['status'] ?? 'error';

        if ($status === 'not_found') {
            return [['code' => 'not_found', 'message' => 'Not found in source. Lot is stocked with unknown box info, so no slot recommendation.']];
        }
        if ($status !== 'found') {
            return [['code' => 'source_error', 'message' => 'Source unavailable. Lot is stocked with unknown box info.']];
        }

        $w = [];
        $p = $match['primary'];

        if (
            filled($partname) && filled($p['partname'])
            && mb_strtolower(trim($partname)) !== mb_strtolower(trim($p['partname']))
        ) {
            $w[] = ['code' => 'partname_mismatch', 'message' => "Part name differs: scanned {$partname}, source {$p['partname']}."];
        }
        if ($qty !== null && $p['qty'] !== null && $qty !== $p['qty']) {
            $w[] = ['code' => 'qty_mismatch', 'message' => "Quantity differs: scanned {$qty}, source {$p['qty']}."];
        }
        if ($match['other']) {
            $w[] = ['code' => 'both_tables', 'message' => 'Lot is in both source tables. The newest row (' . $p['source'] . ') is used.'];
        }
        foreach ($match['sets'] as $set) {
            foreach ($set['issues'] as $issue) {
                $label = $set['original_box_details'] ?? 'no box name';
                $w[] = ['code' => $issue, 'message' => match ($issue) {
                    'unknown_box_details' => "Box \"{$label}\" is not a known box size. That box set is untracked.",
                    'no_box_details'      => 'Box name missing. That box set is untracked.',
                    'no_box_count'        => "Box count missing for \"{$label}\". That box set is untracked.",
                    'count_conflict'      => "Rows of \"{$label}\" disagree on box count. The highest is used.",
                    'count_mismatch'      => "Box count of \"{$label}\" differs from the number of boxes listed. The list is used.",
                    default               => $issue,
                }];
            }
        }

        return $w;
    }

    /** Audited correction. The first original values are kept across later corrections. */
    public function saveOverride(
        string $source,
        string $groupKey,
        string $setKey,
        ?string $originalDetails,
        ?int $originalCount,
        ?string $details,
        ?int $count,
        string $by,
    ): BoxInfoOverride {
        $keys     = ['box_source' => $source, 'group_key' => $groupKey, 'set_key' => $setKey];
        $existing = BoxInfoOverride::where($keys)->first();

        return BoxInfoOverride::updateOrCreate($keys, [
            'original_box_details' => $existing?->original_box_details ?? $originalDetails,
            'original_no_of_box'   => $existing?->original_no_of_box ?? $originalCount,
            'box_details'          => $details,
            'no_of_box'            => $count,
            'changed_by'           => $by,
        ]);
    }

    private function fromTraveler(object $r): array
    {
        return $this->row(self::PT, $r->id, $r->lot_number, $r->part_number, $r->qty, $r->box_group_id, $r->box_details, $r->no_of_box, $r->date_created ?? $r->DATE_CREATED ?? null);
    }

    private function fromPickup(object $r): array
    {
        return $this->row(self::PPC, $r->id_pickup, $r->LOTID, $r->PARTNAME, $r->QTY, $r->box_group_id, $r->box_details, $r->no_of_box, $r->DATE_CREATED ?? $r->date_created ?? null);
    }

    private function row(string $source, $rowId, $lot, $part, $qty, $gid, $details, $count, $at): array
    {
        return [
            'source'       => $source,
            'row_id'       => (int) $rowId,
            'lot_id'       => trim((string) $lot),
            'partname'     => filled($part) ? trim((string) $part) : null,
            'qty'          => $qty !== null ? (int) $qty : null,
            'box_group_id' => $gid ? (int) $gid : null,
            'box_details'  => filled($details) ? trim((string) $details) : null,
            'no_of_box'    => $count ? (int) $count : null,
            'at'           => $at ? (string) $at : null,
        ];
    }
}
