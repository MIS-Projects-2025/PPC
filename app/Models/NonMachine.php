<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NonMachine extends Model
{
    protected $fillable = ['name', 'location', 'scheduled_date'];

    protected $casts = [
        'scheduled_date' => 'date',
    ];

    public function entries(): HasMany
    {
        return $this->hasMany(LoadingPlanEntry::class, 'non_machine_id');
    }

    /**
     * Placement key used by the frontend / API wherever a machine name is
     * accepted ("nm:<id>"). Names are not unique, ids are.
     */
    public static function keyFor(int $id): string
    {
        return "nm:{$id}";
    }

    public function key(): string
    {
        return self::keyFor($this->id);
    }

    /** "nm:12" => 12; anything else (machine names, null) => null. */
    public static function idFromKey(mixed $key): ?int
    {
        return is_string($key) && str_starts_with($key, 'nm:')
            ? (int) substr($key, 3)
            : null;
    }
}
