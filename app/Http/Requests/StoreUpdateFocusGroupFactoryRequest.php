<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUpdateFocusGroupFactoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // Ignore unique check on update if record ID is provided
        $id = $this->route('focus_group_factory')?->id;

        return [
            'focus_group' => [
                'required',
                'string',
                'max:20',
                Rule::unique('focus_group_factory', 'focus_group')->ignore($id),
            ],
            'factory' => ['required', 'string', 'max:10'],
        ];
    }
}
