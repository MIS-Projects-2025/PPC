<?php

namespace App\Services;

use App\Models\BoxDimension;
use App\Models\Lot;
use App\Models\LotPosition;
use App\Models\LotStaging;
use App\Models\PlacementRecommendation;
use App\Models\PlacementSetting;
use App\Models\RackSlot;
use App\Repositories\LotSourceRepository;
use App\Support\BoxDetails;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

/**
 * Placement recommendation engine (requirements sections 5 and 6).
 *
 * Capacity is tracked as used length per lane, not box positions. Anything the model cannot
 * trust (tub slot, no geometry, a lot without dimension or box count) marks the slot untracked,
 * and untracked slots are never recommended. When unsure: no recommendation.
 *
 * Phase 2a adds forRequest() (the visible recommendation, advisory and fail-open), the per-page
 * kill switch, and linking a shown recommendation to the staging that commits it.
 */
class RecommendationService
{
    private const DEFAULTS = [
        'column_gap'       => 10.0,
        'end_margin'       => 10.0,
        'height_clearance' => 10.0,
        'utilization_cap'  => 0.85,
    ];

    public function __construct(protected LotSourceRepository $source) {}

    private ?array $settings = null;

    /** Test hook: pin the allowances without touching the database. */
    public function useSettings(array $settings): static
    {
        $this->settings = $settings + self::DEFAULTS;

        return $this;
    }

    /** Slots left untracked by missing/invalid box info (not tub or unmeasured slots). For the rack page indicator. */
    public function untrackedSummary(int $rackPageId): array
    {
        try {
            $labels = [];

            foreach ($this->snapshot($rackPageId) as $st) {
                if (!$st['tracked'] && $st['untracked_reason'] === 'unknown_box_info') {
                    $labels[] = $st['label'];
                }
            }

            natsort($labels);

            return ['count' => count($labels), 'labels' => array_slice(array_values($labels), 0, 30)];
        } catch (\Throwable $e) {
            return ['count' => 0, 'labels' => []];
        }
    }

    // ------------------------------------------------------------------
    // Kill switch (per rack page, no deploy needed)
    // ------------------------------------------------------------------

    public function isVisible(int $rackPageId): bool
    {
        try {
            return (float) PlacementSetting::where('key', "recommendations_visible:{$rackPageId}")->value('value') > 0;
        } catch (\Throwable $e) {
            return false;
        }
    }

    // ------------------------------------------------------------------
    // Visible recommendation (phase 2a)
    // ------------------------------------------------------------------

    public function forRequest(array $in): array
    {
        $out    = ['id' => null, 'slots' => [], 'reason' => null, 'plan' => [], 'joins' => false];
        $pageId = (int) $in['rack_page_id'];

        $visible = $this->isVisible($pageId);

        $code  = trim((string) $in['lot_id']);
        $match = $in['match'] ?? ['status' => 'error'];
        $rows  = null;

        try {
            if (($match['status'] ?? null) !== 'found') {
                $out['reason'] = ($match['status'] ?? null) === 'not_found' ? 'not_found' : 'source_error';
            } else {
                $partname = filled($in['partname'] ?? null) ? trim($in['partname']) : null;
                $lot      = $this->findLot($code, $partname);

                if ($lot?->status === 'staged') {
                    $out['reason'] = 'already_staged';
                } else {
                    $staged  = $this->stagedSets($match);
                    $key     = $match['lot_set_key'];
                    $scanned = collect($match['sets'])->firstWhere('key', $key);

                    if (isset($staged[$key])) {
                        // Same box set already in the rack: the lot joins those slots, no extra capacity.
                        $labels = RackSlot::whereIn('id', $staged[$key]['slot_ids'])->pluck('label', 'id');
                        $out['joins'] = true;
                        $out['slots'] = array_map(fn($id) => [
                            'slot_id' => $id,
                            'label' => $labels[$id] ?? '?',
                            'boxes' => 0,
                            'unverified' => false,
                        ], $staged[$key]['slot_ids']);
                    } elseif (!$visible) {
                        $out['reason'] = 'disabled';
                    } elseif (!$scanned || empty($scanned['items']) || in_array(null, array_column($scanned['items'], 'dimension_id'), true)) {
                        $out['reason'] = 'unknown_dimension';
                    } elseif (!$scanned['no_of_box']) {
                        $out['reason'] = 'unknown_box_count';
                    } else {
                        $snapshot = $this->snapshot($pageId);
                        $sets     = $this->placeableSets($match, $staged);
                        $affinity = [];
                        foreach ($staged as $st) {
                            foreach ($st['slot_ids'] as $id) {
                                $affinity[$id] = true;
                            }
                        }

                        $plan = $this->planGroup($snapshot, $sets, $lot?->id, $affinity);
                        $rows = $this->rowsForSet($plan, $sets, $key);

                        if ($rows) {
                            $out['slots'] = array_map(fn($r) => [
                                'slot_id'    => $r['slot_id'],
                                'label'      => $snapshot[$r['slot_id']]['label'] ?? '?',
                                'boxes'      => $r['boxes'],
                                'unverified' => $r['unverified'],
                            ], $rows);
                        } else {
                            $out['reason'] = $this->noneReason($snapshot);
                        }

                        // One line per box set so the operator sees the whole group plan.
                        foreach ($sets as $set) {
                            $out['plan'][] = [
                                'box_details' => $set['box_details'],
                                'boxes'       => $set['boxes'],
                                'slots'       => array_map(fn($r) => [
                                    'label' => $snapshot[$r['slot_id']]['label'] ?? '?',
                                    'boxes' => $r['boxes'],
                                ], $plan[$set['key']] ?? []),
                            ];
                        }
                    }
                }
            }
        } catch (\Throwable $e) {
            Log::warning('Placement recommendation failed', ['error' => $e->getMessage()]);
            $out['slots']  = [];
            $out['plan']   = [];
            $out['joins']  = false;
            $out['reason'] = 'error';
            $rows          = null;
        }

        $out['id'] = $visible ? $this->logRequest($pageId, $code, $rows, $out['reason']) : null;

        return $out;
    }

    /** Box sets of the scanned lot's group that are already staged: key => [box_group_id, slot_ids]. */
    private function stagedSets(array $match): array
    {
        if (empty($match['group_id'])) {
            return [];
        }

        $out = [];

        $stagings = LotStaging::whereNull('released_at')
            ->where('box_source', $match['source'])
            ->where('source_group_id', $match['group_id'])
            ->get(['id', 'box_group_id', 'box_details']);

        foreach ($stagings as $st) {
            if (trim((string) $st->box_details) === '') continue;

            $key = BoxDetails::key($st->box_details);
            $out[$key]['box_group_id']  = $st->box_group_id;
            $out[$key]['staging_ids'][] = $st->id;
        }

        foreach (array_keys($out) as $key) {
            $out[$key]['slot_ids'] = LotPosition::whereNull('released_at')
                ->whereIn('lot_staging_id', $out[$key]['staging_ids'])
                ->pluck('rack_slot_id')->unique()->values()->all();
        }

        return $out;
    }

    /** Units that still need a place: one per box size of every box set not staged yet. Largest footprint first. */
    private function placeableSets(array $match, array $staged): array
    {
        $ids  = collect($match['sets'])->pluck('items')->flatten(1)->pluck('dimension_id')->filter()->unique();
        $dims = BoxDimension::whereIn('id', $ids)->get()->keyBy('id');
        $s    = $this->settings();
        $out  = [];

        foreach ($match['sets'] as $set) {
            $items = $set['items'] ?? [];

            if (isset($staged[$set['key']]) || !$items) {
                continue;
            }

            // One unknown size or missing count makes the whole set untracked.
            if (collect($items)->contains(fn($i) => !$i['dimension_id'] || !$i['boxes'] || !$dims->has($i['dimension_id']))) {
                continue;
            }

            foreach ($items as $i) {
                $dim   = $dims[$i['dimension_id']];
                $out[] = [
                    'key'         => $set['key'] . '#' . $dim->id,
                    'set'         => $set['key'],
                    'box_details' => $dim->name,
                    'dim'         => $dim,
                    'boxes'       => (int) $i['boxes'],
                    'weight'      => $this->footprint($dim, (int) $i['boxes'], 10000.0, $s), // size ordering only
                ];
            }
        }

        usort($out, fn($a, $b) => [$b['dim']->depth_units, $b['weight']] <=> [$a['dim']->depth_units, $a['weight']]);

        return $out;
    }

    /**
     * Plan for a whole group. Returns set key => rows [{slot_id, boxes, unverified}] or null.
     * 1. One slot that takes every set (each simulated into the lanes).
     * 2. Otherwise set by set, largest first: the best single slot, else the fewest slots (split).
     *    Slots already used by the group are preferred for the next set.
     */
    private function planGroup(array $snapshot, array $sets, ?int $lotId, array $affinitySlots = []): array
    {
        $s = $this->settings();

        if (!$sets) {
            return [];
        }

        $lotSlots = [];
        $lotRacks = [];
        foreach ($snapshot as $st) {
            if ($lotId && isset($st['lot_ids'][$lotId])) {
                $lotSlots[$st['id']]       = true;
                $lotRacks[$st['rack_key']] = true;
            }
        }
        foreach ($affinitySlots as $id => $_) {
            if (isset($snapshot[$id])) {
                $lotSlots[$id]                         = true;
                $lotRacks[$snapshot[$id]['rack_key']]  = true;
            }
        }

        $candidates = [];

        foreach ($snapshot as $st) {
            if (!$st['tracked'] || ($fit = $this->fitAll($st, $sets, $s)) === null) {
                continue;
            }

            $sameDim = 1;
            foreach ($sets as $set) {
                if (isset($st['dimension_ids'][$set['dim']->id])) {
                    $sameDim = 0;
                    break;
                }
            }

            $candidates[] = ['st' => $st, 'rank' => [
                $fit['tier'],
                isset($lotSlots[$st['id']]) ? 0 : (isset($lotRacks[$st['rack_key']]) ? 1 : 2),
                $sameDim,
                -$fit['free'],
            ]];
        }

        if ($candidates) {
            usort($candidates, function ($a, $b) {
                foreach ($a['rank'] as $i => $v) {
                    if ($v != $b['rank'][$i]) {
                        return $v <=> $b['rank'][$i];
                    }
                }

                return strnatcmp($a['st']['label'], $b['st']['label']) ?: $a['st']['id'] <=> $b['st']['id'];
            });

            $best = $candidates[0];
            $plan = [];
            foreach ($sets as $set) {
                $plan[$set['key']] = [['slot_id' => $best['st']['id'], 'boxes' => $set['boxes'], 'unverified' => $best['rank'][0] === 1]];
            }

            return $plan;
        }

        // No single slot takes everything.
        $work   = $snapshot;
        $plan   = [];
        $groupSlots = $lotSlots;

        foreach ($sets as $set) {
            $rows = $this->recommend($work, $set['dim'], $set['boxes'], $lotId, $groupSlots);
            $plan[$set['key']] = $rows;

            foreach ($rows ?? [] as $r) {
                $this->reserve($work[$r['slot_id']], $set['dim'], $r['boxes'], $s);
                $groupSlots[$r['slot_id']] = true;
            }
        }

        return $plan;
    }

    /** Does every set fit in this one slot? Same tier logic as bestTier(), applied to all sets in turn. */
    private function fitAll(array $st, array $sets, array $s): ?array
    {
        foreach ([0 => 'lanes_all', 1 => 'lanes_confirmed'] as $tier => $key) {
            $tmp  = $st;
            $min  = INF;
            $ok   = true;

            foreach ($sets as $set) {
                $free = $this->freeLength($tmp, $set['dim'], $key, $s);
                $fp   = $this->footprint($set['dim'], $set['boxes'], $st['height'], $s);

                if ($free < $fp) {
                    $ok = false;
                    break;
                }

                $this->addToLanes($tmp[$key], $set['dim'], $fp);
                $min = min($min, $free - $fp);
            }

            if ($ok) {
                return ['tier' => $tier, 'free' => $min];
            }
        }

        return null;
    }

    // Books boxes into a working copy of the state so the next set of the group sees them.
    private function reserve(array &$st, BoxDimension $dim, int $boxes, array $s): void
    {
        $fp = $this->footprint($dim, $boxes, $st['height'], $s);

        $this->addToLanes($st['lanes_all'], $dim, $fp);
        $this->addToLanes($st['lanes_confirmed'], $dim, $fp);
        $st['dimension_ids'][$dim->id] = true;
        $st['has_mini'] = $st['has_mini'] || $dim->is_mini;
    }

    // Same lookup rules as LotService::resolveLot, without the lock.
    private function findLot(string $code, ?string $partname): ?Lot
    {
        $q = Lot::query()->setEagerLoads([])->where('lot_id', $code);
        $columns = ['id', 'status', 'partname'];

        if ($partname === null) {
            return $q->orderByRaw("status = 'staged' desc")->orderByDesc('id')->first($columns);
        }

        return (clone $q)->where('partname', $partname)->latest('id')->first($columns)
            ?? (clone $q)->whereNull('partname')->latest('id')->first($columns);
    }

    /** The scanned box set can be several units (one per box size). Merge their rows per slot. */
    private function rowsForSet(array $plan, array $units, string $setKey): ?array
    {
        $merged = [];

        foreach ($units as $u) {
            if ($u['set'] !== $setKey) {
                continue;
            }

            if (empty($plan[$u['key']])) {
                return null; // one size has no place: a partial recommendation would mislead
            }

            foreach ($plan[$u['key']] as $r) {
                $m = $merged[$r['slot_id']] ?? ['slot_id' => $r['slot_id'], 'boxes' => 0, 'unverified' => false];
                $m['boxes']      += $r['boxes'];
                $m['unverified']  = $m['unverified'] || $r['unverified'];
                $merged[$r['slot_id']] = $m;
            }
        }

        return $merged ? array_values($merged) : null;
    }

    private function unitsFromItems(array $items): array
    {
        $dims = BoxDimension::whereIn('id', array_column($items, 'dimension_id'))->get()->keyBy('id');
        $s    = $this->settings();
        $out  = [];

        foreach ($items as $i) {
            $dim = $dims->get($i['dimension_id']);

            if (!$dim || empty($i['boxes'])) {
                return [];
            }

            $out[] = [
                'key'         => 'shadow#' . $dim->id,
                'set'         => 'shadow',
                'box_details' => $dim->name,
                'dim'         => $dim,
                'boxes'       => (int) $i['boxes'],
                'weight'      => $this->footprint($dim, (int) $i['boxes'], 10000.0, $s),
            ];
        }

        usort($out, fn($a, $b) => [$b['dim']->depth_units, $b['weight']] <=> [$a['dim']->depth_units, $a['weight']]);

        return $out;
    }

    /** Same as contradicts(), for a set of several box sizes. null = not evaluable. */
    public function contradictsUnits(array $snapshot, array $units, array $actualSlotIds): ?bool
    {
        if (count($actualSlotIds) !== 1) {
            return null;
        }

        $st = $snapshot[$actualSlotIds[0]] ?? null;

        if (!$st || !$st['tracked']) {
            return null;
        }

        return $this->fitAll($st, $units, $this->settings()) === null;
    }

    /** @return array<int,int> dimension id => boxes this position holds. [] = unknown. */
    private function positionItems(LotPosition $p, $dims): array
    {
        if (!$p->box_count) {
            return []; // unknown content = untracked slot (same rule as before)
        }

        $items = $p->staging?->boxItems() ?? [];

        // A single-size set can have a known per-slot split. A mixed set holds its full list in every slot (upper bound).
        if (count($items) === 1) {
            $items[0]['boxes'] = (int) $p->box_count;
        }

        $out = [];

        foreach ($items as $i) {
            if (!$dims->has($i['dimension_id']) || empty($i['boxes'])) {
                return [];
            }

            $out[(int) $i['dimension_id']] = ($out[(int) $i['dimension_id']] ?? 0) + (int) $i['boxes'];
        }

        return $out;
    }

    private function noneReason(array $snapshot): string
    {
        foreach ($snapshot as $st) {
            if ($st['tracked']) {
                return 'no_fit';
            }
        }

        return 'tub_or_untracked';
    }

    private function logRequest(int $pageId, string $code, ?array $rows, ?string $reason): ?int
    {
        try {
            return PlacementRecommendation::create([
                'rack_page_id'       => $pageId,
                'lot_code'           => $code,
                'recommended'        => $rows ?: null,
                'reason'             => $reason,
                'actual_slot_ids'    => null,
                'model_contradicted' => null,
                'created_at'         => Carbon::now('UTC'),
            ])->id;
        } catch (\Throwable $e) {
            Log::warning('Placement recommendation log failed', ['error' => $e->getMessage()]);

            return null;
        }
    }

    // ------------------------------------------------------------------
    // Commit-time recording. Neither method ever throws: the operator's
    // flow must not depend on the recommendation.
    // ------------------------------------------------------------------

    /**
     * Evaluate a placement against the state BEFORE it is committed.
     * $items = [{dimension_id, boxes}] of the box set (empty = unknown box info).
     *
     * @return array{recommended: ?array, actual_slot_ids: int[], model_contradicted: ?bool, rack_page_id: ?int}
     */
    public function shadow(array $actualSlotIds, array $items, int $lotId, bool $sharesBoxes = false): array
    {
        $payload = [
            'recommended'        => null,
            'actual_slot_ids'    => array_values($actualSlotIds),
            'model_contradicted' => null,
            'rack_page_id'       => null,
        ];

        try {
            if (empty($actualSlotIds)) {
                return $payload;
            }

            $payload['rack_page_id'] = RackSlot::find($actualSlotIds[0])?->rack?->rack_page_id;

            if ($sharesBoxes) {
                return $payload; // no recommendation to judge: these boxes were already placed
            }

            if (!$items || !$payload['rack_page_id']) {
                return $payload;
            }

            $units = $this->unitsFromItems($items);

            if (!$units) {
                return $payload;
            }

            $snapshot = $this->snapshot($payload['rack_page_id']);

            $payload['recommended'] = count($units) === 1
                ? $this->recommend($snapshot, $units[0]['dim'], $units[0]['boxes'], $lotId)
                : $this->rowsForSet($this->planGroup($snapshot, $units, $lotId), $units, 'shadow');
            $payload['model_contradicted'] = $this->contradictsUnits($snapshot, $units, $actualSlotIds);
        } catch (\Throwable $e) {
            Log::warning('Placement shadow evaluation failed', ['error' => $e->getMessage()]);
        }

        return $payload;
    }

    /**
     * Write the commit. With a recommendation ID that was shown to the operator, that row is
     * completed (what was shown stays as recommended; actual slots, adherence and commit time are
     * added). Without one, a full row is written from the shadow evaluation, as in phase 1.
     */
    public function record(LotStaging $staging, array $payload, ?int $recommendationId = null): void
    {
        try {
            $now     = Carbon::now('UTC');
            $actual  = $payload['actual_slot_ids'];
            $lotCode = Lot::query()->setEagerLoads([])->whereKey($staging->lot_id)->value('lot_id');

            $row = $recommendationId
                ? PlacementRecommendation::whereKey($recommendationId)->whereNull('lot_staging_id')->first()
                : null;

            // A stale or wrong ID must never attach one lot's recommendation to another lot.
            if ($row && $row->lot_code !== null && $row->lot_code !== $lotCode) {
                $row = null;
            }

            if ($row) {
                $row->update([
                    'lot_staging_id'     => $staging->id,
                    'actual_slot_ids'    => $actual,
                    'model_contradicted' => $payload['model_contradicted'],
                    'adherence'          => $this->adherence($row->recommended, $actual),
                    'committed_at'       => $now,
                ]);

                return;
            }

            PlacementRecommendation::create([
                'lot_staging_id'     => $staging->id,
                'rack_page_id'       => $payload['rack_page_id'] ?? null,
                'lot_code'           => $lotCode,
                'recommended'        => $payload['recommended'],
                'actual_slot_ids'    => $actual,
                'model_contradicted' => $payload['model_contradicted'],
                'adherence'          => $this->adherence($payload['recommended'], $actual),
                'committed_at'       => $now,
                'created_at'         => $now,
            ]);
        } catch (\Throwable $e) {
            Log::warning('Placement shadow record failed', ['error' => $e->getMessage()]);
        }
    }

    /** full = same slots, partial = some of them, none = no overlap, null = nothing was recommended. */
    public function adherence(?array $recommended, array $actualSlotIds): ?string
    {
        if (!$recommended) {
            return null;
        }

        $rec = array_values(array_unique(array_map('intval', array_column($recommended, 'slot_id'))));
        $act = array_values(array_unique(array_map('intval', $actualSlotIds)));

        $common = array_intersect($rec, $act);

        if (!$common) {
            return 'none';
        }

        return count($common) === count($rec) && count($act) === count($rec) ? 'full' : 'partial';
    }

    // ------------------------------------------------------------------
    // State
    // ------------------------------------------------------------------

    /**
     * Current capacity state of every active slot on a rack page, keyed by slot id.
     * "Rack" for affinity is the rack record plus the letters of the slot label
     * (the same grouping Rack::shelves uses) - see open item 4.
     */
    public function snapshot(int $rackPageId): array
    {
        $s = $this->settings();

        $slots = RackSlot::query()
            ->where('is_active', true)
            ->whereHas('rack', fn($q) => $q->where('rack_page_id', $rackPageId)->whereNull('racks.deleted_at'))
            ->get(['id', 'rack_id', 'label', 'length', 'height', 'tracked']);

        $dims = BoxDimension::all()->keyBy('id');

        $positions = LotPosition::query()
            ->whereNull('released_at')
            ->whereIn('rack_slot_id', $slots->pluck('id'))
            ->with('staging:id,dimension_id,box_count,box_group_id,box_items')
            ->get(['id', 'lot_id', 'lot_staging_id', 'rack_slot_id', 'box_count', 'presumed_released_at'])
            ->groupBy('rack_slot_id');

        $state = [];

        foreach ($slots as $slot) {
            $usable = max(0, (float) $slot->length - 2 * $s['end_margin']);
            $known  = $slot->tracked && $slot->length && $slot->height && $usable > 0;

            $st = [
                'id'              => $slot->id,
                'label'           => $slot->label,
                'rack_key'        => $slot->rack_id . ':' . preg_replace('/\d+$/', '', $slot->label),
                'height'          => (float) $slot->height,
                'usable'          => $usable,
                'tracked'         => false,
                'lanes_all'       => [0.0, 0.0],  // everything still recorded as occupying the slot
                'lanes_confirmed' => [0.0, 0.0],  // same, minus lots presumed released
                'lot_ids'         => [],
                'dimension_ids'   => [],
                'has_mini'        => false,
                'untracked_reason' => null,
            ];

            $geometryOk = $slot->tracked && $slot->length && $slot->height && $usable > 0;
            $known      = $geometryOk;
            $reason     = $geometryOk ? null : 'no_geometry';   // tub or unmeasured slot: expected, not a data problem

            $entries = [];

            foreach ($positions->get($slot->id, collect()) as $p) {
                $st['lot_ids'][$p->lot_id] = true;

                $held = $this->positionItems($p, $dims);

                if (!$held) {
                    $known = false; // unknown content = untracked slot
                    $reason ??= 'unknown_box_info';
                    continue;
                }

                // One entry per physical box set, however many lots share it (lots in one box group).
                $key = $p->staging?->box_group_id ?? 'p' . $p->id;

                $entries[$key] ??= ['items' => [], 'presumed' => true];
                foreach ($held as $dimId => $n) {
                    $entries[$key]['items'][$dimId] = max($entries[$key]['items'][$dimId] ?? 0, $n);
                }
                // Presumed gone only if every lot sharing the boxes is presumed gone.
                $entries[$key]['presumed'] = $entries[$key]['presumed'] && $p->presumed_released_at !== null;
            }

            if ($known) {
                // One line per box size, so the lane code below is unchanged.
                $flat = [];
                foreach ($entries as $e) {
                    foreach ($e['items'] as $dimId => $n) {
                        $flat[] = ['dim' => $dims[$dimId], 'boxes' => $n, 'presumed' => $e['presumed']];
                    }
                }
                $entries = $flat;

                // Full-depth first so mini-pizzas fill the emptier lane deterministically.
                usort($entries, fn($a, $b) => $b['dim']->depth_units <=> $a['dim']->depth_units);

                foreach ($entries as $e) {
                    $fp = $this->footprint($e['dim'], $e['boxes'], $st['height'], $s);

                    $this->addToLanes($st['lanes_all'], $e['dim'], $fp);
                    if (!$e['presumed']) {
                        $this->addToLanes($st['lanes_confirmed'], $e['dim'], $fp);
                    }

                    $st['dimension_ids'][$e['dim']->id] = true;
                    $st['has_mini'] = $st['has_mini'] || $e['dim']->is_mini;
                }
            }

            $st['tracked'] = $known;
            $st['untracked_reason'] = $known ? null : $reason;
            $state[$slot->id] = $st;
        }

        return $state;
    }

    // ------------------------------------------------------------------
    // Recommendation (section 6)
    // ------------------------------------------------------------------

    /**
     * @return array<int, array{slot_id:int, boxes:int, unverified:bool}>|null  null = no recommendation.
     *         unverified = the space only exists if lots presumed released are really gone.
     */
    public function recommend(array $snapshot, BoxDimension $dim, int $boxCount, ?int $lotId = null, array $affinitySlots = []): ?array
    {
        $s = $this->settings();

        $sameLotSlots = [];
        $sameLotRacks = [];
        foreach ($snapshot as $st) {
            if ($lotId && isset($st['lot_ids'][$lotId])) {
                $sameLotSlots[$st['id']]      = true;
                $sameLotRacks[$st['rack_key']] = true;
            }
        }

        foreach ($affinitySlots as $id => $_) {
            if (isset($snapshot[$id])) {
                $sameLotSlots[$id]                        = true;
                $sameLotRacks[$snapshot[$id]['rack_key']] = true;
            }
        }

        // 1. A single slot that takes the whole lot.
        $candidates = [];

        foreach ($snapshot as $st) {
            if (!$st['tracked'] || ($fit = $this->bestTier($st, $dim, $boxCount, $s)) === null) {
                continue;
            }

            $candidates[] = [
                'st'   => $st,
                'rank' => [
                    $fit['tier'],                                                    // confirmed before presumed-free
                    isset($sameLotSlots[$st['id']]) ? 0
                        : (isset($sameLotRacks[$st['rack_key']]) ? 1 : 2),           // merged-lot affinity
                    $dim->is_mini
                        ? ($st['has_mini'] ? 0 : 1)                                  // minis with minis
                        : (isset($st['dimension_ids'][$dim->id]) ? 0 : 1),           // same-dimension affinity
                    -$fit['free'],                                                   // most headroom first
                ],
            ];
        }

        if ($candidates) {
            usort($candidates, function ($a, $b) {
                foreach ($a['rank'] as $i => $v) {
                    if ($v != $b['rank'][$i]) {
                        return $v <=> $b['rank'][$i];
                    }
                }
                return strnatcmp($a['st']['label'], $b['st']['label']) ?: $a['st']['id'] <=> $b['st']['id'];
            });

            return [[
                'slot_id'    => $candidates[0]['st']['id'],
                'boxes'      => $boxCount,
                'unverified' => $candidates[0]['rank'][0] === 1,
            ]];
        }

        // 2. Nothing takes the whole lot: fewest slots, same rack preferred.
        return $this->combination($snapshot, $dim, $boxCount, $s);
    }

    /**
     * Did the model think the slot the operator used could not take this lot?
     * null = not evaluable (several slots, or an untracked/unknown slot).
     */
    public function contradicts(array $snapshot, BoxDimension $dim, int $boxCount, array $actualSlotIds): ?bool
    {
        if (count($actualSlotIds) !== 1) {
            return null;
        }

        $st = $snapshot[$actualSlotIds[0]] ?? null;

        if (!$st || !$st['tracked']) {
            return null;
        }

        return $this->bestTier($st, $dim, $boxCount, $this->settings()) === null;
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    private function combination(array $snapshot, BoxDimension $dim, int $boxCount, array $s): ?array
    {
        $parts = [];

        foreach ($snapshot as $st) {
            if (!$st['tracked']) {
                continue;
            }

            $tier = 0;
            $max  = $this->maxBoxes($st, $dim, $boxCount, 'lanes_all', $s);

            if ($max === 0) {
                $tier = 1;
                $max  = $this->maxBoxes($st, $dim, $boxCount, 'lanes_confirmed', $s);
            }

            if ($max > 0) {
                $parts[] = ['st' => $st, 'max' => $max, 'tier' => $tier];
            }
        }

        if (!$parts) {
            return null;
        }

        $byRack = collect($parts)->groupBy(fn($p) => $p['st']['rack_key']);

        $best = null;
        foreach ($byRack as $group) {
            $picked = $this->takeUntilCovered($group->all(), $boxCount);
            if ($picked && ($best === null || count($picked) < count($best))) {
                $best = $picked;
            }
        }

        $global = $this->takeUntilCovered($parts, $boxCount);

        // Fewest slots wins; the same rack only breaks ties.
        if ($global && ($best === null || count($global) < count($best))) {
            $best = $global;
        }

        if (!$best) {
            return null;
        }

        $remaining = $boxCount;
        $result    = [];

        foreach ($best as $p) {
            $take     = min($p['max'], $remaining);
            $result[] = [
                'slot_id'    => $p['st']['id'],
                'boxes'      => $take,
                'label'      => $p['st']['label'],
                'unverified' => $p['tier'] === 1,
            ];
            $remaining -= $take;
        }

        usort($result, fn($a, $b) => strnatcmp($a['label'], $b['label']));

        return array_map(fn($r) => ['slot_id' => $r['slot_id'], 'boxes' => $r['boxes'], 'unverified' => $r['unverified']], $result);
    }

    // Largest-capacity slots first (confirmed before presumed) until all boxes are covered.
    private function takeUntilCovered(array $parts, int $boxCount): ?array
    {
        usort($parts, fn($a, $b) => [$a['tier'], -$a['max']] <=> [$b['tier'], -$b['max']]);

        $picked = [];
        $sum    = 0;

        foreach ($parts as $p) {
            $picked[] = $p;
            $sum += $p['max'];
            if ($sum >= $boxCount) {
                return $picked;
            }
        }

        return null;
    }

    /** @return array{tier:int, free:float}|null  tier 0 = confirmed free, 1 = only fits if presumed-released lots are gone */
    private function bestTier(array $st, BoxDimension $dim, int $boxes, array $s): ?array
    {
        foreach ([0 => 'lanes_all', 1 => 'lanes_confirmed'] as $tier => $lanes) {
            $free = $this->freeLength($st, $dim, $lanes, $s);

            if ($free >= $this->footprint($dim, $boxes, $st['height'], $s)) {
                return ['tier' => $tier, 'free' => $free];
            }
        }

        return null;
    }

    private function maxBoxes(array $st, BoxDimension $dim, int $boxCount, string $lanes, array $s): int
    {
        $free = $this->freeLength($st, $dim, $lanes, $s);
        $max  = 0;

        for ($k = 1; $k <= $boxCount; $k++) {
            if ($free < $this->footprint($dim, $k, $st['height'], $s)) {
                break;
            }
            $max = $k;
        }

        return $max;
    }

    // Free length against the utilization cap. Full depth needs both lanes, a mini-pizza needs one.
    private function freeLength(array $st, BoxDimension $dim, string $lanes, array $s): float
    {
        $cap  = $s['utilization_cap'] * $st['usable'];
        $free = [$cap - $st[$lanes][0], $cap - $st[$lanes][1]];

        return $dim->depth_units >= 2 ? min($free) : max($free);
    }

    // Column footprint = longest box + gap. Boxes of one lot stack as high as the slot allows (5.3).
    private function footprint(BoxDimension $dim, int $boxes, float $slotHeight, array $s): float
    {
        $perColumn = $dim->height > 0
            ? max(1, (int) floor(($slotHeight - $s['height_clearance']) / $dim->height))
            : 1;

        return ((int) ceil($boxes / $perColumn)) * ($dim->length + $s['column_gap']);
    }

    private function addToLanes(array &$lanes, BoxDimension $dim, float $footprint): void
    {
        if ($dim->depth_units >= 2) {
            $lanes[0] += $footprint;
            $lanes[1] += $footprint;
            return;
        }

        $lanes[$lanes[0] <= $lanes[1] ? 0 : 1] += $footprint;
    }

    private function settings(): array
    {
        return $this->settings ??= array_map('floatval', PlacementSetting::pluck('value', 'key')->all()) + self::DEFAULTS;
    }
}
