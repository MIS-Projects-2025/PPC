<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;

/**
 * Lives in the `output_monitoring` schema — a different schema on the same
 * DB server as the main app, reached via a dedicated connection (see
 * config/database.php: 'output_monitoring').
 *
 * Deliberately kept on its own connection rather than relying on a
 * cross-schema SQL JOIN, so that:
 *   1. A failure/outage on this schema can be caught and degraded
 *      gracefully (see LotRunRepository) instead of taking down queries
 *      against the primary `lots` table.
 *   2. lot_no <-> lot_id matching stays explicit in PHP/repository code
 *      rather than relying on a cross-connection query Eloquent can't
 *      actually execute as a single statement anyway.
 */
class LotRun extends Model
{
    protected $connection = 'output_monitoring';

    protected $table = 'lot_runs';

    public $timestamps = false;

    protected $casts = [
        'start_time' => 'datetime',
        'end_time'   => 'datetime',
        'parsed_at'  => 'datetime',
        'is_valid'   => 'boolean',
        'muba'       => 'decimal:2',
        'mubf'       => 'decimal:2',
        'mubaf'      => 'decimal:2',
    ];

    public function scopeForLot(Builder $query, string $lotId): Builder
    {
        return $query->where('lot_no', $lotId);

        // Case-sensitive/binary collation fallback:
        // return $query->whereRaw('LOWER(lot_no) = LOWER(?)', [$lotId]);
    }

    public function scopeValid(Builder $query): Builder
    {
        return $query->where('is_valid', true);
    }

    public function scopeLatestFirst(Builder $query): Builder
    {
        return $query->orderByDesc('end_time');
    }

    protected function hasEnded(): Attribute
    {
        return Attribute::get(fn() => filled($this->end_time));
    }

    protected function yieldPercent(): Attribute
    {
        return Attribute::get(function () {
            if (empty($this->total_inspected)) {
                return null;
            }

            return round(($this->total_passed / $this->total_inspected) * 100, 2);
        });
    }
}
