<?php

namespace App\Http\Controllers;

use App\Exceptions\StaleWriteException;
use App\Services\LoadingPlanEntryService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class LoadingPlanEntryController extends Controller
{
    public function __construct(private LoadingPlanEntryService $service) {}

    // ---- Sequence-touching operations ---------------------------------

    public function move(Request $request): JsonResponse
    {
        $data = $request->validate([
            'entry_type'     => 'required|in:lot,block',
            'lot_id'         => 'required_if:entry_type,lot|nullable|string',
            'entry_id'       => 'required_if:entry_type,block|nullable|integer',
            'before_lot_id'  => 'nullable|string',
            'after_lot_id'   => 'nullable|string',
            'machine'        => 'nullable|string',
            'scheduled_date' => 'required|date',
        ]);

        $entry = $data['entry_type'] === 'block'
            ? $this->service->moveBlock(
                $data['entry_id'],
                $data['before_lot_id'] ?? null,
                $data['after_lot_id'] ?? null,
                $data['machine'],
                $data['scheduled_date'],
            )
            : $this->service->moveLot(
                $data['lot_id'],
                $data['before_lot_id'] ?? null,
                $data['after_lot_id'] ?? null,
                $data['machine'],
                $data['scheduled_date'],
            );

        return response()->json($entry);
    }

    public function transfer(Request $request): JsonResponse
    {
        $data = $request->validate([
            'entry_type'      => 'required|in:lot,block',
            'lot_id'          => 'required_if:entry_type,lot|nullable|string',
            'entry_id'        => 'required_if:entry_type,block|nullable|integer',
            'target_machine'  => 'nullable|string',
            'before_lot_id'   => 'nullable|string',
            'after_lot_id'    => 'nullable|string',
            'scheduled_date'  => 'required|date',
        ]);

        $entry = $data['entry_type'] === 'block'
            ? $this->service->transferBlock(
                $data['entry_id'],
                $data['target_machine'],
                $data['before_lot_id'] ?? null,
                $data['after_lot_id'] ?? null,
                $data['scheduled_date'],
            )
            : $this->service->transferLot(
                $data['lot_id'],
                $data['target_machine'],
                $data['before_lot_id'] ?? null,
                $data['after_lot_id'] ?? null,
                $data['scheduled_date'],
            );

        return response()->json($entry);
    }

    public function bulkTransfer(Request $request): JsonResponse
    {
        $data = $request->validate([
            'lot_ids'          => 'nullable|array',
            'lot_ids.*'        => 'string',
            'block_entry_ids'  => 'nullable|array',
            'block_entry_ids.*' => 'integer',
            'target_machine'   => 'nullable|string',
            'scheduled_date'   => 'required|date',
        ]);

        $updated = $this->service->bulkTransfer(
            $data['lot_ids'] ?? [],
            $data['block_entry_ids'] ?? [],
            $data['target_machine'],
            $data['scheduled_date'],
        );

        return response()->json($updated);
    }

    public function addBlock(Request $request): JsonResponse
    {
        $data = $request->validate([
            'machine'         => 'required|string',
            'scheduled_date'  => 'required|date',
            'label'           => 'required|string|max:128',
            'duration'        => 'required|integer|min:1',
            'before_lot_id'   => 'nullable|string',
            'after_lot_id'    => 'nullable|string',
        ]);

        $entry = $this->service->addBlock(
            $data['machine'],
            $data['scheduled_date'],
            $data['label'],
            $data['duration'],
            $data['before_lot_id'] ?? null,
            $data['after_lot_id'] ?? null,
        );

        return response()->json($entry, 201);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'machine'        => 'nullable|string',
            'scheduled_date' => 'required|date',
        ]);

        $this->service->deleteEntry($id, $data['machine'], $data['scheduled_date']);

        return response()->json(['deleted' => $id]);
    }

    public function bulkDestroy(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids'            => 'required|array|min:1',
            'ids.*'          => 'integer',
            'scheduled_date' => 'required|date',
        ]);

        $this->service->bulkDelete($data['ids'], $data['scheduled_date']);

        return response()->json(['deleted' => $data['ids']]);
    }

    // ---- Field-only edits (optimistic locking) -------------------------

    public function updateField(Request $request, int $id): JsonResponse
    {
        Log::info('updateField raw payload', $request->all());

        $data = $request->validate([
            'entry_type'        => 'required|in:lot,block',
            'lot_id'            => 'required_if:entry_type,lot|nullable|string',
            'scheduled_date'    => 'required|date',
            'fields'            => 'required|array',
            'fields.status'     => 'sometimes|nullable|string',
            'fields.remarks'    => 'sometimes|nullable|string',
            'fields.tag'        => 'sometimes|nullable|string',
            'fields.accu_time'  => 'sometimes|nullable|integer',
            'fields.doable'     => 'sometimes|nullable|integer',
            'lock_version'      => 'nullable|integer',
        ]);

        $fields = $request->input('fields', []);

        try {
            if ($data['entry_type'] === 'lot') {
                $entry = $this->service->editLotField($data['lot_id'], $data['scheduled_date'], $fields, $data['lock_version'] ?? null);
            } else {
                $entry = $this->service->editField($id, $fields, $data['lock_version']);
            }

            return response()->json($entry);
        } catch (StaleWriteException $e) {
            return response()->json([
                'error'   => 'stale',
                'message' => $e->getMessage(),
                'current' => $e->current,
            ], 409);
        }
    }

    public function bulkUpdateField(Request $request): JsonResponse
    {
        $data = $request->validate([
            'updates'                  => 'required|array|min:1',
            'updates.*.id'             => 'nullable|integer',
            'updates.*.lot_id'         => 'nullable|string',
            'updates.*.scheduled_date' => 'nullable|date',
            'updates.*.fields'         => 'required|array',
            'updates.*.lock_version'   => 'nullable|integer',
        ]);

        $result = $this->service->bulkEditField($data['updates']);

        return response()->json($result);
    }
}
