<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MachineGroupTransitionRule extends Model
{
    protected $connection = 'qdn_db';
    protected $table = 'machine_group_transition_rules';
    protected $fillable = ['machine_id', 'from_group_id', 'to_group_id', 'operation_type', 'est_duration_minutes', 'symmetric', 'notes'];
    protected $casts = ['symmetric' => 'boolean'];
}
