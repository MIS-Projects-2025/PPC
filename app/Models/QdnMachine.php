<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class QdnMachine extends Model
{
    protected $connection = 'qdn_db';
    protected $table = 'machine_list';

    const CREATED_AT = 'date_created';
    const UPDATED_AT = 'date_updated';

    protected $fillable = [
        'machine_num',
        'model',
        'machine_platform',
        'machine_feed_type',
        'pmnt_no',
        'cn_no',
        'serial',
        'machine_manufacturer',
        'status',
        'manufactured_date',
        'location',
        'factory',
        'oem',
        'dimension',
        'input_voltage',
        'phase',
        'hz',
        'amp',
        'age',
        'ownership',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'date_created' => 'datetime',
        'date_updated' => 'datetime',
    ];

    public function machine()
    {
        return $this->belongsTo(QdnMachine::class, 'machine_id');
    }

    public function scopeActive($query)
    {
        return $query->whereRaw('LOWER(status) = ?', ['active']);
    }

    /**
     * Get all capacity history for this machine.
     */
    public function capacities(): HasMany
    {
        return $this->hasMany(MachineCapacity::class, 'machine_id', 'id');
    }

    /**
     * Get the current active capacity record.
     */
    public function currentCapacity(): HasOne
    {
        return $this->hasOne(MachineCapacity::class, 'machine_id', 'id')
            ->whereNull('effective_to');
    }
}
