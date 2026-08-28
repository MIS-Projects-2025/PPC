<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MachineCapabilityPartRule extends Model
{
    protected $connection = 'qdn_db';
    protected $table = 'machine_capability_part_rules';
    protected $primaryKey = 'rule_id';

    protected $fillable = [
        'setup_state_id',
        'match_type',
        'match_value',
    ];

    public function setupState(): BelongsTo
    {
        return $this->belongsTo(MachineSetupState::class, 'setup_state_id', 'setup_state_id');
    }
}
