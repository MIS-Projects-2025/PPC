<?php

namespace App\Http\Controllers;

use App\Models\F3PackageCodeGroup;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;

class F3PackageCodeController extends Controller
{
    private const LIMIT = 300;

    private function present(F3PackageCodeGroup $r): array
    {
        return ['id' => $r->id, 'package_code' => $r->package_code, 'package_type' => $r->package_type];
    }

    private function clean(string $v): string
    {
        return trim(preg_replace('/\s+/', ' ', $v));
    }

    public function index(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        $like = '%' . addcslashes($q, '%_\\') . '%';

        $query = F3PackageCodeGroup::query()->when(
            $q !== '',
            fn($x) => $x->where(fn($y) => $y->where('package_code', 'like', $like)->orWhere('package_type', 'like', $like))
        );

        return response()->json([
            'data'  => (clone $query)->orderBy('package_code')->limit(self::LIMIT)->get()->map(fn($r) => $this->present($r))->values(),
            'total' => $query->count(),
            'types' => F3PackageCodeGroup::query()->distinct()->orderBy('package_type')->pluck('package_type'),
        ]);
    }

    /** Bulk upsert: existing codes get their type replaced, new codes are created. */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'rows'                 => 'required|array|min:1|max:5000',
            'rows.*.package_code'  => 'required|string|max:100',
            'rows.*.package_type'  => 'required|string|max:100',
        ]);

        $now = now();
        $rows = collect($data['rows'])
            ->map(fn($r) => [
                'package_code' => strtoupper($this->clean($r['package_code'])),
                'package_type' => $this->clean($r['package_type']),
            ])
            ->filter(fn($r) => $r['package_code'] !== '' && $r['package_type'] !== '')
            ->keyBy('package_code')                       // same code twice: last one wins
            ->map(fn($r) => $r + ['created_at' => $now, 'updated_at' => $now])
            ->values()
            ->all();

        if (!$rows) {
            return response()->json(['message' => 'No valid rows to save.'], 422);
        }

        F3PackageCodeGroup::upsert($rows, ['package_code'], ['package_type', 'updated_at']);
        Cache::forget(F3PackageCodeGroup::CACHE_KEY);     // upsert skips model events

        return response()->json(['count' => count($rows)]);
    }

    public function update(Request $request, F3PackageCodeGroup $f3PackageCode): JsonResponse
    {
        $request->merge(['package_code' => strtoupper($this->clean((string) $request->input('package_code')))]);

        $data = $request->validate([
            'package_code' => [
                'required',
                'string',
                'max:100',
                Rule::unique('f3_package_code_group', 'package_code')->ignore($f3PackageCode->id)
            ],
            'package_type' => 'required|string|max:100',
        ]);

        $f3PackageCode->update([
            'package_code' => $data['package_code'],
            'package_type' => $this->clean($data['package_type']),
        ]);

        return response()->json($this->present($f3PackageCode));
    }

    public function destroy(F3PackageCodeGroup $f3PackageCode): JsonResponse
    {
        $f3PackageCode->delete();

        return response()->json(['deleted' => $f3PackageCode->id]);
    }
}
