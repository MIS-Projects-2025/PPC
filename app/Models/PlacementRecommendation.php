<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlacementRecommendation extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'lot_staging_id',
        'rack_page_id',
        'lot_code',
        'recommended',
        'reason',
        'actual_slot_ids',
        'model_contradicted',
        'adherence',
        'committed_at',
        'didnt_fit_at',
        'created_at',
    ];

    protected $casts = [
        'recommended'        => 'array',
        'actual_slot_ids'    => 'array',
        'model_contradicted' => 'boolean',
    ];
}
