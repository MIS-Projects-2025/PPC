<?php

namespace App\Http\Controllers;

use App\Models\BoxDimension;
use App\Services\BoxDimensionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class BoxDimensionController extends Controller
{
    public function __construct(protected BoxDimensionService $service) {}

    public function index(): Response
    {
        return Inertia::render('BoxDimensions', [
            'boxes' => $this->service->all(),
        ]);
    }

    public function store(): RedirectResponse
    {
        $this->service->create(request()->validate($this->rules()));

        return back();
    }

    public function update(int $id): RedirectResponse
    {
        $this->service->update($id, request()->validate($this->rules($id)));

        return back();
    }

    public function destroy(int $id): RedirectResponse
    {
        $this->service->delete($id);

        return back();
    }

    private function rules(?int $ignoreId = null): array
    {
        return [
            'name'        => ['required', 'string', 'max:100', Rule::unique((new BoxDimension)->getTable(), 'name')->ignore($ignoreId)],
            'length'      => 'required|numeric|decimal:0,1|min:0.1|max:9999.9',
            'height'      => 'required|numeric|decimal:0,1|min:0.1|max:9999.9',
            'depth_units' => 'required|integer|in:1,2', // 1 = mini (half depth), 2 = full depth
        ];
    }
}
