<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Services\LotScheduleCalculator;

class LoadingPlanEntry extends Model
{
    protected $table = 'loading_plan_entries';

    protected $fillable = [
        'entry_type',
        'lot_id',
        'part_name',
        'package_name',
        'qty',
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
        'capacity_uph_snapshot',
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

    /**
     * Explicit replacement for the old `machine` string column.
     * Returns the machine's display name (machine_num), or null if unassigned.
     */
    public function getMachineName(): ?string
    {
        return $this->machineModel?->machine_num;
    }

    protected static function booted()
    {
        static::saving(function (LoadingPlanEntry $entry) {
            if ($entry->getOriginal('finalized_at') !== null && $entry->isDirty('capacity_uph_snapshot')) {
                throw new \RuntimeException(
                    "Cannot modify capacity_uph_snapshot on entry {$entry->id}: already finalized at {$entry->getOriginal('finalized_at')}"
                );
            }
        });
    }

    public function refreshCapacityUphSnapshot(int $qty): void
    {
        if ($this->finalized_at !== null) return; // frozen, no-op rather than throwing — callers shouldn't need to know finalization state to safely call this

        $calc = app(LotScheduleCalculator::class);
        $fresh = $calc->capacityUph($this->getMachineName(), $qty);

        if ($fresh !== $this->capacity_uph_snapshot) {
            // scope the update to unfinalized rows specifically, so a concurrent
            // finalization landing between the read and this write can't be clobbered
            static::where('id', $this->id)
                ->whereNull('finalized_at')
                ->update(['capacity_uph_snapshot' => $fresh]);
            $this->capacity_uph_snapshot = $fresh;
        }
    }
}
