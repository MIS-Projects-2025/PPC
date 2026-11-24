<?php

namespace App\Models;

class BoxingHourlyRow extends HourlyRow
{
    public const MORPH = 'boxing';

    protected $table = 'boxing_hourly_rows';

    protected $fillable = ['hourly_sheet_id', 'sort_order', 'shift', 'emp_id', 'emp_name'];

    protected $casts = ['sort_order' => 'integer'];

    public static function editableRules(): array
    {
        return [
            'emp_id' => ['nullable', 'string', 'max:50'],
        ];
    }

    /** `shift` is fixed when the row is created (day table or night table). */
    public static function readOnlyFields(): array
    {
        return ['emp_name', 'shift'];
    }

    public static function employeeFields(): array
    {
        return ['emp_id' => 'emp_name'];
    }

    public static function hasLots(): bool
    {
        return true;
    }
}
