<?php

namespace App\Services;

use App\Exceptions\SequenceExhaustedException;
use App\Exceptions\StaleWriteException;
use App\Models\LoadingPlanEntry;
use Illuminate\Support\Collection;
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

    /** Reorder a lot within its current machine, placing it between
     *  $beforeLotId and $afterLotId (either may be null for start/end). */
    public function moveLot(string $lotId, ?string $beforeLotId, ?string $afterLotId, string $machine, string $date): LoadingPlanEntry
    {
        return DB::transaction(function () use ($lotId, $beforeLotId, $afterLotId, $machine, $date) {
            $rows = $this->lockMachineRows([$machine], $date);

            $newOrder = $this->resolveSequenceOrder($rows, $beforeLotId, $afterLotId, $machine, $date);

            $entry = LoadingPlanEntry::where('lot_id', $lotId)
                ->where('scheduled_date', $date)
                ->firstOrFail();

            $entry->update(['sequence_order' => $newOrder, 'lock_version' => DB::raw('lock_version + 1')]);

            return $entry->fresh();
        });
    }

    /** Same as moveLot, but for a block — blocks have no lot_id, only their
     *  own entry id, so this is keyed by id instead. */
    public function moveBlock(int $entryId, ?string $beforeLotId, ?string $afterLotId, string $machine, string $date): LoadingPlanEntry
    {
        return DB::transaction(function () use ($entryId, $beforeLotId, $afterLotId, $machine, $date) {
            $rows = $this->lockMachineRows([$machine], $date);

            $newOrder = $this->resolveSequenceOrder($rows, $beforeLotId, $afterLotId, $machine, $date);

            $entry = LoadingPlanEntry::where('id', $entryId)
                ->where('entry_type', 'block')
                ->where('scheduled_date', $date)
                ->firstOrFail();

            $entry->update(['sequence_order' => $newOrder, 'lock_version' => DB::raw('lock_version + 1')]);

            return $entry->fresh();
        });
    }

    /** Move a single lot to a different machine, placing it between the
     *  given neighbors on the target. Locks both source and target
     *  machines (sorted) so a concurrent read on the source can't compute
     *  a midpoint against a row that's mid-transfer. */
    public function transferLot(string $lotId, string $targetMachine, ?string $beforeLotId, ?string $afterLotId, string $date): LoadingPlanEntry
    {
        return DB::transaction(function () use ($lotId, $targetMachine, $beforeLotId, $afterLotId, $date) {
            $entry = LoadingPlanEntry::where('lot_id', $lotId)
                ->where('scheduled_date', $date)
                ->firstOrFail();

            $machinesToLock = collect([$entry->machine, $targetMachine])
                ->filter()
                ->unique()
                ->sort()
                ->values()
                ->all();

            $rows = $this->lockMachineRows($machinesToLock, $date);

            $newOrder = $this->resolveSequenceOrder(
                $rows->where('machine', $targetMachine),
                $beforeLotId,
                $afterLotId,
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

    /** Same as transferLot, but for a block — keyed by entry id instead of
     *  lot_id, since blocks have no lot_id. */
    public function transferBlock(int $entryId, string $targetMachine, ?string $beforeLotId, ?string $afterLotId, string $date): LoadingPlanEntry
    {
        return DB::transaction(function () use ($entryId, $targetMachine, $beforeLotId, $afterLotId, $date) {
            $entry = LoadingPlanEntry::where('id', $entryId)
                ->where('entry_type', 'block')
                ->where('scheduled_date', $date)
                ->firstOrFail();

            $machinesToLock = collect([$entry->machine, $targetMachine])
                ->filter()
                ->unique()
                ->sort()
                ->values()
                ->all();

            $rows = $this->lockMachineRows($machinesToLock, $date);

            $newOrder = $this->resolveSequenceOrder(
                $rows->where('machine', $targetMachine),
                $beforeLotId,
                $afterLotId,
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
    public function addBlock(string $machine, string $date, string $label, int $durationMinutes, ?string $beforeLotId, ?string $afterLotId): LoadingPlanEntry
    {
        return DB::transaction(function () use ($machine, $date, $label, $durationMinutes, $beforeLotId, $afterLotId) {
            $rows = $this->lockMachineRows([$machine], $date);
            Log::info("rows", $rows->toArray());
            $newOrder = $this->resolveSequenceOrder($rows, $beforeLotId, $afterLotId, $machine, $date);

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

    /** Remove one entry (a block outright, or a lot's plan entry — which
     *  simply makes it reappear as Unassigned on next load, since the
     *  controller merges WIP rows with plan entries and defaults absent
     *  entries to machine === null). */
    public function deleteEntry(int $id, string $machine, string $date): void
    {
        DB::transaction(function () use ($id, $machine, $date) {
            // Lock the machine's rows even though nothing here needs
            // renumbering — this closes the race where a concurrent
            // moveLot/addBlock on the same machine reads this row as a
            // neighbor a moment before it's deleted out from under it.
            $this->lockMachineRows([$machine], $date);

            LoadingPlanEntry::where('id', $id)
                ->where('machine', $machine)
                ->where('scheduled_date', $date)
                ->delete();
        });
    }

    /** Transfer many lots and/or blocks to one target machine in a single
     *  operation. Items already on the target are skipped as no-ops. Lots
     *  with no existing plan entry at all (never planned — Unassigned) get a
     *  fresh entry created directly onto the target. Blocks always have an
     *  entry already (created via addBlock), so they're looked up by id.
     *  Locks every machine actually involved (all real sources + the
     *  target), sorted, in one transaction. */
    public function bulkTransfer(array $lotIds, array $blockEntryIds, string $targetMachine, string $date): Collection
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

    /** Delete many entries at once (mixed lots/blocks, possibly spanning
     *  several machines). Locks every distinct machine involved, sorted. */
    public function bulkDelete(array $ids, string $date): void
    {
        DB::transaction(function () use ($ids, $date) {
            $machines = LoadingPlanEntry::whereIn('id', $ids)
                ->where('scheduled_date', $date)
                ->pluck('machine')
                ->filter()
                ->unique()
                ->sort()
                ->values()
                ->all();

            if (!empty($machines)) {
                $this->lockMachineRows($machines, $date);
            }

            LoadingPlanEntry::whereIn('id', $ids)
                ->where('scheduled_date', $date)
                ->delete();
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

    /** Bulk field edit (e.g. "set status DONE" across a multi-select).
     *  Each update is either:
     *    - { id, fields, lock_version } — existing entry, optimistic-lock
     *      checked and updated, same as editField.
     *    - { lot_id, scheduled_date, fields } — lot never planned before,
     *      no entry row exists yet; created fresh (entry_type: 'lot').
     *  Returns the ids/lot_ids that were stale (existing-entry case only)
     *  so the client can report which ones didn't apply. */
    public function bulkEditField(array $updates): array
    {
        $stale = [];
        $entries = [];

        DB::transaction(function () use ($updates, &$stale, &$entries) {
            foreach ($updates as $u) {
                $id = $u['id'] ?? null;
                $fields = $u['fields'];

                if ($id) {
                    $affected = LoadingPlanEntry::where('id', $id)
                        ->where('lock_version', $u['lock_version'] ?? null)
                        ->update([...$fields, 'lock_version' => DB::raw('lock_version + 1')]);

                    if ($affected === 0) {
                        $stale[] = $id;
                    } else {
                        $entries[] = LoadingPlanEntry::find($id);
                    }
                    continue;
                }

                $lotId = $u['lot_id'];
                $scheduledDate = $u['scheduled_date'];

                try {
                    $entry = LoadingPlanEntry::create([
                        'entry_type'     => 'lot',
                        'lot_id'         => $lotId,
                        'scheduled_date' => $scheduledDate,
                        'machine'        => null,
                        'sequence_order' => null,
                        'lock_version'   => 1,
                        ...$fields,
                    ]);
                    $entries[] = $entry;
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
        });

        return ['stale' => $stale, 'entries' => $entries];
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
     *  sequence_order to place a new/moved row between $beforeLotId and
     *  $afterLotId. Rebalances and retries once if the gap is exhausted. */
    private function resolveSequenceOrder(Collection $machineRows, ?string $beforeLotId, ?string $afterLotId, string $machine, string $date): float
    {
        $before = $beforeLotId ? $machineRows->firstWhere('lot_id', $beforeLotId)?->sequence_order : null;
        $after = $afterLotId ? $machineRows->firstWhere('lot_id', $afterLotId)?->sequence_order : null;

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

            $before = $beforeLotId ? $rebalanced->firstWhere('lot_id', $beforeLotId)?->sequence_order : null;
            $after = $afterLotId ? $rebalanced->firstWhere('lot_id', $afterLotId)?->sequence_order : null;

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
}
