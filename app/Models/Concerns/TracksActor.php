<?php

namespace App\Models\Concerns;

use App\Support\Actor;
use Illuminate\Database\Eloquent\Model;

/** Stamps created_by / updated_by with the employee ID of whoever triggered the request (null in console/jobs). */
trait TracksActor
{
    public static function bootTracksActor(): void
    {
        static::creating(function (Model $model) {
            $model->created_by = $model->created_by ?? Actor::id();
            $model->updated_by = Actor::id();
        });

        static::updating(function (Model $model) {
            $model->updated_by = Actor::id();
        });
    }
}
