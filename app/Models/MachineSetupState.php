<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MachineSetupState extends Model
{
    protected $connection = 'qdn_db';
    protected $table = 'machine_setup_states';
    protected $primaryKey = 'setup_state_id';

    protected $fillable = [
        'machine_id',
        'group_id',
        'factory',
        'package_name',
        'body_size',
        'thickness',
        'leadcount_min',
        'leadcount_max',
        'leadcount_exclude',
        'process_type',
        'capacity_daily',
        'remarks',
    ];

    protected $casts = [
        'thickness' => 'decimal:2',
        'leadcount_min' => 'integer',
        'leadcount_max' => 'integer',
        'capacity_daily' => 'integer',
    ];

    public function machine(): BelongsTo
    {
        return $this->belongsTo(QdnMachine::class, 'machine_id', 'id');
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(MachineSetupGroup::class, 'group_id', 'group_id');
    }

    public function partRules(): HasMany
    {
        return $this->hasMany(MachineCapabilityPartRule::class, 'setup_state_id', 'setup_state_id');
    }

    /** Transition rules where this state is the destination. */
    public function incomingTransitions(): HasMany
    {
        return $this->hasMany(MachineTransitionRule::class, 'to_state_id', 'setup_state_id');
    }

    /** Transition rules where this state is the origin (excludes wildcard from_state_id=NULL rows). */
    public function outgoingTransitions(): HasMany
    {
        return $this->hasMany(MachineTransitionRule::class, 'from_state_id', 'setup_state_id');
    }

    /** True if this state's only path to eligibility is a fixed part list (e.g. RES/CFCR-dedicated machines). */
    public function isDedicatedListOnly(): bool
    {
        return $this->partRules()->where('match_type', 'dedicated_list')->exists();
    }
}
