<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PackageGroupLoadingPlan extends Model
{
    protected $connection = 'qdn_db';
    protected $table = 'package_groups';

    protected $fillable = ['group_name', 'package_name'];
}
