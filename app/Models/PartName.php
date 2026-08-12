<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PartName extends Model
{
    use HasFactory;

    protected $connection = 'qdn_db';

    protected $table = 'package_list';

    protected $primaryKey = 'id';

    protected $fillable = [
        'devicename',
        'focus_grp',
        'areas',
        'productline',
        'package_type',
        'lead_count',
        'dimensions',
        'allocation',
        'generic_name',
        'drypack',
        'recipe',
    ];

    protected $casts = [
        'date_created' => 'datetime',
        'date_updated' => 'datetime',
    ];

    public $timestamps = false;
}
