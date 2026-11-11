<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RackFloorMap extends Model
{
    public const DEFAULT_WIDTH  = 28;
    public const DEFAULT_HEIGHT = 12;

    protected $fillable = ['rack_page_id', 'width', 'height'];

    protected $casts = [
        'rack_page_id' => 'integer',
        'width'        => 'integer',
        'height'       => 'integer',
    ];

    public function rackPage(): BelongsTo
    {
        return $this->belongsTo(RackPage::class);
    }

    public function blocks(): HasMany
    {
        return $this->hasMany(RackFloorBlock::class)->orderBy('id');
    }
}
