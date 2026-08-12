<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\PpcPackageMaster;
use App\Services\BulkUpserter;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Traits\MassDeletesByIds;
use Illuminate\Validation\Rule;

// ─────────────────────────────────────────────
// Package Master Controller
// ─────────────────────────────────────────────
class PlPackageMasterController extends Controller
{
  use MassDeletesByIds;

  public function index(Request $request)
  {
    $search  = $request->input('search', '');
    $perPage = $request->input('perPage', 1000);

    $packages = PpcPackageMaster::query()
      ->when($search, fn($q) => $q->where('package', 'like', "%{$search}%"))
      ->orderBy('package')
      ->paginate($perPage)
      ->through(fn($rule) => [
        ...$rule->toArray(),
        'updated_at' => $rule->updated_at?->format('M d, Y h:i A'),
      ])
      ->withQueryString();

    return Inertia::render('PpcPackageMasterPage', [
      'packages'     => $packages,
      'search'       => $search,
      'perPage'      => $perPage,
      'totalEntries' => PpcPackageMaster::count(),
    ]);
  }

  public function bulkUpdate(Request $request)
  {
    $rows = $request->all();
    $user = session('emp_data');

    $columnRules = [
      'package'    => fn($id) => [
        'sometimes',
        'required',
        'string',
        'max:65',
        Rule::unique('ppc_package_master', 'package')->ignore($id)
      ],
      'is_telford' => ['sometimes', 'required', 'boolean'],
      'default_pl' => ['nullable', 'string', 'in:PL1,PL6'],
      'is_active'  => ['sometimes', 'required', 'boolean'],
    ];

    $bulkUpdater = new BulkUpserter(new PpcPackageMaster(), $columnRules);
    $result = $bulkUpdater->update($rows);

    if (!empty($result['errors'])) {
      return response()->json([
        'status'  => 'error',
        'message' => 'You have ' . count($result['errors']) . ' error/s',
        'data'    => $result['errors'],
      ], 422);
    }

    return response()->json([
      'status'  => 'ok',
      'message' => 'Updated successfully',
      'updated' => $result['updated'],
    ]);
  }

  public function massDelete(Request $request)
  {
    return $this->massDeleteByIds($request, PpcPackageMaster::class);
  }
}
