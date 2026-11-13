<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Awobaz\Compoships\Compoships;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Casts\Attribute;


class LoadingPlanEntry extends Model
{
    use HasFactory;
    use Compoships;
    protected $table = 'loading_plan_entries';
    protected $appends = ['is_rework'];

    /** A lot whose entry has one of these statuses is finished: it never carries over. Everything else carries. */
    // todo: make the statuses db-stored, remove the statuses from the frontend, fetch instead and put this on any constant file
    public const CLOSED_STATUSES = [
        'DONE',
        'FINAL SHIP',
        'IQA',
        'OQA',
        'FVI',
        'VISUAL (FVI)',
        'BUY-OFF',
    ];

    public static function isClosedStatus(?string $status): bool
    {
        return in_array(strtoupper(trim((string) $status)), self::CLOSED_STATUSES, true);
    }

    protected $fillable = [
        'entry_type',
        'source',
        'lot_id',
        'package_name',
        'scheduled_date',
        'machine_id',
        'non_machine_id',
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
        'rework_seq',
        'rework_of_entry_id',
        'carried_from_entry_id',
        'origin_date',
        'root_lot_id',
        'is_pickup',
        'is_scm',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
        'is_pickup'      => 'boolean',
        'is_scm'         => 'boolean',
        'sequence_order' => 'float',
        'finalized_at'   => 'datetime',
        'origin_date'    => 'date:Y-m-d',
        'time_start'     => 'datetime',
        'time_end'       => 'datetime',
    ];

    protected function source(): Attribute
    {
        return Attribute::make(
            get: fn($v) => $v === null ? null : strtolower($v),
            set: fn($v) => $v === null ? null : strtolower($v),
        );
    }

    public function getPlacementKey(): ?string
    {
        return $this->non_machine_id !== null
            ? NonMachine::keyFor($this->non_machine_id)
            : $this->getMachineName();
    }

    public function getIsReworkAttribute(): bool
    {
        return ($this->rework_seq ?? 0) > 0;
    }

    public function nonMachine(): BelongsTo
    {
        return $this->belongsTo(NonMachine::class, 'non_machine_id');
    }

    /**
     * Relationship to the machine record (lives in qdn_db).
     */
    public function machineModel()
    {
        return $this->belongsTo(QdnMachine::class, 'machine_id');
    }

    public function lotQuantity()
    {
        return $this->hasOne(
            LotQuantity::class,
            ['lot_id', 'scheduled_date', 'rework_seq'],
            ['lot_id', 'scheduled_date', 'rework_seq']
        );
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
            ->where('rework_seq', $this->rework_seq ?? 0)
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
        return $this->hasOne(
            LotSplit::class,
            ['child_lot_id', 'scheduled_date'],
            ['lot_id', 'scheduled_date']
        )->active();
    }

    /**
     * Resolve the root WIP lot_id this entry ultimately traces back to.
     * Plain WIP-backed lots are their own root. Split children/parents
     * resolve via lot_splits.root_lot_id.
     */
    public function resolveRootLotId(): string
    {
        // 0. A carried entry remembers its root: its split row lives on an earlier date
        if ($this->root_lot_id) {
            return $this->root_lot_id;
        }

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
        return app(\App\Services\LotSourceService::class)->forEntry($this);
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

        if ($entry->finalized_at !== null) {
            throw new \App\Exceptions\LoadingPlanDateFinalizedException(
                $entry->scheduled_date->toDateString()
            );
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
