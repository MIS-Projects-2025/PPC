<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class RackSlot extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'rack_id',
        'label',
        'is_manually_full',
        'marked_full_by',
        'marked_full_at',
        'is_active',
    ];

    protected $casts = [
        'is_manually_full' => 'boolean',
        'marked_full_at'   => 'datetime',
        'is_active'        => 'boolean',
    ];

    public function rack(): BelongsTo
    {
        return $this->belongsTo(Rack::class)->withTrashed();
    }

    public function lots(): HasMany
    {
        return $this->hasMany(LotPosition::class);
    }

    public function activePositions(): HasMany
    {
        return $this->hasMany(LotPosition::class)->whereNull('released_at');
    }

    public function isActive(): bool
    {
        return $this->is_active;
    }

    // Convenience: is this slot physically available for a new lot?
    public function isAvailable(): bool
    {
        return !$this->is_manually_full;
    }

    public function markedFullBy()
    {
        return $this->belongsTo(Employee::class, 'marked_full_by', 'EMPLOYID')
            ->select(['EMPLOYID', 'FIRSTNAME', 'LASTNAME', 'JOB_TITLE']);
    }
}
