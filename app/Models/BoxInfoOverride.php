<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Audited correction of wrong source box info. The source tables are never written.
 * Keyed by (source, group, original box_details) so every later lot of the same box set gets it too.
 */
class BoxInfoOverride extends Model
{
    protected $fillable = [
        'box_source',
        'group_key',
        'set_key',
        'original_box_details',
        'original_no_of_box',
        'box_details',
        'no_of_box',
        'changed_by',
    ];

    protected $casts = [
        'original_no_of_box' => 'integer',
        'no_of_box'          => 'integer',
    ];
}
