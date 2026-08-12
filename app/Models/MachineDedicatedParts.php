<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MachineDedicatedParts extends Model
{
    protected $table = 'machine_dedicated_parts';

    // Composite Primary Key setup
    protected $primaryKey = ['machine_id', 'part_name'];
    public $incrementing = false;

    // Disabled timestamps as they are not present in the schema
    public $timestamps = false;

    protected $fillable = [
        'machine_id',
        'part_name',
    ];

    /**
     * Get the machine that owns this dedicated part.
     */
    public function machine(): BelongsTo
    {
        return $this->belongsTo(QdnMachine::class, 'machine_id', 'id');
    }
}
