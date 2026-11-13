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
        'partname',
        'qty',
        'cycle',
        'staged_by',
        'staged_at',
        'released_by',
        'released_at',
        'dimension_id',
        'box_count',
        'box_group_id',
        'withdrawer_id',
        'box_source',
        'source_group_id',
        'box_details',
        'box_items',
    ];

    protected $casts = [
        'cycle'       => 'integer',
        'box_items'   => 'array',
    ];

    public function lot(): BelongsTo
    {
        return $this->belongsTo(Lot::class);
    }

    public function positions(): HasMany
    {
        return $this->hasMany(LotPosition::class);
    }

    public function boxItems(): array
    {
        $merged = [];

        foreach ((array) $this->box_items as $i) {
            $id = (int) ($i['dimension_id'] ?? 0);
            $merged[$id] = ($merged[$id] ?? 0) + (int) ($i['boxes'] ?? 0);
        }

        if (!$merged && $this->dimension_id && $this->box_count) {
            $merged[(int) $this->dimension_id] = (int) $this->box_count;
        }

        return array_map(fn($id, $n) => ['dimension_id' => $id, 'boxes' => $n], array_keys($merged), $merged);
    }

    public function isActive(): bool
    {
        return $this->released_at === null;
    }

    public function scopeActive($query)
    {
        return $query->whereNull('released_at');
    }

    public function withdrawer()
    {
        return $this->belongsTo(Employee::class, 'withdrawer_id', 'EMPLOYID')
            ->select(['EMPLOYID', 'FIRSTNAME', 'LASTNAME', 'JOB_TITLE']);
    }
}
