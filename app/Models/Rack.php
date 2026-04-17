<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\SoftDeletes;

class Rack extends Model
{
    use SoftDeletes;

    protected $appends = ['shelves'];

    protected $fillable = [
        'production_line_id',
        'label',
    ];

    public function productionLine(): BelongsTo
    {
        return $this->belongsTo(ProductionLine::class);
    }

    public function slots(): HasMany
    {
        return $this->hasMany(RackSlot::class);
    }

    public function shelves(): Attribute
    {
        return Attribute::make(
            get: fn() => $this->slots
                ->groupBy(fn($slot) => substr($slot->label, 0, 1))
                // Optional: Sort keys so shelf A comes before B
                ->sortKeys()
        );
    }

    protected static function booted(): void
    {
        static::deleting(function (Rack $rack) {
            $rack->label = $rack->label . '__deleted__' . $rack->id;
            $rack->save();
            $rack->slots()->each(fn($slot) => $slot->delete());
        });
    }
}
