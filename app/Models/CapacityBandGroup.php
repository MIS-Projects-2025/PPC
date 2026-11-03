<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CapacityBandGroup extends Model
{
    public const F1F2 = 'F1F2';
    public const F3   = 'F3';

    protected $connection = 'qdn_db';
    protected $table = 'capacity_band_groups';
    protected $primaryKey = 'code';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;
    protected $fillable = ['code', 'label'];

    /**
     * The one place a lot decides which band family prices its capacity.
     * To split F1/F2 later: add a ?string $factory argument and return it for non-F3 lots.
     */
    public static function forSource(?string $source): string
    {
        return strtolower((string) $source) === 'f3' ? self::F3 : self::F1F2;
    }
}
