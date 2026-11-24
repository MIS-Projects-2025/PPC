<?php

namespace App\Http\Requests\HourlyMonitoring;

use Illuminate\Foundation\Http\FormRequest;

class DateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // no authorization for now: everything is unguarded
    }

    public function rules(): array
    {
        return ['date' => ['nullable', 'date_format:Y-m-d']];
    }

    /** The requested day as Y-m-d (today when omitted). */
    public function day(): string
    {
        return $this->validated('date') ?? now()->toDateString();
    }
}
