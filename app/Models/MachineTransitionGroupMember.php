<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MachineTransitionGroupMember extends Model
{
    protected $connection = 'qdn_db';
    protected $table = 'machine_transition_group_members';
    public $incrementing = false;
    public $timestamps = false;
    protected $fillable = ['group_id', 'setup_state_id'];
}
