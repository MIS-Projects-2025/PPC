<?php

namespace App\Services;

use App\Models\CustomerDataWip;
use App\Models\LoadingPlanEntry;
use App\Models\LotSplit;
use App\Models\LotQuantity;
use App\Models\ProcessTraveler;
use Illuminate\Support\Collection;

/**
 * One place to ask "what is the source row for this lot?".
 * Always returns CustomerDataWip-shaped objects, keyed by Lot_Id.
 * F3 results are unsaved CustomerDataWip instances built by ProcessTraveler::toWip().
 */
class LotSourceService
{
    public const WIP = 'wip';
    public const F3  = 'f3';

    /**
     * Pool of lots that can be shown/placed for a location, keyed by Lot_Id.
     * F3 only; F1/F2 keep using LoadingPlanService::getWipRowsForToday().
     * Excludes soft-deleted travelers.
     */
    public function poolFor(string $date, ?string $location): Collection
    {
        if ($location !== 'F3') {
            return collect();
        }

        return ProcessTraveler::forPlanDate($date)
            ->orderByDesc('id')
            ->get()
            ->toBase()
            ->unique('lot_number')                    // latest row wins if lot_number is duplicated
            ->mapWithKeys(fn($t) => [$t->lot_number => $t->toWip()]);
    }

    public function ensureLotQuantities(Collection $entries, string $date): void
    {
        $lots = $entries
            ->filter(fn($e) => $e->entry_type === 'lot' && $e->lot_id && !(int) $e->rework_seq)
            ->unique('lot_id');
        if ($lots->isEmpty()) return;

        $ids  = $lots->pluck('lot_id');
        $have = LotQuantity::where('scheduled_date', $date)->where('rework_seq', 0)
            ->whereIn('lot_id', $ids)->pluck('lot_id')->flip();
        $kids = LotSplit::active()->where('scheduled_date', $date)
            ->whereIn('child_lot_id', $ids)->pluck('child_lot_id')->flip();

        foreach ($lots as $e) {
            if ($have->has($e->lot_id) || $kids->has($e->lot_id)) continue;
            $this->ensureLotQuantity($e);   // slow path only for missing rows
        }
    }

    public function ensureLotQuantity(LoadingPlanEntry $entry): ?LotQuantity
    {
        if ($entry->entry_type !== 'lot' || !$entry->lot_id) return null;

        $date   = $entry->scheduled_date->toDateString();
        $rework = (int) $entry->rework_seq;

        $existing = LotQuantity::where('lot_id', $entry->lot_id)
            ->where('scheduled_date', $date)
            ->where('rework_seq', $rework)
            ->first();

        if ($existing) return $existing;

        // reworkEntry() creates its own row; never fabricate one for rework_seq > 0
        if ($rework > 0) return null;

        $isSplitChild = LotSplit::active()
            ->where('child_lot_id', $entry->lot_id)
            ->where('scheduled_date', $date)
            ->exists();

        // split children get their row in LotSplitService, not from the traveler
        if ($isSplitChild) return null; // its row comes from LotSplitService

        $src = $this->forEntry($entry);
        if (!$src) return null;

        return LotQuantity::firstOrCreate(
            ['lot_id' => $entry->lot_id, 'scheduled_date' => $date, 'rework_seq' => 0],
            [
                'part_name'        => $src->Part_Name ?? '',
                'qty_base'         => (int) round((float) ($src->Qty ?? 0)),
                'split_adjustment' => 0,
                'merge_adjustment' => 0,
            ],
        );
    }

    /**
     * Source rows for lots that may already have entries.
     *
     * @param string|array $date   a date, or [today, yesterday] for leaked lots
     * @param ?string      $source 'wip' | 'f3' hint (from LoadingPlanEntry::$source).
     *                             null = probe WIP first, then travelers.
     * F3 lookups ignore $date (a traveler is one row, not re-imported daily) and
     * include soft-deleted rows, so placed lots keep their details.
     */
    public function find(iterable $lotIds, string|array $date, ?string $source = null): Collection
    {
        $ids = collect($lotIds)->filter()->unique()->values();
        if ($ids->isEmpty()) {
            return collect();
        }

        $out = collect();

        if ($source !== self::F3) {
            $out = CustomerDataWip::query()
                ->forDate($date)
                ->whereIn('Lot_Id', $ids)
                ->orderByDesc('import_date')
                ->get()
                ->toBase()
                ->unique('Lot_Id')
                ->keyBy('Lot_Id');
        }

        $rest = $ids->diff($out->keys())->values();

        if ($source !== self::WIP && $rest->isNotEmpty()) {
            ProcessTraveler::withTrashed()
                ->whereIn('lot_number', $rest)
                ->orderByDesc('id')
                ->get()
                ->toBase()
                ->unique('lot_number')
                ->each(fn($t) => $out->put($t->lot_number, $t->toWip()));
        }

        return $out;
    }

    /** Source row for one placed entry. Split children resolve to their root lot. */
    public function forEntry(LoadingPlanEntry $entry): ?CustomerDataWip
    {
        if (!$entry->lot_id) {          // blocks
            return null;
        }

        return $this->find(
            [$entry->resolveRootLotId()],
            $entry->scheduled_date->toDateString(),
            $entry->source ?? self::WIP,
        )->first();
    }

    /**
     * Batch version of forEntry(): entry id => source row (or null).
     * Two queries per (source, date) group, plus one for active splits.
     */
    public function forEntries(iterable $entries): Collection
    {
        $entries = collect($entries)->filter(fn($e) => $e->lot_id)->values();
        if ($entries->isEmpty()) {
            return collect();
        }

        $splits = LotSplit::active()
            ->whereIn('child_lot_id', $entries->pluck('lot_id')->unique()->all())
            ->get()
            ->keyBy(fn($s) => $s->child_lot_id . '|' . $s->scheduled_date->toDateString());

        $dateOf = fn($e) => $e->scheduled_date->toDateString();
        $srcOf  = fn($e) => $e->source ?? self::WIP;
        $rootOf = fn($e) => $splits->get($e->lot_id . '|' . $dateOf($e))?->root_lot_id ?? $e->lot_id;

        $found = [];
        foreach ($entries->groupBy(fn($e) => $srcOf($e) . '|' . $dateOf($e)) as $key => $group) {
            [$source, $date] = explode('|', $key);
            $found[$key] = $this->find($group->map($rootOf)->unique()->values(), $date, $source);
        }

        return $entries->mapWithKeys(fn($e) => [
            $e->id => $found[$srcOf($e) . '|' . $dateOf($e)]->get($rootOf($e)),
        ]);
    }

    /**
     * For lots being placed for the first time (no entry yet, so no hint):
     * lotId => 'wip'|'f3'. Unknown lots default to 'wip'.
     */
    public function sourcesFor(iterable $lotIds, string $date): Collection
    {
        return $this->find($lotIds, $date)
            ->map(fn($w) => $w->source)
            ->union(collect($lotIds)->mapWithKeys(fn($id) => [$id => self::WIP]));
    }

    /** Split child ids must not collide with a WIP lot or any traveler (including deleted ones). */
    public function lotIdTaken(string $lotId): bool
    {
        return CustomerDataWip::where('Lot_Id', $lotId)->exists()
            || ProcessTraveler::withTrashed()->where('lot_number', $lotId)->exists();
    }
}
