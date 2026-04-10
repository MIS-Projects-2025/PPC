<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RackSlot extends Model
{
    protected $fillable = [
        'rack_id',
        'label',
        'is_manually_full',
        'marked_full_by',
        'marked_full_at',
    ];

    protected $casts = [
        'is_manually_full' => 'boolean',
        'marked_full_at'   => 'datetime',
    ];

    public function rack(): BelongsTo
    {
        return $this->belongsTo(Rack::class);
    }

    public function lots(): HasMany
    {
        return $this->hasMany(LotPosition::class);
    }

    public function activePositions(): HasMany
    {
        return $this->hasMany(LotPosition::class)->whereNull('released_at');
    }

    // Convenience: is this slot physically available for a new lot?
    public function isAvailable(): bool
    {
        if ($this->is_manually_full) {
            return false;
        }

        return !$this->activePositions()->exists();
    }

    public function markedFullBy()
    {
        return $this->belongsTo(Employee::class, 'marked_full_by', 'EMPLOYID')
            ->select(['EMPLOYID', 'FIRSTNAME', 'LASTNAME', 'JOB_TITLE']);
    }
}
