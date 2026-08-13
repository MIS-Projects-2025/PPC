<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MachineDayStart extends Model
{
    protected $table = 'machine_day_starts';
    public $incrementing = false; // composite key, no surrogate id
    protected $primaryKey = null; // composite PK isn't natively supported by Eloquent

    protected $fillable = [
        'machine_id',
        'scheduled_date',
        'day_start_time',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
    ];

    /** Cross-database relation — no FK constraint possible (qdn_db is separate). */
    public function machine(): BelongsTo
    {
        return $this->belongsTo(QdnMachine::class, 'machine_id', 'id');
    }
}
