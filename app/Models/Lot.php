<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Casts\Attribute;

class Lot extends Model
{
    protected $appends = ['slot_ids'];

    protected $fillable = [
        'lot_id',
        'partname',
        'qty',
        'status',
        'received_at',
        'received_by',
        'modified_by',
    ];

    protected $casts = [
        // 'received_at' => 'datetime',
        'qty'         => 'integer',
    ];

    // protected function serializeDate(\DateTimeInterface $date): string
    // {
    //     return $date->utc()->toIso8601ZuluString();
    // }

    public function positions(): HasMany
    {
        return $this->hasMany(LotPosition::class);
    }

    public function activePositions(): HasMany
    {
        return $this->hasMany(LotPosition::class)->whereNull('released_at');
    }

    public function getAgeDaysAttribute(): int
    {
        return (int) $this->received_at->diffInDays(now());
    }

    public function isAging(): bool
    {
        return $this->age_days >= 3;
    }

    public function scopeStaged($query)
    {
        return $query->where('status', 'staged');
    }

    public function scopeAging($query)
    {
        return $query->where('received_at', '<=', now()->subDays(3));
    }

    public function scopeToday($query)
    {
        return $query->whereBetween('received_at', [
            today()->startOfDay()->utc(),
            today()->endOfDay()->utc(),
        ]);
    }

    protected function slotIds(): Attribute
    {
        return Attribute::make(
            get: fn() => $this->activePositions->pluck('rack_slot_id')->toArray(),
        );
    }

    public function modifiedBy()
    {
        return $this->belongsTo(Employee::class, 'modified_by', 'EMPLOYID')
            ->select(['EMPLOYID', 'FIRSTNAME', 'LASTNAME', 'JOB_TITLE']);
    }

    public function receivedBy()
    {
        return $this->belongsTo(Employee::class, 'received_by', 'EMPLOYID')
            ->select(['EMPLOYID', 'FIRSTNAME', 'LASTNAME', 'JOB_TITLE']);
    }
}
