<?php

namespace App\Traits;

use App\Exceptions\LoadingPlanDateFinalizedException;
use App\Models\LoadingPlanEntry;
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
