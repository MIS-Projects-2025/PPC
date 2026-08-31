<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RackPage extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'label',
    ];

    public function racks(): HasMany
    {
        return $this->hasMany(Rack::class);
    }
}
