<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MachineFocusGroupRule extends Model
{
    protected $connection = 'qdn_db';
    protected $table = 'machine_focus_group_rules';

    protected $fillable = [
        'machine_id',
        'focus_group',
        'rule_type', // 'exclude' | 'include_only'
        'notes',
    ];
}
