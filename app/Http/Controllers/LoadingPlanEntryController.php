<?php

namespace App\Http\Controllers;

use App\Exceptions\StaleWriteException;
use App\Exceptions\BulkStaleWriteException;
use App\Exceptions\LoadingPlanDateFinalizedException;
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
            'entry_type'      => 'required|in:lot,block',
            'entry_id'        => 'required_if:entry_type,block|nullable|integer',
            'before_entry_id' => 'nullable|integer',
            'after_entry_id'  => 'nullable|integer',
            'machine'         => 'nullable|string',
        ]);

        try {
            $entry = $this->service->moveEntry(
                $data['entry_type'],
                $data['entry_id'] ?? null,
                $data['before_entry_id'] ?? null,
                $data['after_entry_id'] ?? null,
                $data['machine'],
            );

            return response()->json($entry);
        } catch (\Throwable $e) {
            return response()->json([
                'error'   => 'bad_request',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function transfer(Request $request): JsonResponse
    {
        $data = $request->validate([
            'entry_type'      => 'required|in:lot,block',
            'entry_id'        => 'required_if:entry_type,block|nullable|integer',
            'target_machine'  => 'nullable|string',
            'before_entry_id' => 'nullable|integer',
            'after_entry_id'  => 'nullable|integer',
        ]);

        // Unassigned isn't a real machine — order doesn't apply there, so this
        // is an unassign, not a transfer. deleteEntry() (non-force) already
        // does exactly that: clears machine/sequence_order, keeps the row.
        if ($data['target_machine'] === null) {
            $entry = $this->service->resolveEntry(
                $data['entry_id'] ?? null,
            );

            $this->service->deleteEntry($entry->id, $entry->getMachineName(), $data['scheduled_date']);

            return response()->json($entry->fresh());
        }

        $entry = $this->service->transferEntry(
            $data['entry_type'],
            $data['entry_id'] ?? null,
            $data['target_machine'],
            $data['before_entry_id'] ?? null,
            $data['after_entry_id'] ?? null,
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
            'before_entry_id'   => 'nullable|integer',
            'after_entry_id'    => 'nullable|integer',
        ]);

        $entry = $this->service->addBlock(
            $data['machine'],
            $data['scheduled_date'],
            $data['label'],
            $data['duration'],
            $data['before_entry_id'] ?? null,
            $data['after_entry_id'] ?? null,
        );

        return response()->json($entry, 201);
    }

    public function createManualLot(Request $request): JsonResponse
    {
        $data = $request->validate([
            'machine'         => 'required|string',
            'scheduled_date'  => 'required|date',
            'fields.part_name'    => 'nullable|string|max:100',
            'fields.package_name' => 'nullable|string|max:50',
            'fields.qty'          => 'nullable|integer',
            'before_entry_id' => 'nullable|integer',
            'after_entry_id'  => 'nullable|integer',
        ]);
        // TODO: no lot ?
        $entry = $this->service->createManualLot(
            $data['machine'],
            $data['scheduled_date'],
            $data['fields'] ?? [],
            $data['before_entry_id'] ?? null,
            $data['after_entry_id'] ?? null,
        );

        return response()->json($entry, 201);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'machine'        => 'nullable|string',
            'scheduled_date' => 'required|date',
        ]);

        $this->service->deleteEntry($id, $data['machine'] ?? null, $data['scheduled_date']);

        return response()->json(['id' => $id]);
    }

    public function bulkDestroy(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids'            => 'required|array|min:1',
            'ids.*'          => 'integer',
            'scheduled_date' => 'required|date',
        ]);

        $result = $this->service->bulkDelete($data['ids']);

        return response()->json($result);
    }

    // ---- Field-only edits (optimistic locking) -------------------------

    public function updateField(Request $request, int $id): JsonResponse
    {
        Log::info('updateField raw payload', $request->all());

        $data = $request->validate([
            'entry_type'        => 'required|in:lot,block',
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
                $entry = $this->service->editLotField($id, $fields, $data['lock_version'] ?? null);
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
            'updates'                => 'required|array|min:1',
            'updates.*.entry_id'     => 'required|integer',
            'updates.*.fields'       => 'required|array',
            'updates.*.lock_version' => 'nullable|integer',
        ]);

        try {
            $entries = $this->service->bulkEditField($data['updates']);
            return response()->json(['entries' => $entries]);
        } catch (BulkStaleWriteException $e) {
            return response()->json([
                'error'     => 'stale',
                'message'   => $e->getMessage(),
                'conflicts' => $e->conflicts,
            ], 409);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['error' => 'bad_request', 'message' => $e->getMessage()], 422);
        }
    }

    public function batchApply(Request $request): JsonResponse
    {
        $data = $request->validate([
            'operations'                   => 'required|array|min:1',
            'operations.*.fields'          => 'nullable|array',
            'operations.*.type'            => 'required|in:move,transfer,create_lot,create_block,delete,update_field,split,revert_split,unrevert_split',
            'operations.*.entry_type'      => 'nullable|string',
            'operations.*.before_entry_id' => 'nullable|integer',
            'operations.*.after_entry_id'  => 'nullable|integer',
            'operations.*.machine'         => 'nullable|string',
            'operations.*.label'           => 'nullable|string',
            'operations.*.duration'        => 'nullable|integer',
            'operations.*.target_machine'  => 'nullable|string',
            'operations.*.lot_id'          => 'nullable|string',
            'operations.*.entry_id'        => 'nullable|integer',
            'operations.*.lock_version'    => 'nullable|integer',
            'operations.*.parent_lot_id'   => 'nullable|string',
            'operations.*.child_qty'       => 'nullable|integer|min:1',
            'operations.*.child_lot_id'    => 'nullable|string',
            'operations.*.split_id'        => 'nullable|integer',
            'scheduled_date'                => 'nullable|date',
        ]);

        try {
            $results = $this->service->batchApply($data['operations'], $data['scheduled_date']);
            return response()->json(['results' => $results]);
        } catch (\App\Exceptions\InvalidSplitException $e) {
            return response()->json([
                'error'   => 'invalid_split',
                'message' => $e->getMessage(),
            ], 422);
        } catch (LoadingPlanDateFinalizedException $e) {
            return response()->json([
                'error'          => 'finalized',
                'message'        => $e->getMessage(),
                'scheduled_date' => $e->scheduledDate,
            ], 422);
        } catch (\Throwable $e) {
            Log::error('batchApply failed', ['exception' => $e]);
            return response()->json([
                'error'   => 'server_error',
                'message' => 'Could not apply the batch of changes. Nothing was saved.',
            ], 500);
        }
    }
}
