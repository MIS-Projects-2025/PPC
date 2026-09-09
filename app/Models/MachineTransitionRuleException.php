<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MachineTransitionRuleException extends Model
{
    protected $connection = 'qdn_db';
    protected $table = 'machine_transition_rule_exceptions';

    protected $fillable = [
        'machine_id',
        'part_name',
        'from_state_id',
        'to_state_id',
        'operation_type',
        'est_duration_minutes',
        'notes',
    ];
}
