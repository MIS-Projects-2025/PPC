<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

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
}
