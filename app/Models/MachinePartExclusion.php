<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MachinePartExclusion extends Model
{
    protected $connection = 'qdn_db';
    protected $table = 'machine_part_exclusions';

    protected $fillable = [
        'machine_id',
        'part_name',
        'notes',
    ];
}
