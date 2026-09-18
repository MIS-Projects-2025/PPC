<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MachineAutoPartRule extends Model
{
    protected $connection = 'qdn_db';
    protected $table = 'machine_auto_part_rules';

    protected $fillable = [
        'machine_id',
        'package_name',
        'rule_type', // 'exclude' | 'include_only'
        'notes',
    ];
}
