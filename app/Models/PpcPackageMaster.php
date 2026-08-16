<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

class PpcPackageMaster extends Model
{
    protected $table = 'ppc_package_master';
    public $timestamps = false;
    protected $fillable = [
        'package',
        'is_telford',
        'default_pl',
        'is_active',
        'valid_from',
        'valid_to',
    ];

    protected $casts = [
        'updated_at' => 'datetime',
        'created_at' => 'datetime',
        'is_telford' => 'boolean',
        'is_active'  => 'boolean',
        'valid_from' => 'date',
        'valid_to'   => 'date',
    ];

    public function scopeActiveTelford(Builder $query): Builder
    {
        return $query->where('is_telford', true)
            ->where('is_active', true);
    }
}
