<?php

namespace App\Http\Requests\HourlyMonitoring;

use Illuminate\Foundation\Http\FormRequest;

/**
 * {
 *   "rows": [
 *     { "id": 12, "fields": {"plan": 5000, "day_emp_id": "1234"}, "cells": {"8": "1500", "9": "E_CHIPOUT", "10": ""}, "lots": {"8": "3"} }
 *   ]
 * }
 * Cells (and boxing lots) are keyed by hour slot (0-23). A blank value clears it.
 */
class ApplyRowChangesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $rules = [
            'rows'           => ['required', 'array', 'min:1', 'max:500'],
            'rows.*.id'      => ['required', 'integer'],
            'rows.*.fields'  => ['sometimes', 'array'],
            'rows.*.cells'   => ['sometimes', 'array'],
            'rows.*.cells.*' => ['nullable', 'string', 'max:255'],
            'rows.*.lots'    => ['sometimes', 'array'],
            'rows.*.lots.*'  => ['nullable', 'string', 'max:20'],
        ];

        foreach ($this->route('sheet')->rowModelClass()::editableRules() as $field => $fieldRules) {
            $rules["rows.*.fields.$field"] = $fieldRules;
        }

        return $rules;
    }
}
