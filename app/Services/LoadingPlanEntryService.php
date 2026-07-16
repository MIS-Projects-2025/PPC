<?php

namespace App\Services;

use App\Exceptions\SequenceExhaustedException;
use App\Exceptions\BulkStaleWriteException;
use App\Exceptions\StaleWriteException;
use App\Exceptions\LoadingPlanDateFinalizedException;
use App\Models\LoadingPlanEntry;
use App\Models\QdnMachine;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LoadingPlanEntryService
{
    private const GAP_SEED = 1000.0;
    private const MIN_GAP = 0.001;

    public function resolveEntry(string $entryType, string|int|null $lotId, ?int $entryId, string $date): LoadingPlanEntry
    {
        return $entryType === 'block'
            ? LoadingPlanEntry::with('machineModel')->where('id', $entryId)
            ->where('entry_type', 'block')
            ->where('scheduled_date', $date)
            ->firstOrFail()
            : LoadingPlanEntry::with('machineModel')->where('lot_id', $lotId)
            ->where('scheduled_date', $date)
            ->firstOrFail();
    }

    public function moveEntry(string $entryType, ?string $lotId, ?int $entryId, ?int $beforeEntryId, ?int $afterEntryId, string $machine, string $date): LoadingPlanEntry
    {
        return DB::transaction(function () use ($entryType, $lotId, $entryId, $beforeEntryId, $afterEntryId, $machine, $date) {
            $entry = $this->resolveEntry($entryType, $lotId, $entryId, $date);
            $this->assertNotFinalized($entry);

            $machineId = $this->resolveMachineId($machine);

            $rows = $this->lockMachineRows([$machineId], $date);
            $newOrder = $this->resolveSequenceOrder($rows, $beforeEntryId, $afterEntryId, $machine, $date);

            $entry->update(['sequence_order' => $newOrder, 'lock_version' => DB::raw('lock_version + 1')]);

            return $entry->fresh('machineModel');
        });
    }

    public function transferEntry(string $entryType, ?string $lotId, ?int $entryId, string $targetMachine, ?int $beforeEntryId, ?int $afterEntryId, string $date): LoadingPlanEntry
    {
        return DB::transaction(function () use ($entryType, $lotId, $entryId, $targetMachine, $beforeEntryId, $afterEntryId, $date) {
            $entry = $this->resolveEntry($entryType, $lotId, $entryId, $date);
            $this->assertNotFinalized($entry);

            $targetMachineId = $this->resolveMachineId($targetMachine);

            $machinesToLock = collect([$entry->machine_id, $targetMachineId])
                ->filter()
                ->unique()
                ->sort()
                ->values()
                ->all();

            $rows = $this->lockMachineRows($machinesToLock, $date);

            $newOrder = $this->resolveSequenceOrder(
                $rows->where('machine_id', $targetMachineId),
                $beforeEntryId,
                $afterEntryId,
                $targetMachine,
                $date,
            );

            $entry->update([
                'machine_id'     => $targetMachineId,
                'sequence_order' => $newOrder,
                'lock_version'   => DB::raw('lock_version + 1'),
            ]);

            return $entry->fresh('machineModel');
        });
    }

    public function addBlock(string $machine, string $date, string $label, int $durationMinutes, ?int $beforeEntryId, ?int $afterEntryId): LoadingPlanEntry
    {
        return DB::transaction(function () use ($machine, $date, $label, $durationMinutes, $beforeEntryId, $afterEntryId) {
            $this->assertDateNotFinalized($date);

            $machineId = $this->resolveMachineId($machine);

            $rows = $this->lockMachineRows([$machineId], $date);
            $newOrder = $this->resolveSequenceOrder($rows, $beforeEntryId, $afterEntryId, $machine, $date);

            return LoadingPlanEntry::create([
                'entry_type'      => 'block',
                'lot_id'          => null,
                'scheduled_date'  => $date,
                'machine_id'      => $machineId,
                'sequence_order'  => $newOrder,
                'block_label'     => $label,
                'accu_time'       => $durationMinutes,
                'lock_version'    => 1,
            ]);
        });
    }

    public function deleteEntry(int $id, ?string $machine, string $date, bool $forceDelete = false): void
    {
        DB::transaction(function () use ($id, $machine, $date, $forceDelete) {
            if ($machine) {
                $machineId = $this->resolveMachineId($machine);
                if ($machineId) {
                    $this->lockMachineRows([$machineId], $date);
                }
            }

            $entry = LoadingPlanEntry::where('id', $id)
                ->where('scheduled_date', $date)
                ->first();

            if (!$entry) {
                return;
            }

            $this->assertNotFinalized($entry);

            if ($forceDelete || $entry->entry_type === 'block') {
                $entry->delete();
                return;
            }

            $entry->update([
                'machine_id'     => null,
                'sequence_order' => null,
                'lock_version'   => DB::raw('lock_version + 1'),
            ]);
        });
    }

    public function bulkTransfer(array $lotIds, array $blockEntryIds, ?string $targetMachine, string $date): Collection
    {
        return DB::transaction(function () use ($lotIds, $blockEntryIds, $targetMachine, $date) {
            $this->assertDateNotFinalized($date);

            $targetMachineId = $this->resolveMachineId($targetMachine);

            $lotEntries = LoadingPlanEntry::with('machineModel')->whereIn('lot_id', $lotIds)
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
            $movers = $allEntries->filter(fn($e) => $e->machine_id !== $targetMachineId);

            if ($movers->isEmpty() && empty($unplannedLotIds)) {
                return collect();
            }

            $machinesToLock = $movers->pluck('machine_id')
                ->push($targetMachineId)
                ->filter()
                ->unique()
                ->sort()
                ->values()
                ->all();

            $lockedRows = $this->lockMachineRows($machinesToLock, $date);

            $nextSeq = ($lockedRows->where('machine_id', $targetMachineId)->max('sequence_order') ?? 0) + self::GAP_SEED;

            $updated = collect();

            foreach ($movers as $entry) {
                $this->assertNotFinalized($entry);

                $entry->update([
                    'machine_id'     => $targetMachineId,
                    'sequence_order' => $nextSeq,
                    'lock_version'   => DB::raw('lock_version + 1'),
                ]);
                $updated->push($entry->fresh('machineModel'));
                $nextSeq += self::GAP_SEED;
            }

            foreach ($unplannedLotIds as $lotId) {
                $entry = LoadingPlanEntry::create([
                    'entry_type'     => 'lot',
                    'lot_id'         => $lotId,
                    'scheduled_date' => $date,
                    'machine_id'     => $targetMachineId,
                    'sequence_order' => $nextSeq,
                    'lock_version'   => 1,
                ]);
                $updated->push($entry);
                $nextSeq += self::GAP_SEED;
            }

            return $updated;
        });
    }

    public function bulkDelete(array $ids, string $date): array
    {
        return DB::transaction(function () use ($ids, $date) {
            $entries = LoadingPlanEntry::whereIn('id', $ids)
                ->where('scheduled_date', $date)
                ->get();

            $machines = $entries->pluck('machine_id')->filter()->unique()->sort()->values()->all();
            if (!empty($machines)) {
                $this->lockMachineRows($machines, $date);
            }

            $unassigned = [];
            $deleted = [];

            foreach ($entries as $entry) {
                $this->assertNotFinalized($entry);

                if ($entry->entry_type === 'block') {
                    $deleted[] = $entry->id;
                    $entry->delete();
                } else {
                    $entry->update([
                        'machine_id'     => null,
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
            $this->assertDateNotFinalized($date);

            $lotId = 'MANUAL-' . now()->format('YmdHis') . '-' . strtoupper(Str::random(4));
            $machineId = $this->resolveMachineId($machine);

            $rows = $this->lockMachineRows([$machineId], $date);
            $newOrder = $this->resolveSequenceOrder($rows, $beforeEntryId, $afterEntryId, $machine, $date);

            return LoadingPlanEntry::create([
                'entry_type'     => 'lot',
                'lot_id'         => $lotId,
                'part_name'      => $fields['Part_Name'] ?? '',
                'package_name'   => $fields['Package_Name'] ?? null,
                'qty'            => $fields['Qty'] ?? 0,
                'scheduled_date' => $date,
                'machine_id'     => $machineId,
                'sequence_order' => $newOrder,
                'status'         => 'NONE',
                'lock_version'   => 1,
            ]);
        });
    }

    // ------------------------------------------------------------------
    // Field-only edits — optimistic locking, no machine lock
    // ------------------------------------------------------------------

    public function editField(int $id, array $fields, int $expectedLockVersion): LoadingPlanEntry
    {
        $affected = LoadingPlanEntry::where('id', $id)
            ->where('lock_version', $expectedLockVersion)
            ->whereNull('finalized_at')
            ->update([...$fields, 'lock_version' => DB::raw('lock_version + 1')]);

        if ($affected === 0) {
            $entry = LoadingPlanEntry::find($id);
            if ($entry && $entry->finalized_at !== null) {
                throw new LoadingPlanDateFinalizedException($entry->scheduled_date, $entry->id);
            }
            throw new StaleWriteException($entry);
        }

        return LoadingPlanEntry::findOrFail($id);
    }

    public function editLotField(string $lotId, string $date, array $fields, ?int $expectedLockVersion): LoadingPlanEntry
    {
        $existing = LoadingPlanEntry::where('lot_id', $lotId)
            ->where('scheduled_date', $date)
            ->first();

        if (!$existing) {
            $this->assertDateNotFinalized($date);

            return LoadingPlanEntry::create([
                'entry_type'     => 'lot',
                'lot_id'         => $lotId,
                'scheduled_date' => $date,
                'machine_id'     => null,
                'sequence_order' => null,
                'lock_version'   => 1,
                ...$fields,
            ]);
        }

        $this->assertNotFinalized($existing);

        $affected = LoadingPlanEntry::where('id', $existing->id)
            ->where('lock_version', $expectedLockVersion)
            ->whereNull('finalized_at')
            ->update([...$fields, 'lock_version' => DB::raw('lock_version + 1')]);

        if ($affected === 0) {
            throw new StaleWriteException(LoadingPlanEntry::find($existing->id));
        }

        return LoadingPlanEntry::findOrFail($existing->id);
    }

    public function bulkEditField(array $updates): array
    {
        return DB::transaction(function () use ($updates) {
            $entries = [];
            $conflicts = [];

            foreach ($updates as $u) {
                $id = $u['id'] ?? null;
                $fields = $u['fields'];

                if ($id) {
                    $existing = LoadingPlanEntry::find($id);
                    $this->assertNotFinalized($existing);

                    $affected = LoadingPlanEntry::where('id', $id)
                        ->where('lock_version', $u['lock_version'] ?? null)
                        ->whereNull('finalized_at')
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

                $existing = LoadingPlanEntry::where('lot_id', $lotId)
                    ->where('scheduled_date', $scheduledDate)
                    ->first();

                if ($existing) {
                    $this->assertNotFinalized($existing);
                } else {
                    $this->assertDateNotFinalized($scheduledDate);
                }

                try {
                    $entries[] = LoadingPlanEntry::create([
                        'entry_type'     => 'lot',
                        'lot_id'         => $lotId,
                        'scheduled_date' => $scheduledDate,
                        'machine_id'     => null,
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

                    $this->assertNotFinalized($existing);

                    $existing->update([...$fields, 'lock_version' => DB::raw('lock_version + 1')]);
                    $entries[] = $existing->fresh();
                }
            }

            if (!empty($conflicts)) {
                throw new BulkStaleWriteException($conflicts);
            }

            return $entries;
        });
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    /** Throws if this specific entry has already been finalized. */
    private function assertNotFinalized(?LoadingPlanEntry $entry): void
    {
        if ($entry && $entry->finalized_at !== null) {
            throw new LoadingPlanDateFinalizedException($entry->scheduled_date, $entry->id);
        }
    }

    /** Throws if ANY entry for this date has already been finalized — used
     *  before creating a brand new row, where there's no existing entry
     *  to check individually. */
    private function assertDateNotFinalized(string $date): void
    {
        $isFinalized = LoadingPlanEntry::where('scheduled_date', $date)
            ->whereNotNull('finalized_at')
            ->exists();

        if ($isFinalized) {
            throw new LoadingPlanDateFinalizedException($date);
        }
    }

    /** Resolve a machine name (from frontend/legacy callers) to its id in qdn_db. */
    private function resolveMachineId(?string $machineName): ?int
    {
        if ($machineName === null || $machineName === '') {
            return null;
        }

        return QdnMachine::where('machine_num', $machineName)->value('id');
    }

    /** Batch version — returns just the ids, order not guaranteed to match input. */
    private function resolveMachineIds(array $machineNames): array
    {
        if (empty($machineNames)) {
            return [];
        }

        return QdnMachine::whereIn('machine_num', $machineNames)->pluck('id')->all();
    }

    /** Lock and return every row across the given machine_ids for this date. */
    private function lockMachineRows(array $machineIds, string $date): Collection
    {
        $ids = collect($machineIds)->filter()->unique()->sort()->values()->all();

        return LoadingPlanEntry::with('machineModel')
            ->whereIn('machine_id', $ids)
            ->where('scheduled_date', $date)
            ->orderBy('sequence_order')
            ->lockForUpdate()
            ->get();
    }

    private function resolveSequenceOrder(Collection $machineRows, ?int $beforeEntryId, ?int $afterEntryId, string $machine, string $date): float
    {
        $before = $beforeEntryId ? $machineRows->firstWhere('id', $beforeEntryId)?->sequence_order : null;
        $after  = $afterEntryId ? $machineRows->firstWhere('id', $afterEntryId)?->sequence_order : null;

        if ($before === null && $after === null) {
            $currentMax = $machineRows->max('sequence_order');
            if ($currentMax !== null) {
                $before = $currentMax;
            }
        }

        if ($before !== null && $after !== null && $before > $after) {
            [$before, $after] = [$after, $before];
        }

        try {
            return $this->computeSequenceOrder($before, $after, $machine, $date);
        } catch (SequenceExhaustedException) {
            $machineId = $this->resolveMachineId($machine);
            $rebalanced = $this->rebalance($machineId, $date);

            $before = $beforeEntryId ? $rebalanced->firstWhere('id', $beforeEntryId)?->sequence_order : null;
            $after = $afterEntryId ? $rebalanced->firstWhere('id', $afterEntryId)?->sequence_order : null;

            if ($before === null && $after === null) {
                $currentMax = $rebalanced->max('sequence_order');
                if ($currentMax !== null) {
                    $before = $currentMax;
                }
            }

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

    private function rebalance(?int $machineId, string $date): Collection
    {
        $rows = LoadingPlanEntry::where('machine_id', $machineId)
            ->where('scheduled_date', $date)
            ->orderBy('sequence_order')
            ->lockForUpdate()
            ->get();

        foreach ($rows as $i => $row) {
            $row->update(['sequence_order' => ($i + 1) * self::GAP_SEED]);
        }

        return $rows->fresh();
    }

    public function batchApply(array $operations, string $date): array
    {
        return DB::transaction(function () use ($operations, $date) {
            $machineNames = collect($operations)
                ->flatMap(fn($op) => [$op['machine'] ?? null, $op['target_machine'] ?? null])
                ->filter()
                ->unique()
                ->values()
                ->all();

            $machineIds = $this->resolveMachineIds($machineNames);

            if (!empty($machineIds)) {
                $this->lockMachineRows($machineIds, $date);
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
        $entry = LoadingPlanEntry::with('machineModel')->findOrFail($op['entry_id']);
        $this->deleteEntry($op['entry_id'], $entry->getMachineName(), $date, forceDelete: true);
        return ['deleted' => $op['entry_id']];
    }

    private function applyUpdateField(array $op, string $date)
    {
        return $op['entry_type'] === 'block'
            ? $this->editField($op['entry_id'], $op['fields'], $op['lock_version'] ?? null)
            : $this->editLotField($op['lot_id'], $date, $op['fields'], $op['lock_version'] ?? null);
    }
}
