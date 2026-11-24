<?php

namespace App\Http\Requests\HourlyMonitoring;

use Illuminate\Foundation\Http\FormRequest;

class EmployeeSearchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return ['q' => ['required', 'string', 'min:1', 'max:50']];
    }
}
