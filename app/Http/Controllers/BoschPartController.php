<?php

namespace App\Http\Controllers;

use App\Models\BoschPart;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BoschPartController extends Controller
{
    private const LIMIT = 300;
    private const NO_BADGE = '__none__';

    private function present(BoschPart $p): array
    {
        return ['id' => $p->id, 'partname' => $p->partname, 'badges' => $p->badges ?? []];
    }

    /** trim, collapse spaces, drop blanks, dedupe case-insensitively, reuse existing casing. */
    private function cleanBadges(array $badges): array
    {
        $known = collect(BoschPart::distinctBadges())->keyBy(fn($b) => mb_strtoupper($b));
        $out = [];

        foreach ($badges as $b) {
            $b = trim(preg_replace('/\s+/', ' ', (string) $b));
            if ($b === '') continue;
            $key = mb_strtoupper($b);
            $out[$key] ??= $known[$key] ?? $b;
        }

        return array_values($out);
    }

    public function index(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        $badge = trim((string) $request->query('badge', ''));

        $query = BoschPart::query()
            ->when($q !== '', fn($x) => $x->where('partname', 'like', '%' . addcslashes($q, '%_\\') . '%'))
            ->when($badge === self::NO_BADGE, fn($x) => $x->where(
                fn($y) => $y->whereNull('badges')->orWhereJsonLength('badges', 0)
            ))
            ->when($badge !== '' && $badge !== self::NO_BADGE, fn($x) => $x->whereJsonContains('badges', $badge));

        $total = (clone $query)->count();

        return response()->json([
            'data'   => $query->orderBy('partname')->limit(self::LIMIT)->get()->map(fn($p) => $this->present($p))->values(),
            'total'  => $total,
            'badges' => BoschPart::distinctBadges(),
        ]);
    }

    /**
     * Bulk add/remove badges on many part names at once.
     * mode=add    : creates missing parts, adds the badges to each (existing badges kept)
     * mode=remove : removes the badges from the parts that exist
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'partnames'   => 'required|array|min:1|max:5000',
            'partnames.*' => 'string|max:100',
            'badges'      => 'present|array|max:20',
            'badges.*'    => 'string|max:24',
            'mode'        => 'nullable|in:add,remove',
        ]);

        $mode = $data['mode'] ?? 'add';
        $badges = $this->cleanBadges($data['badges']);

        if ($mode === 'remove' && !$badges) {
            return response()->json(['message' => 'Pick at least one badge to remove.'], 422);
        }

        $names = collect($data['partnames'])
            ->map(fn($p) => strtoupper(trim($p)))
            ->filter()->unique()->values();

        DB::transaction(function () use ($names, $badges, $mode) {
            $existing = BoschPart::whereIn('partname', $names)->get()->keyBy(fn($p) => strtoupper(trim($p->partname)));
            $drop = array_map('mb_strtoupper', $badges);

            foreach ($names as $name) {
                $part = $existing->get($name);

                if ($mode === 'remove') {
                    if (!$part) continue;
                    $part->badges = array_values(array_filter(
                        $part->badges ?? [],
                        fn($b) => !in_array(mb_strtoupper($b), $drop, true)
                    ));
                } else {
                    $part ??= new BoschPart(['partname' => $name]);
                    $current = $part->badges ?? [];
                    $have = array_map('mb_strtoupper', $current);
                    foreach ($badges as $b) {
                        if (!in_array(mb_strtoupper($b), $have, true)) {
                            $current[] = $b;
                            $have[] = mb_strtoupper($b);
                        }
                    }
                    $part->badges = $current;
                }

                $part->save();
            }
        });

        return response()->json(['count' => $names->count()]);
    }

    /** Replaces the part's whole badge list (empty list = no badges). */
    public function update(Request $request, BoschPart $boschPart): JsonResponse
    {
        $data = $request->validate([
            'badges'   => 'present|array|max:20',
            'badges.*' => 'string|max:24',
        ]);

        $boschPart->update(['badges' => $this->cleanBadges($data['badges'])]);

        return response()->json($this->present($boschPart));
    }

    public function destroy(BoschPart $boschPart): JsonResponse
    {
        $boschPart->delete();

        return response()->json(['deleted' => $boschPart->id]);
    }
}
