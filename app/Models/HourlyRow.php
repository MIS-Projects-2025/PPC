<?php

namespace App\Models;

use App\Models\Concerns\TracksActor;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

abstract class HourlyRow extends Model
{
    use TracksActor;

    /** Value stored in hourly_cells.rowable_type (a short alias, so no morph map is needed). */
    public const MORPH = '';

    /** Client-editable attributes => validation rules. Anything not listed here can't be set from the grid. */
    abstract public static function editableRules(): array;

    /** Attributes the grid shows but never writes directly (name snapshots are resolved server-side). */
    abstract public static function readOnlyFields(): array;

    /** Employee ID attribute => the name-snapshot attribute that is filled from the masterlist. */
    abstract public static function employeeFields(): array;

    /** Whether every hour slot also has a "No of lots" value (boxing). */
    public static function hasLots(): bool
    {
        return false;
    }

    public function getMorphClass(): string
    {
        return static::MORPH;
    }

    public function sheet(): BelongsTo
    {
        return $this->belongsTo(HourlySheet::class, 'hourly_sheet_id');
    }

    public function cells(): MorphMany
    {
        return $this->morphMany(HourlyCell::class, 'rowable');
    }

    protected static function booted(): void
    {
        // Cells are polymorphic, so no DB cascade: clean them up here.
        static::deleting(fn (HourlyRow $row) => $row->cells()->delete());
    }
}
