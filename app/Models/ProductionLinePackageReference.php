<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductionLinePackageReference extends Model
{
    protected $table = 'ppc_productionline_packagereference';

    protected $primaryKey = 'package';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;

    protected $fillable = ['package', 'production_line'];
}
