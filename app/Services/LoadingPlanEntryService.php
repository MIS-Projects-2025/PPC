<?php

namespace App\Services;

use App\Exceptions\SequenceExhaustedException;
use App\Exceptions\BulkStaleWriteException;
use App\Exceptions\StaleWriteException;
use App\Models\LoadingPlanEntry;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * All writes to loading_plan_entries go through here, split into two
 * concurrency strategies depending on what the operation touches:
 *
 *   SEQUENCE-TOUCHING ops (moveLot, transferLot, addBlock, deleteEntry,
 *   bulkTransfer, bulkDelete): these read/write sequence_order and depend
 *   on sibling rows on the same machine, so each locks every
 *   (machine, scheduled_date) bucket it involves via lockForUpdate()
 *   inside a transaction — always in sorted machine-name order, to avoid
 *   deadlocking against another operation locking the same machines in
 *   the opposite order.
 *
 *   FIELD-ONLY edits (editField, bulkEditField): status/Remarks/accuTime/
 *   tag never touch sequence_order or sibling rows, so they use a cheap
 *   optimistic lock_version check on that single row instead — no
 *   machine-wide locking, no blocking of unrelated reorders.
 */
class LoadingPlanEntryService
{
    private const GAP_SEED = 1000.0;
    private const MIN_GAP = 0.001; // matches decimal(14,4) column precision

    // ------------------------------------------------------------------
    // Sequence-touching operations
    // ------------------------------------------------------------------

    /** Resolve the entry being moved/transferred, given the same discriminated
     *  identifier the controller validates: lot_id for lots, entry id for blocks. */
    public function resolveEntry(string $entryType, string|int|null $lotId, ?int $entryId, string $date): LoadingPlanEntry
    {
        return $entryType === 'block'
            ? LoadingPlanEntry::where('id', $entryId)
            ->where('entry_type', 'block')
            ->where('scheduled_date', $date)
            ->firstOrFail()
            : LoadingPlanEntry::where('lot_id', $lotId)
            ->where('scheduled_date', $date)
            ->firstOrFail();
    }

    public function moveEntry(string $entryType, ?string $lotId, ?int $entryId, ?int $beforeEntryId, ?int $afterEntryId, string $machine, string $date): LoadingPlanEntry
    {
        return DB::transaction(function () use ($entryType, $lotId, $entryId, $beforeEntryId, $afterEntryId, $machine, $date) {
            Log::info("entry_type: $entryType, lot_id: $lotId, entry_id: $entryId, before_entry_id: $beforeEntryId, after_entry_id: $afterEntryId, machine: $machine, date: $date");

            $rows = $this->lockMachineRows([$machine], $date);
            $newOrder = $this->resolveSequenceOrder($rows, $beforeEntryId, $afterEntryId, $machine, $date);

            $entry = $this->resolveEntry($entryType, $lotId, $entryId, $date);
            $entry->update(['sequence_order' => $newOrder, 'lock_version' => DB::raw('lock_version + 1')]);

            return $entry->fresh();
        });
    }

    public function transferEntry(string $entryType, ?string $lotId, ?int $entryId, string $targetMachine, ?int $beforeEntryId, ?int $afterEntryId, string $date): LoadingPlanEntry
    {
        return DB::transaction(function () use ($entryType, $lotId, $entryId, $targetMachine, $beforeEntryId, $afterEntryId, $date) {
            $entry = $this->resolveEntry($entryType, $lotId, $entryId, $date);

            $machinesToLock = collect([$entry->machine, $targetMachine])
                ->filter()
                ->unique()
                ->sort()
                ->values()
                ->all();

            $rows = $this->lockMachineRows($machinesToLock, $date);

            $newOrder = $this->resolveSequenceOrder(
                $rows->where('machine', $targetMachine),
                $beforeEntryId,
                $afterEntryId,
                $targetMachine,
                $date,
            );

            $entry->update([
                'machine'        => $targetMachine,
                'sequence_order' => $newOrder,
                'lock_version'   => DB::raw('lock_version + 1'),
            ]);

            return $entry->fresh();
        });
    }

    /** Insert a non-lot block (Preventative Maintenance, Changeover, etc.)
     *  onto a machine, between the given neighbors (or appended if both
     *  are null). */
    public function addBlock(string $machine, string $date, string $label, int $durationMinutes, ?int $beforeEntryId, ?int $afterEntryId): LoadingPlanEntry
    {
        return DB::transaction(function () use ($machine, $date, $label, $durationMinutes, $beforeEntryId, $afterEntryId) {
            $rows = $this->lockMachineRows([$machine], $date);
            Log::info("rows", $rows->toArray());
            $newOrder = $this->resolveSequenceOrder($rows, $beforeEntryId, $afterEntryId, $machine, $date);

            return LoadingPlanEntry::create([
                'entry_type'      => 'block',
                'lot_id'          => null,
                'scheduled_date'  => $date,
                'machine'         => $machine,
                'sequence_order'  => $newOrder,
                'block_label'     => $label,
                'accu_time'       => $durationMinutes, // adjust column name if yours differs
                'lock_version'    => 1,
            ]);
        });
    }

    /** Remove one entry. Blocks are always hard-deleted (no backing WIP row
     *  to fall back to). Lots are "unassigned" by default (machine and
     *  sequence_order cleared, entry row kept) — UNLESS $forceDelete is
     *  true, in which case the row is hard-deleted regardless of type. Force
     *  delete is only used to undo a creation (via batchApply's 'delete'
     *  op), where the correct undo of "I created this" is "it no longer
     *  exists," not "it's unassigned." */
    public function deleteEntry(int $id, ?string $machine, string $date, bool $forceDelete = false): void
    {
        DB::transaction(function () use ($id, $machine, $date, $forceDelete) {
            if ($machine) {
                $this->lockMachineRows([$machine], $date);
            }

            $entry = LoadingPlanEntry::where('id', $id)
                ->where('scheduled_date', $date)
                ->first();

            if (!$entry) {
                return;
            }

            if ($forceDelete || $entry->entry_type === 'block') {
                $entry->delete();
                return;
            }

            // Lot, normal delete: unassign, don't remove.
            $entry->update([
                'machine'        => null,
                'sequence_order' => null,
                'lock_version'   => DB::raw('lock_version + 1'),
            ]);
        });
    }

    /** Transfer many lots and/or blocks to one target machine in a single
     *  operation. Items already on the target are skipped as no-ops. Lots
     *  with no existing plan entry at all (never planned — Unassigned) get a
     *  fresh entry created directly onto the target. Blocks always have an
     *  entry already (created via addBlock), so they're looked up by id.
     *  Locks every machine actually involved (all real sources + the
     *  target), sorted, in one transaction. */
    public function bulkTransfer(array $lotIds, array $blockEntryIds, ?string $targetMachine, string $date): Collection
    {
        return DB::transaction(function () use ($lotIds, $blockEntryIds, $targetMachine, $date) {
            $lotEntries = LoadingPlanEntry::whereIn('lot_id', $lotIds)
                ->where('scheduled_date', $date)
                ->where('entry_type', 'lot')
                ->get();

            $blockEntries = empty($blockEntryIds)
                ? collect()
                : LoadingPlanEntry::whereIn('id', $blockEntryIds)
                ->where('scheduled_date', $date)
                ->where('entry_type', 'block')
                ->get();

            $plannedLotIds = $lotEntries->pluck('lot_id')->all();
            $unplannedLotIds = array_values(array_diff($lotIds, $plannedLotIds));

            $allEntries = $lotEntries->concat($blockEntries);
            $movers = $allEntries->filter(fn($e) => $e->machine !== $targetMachine);

            if ($movers->isEmpty() && empty($unplannedLotIds)) {
                return collect();
            }

            // Lock every real source machine (from movers) plus the target.
            // Unplanned lots have no machine to lock — Unassigned is never
            // locked, same as everywhere else in this service.
            $machinesToLock = $movers->pluck('machine')
                ->push($targetMachine)
                ->filter()
                ->unique()
                ->sort()
                ->values()
                ->all();

            $lockedRows = $this->lockMachineRows($machinesToLock, $date);

            $nextSeq = ($lockedRows->where('machine', $targetMachine)->max('sequence_order') ?? 0) + self::GAP_SEED;

            $updated = collect();

            foreach ($movers as $entry) {
                $entry->update([
                    'machine'        => $targetMachine,
                    'sequence_order' => $nextSeq,
                    'lock_version'   => DB::raw('lock_version + 1'),
                ]);
                $updated->push($entry->fresh());
                $nextSeq += self::GAP_SEED;
            }

            foreach ($unplannedLotIds as $lotId) {
                $entry = LoadingPlanEntry::create([
                    'entry_type'     => 'lot',
                    'lot_id'         => $lotId,
                    'scheduled_date' => $date,
                    'machine'        => $targetMachine,
                    'sequence_order' => $nextSeq,
                    'lock_version'   => 1,
                ]);
                $updated->push($entry);
                $nextSeq += self::GAP_SEED;
            }

            return $updated;
        });
    }

    /** Bulk version of the same rule: blocks are deleted, lots are
     *  unassigned. Locks every distinct machine involved, sorted. */
    public function bulkDelete(array $ids, string $date): array
    {
        return DB::transaction(function () use ($ids, $date) {
            $entries = LoadingPlanEntry::whereIn('id', $ids)
                ->where('scheduled_date', $date)
                ->get();

            $machines = $entries->pluck('machine')->filter()->unique()->sort()->values()->all();
            if (!empty($machines)) {
                $this->lockMachineRows($machines, $date);
            }

            $unassigned = [];
            $deleted = [];

            foreach ($entries as $entry) {
                if ($entry->entry_type === 'block') {
                    $deleted[] = $entry->id;
                    $entry->delete();
                } else {
                    $entry->update([
                        'machine'        => null,
                        'sequence_order' => null,
                        'lock_version'   => DB::raw('lock_version + 1'),
                    ]);
                    $unassigned[] = $entry->fresh();
                }
            }

            return ['deleted' => $deleted, 'unassigned' => $unassigned];
        });
    }

    public function createManualLot(string $machine, string $date, array $fields, ?int $beforeEntryId, ?int $afterEntryId): LoadingPlanEntry
    {
        return DB::transaction(function () use ($machine, $date, $fields, $beforeEntryId, $afterEntryId) {
            $lotId = 'MANUAL-' . now()->format('YmdHis') . '-' . strtoupper(Str::random(4));

            $rows = $this->lockMachineRows([$machine], $date);
            $newOrder = $this->resolveSequenceOrder($rows, $beforeEntryId, $afterEntryId, $machine, $date);

            return LoadingPlanEntry::create([
                'entry_type'     => 'lot',
                'lot_id'         => $lotId,
                'part_name'      => $fields['Part_Name'] ?? '',
                'package_name'   => $fields['Package_Name'] ?? null,
                'qty'            => $fields['Qty'] ?? 0,
                'scheduled_date' => $date,
                'machine'        => $machine,
                'sequence_order' => $newOrder,
                'status'         => 'NONE',
                'lock_version'   => 1,
            ]);
        });
    }

    // ------------------------------------------------------------------
    // Field-only edits — optimistic locking, no machine lock
    // ------------------------------------------------------------------

    /** Edit status/Remarks/accuTime/tag on one entry. Throws
     *  StaleWriteException if lock_version no longer matches (someone
     *  else edited this row first). Use for blocks, which always have an
     *  id (created via addBlock). For lots, use editLotField instead. */
    public function editField(int $id, array $fields, int $expectedLockVersion): LoadingPlanEntry
    {
        $affected = LoadingPlanEntry::where('id', $id)
            ->where('lock_version', $expectedLockVersion)
            ->update([...$fields, 'lock_version' => DB::raw('lock_version + 1')]);

        if ($affected === 0) {
            throw new StaleWriteException(LoadingPlanEntry::find($id));
        }

        return LoadingPlanEntry::findOrFail($id);
    }

    /** Edit a lot's fields by lot_id + date, rather than entry id. Handles
     *  the case where the lot has never been planned before (no
     *  loading_plan_entries row exists yet — e.g. it's still sitting in
     *  Unassigned and this is its first status/remarks edit): creates the
     *  row instead of requiring a lock_version match. If a row already
     *  exists, behaves exactly like editField's optimistic check. */
    public function editLotField(string $lotId, string $date, array $fields, ?int $expectedLockVersion): LoadingPlanEntry
    {
        $existing = LoadingPlanEntry::where('lot_id', $lotId)
            ->where('scheduled_date', $date)
            ->first();

        if (!$existing) {
            return LoadingPlanEntry::create([
                'entry_type'     => 'lot',
                'lot_id'         => $lotId,
                'scheduled_date' => $date,
                'machine'        => null,
                'sequence_order' => null,
                'lock_version'   => 1,
                ...$fields,
            ]);
        }

        $affected = LoadingPlanEntry::where('id', $existing->id)
            ->where('lock_version', $expectedLockVersion)
            ->update([...$fields, 'lock_version' => DB::raw('lock_version + 1')]);

        if ($affected === 0) {
            throw new StaleWriteException(LoadingPlanEntry::find($existing->id));
        }

        return LoadingPlanEntry::findOrFail($existing->id);
    }

    /** Bulk field edit (e.g. "set status DONE" across a multi-select), fully
     *  atomic: if ANY row in the batch has a stale lock_version, the entire
     *  batch is rolled back and nothing applies — consistent with
     *  batchApply's all-or-nothing behavior. Throws StaleWriteException
     *  (carrying every conflicting row's current server-side data) if any
     *  conflict is found, so the caller can tell the user exactly what
     *  changed underneath them. */
    public function bulkEditField(array $updates): array
    {
        return DB::transaction(function () use ($updates) {
            $entries = [];
            $conflicts = [];

            foreach ($updates as $u) {
                $id = $u['id'] ?? null;
                $fields = $u['fields'];

                if ($id) {
                    $affected = LoadingPlanEntry::where('id', $id)
                        ->where('lock_version', $u['lock_version'] ?? null)
                        ->update([...$fields, 'lock_version' => DB::raw('lock_version + 1')]);

                    if ($affected === 0) {
                        $conflicts[] = LoadingPlanEntry::find($id);
                        continue;
                    }

                    $entries[] = LoadingPlanEntry::find($id);
                    continue;
                }

                $lotId = $u['lot_id'];
                $scheduledDate = $u['scheduled_date'];

                try {
                    $entries[] = LoadingPlanEntry::create([
                        'entry_type'     => 'lot',
                        'lot_id'         => $lotId,
                        'scheduled_date' => $scheduledDate,
                        'machine'        => null,
                        'sequence_order' => null,
                        'lock_version'   => 1,
                        ...$fields,
                    ]);
                } catch (\Illuminate\Database\QueryException $e) {
                    $existing = LoadingPlanEntry::where('lot_id', $lotId)
                        ->where('scheduled_date', $scheduledDate)
                        ->first();

                    if (!$existing) {
                        throw $e;
                    }

                    $existing->update([...$fields, 'lock_version' => DB::raw('lock_version + 1')]);
                    $entries[] = $existing->fresh();
                }
            }

            if (!empty($conflicts)) {
                // Rolling back is automatic — DB::transaction() catches this
                // exception and rolls back everything applied in this loop so
                // far, including any successful updates/creates above.
                throw new BulkStaleWriteException($conflicts);
            }

            return $entries;
        });
    }

    // ------------------------------------------------------------------
    // Internals: locking + fractional sequence math
    // ------------------------------------------------------------------

    /** Lock and return every row across the given machines for this date,
     *  in a fixed sorted machine order (caller is responsible for having
     *  already sorted $machines — this just executes the lock). Must be
     *  called inside an existing DB::transaction(). */
    private function lockMachineRows(array $machines, string $date): Collection
    {
        return LoadingPlanEntry::whereIn('machine', $machines)
            ->where('scheduled_date', $date)
            ->orderBy('sequence_order')
            ->lockForUpdate()
            ->get();
    }

    /** Given the already-locked rows for a machine, compute the
     *  sequence_order to place a new/moved row between $beforeEntryId and
     *  $afterEntryId. Rebalances and retries once if the gap is exhausted. */
    private function resolveSequenceOrder(Collection $machineRows, ?int $beforeEntryId, ?int $afterEntryId, string $machine, string $date): float
    {
        $before = $beforeEntryId ? $machineRows->firstWhere('id', $beforeEntryId)?->sequence_order : null;
        $after  = $afterEntryId ? $machineRows->firstWhere('id', $afterEntryId)?->sequence_order : null;

        // Both null means "no specific position requested" — that should
        // mean "append to the end of whatever's already there," not "use
        // the flat seed value" (which would land at the very top, and
        // collide with an existing row already sitting at that exact
        // value on any machine that isn't empty).
        if ($before === null && $after === null) {
            $currentMax = $machineRows->max('sequence_order');
            if ($currentMax !== null) {
                $before = $currentMax;
            }
            // else: machine is genuinely empty — computeSequenceOrder's
            // null/null branch (GAP_SEED) is correct as the first row.
        }

        if ($before !== null && $after !== null && $before > $after) {
            [$before, $after] = [$after, $before];
        }

        try {
            return $this->computeSequenceOrder($before, $after, $machine, $date);
        } catch (SequenceExhaustedException) {
            $rebalanced = $this->rebalance($machine, $date);

            $before = $beforeEntryId ? $rebalanced->firstWhere('id', $beforeEntryId)?->sequence_order : null;
            $after = $afterEntryId ? $rebalanced->firstWhere('id', $afterEntryId)?->sequence_order : null;

            if ($before === null && $after === null) {
                $currentMax = $rebalanced->max('sequence_order');
                if ($currentMax !== null) {
                    $before = $currentMax;
                }
            }

            // Freshly rebalanced gaps (1000, 2000, 3000...) always have
            // room, so this second attempt cannot throw again.
            return $this->computeSequenceOrder($before, $after, $machine, $date);
        }
    }

    private function computeSequenceOrder(?float $before, ?float $after, string $machine, string $date): float
    {
        if ($before === null && $after === null) {
            return self::GAP_SEED;
        }
        if ($before === null) {
            return $after - self::GAP_SEED;
        }
        if ($after === null) {
            return $before + self::GAP_SEED;
        }

        if (($after - $before) < self::MIN_GAP) {
            Log::warning('Sequence order gap check failed', [
                'machine' => $machine,
                'date'    => $date,
                'before'  => $before,
                'after'   => $after,
                'gap'     => $after - $before,
            ]);
            throw new SequenceExhaustedException($machine, $date);
        }

        return ($before + $after) / 2;
    }

    /** Re-stamp a machine's rows to clean, evenly-spaced integers,
     *  preserving their current relative order. Must be called from
     *  within a transaction that already holds the lock on these rows. */
    private function rebalance(string $machine, string $date): Collection
    {
        $rows = LoadingPlanEntry::where('machine', $machine)
            ->where('scheduled_date', $date)
            ->orderBy('sequence_order')
            ->lockForUpdate()
            ->get();

        foreach ($rows as $i => $row) {
            $row->update(['sequence_order' => ($i + 1) * self::GAP_SEED]);
        }

        return $rows->fresh();
    }

    /** Applies a heterogeneous batch of operations as one atomic unit — all
     *  succeed or none do. Used for undo/redo sync, where several rows'
     *  changes belong to a single logical user action and must not
     *  partially apply if one operation in the batch fails.
     *
     *  Each operation is one of:
     *    ['type' => 'move', 'entry_type' => 'lot'|'block', 'lot_id'?, 'entry_id'?,
     *     'before_entry_id'?, 'after_entry_id'?, 'machine']
     *    ['type' => 'transfer', ...same as move plus 'target_machine']
     *    ['type' => 'create_lot', 'lot_id', 'fields', 'machine'?, 'before_entry_id'?, 'after_entry_id'?]
     *    ['type' => 'create_block', 'machine', 'label', 'duration', 'before_entry_id'?, 'after_entry_id'?]
     *    ['type' => 'delete', 'entry_id', 'machine'?]
     *    ['type' => 'update_field', 'entry_type' => 'lot'|'block', 'lot_id'?, 'entry_id'?,
     *     'fields', 'lock_version'?]
     *
     *  Returns one result per operation, in the same order, as plain arrays
     *  (id, entry data, etc.) for the caller to sync back into local state. */
    public function batchApply(array $operations, string $date): array
    {
        return DB::transaction(function () use ($operations, $date) {
            // Lock every machine any operation in this batch touches, up
            // front, sorted — one lock acquisition per machine for the whole
            // batch, rather than each nested method re-locking independently
            // in an uncoordinated order.
            $machines = collect($operations)
                ->flatMap(fn($op) => [$op['machine'] ?? null, $op['target_machine'] ?? null])
                ->filter()
                ->unique()
                ->sort()
                ->values()
                ->all();

            if (!empty($machines)) {
                $this->lockMachineRows($machines, $date);
            }

            $results = [];

            foreach ($operations as $op) {
                $results[] = match ($op['type']) {
                    'move' => $this->applyMove($op, $date),
                    'transfer' => $this->applyTransfer($op, $date),
                    'create_lot' => $this->applyCreateLot($op, $date),
                    'create_block' => $this->addBlock(
                        $op['machine'],
                        $date,
                        $op['label'],
                        $op['duration'],
                        $op['before_entry_id'] ?? null,
                        $op['after_entry_id'] ?? null,
                    ),
                    'delete' => $this->applyDelete($op, $date),
                    'update_field' => $this->applyUpdateField($op, $date),
                    default => throw new \InvalidArgumentException("Unknown batch operation type: {$op['type']}"),
                };
            }

            return $results;
        });
    }

    private function applyMove(array $op, string $date)
    {
        // Log::info("operation: move, entry_type: {$op['entry_type']}, lot_id: {$op['lot_id']}, entry_id: {$op['entry_id']}, before_entry_id: {$op['before_entry_id']}, after_entry_id: {$op['after_entry_id']}, machine: {$op['machine']}, date: $date");

        return $this->moveEntry(
            $op['entry_type'],
            $op['lot_id'] ?? null,
            $op['entry_id'] ?? null,
            $op['before_entry_id'] ?? null,
            $op['after_entry_id'] ?? null,
            $op['machine'],
            $date,
        );
    }

    private function applyTransfer(array $op, string $date)
    {
        return $this->transferEntry(
            $op['entry_type'],
            $op['lot_id'] ?? null,
            $op['entry_id'] ?? null,
            $op['target_machine'],
            $op['before_entry_id'] ?? null,
            $op['after_entry_id'] ?? null,
            $date,
        );
    }

    private function applyCreateLot(array $op, string $date)
    {
        $entry = $this->editLotField($op['lot_id'], $date, $op['fields'], null);

        if (!empty($op['machine'])) {
            $entry = $this->moveEntry(
                'lot',
                $op['lot_id'],
                null,
                $op['before_entry_id'] ?? null,
                $op['after_entry_id'] ?? null,
                $op['machine'],
                $date,
            );
        }

        return $entry;
    }

    private function applyDelete(array $op, string $date)
    {
        $entry = LoadingPlanEntry::findOrFail($op['entry_id']);
        $this->deleteEntry($op['entry_id'], $entry->machine, $date, forceDelete: true);
        return ['deleted' => $op['entry_id']];
    }

    private function applyUpdateField(array $op, string $date)
    {
        return $op['entry_type'] === 'block'
            ? $this->editField($op['entry_id'], $op['fields'], $op['lock_version'] ?? null)
            : $this->editLotField($op['lot_id'], $date, $op['fields'], $op['lock_version'] ?? null);
    }
}
