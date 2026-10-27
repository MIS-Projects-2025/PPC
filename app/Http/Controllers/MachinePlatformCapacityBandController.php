<?php

namespace App\Http\Controllers;

use App\Models\MachinePlatformCapacityBand;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class MachinePlatformCapacityBandController extends Controller
{
    public function index()
    {
        return MachinePlatformCapacityBand::orderBy('platform')->orderBy('qty_min')->get();
    }

    public function store(Request $request)
    {
        return MachinePlatformCapacityBand::create($this->validated($request));
    }

    public function update(Request $request, MachinePlatformCapacityBand $capacityBand)
    {
        $capacityBand->update($this->validated($request, $capacityBand->id));

        return $capacityBand;
    }

    public function destroy(MachinePlatformCapacityBand $capacityBand)
    {
        $capacityBand->delete();

        return response()->noContent();
    }

    private function validated(Request $request, ?int $ignoreId = null): array
    {
        $data = $request->validate([
            'platform'     => ['required', 'string', 'max:20'],
            'qty_min'      => ['required', 'integer', 'min:0'],
            'qty_max'      => ['required', 'integer', 'gte:qty_min'],
            'capacity_uph' => ['required', 'integer', 'min:0'],
        ]);
        $data['platform'] = strtoupper(trim($data['platform']));

        // The unique key only blocks exact duplicates; getCapacity() needs ranges that never overlap.
        $overlap = MachinePlatformCapacityBand::forPlatform($data['platform'])
            ->when($ignoreId, fn($q) => $q->whereKeyNot($ignoreId))
            ->where('qty_min', '<=', $data['qty_max'])
            ->where('qty_max', '>=', $data['qty_min'])
            ->first();

        if ($overlap) {
            throw ValidationException::withMessages([
                'qty_min' => "Range overlaps existing band {$overlap->qty_min}–{$overlap->qty_max} for {$data['platform']}.",
            ]);
        }

        return $data;
    }
}
