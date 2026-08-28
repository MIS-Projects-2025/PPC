<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MachineSetupGroup extends Model
{
    protected $connection = 'qdn_db';
    protected $table = 'machine_setup_groups';
    protected $primaryKey = 'group_id';

    protected $fillable = [
        'machine_id',
        'group_type',
        'notes',
    ];

    public function machine(): BelongsTo
    {
        return $this->belongsTo(QdnMachine::class, 'machine_id', 'id');
    }

    public function setupStates(): HasMany
    {
        return $this->hasMany(MachineSetupState::class, 'group_id', 'group_id');
    }
}
