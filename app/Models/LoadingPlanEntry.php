<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Services\LotScheduleCalculator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Awobaz\Compoships\Compoships;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class LoadingPlanEntry extends Model
{
    use Compoships;
    protected $table = 'loading_plan_entries';

    protected $fillable = [
        'entry_type',
        'lot_id',
        'package_name',
        'scheduled_date',
        'machine_id',
        'sequence_order',
        'status',
        'tag',
        'remarks',
        'block_label',
        'accu_time',
        'time_start',
        'time_end',
        'lock_version',
        'is_manual_expedite',
        'machine_snapshot',
        'doable_snapshot',
        'finalized_at',
        'resulting_setup_state_id',
        'operation_type',
        'matched_rule_id',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
        'sequence_order' => 'float',
        'finalized_at'   => 'datetime',
        'time_start'     => 'datetime',
        'time_end'       => 'datetime',
    ];

    /**
     * Relationship to the machine record (lives in qdn_db).
     */
    public function machineModel()
    {
        return $this->belongsTo(QdnMachine::class, 'machine_id');
    }

    public function lotQuantity()
    {
        return $this->hasOne(LotQuantity::class, ['lot_id', 'scheduled_date'], ['lot_id', 'scheduled_date']);
    }
    // public function lotQuantity(): HasOne
    // {
    //     // TODO: This is fragile, it assumes that lot is unique per scheduled_date
    //     return $this->hasOne(LotQuantity::class, 'lot_id', 'lot_id')
    //         ->whereColumn('lot_quantities.scheduled_date', 'loading_plan_entries.scheduled_date');
    // }
    // public function lotQuantity(): HasOne
    // {
    //     return $this->hasOne(LotQuantity::class, 'lot_id', 'lot_id')
    //         ->whereColumn('lot_quantities.scheduled_date', 'loading_plan_entries.scheduled_date');
    // }

    public function getQuantityRow(): ?LotQuantity
    {
        return LotQuantity::where('lot_id', $this->lot_id)
            ->where('scheduled_date', $this->scheduled_date)
            ->first();
    }

    public function scopeToday(Builder $query): Builder
    {
        return $query->whereDate('scheduled_date', now()->toDateString());
    }

    public function scopeEntryType(Builder $query, string $type): Builder
    {
        return $query->where('entry_type', $type);
    }

    /**
     * Explicit replacement for the old `machine` string column.
     * Returns the machine's display name (machine_num), or null if unassigned.
     */
    public function getMachineName(): ?string
    {
        return $this->machineModel?->machine_num;
    }

    public function activeLotSplit(): HasOne
    {
        return $this->hasOne(LotSplit::class, 'child_lot_id', 'lot_id')
            ->whereColumn('scheduled_date', 'loading_plan_entries.scheduled_date')
            ->active();
    }

    // capacity_uph_snapshot is now stored in lot_quantities, so this method is no longer used.
    // protected static function booted()
    // {
    //     static::saving(function (LoadingPlanEntry $entry) {
    //         if ($entry->getOriginal('finalized_at') !== null && $entry->isDirty('capacity_uph_snapshot')) {
    //             throw new \RuntimeException(
    //                 "Cannot modify capacity_uph_snapshot on entry {$entry->id}: already finalized at {$entry->getOriginal('finalized_at')}"
    //             );
    //         }
    //     });
    // }

    /**
     * Resolve the root WIP lot_id this entry ultimately traces back to.
     * Plain WIP-backed lots are their own root. Split children/parents
     * resolve via lot_splits.root_lot_id.
     */
    public function resolveRootLotId(): string
    {
        // 1. Use loaded relation if available
        if ($this->relationLoaded('activeLotSplit')) {
            return $this->activeLotSplit?->root_lot_id ?? $this->lot_id;
        }

        // 2. Query DB if not loaded
        $rootLotId = LotSplit::active()
            ->where('child_lot_id', $this->lot_id)
            ->where('scheduled_date', $this->scheduled_date->toDateString())
            ->value('root_lot_id');

        // 3. Fallback to $this->lot_id
        return $rootLotId ?? $this->lot_id;
    }

    /**
     * Display-only fields that describe the physical lot itself (not the
     * qty fragment) — Lead_Count, Body_Size, CR3, etc. Split children have
     * no WIP row of their own, so these are inherited from the root lot's
     * CustomerDataWip row rather than duplicated/stored anywhere.
     * Returns null if there's no underlying WIP row at all (e.g. a fully
     * manual lot with no WIP origin).
     */
    public function inheritedWipData(): ?CustomerDataWip
    {
        $rootLotId = $this->resolveRootLotId();

        return CustomerDataWip::query()
            ->forDate($this->scheduled_date->toDateString())
            ->where('Lot_Id', $rootLotId)
            ->first();
    }

    // currently not in used
    // public function refreshCapacityUphSnapshot(int $qty): void
    // {
    //     if ($this->finalized_at !== null) return; // frozen, no-op rather than throwing — callers shouldn't need to know finalization state to safely call this

    //     $calc = app(LotScheduleCalculator::class);
    //     $fresh = $calc->capacityUph($this->getMachineName(), $qty);

    //     if ($fresh !== $this->capacity_uph_snapshot) {
    //         // scope the update to unfinalized rows specifically, so a concurrent
    //         // finalization landing between the read and this write can't be clobbered
    //         static::where('id', $this->id)
    //             ->whereNull('finalized_at')
    //             ->update(['capacity_uph_snapshot' => $fresh]);
    //         $this->capacity_uph_snapshot = $fresh;
    //     }
    // }

    public static function findOrFailNotFinalized(int $id): self
    {
        $entry = static::where('id', $id)->lockForUpdate()->firstOrFail();

        if ($entry->is_finalized) {
            throw new \RuntimeException("Loading plan entry for the lot is already finalized.");
        }

        return $entry;
    }

    public function resultingSetupState(): BelongsTo
    {
        return $this->belongsTo(MachineSetupState::class, 'resulting_setup_state_id', 'setup_state_id');
    }

    public function matchedRule(): BelongsTo
    {
        return $this->belongsTo(MachineTransitionRule::class, 'matched_rule_id', 'rule_id');
    }

    /** Not yet started — the "open window" a rebuild is allowed to touch. */
    public function scopeOpen(Builder $query): Builder
    {
        return $query
            ->where(function ($q) {
                $q->whereNull('time_start')->orWhere('time_start', '>', Carbon::now());
            });
    }

    /** Already started (or past) — frozen, cannot be moved by a rebuild. */
    public function scopeFrozen(Builder $query): Builder
    {
        return $query
            ->whereNotNull('time_start')
            ->where('time_start', '<=', Carbon::now());
    }
}
