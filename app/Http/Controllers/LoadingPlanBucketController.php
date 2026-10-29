<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\QdnMachine;
use App\Models\LoadingPlanBucket;
use App\Services\LoadingPlanEntryService;
use App\Exceptions\LoadingPlanDateFinalizedException;

class LoadingPlanBucketController extends Controller
{
    private function present(LoadingPlanBucket $b): array
    {
        return [
            'id' => $b->id,
            'label' => $b->label,
            'sort_order' => $b->sort_order,
            'machine' => $b->machine_id ? QdnMachine::whereKey($b->machine_id)->value('machine_num') : null,
        ];
    }

    public function store(Request $r)
    {
        $d = $r->validate(['location' => 'required|in:PL1,PL6,F3', 'label' => 'required|string|max:64', 'machine' => 'nullable|string']);

        $machineId = null;
        if (!empty($d['machine'])) {
            $machineId = QdnMachine::where('machine_num', $d['machine'])->value('id')
                ?? abort(422, "Machine [{$d['machine']}] does not exist.");
        }

        $b = LoadingPlanBucket::create([
            'location' => $d['location'],
            'label' => $d['label'],
            'machine_id' => $machineId,
            'sort_order' => (LoadingPlanBucket::where('location', $d['location'])->max('sort_order') ?? 0) + 1,
        ]);
        return response()->json($this->present($b));
    }

    public function update(Request $r, LoadingPlanBucket $bucket)
    {
        $bucket->update($r->validate(['label' => 'required|string|max:64']));
        return response()->json($this->present($bucket));
    }

    public function destroy(LoadingPlanBucket $bucket)
    {
        $bucket->delete(); // items cascade; lots fall back to Unassigned
        return response()->json(['deleted' => $bucket->id]);
    }

    public function park(Request $r)
    {
        $d = $r->validate([
            'bucket_id' => 'required|exists:loading_plan_buckets,id',
            'lot_ids' => 'required|array|min:1',
            'lot_ids.*' => 'string',
            'scheduled_date' => 'required|date',
            'prev_lot_id' => 'nullable|string',
            'next_lot_id' => 'nullable|string',
        ]);

        try {
            $result = (new LoadingPlanEntryService())->parkLots(
                $d['lot_ids'],
                $d['bucket_id'],
                $d['scheduled_date'],
                $d['prev_lot_id'] ?? null,
                $d['next_lot_id'] ?? null,
            );
            return response()->json($result);
        } catch (LoadingPlanDateFinalizedException $e) {
            return response()->json(['error' => 'finalized', 'message' => $e->getMessage(), 'scheduled_date' => $e->scheduledDate], 422);
        }
    }

    public function unpark(Request $r)
    {
        $d = $r->validate(['lot_ids' => 'required|array|min:1', 'lot_ids.*' => 'string', 'scheduled_date' => 'required|date']);

        try {
            (new LoadingPlanEntryService())->unparkLots($d['lot_ids'], $d['scheduled_date']);
            return response()->json(['ok' => true]);
        } catch (LoadingPlanDateFinalizedException $e) {
            return response()->json(['error' => 'finalized', 'message' => $e->getMessage(), 'scheduled_date' => $e->scheduledDate], 422);
        }
    }
}
