<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// app/Models/SchedulerRun.php
class SchedulerRun extends Model
{
    protected $fillable = [
        'location',
        'date',
        'employee_id',
        'status',
        'pickup_count',
        'assigned_count',
        'unassigned_count',
        'unmatched_parts',
        'note',
    ];

    protected $casts = ['unmatched_parts' => 'array', 'date' => 'date'];
}
