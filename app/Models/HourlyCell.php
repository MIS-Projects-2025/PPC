<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** One slot of one row: either output_qty or a downtime_code (FK), never both. */
class HourlyCell extends Model
{
    protected $fillable = ['rowable_type', 'rowable_id', 'hour', 'output_qty', 'downtime_code_id', 'updated_by'];

    protected $casts = ['hour' => 'integer', 'output_qty' => 'integer'];

    public function downtimeCode(): BelongsTo
    {
        return $this->belongsTo(DowntimeCode::class, 'downtime_code_id');
    }
}
