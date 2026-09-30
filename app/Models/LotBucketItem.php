<?php
// app/Models/LotBucketItem.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LotBucketItem extends Model
{
    protected $table = 'loading_plan_bucket_items';

    protected $guarded = [];

    protected $casts = [
        'position' => 'float',
    ];

    public function bucket(): BelongsTo
    {
        return $this->belongsTo(LoadingPlanBucket::class, 'bucket_id');
    }
}
