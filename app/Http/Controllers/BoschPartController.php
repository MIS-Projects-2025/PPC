<?php

namespace App\Http\Controllers;

use App\Models\BoschPart;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BoschPartController extends Controller
{
    public function index(Request $request)
    {
        $q = trim((string) $request->query('q', ''));

        $query = BoschPart::query()
            ->when($q !== '', fn($x) => $x->where('partname', 'like', '%' . addcslashes($q, '%_\\') . '%'))
            ->orderBy('partname');

        return response()->json([
            'total' => (clone $query)->count(),
            'data'  => $query->limit(900)->get(['id', 'partname', 'is_bosch']),
        ]);
    }

    // Bulk add / upsert. Uses model saves (not query upserts) so the lookup cache is busted.
    public function store(Request $request)
    {
        $data = $request->validate([
            'partnames'   => ['required', 'array', 'min:1', 'max:2000'],
            'partnames.*' => ['required', 'string', 'max:100'],
            'is_bosch'    => ['sometimes', 'boolean'],
        ]);

        $names = collect($data['partnames'])
            ->map(fn($p) => strtoupper(trim($p)))
            ->filter()
            ->unique()
            ->values();

        $isBosch = $data['is_bosch'] ?? true;

        DB::transaction(function () use ($names, $isBosch) {
            foreach ($names as $n) {
                BoschPart::updateOrCreate(['partname' => $n], ['is_bosch' => $isBosch]);
            }
        });

        return response()->json(['count' => $names->count()]);
    }

    public function update(Request $request, BoschPart $boschPart)
    {
        $boschPart->update($request->validate(['is_bosch' => ['required', 'boolean']]));

        return response()->json($boschPart->only('id', 'partname', 'is_bosch'));
    }

    public function destroy(BoschPart $boschPart)
    {
        $boschPart->delete(); // `deleted` hook clears the cache

        return response()->json(['ok' => true]);
    }
}
