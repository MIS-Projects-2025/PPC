<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DowntimeCode extends Model
{
    protected $table = 'downtime_code';

    protected $fillable = ['code', 'bg_color', 'is_downtime'];

    protected $casts = ['is_downtime' => 'boolean'];

    /** Background colors that need white text (navy). Everything else uses black text. */
    private const LIGHT_TEXT_ON = ['#1F3864'];

    public function textColor(): string
    {
        return in_array(strtoupper((string) $this->bg_color), self::LIGHT_TEXT_ON, true) ? '#FFFFFF' : '#000000';
    }
}
