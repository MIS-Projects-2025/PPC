<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One slot of one row: either output_qty or a downtime_code (FK), never both.
 * Boxing slots may additionally hold `lots` (the "No of lots" next to the hour).
 */
class HourlyCell extends Model
{
    protected $fillable = ['rowable_type', 'rowable_id', 'hour', 'output_qty', 'downtime_code_id', 'lots', 'updated_by'];

    protected $casts = ['hour' => 'integer', 'output_qty' => 'integer', 'lots' => 'integer'];

    public function downtimeCode(): BelongsTo
    {
        return $this->belongsTo(DowntimeCode::class, 'downtime_code_id');
    }
}
