<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Services\LotScheduleCalculator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasOne;

class LoadingPlanEntry extends Model
{
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
        'lock_version',
        'machine_snapshot',
        'doable_snapshot',
        'finalized_at',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
        'sequence_order' => 'float',
        'finalized_at'   => 'datetime',
    ];

    /**
     * Relationship to the machine record (lives in qdn_db).
     */
    public function machineModel()
    {
        return $this->belongsTo(QdnMachine::class, 'machine_id');
    }

    public function lotQuantity(): HasOne
    {
        return $this->hasOne(LotQuantity::class, 'lot_id', 'lot_id');
    }
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
        $asChild = LotSplit::active()->where('child_lot_id', $this->lot_id)->value('root_lot_id');

        return $asChild ?? $this->lot_id;
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
}
