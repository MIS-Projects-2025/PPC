<?php

namespace App\Traits;

use App\Exceptions\LoadingPlanDateFinalizedException;
use App\Exceptions\InvalidMergeException;
use App\Models\LoadingPlanEntry;
use App\Models\LotQuantity;
use App\Models\LotSplit;
use DateTimeInterface;
use Illuminate\Support\Collection;

trait ValidatesLoadingPlanEntries
{
    /**
     * Throws if this specific entry has already been finalized.
     */
    protected function assertNotFinalized(?LoadingPlanEntry $entry): void
    {
        if ($entry && $entry->finalized_at !== null) {
            throw new LoadingPlanDateFinalizedException($entry->scheduled_date, $entry->id);
        }
    }

    private function assertNoNegativeQuantity(?LotQuantity ...$quantities): void
    {
        foreach ($quantities as $quantity) {
            if ($quantity && $quantity->effectiveQty() < 0) {
                throw new InvalidMergeException(
                    "This would leave lot [{$quantity->lot_id}] with negative quantity — undo whatever was split or merged from it afterwards first."
                );
            }
        }
    }

    private function assertNotSplitParentAndChild(string $lotA, string $lotB, string $date): void
    {
        $related = LotSplit::active()
            ->where('scheduled_date', $date)
            ->where(function ($q) use ($lotA, $lotB) {
                $q->where(fn($q2) => $q2->where('parent_lot_id', $lotA)->where('child_lot_id', $lotB))
                    ->orWhere(fn($q2) => $q2->where('parent_lot_id', $lotB)->where('child_lot_id', $lotA));
            })
            ->exists();

        if ($related) {
            throw new InvalidMergeException(
                "Cannot merge [{$lotA}] and [{$lotB}] — one was split from the other. Revert the split instead."
            );
        }
    }

    protected function assertNoneFinalized(Collection $entries): void
    {
        foreach ($entries as $entry) {
            $this->assertNotFinalized($entry);
        }
    }

    /**
     * Asserts all entries belong to the same date and returns that date string.
     */
    protected function assertConsistentDates(iterable $entries, string $column = 'scheduled_date'): ?string
    {
        $dates = collect($entries)
            ->map(function ($item) use ($column) {
                // Extract column if item is a Model/Array, otherwise use item directly
                $value = data_get($item, $column, $item);

                // Format Carbon or DateTime objects to string
                if ($value instanceof DateTimeInterface) {
                    return $value->format('Y-m-d');
                }

                return (string) $value;
            })
            ->unique();

        if ($dates->count() > 1) {
            throw new \InvalidArgumentException(
                "Different dates are not allowed on this action — got: " . $dates->implode(', ')
            );
        }

        return $dates->first();
    }

    /**
     * Prevents editing critical fields directly via editField.
     */
    protected function assertSupportedEditField(array $fields): void
    {
        $unsupported = array_intersect(array_keys($fields), ['machine_id', 'lot_id', 'sequence_order']);

        if (!empty($unsupported)) {
            throw new \InvalidArgumentException(
                'editField cannot update ' . implode(', ', $unsupported)
                    . ' — use moveEntry/transferEntry, which handle locking, reordering, and recalculation correctly.'
            );
        }
    }

    /**
     * Throws if ANY entry for this date has already been finalized.
     */
    protected function assertDateNotFinalized(string $date): void
    {
        $isFinalized = LoadingPlanEntry::where('scheduled_date', $date)
            ->whereNotNull('finalized_at')
            ->exists();

        if ($isFinalized) {
            throw new LoadingPlanDateFinalizedException($date);
        }
    }
}
