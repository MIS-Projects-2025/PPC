<?php

namespace App\Services;

use App\Models\LotSplit;
use App\Models\PartName;
use App\Models\ProcessTraveler;
use App\Services\RecipeInfo;
use Illuminate\Support\Collection;

/**
 * Recipe source of truth:
 *   F1/F2 ('wip') : qdn_db.package_list.recipe, per part name (devicename)
 *   F3    ('f3')  : process_travelers.process_rqmt, per traveler (= per root lot)
 *
 * Reads feed LotScheduleCalculator::computeMetrics(); writes go through update().
 */
class RecipeService
{
    private const FIXED_RATE = ['TUBE', 'TRAY', 'WAFFLE_TRAY'];

    public static function isFixedRate(?string $allocation): bool
    {
        return $allocation !== null && in_array(strtoupper(trim($allocation)), self::FIXED_RATE, true);
    }

    /** The root lot a lot_id traces back to (itself unless it is an active split child on $date). */
    public function rootOf(string $lotId, string $date): string
    {
        return LotSplit::active()
            ->where('child_lot_id', $lotId)
            ->where('scheduled_date', $date)
            ->value('root_lot_id') ?? $lotId;
    }

    /** Traveler recipes keyed by lot_number. Includes soft-deleted travelers. */
    public function forTravelers(iterable $rootLotIds): Collection
    {
        $ids = collect($rootLotIds)->filter()->unique()->values();
        if ($ids->isEmpty()) {
            return collect();
        }

        return ProcessTraveler::withTrashed()
            ->whereIn('lot_number', $ids)
            ->orderByDesc('id')
            ->get()
            ->toBase()
            ->unique('lot_number')
            ->mapWithKeys(fn($t) => [$t->lot_number => new RecipeInfo(
                $t->process_rqmt > 0 ? (int) $t->process_rqmt : null,   // 0 = no recipe
                $t->input_type,
                RecipeInfo::PROCESS_TRAVELER,
                $t->id,
            )]);
    }

    /**
     * Traveler recipes for lot ids that may be split children.
     * Keyed by BOTH the lot ids asked for and their root lot numbers,
     * so callers can look up by $entry->lot_id directly.
     */
    public function forLots(array $lotIds, array $dates = []): Collection
    {
        $lotIds = array_values(array_unique(array_filter($lotIds)));
        if (!$lotIds) {
            return collect();
        }

        $roots = LotSplit::active()
            ->whereIn('child_lot_id', $lotIds)
            ->when($dates, fn($q) => $q->whereIn('scheduled_date', $dates))
            ->pluck('root_lot_id', 'child_lot_id');

        $byRoot = $this->forTravelers(collect($lotIds)->map(fn($id) => $roots[$id] ?? $id));

        return collect($lotIds)
            ->mapWithKeys(fn($id) => [$id => $byRoot->get($roots[$id] ?? $id)])
            ->filter()
            ->union($byRoot);
    }

    /**
     * The one write path.
     *
     * @param string  $source     'wip' | 'f3'
     * @param ?string $rootLotId  required for 'f3' (the traveler's lot_number)
     */
    public function update(string $source, string $partName, ?string $rootLotId, int $recipe, ?string $by): void
    {
        if ($recipe < 1) {
            throw new \InvalidArgumentException('Recipe must be at least 1.');
        }

        if ($source === 'f3') {
            $this->updateTraveler((string) $rootLotId, $recipe, $by);
            return;
        }

        $rows = PartName::where('devicename', $partName);
        if (!$rows->exists()) {
            throw new \InvalidArgumentException("[{$partName}] has no package_list record.");
        }
        if (self::isFixedRate((clone $rows)->value('allocation'))) {
            throw new \InvalidArgumentException('Doable for TUBE/TRAY parts uses a fixed 95% rule, not a recipe.');
        }

        // query-builder update: hits every duplicate row, ignores $fillable
        PartName::where('devicename', $partName)->update([
            'recipe'       => $recipe,
            'updated_by'   => $by,
            'date_updated' => now(),
        ]);

        $stored = PartName::where('devicename', $partName)->pluck('recipe')->unique();
        if ($stored->count() !== 1 || (int) $stored->first() !== $recipe) {
            throw new \RuntimeException("Recipe for [{$partName}] did not persist.");
        }
    }

    private function updateTraveler(string $rootLotId, int $recipe, ?string $by): void
    {
        $q = ProcessTraveler::withTrashed()->where('lot_number', $rootLotId);
        if ($rootLotId === '' || !$q->exists()) {
            throw new \InvalidArgumentException("Traveler [{$rootLotId}] not found.");
        }
        if (self::isFixedRate((clone $q)->value('input_type'))) {
            throw new \InvalidArgumentException('Doable for TUBE/TRAY lots uses a fixed 95% rule, not a recipe.');
        }

        (clone $q)->update([
            'process_rqmt' => $recipe,
            'updated_by'   => $by ?? 'loading-plan',   // NOT NULL column
            'date_updated' => now(),
        ]);

        $stored = ProcessTraveler::withTrashed()->where('lot_number', $rootLotId)->pluck('process_rqmt')->unique();
        if ($stored->count() !== 1 || (int) $stored->first() !== $recipe) {
            throw new \RuntimeException("Recipe for traveler [{$rootLotId}] did not persist.");
        }
    }
}
