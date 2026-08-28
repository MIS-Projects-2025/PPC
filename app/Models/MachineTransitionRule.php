<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MachineTransitionRule extends Model
{
    protected $connection = 'qdn_db';
    protected $table = 'machine_transition_rules';
    protected $primaryKey = 'rule_id';

    protected $fillable = [
        'machine_id',
        'from_state_id',
        'to_state_id',
        'operation_type',
        'est_duration_minutes',
        'notes',
    ];

    protected $casts = [
        'est_duration_minutes' => 'integer',
    ];

    public function machine(): BelongsTo
    {
        return $this->belongsTo(QdnMachine::class, 'machine_id', 'id');
    }

    /** Null when this rule applies from ANY current state (wildcard). */
    public function fromState(): BelongsTo
    {
        return $this->belongsTo(MachineSetupState::class, 'from_state_id', 'setup_state_id');
    }

    public function toState(): BelongsTo
    {
        return $this->belongsTo(MachineSetupState::class, 'to_state_id', 'setup_state_id');
    }
}
