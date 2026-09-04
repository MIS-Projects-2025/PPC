<?php

namespace App\Http\Controllers;

use App\Models\LoadingPlanEntry;
use App\Models\LoadingPlanEntryHistory;
use App\Models\LotQuantityHistory;
use Illuminate\Http\Request;

class LoadingPlanEntryHistoryController extends Controller
{
    public function index($entryId, Request $request)
    {
        $entryId = (int) $entryId;
        $perPage = $request->integer('per_page', 25);
        $page = $request->integer('page', 1);

        $entry = LoadingPlanEntry::select('id', 'lot_id', 'scheduled_date')
            ->findOrFail($entryId);

        // Entry (placement/scheduling) history, tagged by source.
        $entryHistory = LoadingPlanEntryHistory::where('entry_id', $entryId)
            ->get()
            ->map(fn($row) => $this->tag($row, 'entry'));

        // Quantity/recipe history for the same lot on the same date —
        // linked via the shared (lot_id, scheduled_date) key, not a FK.
        $quantityHistory = LotQuantityHistory::where('lot_id', $entry->lot_id)
            ->where('scheduled_date', $entry->scheduled_date)
            ->get()
            ->map(fn($row) => $this->tag($row, 'quantity'));

        $merged = $entryHistory->concat($quantityHistory)
            ->sortByDesc('changed_at')
            ->values();

        $total = $merged->count();
        $items = $merged->forPage($page, $perPage)->values();

        return response()->json([
            'data'         => $items,
            'current_page' => $page,
            'last_page'    => max(1, (int) ceil($total / $perPage)),
            'total'        => $total,
        ]);
    }

    private function tag($row, string $source): array
    {
        return [
            'id'              => $source . '-' . $row->id,
            'source'          => $source, // 'entry' | 'quantity'
            'change_type'     => $row->change_type,
            'changed_at'      => $row->changed_at,
            'changed_by'      => $row->changed_by, // null until auth exists
            'changed_columns' => $row->changed_columns,
            'old_values'      => $row->old_values,
            'new_values'      => $row->new_values,
        ];
    }
}
