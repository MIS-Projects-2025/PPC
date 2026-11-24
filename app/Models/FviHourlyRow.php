<?php

namespace App\Models;

class FviHourlyRow extends HourlyRow
{
    public const MORPH = 'fvi';

    protected $table = 'fvi_hourly_rows';

    protected $fillable = [
        'hourly_sheet_id', 'sort_order',
        'day_emp_id', 'day_emp_name', 'day_designation', 'day_lots',
        'night_emp_id', 'night_emp_name', 'night_designation', 'night_lots',
    ];

    protected $casts = ['sort_order' => 'integer', 'day_lots' => 'integer', 'night_lots' => 'integer'];

    public static function editableRules(): array
    {
        $int = ['nullable', 'integer', 'min:0', 'max:2000000000'];

        return [
            'day_emp_id'        => ['nullable', 'string', 'max:50'],
            // Possible in the future it will be a reference table too.
            'day_designation'   => ['nullable', 'string', 'max:100'],
            'day_lots'          => $int,
            'night_emp_id'      => ['nullable', 'string', 'max:50'],
            'night_designation' => ['nullable', 'string', 'max:100'],
            'night_lots'        => $int,
        ];
    }

    public static function readOnlyFields(): array
    {
        return ['day_emp_name', 'night_emp_name'];
    }

    public static function employeeFields(): array
    {
        return ['day_emp_id' => 'day_emp_name', 'night_emp_id' => 'night_emp_name'];
    }
}
