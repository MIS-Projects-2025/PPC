<?php

namespace App\Http\Controllers;

use App\Models\LoadingPlanPackageGroup;
use App\Services\PackageGroups;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LoadingPlanPackageGroupController extends Controller
{
    public function __construct(private PackageGroups $service) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(
            $this->service->list($request->query('group'), $request->query('search'))
        );
    }

    public function grouped(): JsonResponse
    {
        return response()->json($this->service->grouped());
    }

    public function resolve(Request $request): JsonResponse
    {
        $name = $request->validate(['package_name' => 'required|string|max:50'])['package_name'];

        return response()->json([
            'package_name' => $name,
            'group_name'   => $this->service->resolve($name),
        ]);
    }

    public function show(LoadingPlanPackageGroup $packageGroup): JsonResponse
    {
        return response()->json($packageGroup);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules());

        return response()->json($this->service->create($data), 201);
    }

    public function update(Request $request, LoadingPlanPackageGroup $packageGroup): JsonResponse
    {
        $data = $request->validate($this->rules($packageGroup));

        return response()->json($this->service->update($packageGroup, $data));
    }

    public function destroy(LoadingPlanPackageGroup $packageGroup): JsonResponse
    {
        $this->service->delete($packageGroup);

        return response()->json(['deleted' => true]);
    }

    private function rules(?LoadingPlanPackageGroup $current = null): array
    {
        return [
            'group_name'   => ['required', 'string', 'max:30'],
            // groupOf() is a package -> single group map, so a package name is unique across groups.
            // Drop this rule if a package may belong to several groups.
            'package_name' => [
                'required',
                'string',
                'max:50',
                Rule::unique('qdn_db.package_groups', 'package_name')->ignore($current?->id),
            ],
        ];
    }
}
