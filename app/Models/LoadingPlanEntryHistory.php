<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoadingPlanEntryHistory extends Model
{
    public $timestamps = false;

    protected $table = 'loading_plan_entry_history';

    protected $fillable = [
        'entry_id',
        'changed_by',
        'change_type',
        'changed_columns',
        'old_values',
        'new_values',
    ];

    protected $casts = [
        'changed_at'       => 'datetime',
        'changed_columns'  => 'array',
        'old_values'       => 'array',
        'new_values'       => 'array',
    ];

    public function entry()
    {
        return $this->belongsTo(LoadingPlanEntry::class, 'entry_id');
    }

    // public function changedBy()
    // {
    //     return $this->belongsTo(\App\Models\User::class, 'changed_by');
    // }
}
