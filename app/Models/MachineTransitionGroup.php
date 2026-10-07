<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MachineTransitionGroup extends Model
{
    protected $connection = 'qdn_db';
    protected $table = 'machine_transition_groups';
    protected $fillable = ['machine_id', 'name', 'color'];

    public function members()
    {
        return $this->hasMany(MachineTransitionGroupMember::class, 'group_id');
    }
}
