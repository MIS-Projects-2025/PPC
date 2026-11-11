<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlacementSetting extends Model
{
    public $timestamps = false;
    public $incrementing = false;

    protected $primaryKey = 'key';
    protected $keyType = 'string';

    protected $fillable = ['key', 'value'];
}
