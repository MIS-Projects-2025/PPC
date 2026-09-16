<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MachineTransitionAxisRule extends Model
{
    protected $connection = 'qdn_db';
    protected $table = 'machine_transition_axis_rules';

    protected $fillable = [
        'machine_id',
        'axis',
        'operation_type',
        'est_duration_minutes',
        'combination_rule',
    ];
}
