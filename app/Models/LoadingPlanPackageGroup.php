<?php

namespace App\Models;

use App\Services\PackageGroups;
use Illuminate\Database\Eloquent\Model;

class LoadingPlanPackageGroup extends Model
{
    protected $connection = 'qdn_db';

    protected $table = 'package_groups';

    protected $fillable = ['group_name', 'package_name'];

    protected static function booted(): void
    {
        // Any change through Eloquent invalidates the cached lookup maps.
        // Note: query-builder mass ops (PackageGroup::where(...)->delete()/update())
        // do NOT fire these events; call PackageGroups::flushCache() after them.
        static::saved(fn() => PackageGroups::flushCache());
        static::deleted(fn() => PackageGroups::flushCache());
    }
}
