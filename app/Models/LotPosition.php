<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LotPosition extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'lot_id',
        'rack_slot_id',
        'production_line_id',
        'assigned_at',
        'assigned_by',
        'released_at',
        'released_by',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
        'released_at' => 'datetime',
    ];

    public function lot(): BelongsTo
    {
        // 1. Related model
        // 2. The foreign key on this table ('lot_id')
        // 3. The primary key on the Lot table ('id')
        return $this->belongsTo(Lot::class, 'lot_id', 'id');
    }

    public function productionLine(): BelongsTo
    {
        return $this->belongsTo(ProductionLine::class, 'production_line_id', 'id');
    }

    public function rackSlot(): BelongsTo
    {
        return $this->belongsTo(RackSlot::class)->withTrashed();
        // return $this->belongsTo(RackSlot::class);
    }

    public function isActive(): bool
    {
        return $this->released_at === null;
    }

    public function scopeActive($query)
    {
        return $query->whereNull('released_at');
    }

    public function assignedBy()
    {
        return $this->belongsTo(Employee::class, 'assigned_by', 'EMPLOYID')
            ->select(['EMPLOYID', 'FIRSTNAME', 'LASTNAME', 'JOB_TITLE']);
    }

    public function releasedBy()
    {
        return $this->belongsTo(Employee::class, 'released_by', 'EMPLOYID')
            ->select(['EMPLOYID', 'FIRSTNAME', 'LASTNAME', 'JOB_TITLE']);
    }
}
