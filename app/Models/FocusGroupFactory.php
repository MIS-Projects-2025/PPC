<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FocusGroupFactory extends Model
{
    protected $table = 'focus_group_factory';

    protected $fillable = [
        'focus_group',
        'factory',
    ];
}
