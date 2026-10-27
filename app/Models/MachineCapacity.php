<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MachineCapacity extends Model
{
    protected $connection = 'qdn_db';
    protected $table = 'machine_capacities';

    public $timestamps = false;

    protected $fillable = [
        'machine_id',
        'capacity',
        'effective_from',
        'effective_to',
    ];

    protected $casts = [
        'effective_from' => 'date:Y-m-d',
        'effective_to'   => 'date:Y-m-d',
        'capacity'       => 'integer',
    ];

    /**
     * Capacity rows effective on $date for many machines, in one query.
     * Keyed by machine_id. Same predicate as effectiveFor().
     */
    public static function effectiveForMany(iterable $machineIds, \Carbon\Carbon $date): \Illuminate\Support\Collection
    {
        $day = $date->toDateString();

        return static::query()
            ->whereIn('machine_id', collect($machineIds)->values())
            ->where('effective_from', '<=', $day)
            ->where(function ($q) use ($day) {
                $q->whereNull('effective_to')->orWhere('effective_to', '>=', $day);
            })
            ->orderBy('effective_from')   // see note below
            ->get()
            ->keyBy('machine_id');
    }

    /**
     * Get the machine that owns this capacity record.
     */
    public function machine(): BelongsTo
    {
        return $this->belongsTo(QdnMachine::class, 'machine_id', 'id');
    }

    /**
     * Scope to get current active record for a machine.
     */
    public function scopeCurrent(Builder $query): Builder
    {
        return $query->whereNull('effective_to');
    }

    /**
     * Scope to get capacity active on a specific date.
     */
    public function scopeAsOf(Builder $query, string $date): Builder
    {
        return $query->where('effective_from', '<=', $date)
            ->where(function ($q) use ($date) {
                $q->whereNull('effective_to')
                    ->orWhere('effective_to', '>=', $date);
            });
    }

    public static function effectiveFor(int $machineId, \Carbon\Carbon $date): ?self
    {
        return static::query()
            ->where('machine_id', $machineId)
            ->where('effective_from', '<=', $date->toDateString())
            ->where(function ($q) use ($date) {
                $q->whereNull('effective_to')->orWhere('effective_to', '>=', $date->toDateString());
            })
            ->first();
    }
}
