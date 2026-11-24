<?php

namespace App\Models;

class MachineHourlyRow extends HourlyRow
{
    public const MORPH = 'machine';

    protected $table = 'machine_hourly_rows';

    protected $fillable = [
        'hourly_sheet_id', 'sort_order',
        'machine', 'capacity', 'plan', 'package_type', 'setup',
        'day_emp_id', 'day_emp_name', 'day_lots',
        'night_setup', 'night_emp_id', 'night_emp_name', 'night_lots',
        'reason', 'action', 'who', 'when_at', 'status',
    ];

    protected $casts = [
        'sort_order' => 'integer', 'capacity' => 'integer', 'plan' => 'integer',
        'day_lots' => 'integer', 'night_lots' => 'integer',
    ];

    public static function editableRules(): array
    {
        $int = ['nullable', 'integer', 'min:0', 'max:2000000000'];
        $str = ['nullable', 'string', 'max:255'];

        return [
            // FUTURE: will reference qdn_db.machine_list and become a dropdown.
            'machine'      => ['nullable', 'string', 'max:100'],
            // FUTURE: will reference qdn_db.machine_capacies and become a dropdown.
            'capacity'     => $int,
            'plan'         => $int,
            'package_type' => ['nullable', 'string', 'max:100'],
            'setup'        => ['nullable', 'string', 'max:100'],
            'day_emp_id'   => ['nullable', 'string', 'max:50'],
            'day_lots'     => $int,
            'night_setup'  => ['nullable', 'string', 'max:100'],
            'night_emp_id' => ['nullable', 'string', 'max:50'],
            'night_lots'   => $int,
            'reason'       => $str,
            'action'       => $str,
            'who'          => $str,
            'when_at'      => $str,
            'status'       => $str,
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
