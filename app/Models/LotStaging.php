<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LotStaging extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'lot_id',
        'cycle',
        'staged_by',
        'staged_at',
        'released_by',
        'released_at',
    ];

    protected $casts = [
        'cycle'       => 'integer',
    ];

    public function lot(): BelongsTo
    {
        return $this->belongsTo(Lot::class);
    }

    public function positions(): HasMany
    {
        return $this->hasMany(LotPosition::class);
    }

    public function isActive(): bool
    {
        return $this->released_at === null;
    }

    public function scopeActive($query)
    {
        return $query->whereNull('released_at');
    }
}
