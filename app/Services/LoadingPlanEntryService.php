<?php

namespace App\Services;

use App\Exceptions\SequenceExhaustedException;
use App\Exceptions\BulkStaleWriteException;
use App\Exceptions\StaleWriteException;
use App\Exceptions\LoadingPlanDateFinalizedException;
use App\Models\LoadingPlanEntry;
use App\Models\QdnMachine;
use App\Models\LotQuantity;
use App\Models\CustomerDataWip;
use Exception;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LoadingPlanEntryService
{
    private const GAP_SEED = 1000.0;
    private const MIN_GAP = 0.001;

    /** @var array<string,int> machine_num => id */
    private array $machineIdByNum;

    public function __construct()
    {
        $this->machineIdByNum = QdnMachine::pluck('id', 'machine_num')->all();
    }

    public function resolveEntry(int $entryId): LoadingPlanEntry
    {
        if ($entryId !== null) {
            return LoadingPlanEntry::with('machineModel')
                ->where('id', $entryId)
                ->firstOrFail();
        }

        throw new Exception("The lot was not found.");
    }

    public function moveEntry(string $entryType, ?int $entryId, ?int $beforeEntryId, ?int $afterEntryId, string $machine): LoadingPlanEntry
    {
        return DB::transaction(function () use ($entryType, $entryId, $beforeEntryId, $afterEntryId, $machine) {
            $entry = $this->resolveEntry($entryId);
            $this->assertNotFinalized($entry);

            $resolvedDate = $entry->scheduled_date->toDateString();

            $machineId = $this->resolveMachineId($machine);

            $rows = $this->lockMachineRows([$machineId], $resolvedDate);
            $newOrder = $this->resolveSequenceOrder($rows, $beforeEntryId, $afterEntryId, $machine, $resolvedDate);

            $entry->update(['sequence_order' => $newOrder, 'lock_version' => DB::raw('lock_version + 1')]);

            if ($entryType === 'lot') {
                app(LotScheduleCalculator::class, [
                    'dates' => [$resolvedDate],
                    'lotIds' => [$entry->lot_id],
                ])->recalculateAndRetime($entry->lot_id, $resolvedDate, $machineId);
            }

            return $entry->fresh('machineModel');
        });
    }

    public function transferEntry(string $entryType, ?int $entryId, string $targetMachine, ?int $beforeEntryId, ?int $afterEntryId): LoadingPlanEntry
    {
        return DB::transaction(function () use ($entryType, $entryId, $targetMachine, $beforeEntryId, $afterEntryId) {
            $entry = $this->resolveEntry($entryId);

            $resolvedDate = $entry->scheduled_date->toDateString();

            $sourceMachineId = $entry->machine_id;
            $this->assertNotFinalized($entry);

            $targetMachineId = $this->resolveMachineId($targetMachine);

            $machinesToLock = collect([$entry->machine_id, $targetMachineId])
                ->filter()
                ->unique()
                ->sort()
                ->values()
                ->all();

            $rows = $this->lockMachineRows($machinesToLock, $resolvedDate);

            $newOrder = $this->resolveSequenceOrder(
                $rows->where('machine_id', $targetMachineId),
                $beforeEntryId,
                $afterEntryId,
                $targetMachine,
                $resolvedDate,
            );

            $entry->update([
                'machine_id'     => $targetMachineId,
                'sequence_order' => $newOrder,
                'lock_version'   => DB::raw('lock_version + 1'),
            ]);

            if ($entryType === 'lot') {
                app(LotScheduleCalculator::class, ['dates' => [$resolvedDate], 'lotIds' => [$entry->lot_id]])
                    ->recalculateAndRetime($entry->lot_id, $resolvedDate, $targetMachineId);

                if ($sourceMachineId && $sourceMachineId !== $targetMachineId) {
                    $sourceRestart = $this->findFirstRemainingRow($sourceMachineId, $resolvedDate);
                    if ($sourceRestart) {
                        app(LotScheduleCalculator::class)->recomputeTimeStartAndEnd($sourceRestart, $sourceMachineId);
                    }
                }
            }

            return $entry->fresh('machineModel');
        });
    }

    /**
     * The first row remaining on $machineId for $scheduledDate, in sequence
     * order — used after a lot is removed from this machine (e.g. via
     * transferEntry) to find where to restart the timing walk. Returns null
     * if the machine now has no rows left for this date at all.
     */
    public function findFirstRemainingRow(int $machineId, string $date): ?LoadingPlanEntry
    {
        return LoadingPlanEntry::where('machine_id', $machineId)
            ->where('scheduled_date', $date)
            ->orderBy('sequence_order')
            ->first();
    }

    public function addBlock(string $machine, string $date, string $label, int $durationMinutes, ?int $beforeEntryId, ?int $afterEntryId): LoadingPlanEntry
    {
        return DB::transaction(function () use ($machine, $date, $label, $durationMinutes, $beforeEntryId, $afterEntryId) {
            $this->assertDateNotFinalized($date);

            $machineId = $this->resolveMachineId($machine);

            $rows = $this->lockMachineRows([$machineId], $date);
            $newOrder = $this->resolveSequenceOrder($rows, $beforeEntryId, $afterEntryId, $machine, $date);

            $entry = LoadingPlanEntry::create([
                'entry_type'      => 'block',
                'lot_id'          => null,
                'scheduled_date'  => $date,
                'machine_id'      => $machineId,
                'sequence_order'  => $newOrder,
                'block_label'     => $label,
                'accu_time'       => $durationMinutes,
                'lock_version'    => 1,
            ]);

            $calc = app(LotScheduleCalculator::class);
            $calc->recomputeTimeStartAndEnd($entry, $machineId);

            if ($calc->findPredecessor($entry) === null) {
                DB::table('machine_day_starts')->updateOrInsert(
                    ['machine_id' => $machineId, 'scheduled_date' => $date],
                    ['day_start_time' => $entry->fresh()->time_start->format('H:i:s'), 'updated_at' => now()]
                );
            }

            return $entry->fresh();
        });
    }

    public function deleteEntry(int $id, ?string $machine, bool $forceDelete = false): void
    {
        DB::transaction(function () use ($id, $machine, $forceDelete) {
            $machineId = $machine ? $this->resolveMachineId($machine) : null;
            $entry = LoadingPlanEntry::where('id', $id)->first();
            $date = $entry->scheduled_date;

            if ($machineId) {
                $this->lockMachineRows([$machineId], $date);
            }


            if (!$entry) {
                return;
            }

            $this->assertNotFinalized($entry);

            $vacatedMachineId = $entry->machine_id;

            if ($forceDelete || $entry->entry_type === 'block') {
                $entry->delete();
            } else {
                $entry->update([
                    'machine_id'     => null,
                    'sequence_order' => null,
                    'lock_version'   => DB::raw('lock_version + 1'),
                ]);
            }

            if ($vacatedMachineId) {
                $calc = app(LotScheduleCalculator::class);
                $restart = $this->findFirstRemainingRow($vacatedMachineId, $date);
                if ($restart) {
                    $calc->recomputeTimeStartAndEnd($restart, $vacatedMachineId);
                }
            }
        });
    }

    public function bulkTransfer(array $entryIds, array $blockEntryIds, ?string $targetMachine, string $date): Collection
    {
        return DB::transaction(function () use ($entryIds, $blockEntryIds, $targetMachine, $date) {
            $this->assertDateNotFinalized($date);

            $targetMachineId = $this->resolveMachineId($targetMachine);
            // var_dump("🚀 ~ LoadingPlanEntryService ~ bulkTransfer ~ $targetMachineId:", $targetMachineId);

            $lotEntries = LoadingPlanEntry::with('machineModel')->whereIn('id', $entryIds)
                ->where('scheduled_date', $date)
                ->where('entry_type', 'lot')
                ->get();

            $blockEntries = empty($blockEntryIds)
                ? collect()
                : LoadingPlanEntry::whereIn('id', $blockEntryIds)
                ->where('scheduled_date', $date)
                ->where('entry_type', 'block')
                ->get();

            $plannedLotIds = $lotEntries->pluck('id')->all();
            $unplannedLotIds = array_values(array_diff($entryIds, $plannedLotIds));

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

            $lotIds = $movers->pluck('lot_id')->all();
            $calculator = new LotScheduleCalculator([$date], $lotIds);

            foreach ($movers as $entry) {
                $this->assertNotFinalized($entry);

                $entry->update([
                    'machine_id'     => $targetMachineId,
                    'sequence_order' => $nextSeq,
                    'lock_version'   => DB::raw('lock_version + 1'),
                ]);

                if ($entry->entry_type === 'lot') {
                    $calculator->recalculateAndRetime($entry->lot_id, $date, $targetMachineId);
                }

                $updated->push($entry->fresh('machineModel'));
                $nextSeq += self::GAP_SEED;
            }

            $wip = CustomerDataWip::query()
                ->select('Lot_Id', 'Package_Name', 'import_date')
                ->whereIn('Lot_Id', $unplannedLotIds)
                ->orderBy('Lot_Id')
                ->orderByDesc('import_date')
                ->get()
                ->unique('Lot_Id')
                ->keyBy('Lot_Id');

            foreach ($unplannedLotIds as $lotId) {
                $wipItem = $wip->get($lotId);

                $entry = LoadingPlanEntry::create([
                    'entry_type'     => 'lot',
                    'lot_id'         => $lotId,
                    'scheduled_date' => $date,
                    'machine_id'     => $targetMachineId,
                    'package_name'   => $wipItem?->Package_Name ?? null,
                    'sequence_order' => $nextSeq,
                    'lock_version'   => 1,
                ]);

                $calculator->recalculateAndRetime($lotId, $date, $targetMachineId);

                $updated->push($entry->fresh('machineModel'));
                $nextSeq += self::GAP_SEED;
            }

            return $updated;
        });
    }

    /**
     * Same as bulkTransfer(), but each lot can go to a different machine.
     * $assignments: array<int, array{lot_id: string, machine: string}>
     */
    public function bulkTransferMulti(array $assignments, array $blockEntryIds, string $date): Collection
    {
        return DB::transaction(function () use ($assignments, $blockEntryIds, $date) {
            $this->assertDateNotFinalized($date);

            // lot_id => resolved target machine_id
            $targetByLotId = collect($assignments)
                ->mapWithKeys(fn($a) => [$a['lot_id'] => $this->resolveMachineId($a['machine'])]);

            $lotIds = $targetByLotId->keys()->all();

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
            $movers = $allEntries->filter(fn($e) => $e->machine_id !== $targetByLotId->get($e->lot_id));

            if ($movers->isEmpty() && empty($unplannedLotIds)) {
                return collect();
            }

            // Lock every machine that's either a source (movers' current
            // machine) or a destination (any distinct target) — same idea as
            // bulkTransfer(), just union'd across all targets instead of one.
            $machinesToLock = $movers->pluck('machine_id')
                ->concat($targetByLotId->values())
                ->filter()
                ->unique()
                ->sort()
                ->values()
                ->all();

            $lockedRows = $this->lockMachineRows($machinesToLock, $date);

            // Independent sequence counter per target machine, seeded from
            // that machine's current max sequence_order (same GAP_SEED spacing).
            $nextSeqByMachine = $lockedRows->groupBy('machine_id')
                ->map(fn($rows) => ($rows->max('sequence_order') ?? 0) + self::GAP_SEED);

            $updated = collect();

            $calculator = new LotScheduleCalculator([$date], $lotIds);

            \Log::info('calculator', ['mb_start_for_loop' => memory_get_usage(true) / 1048576]);

            foreach ($movers as $i => $entry) {
                if ($i % 50 === 0) {
                    Log::info("bulkTransferMulti checkpoint", ['i' => $i, 'mb' => memory_get_usage(true) / 1048576]);
                }

                $this->assertNotFinalized($entry);

                $targetMachineId = $targetByLotId->get($entry->lot_id);
                $targetMachineCode = collect($assignments)->firstWhere('lot_id', $entry->lot_id)['machine'];
                $seq = $nextSeqByMachine->get($targetMachineId, self::GAP_SEED);

                $entry->update([
                    'machine_id'     => $targetMachineId,
                    'sequence_order' => $seq,
                    'lock_version'   => DB::raw('lock_version + 1'),
                ]);

                if ($entry->entry_type === 'lot') {
                    $calculator->recalculateAndRetime($entry->lot_id, $date, $targetMachineId);
                }

                $updated->push($entry->fresh('machineModel'));
                $nextSeqByMachine[$targetMachineId] = $seq + self::GAP_SEED;
            }

            $wip = CustomerDataWip::query()->forDate($date)->whereIn('Lot_Id', $unplannedLotIds)->get()->keyBy('Lot_Id');

            foreach ($unplannedLotIds as $lotId) {
                $wipItem = $wip->get($lotId);
                $targetMachineId = $targetByLotId->get($lotId);
                $seq = $nextSeqByMachine->get($targetMachineId, self::GAP_SEED);

                $entry = LoadingPlanEntry::create([
                    'entry_type'     => 'lot',
                    'lot_id'         => $lotId,
                    'scheduled_date' => $date,
                    'machine_id'     => $targetMachineId,
                    'package_name'   => $wipItem?->Package_Name ?? null,
                    'sequence_order' => $seq,
                    'lock_version'   => 1,
                ]);
                $updated->push($entry);
                $nextSeqByMachine[$targetMachineId] = $seq + self::GAP_SEED;
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

            foreach ($entries as $entry) {
                $this->assertNotFinalized($entry);
            }

            [$blocks, $others] = $entries->partition(fn($entry) => $entry->entry_type === 'block');

            $deleted = $blocks->pluck('id')->all();
            if (!empty($deleted)) {
                LoadingPlanEntry::whereIn('id', $deleted)->delete();
            }

            $unassignedIds = $others->pluck('id')->all();
            if (!empty($unassignedIds)) {
                LoadingPlanEntry::whereIn('id', $unassignedIds)->update([
                    'machine_id'     => null,
                    'sequence_order' => null,
                    'lock_version'   => DB::raw('lock_version + 1'),
                ]);
            }

            // every affected machine now has one or more rows removed/vacated —
            // retime each from whatever's now its first-remaining row
            if (!empty($machines)) {
                $calc = app(LotScheduleCalculator::class);
                foreach ($machines as $machineId) {
                    $restart = $this->findFirstRemainingRow($machineId, $date);
                    if ($restart) {
                        $calc->recomputeTimeStartAndEnd($restart, $machineId);
                    }
                }
            }

            // avoid a fresh() query per row — we already know the new values
            $unassigned = $others->map(function ($entry) {
                $entry->machine_id = null;
                $entry->sequence_order = null;
                $entry->lock_version += 1;
                return $entry;
            })->values()->all();

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

            $entry = LoadingPlanEntry::create([
                'entry_type'     => 'lot',
                'lot_id'         => $lotId,
                'package_name'   => $fields['Package_Name'] ?? null,
                'scheduled_date' => $date,
                'machine_id'     => $machineId,
                'sequence_order' => $newOrder,
                'status'         => 'NONE',
                'lock_version'   => 1,
            ]);

            LotQuantity::create([
                'lot_id'         => $lotId,
                'scheduled_date' => $date,
                'part_name'      => $fields['Part_Name'] ?? '',
                'qty_base'       => $fields['Qty'] ?? 0,
            ]);

            app(LotScheduleCalculator::class, [
                'dates' => [$date],
                'lotIds' => [$lotId],
            ])->recalculateAndRetime($lotId, $date, $machineId);

            return $entry;
        });
    }

    // ------------------------------------------------------------------
    // Field-only edits — optimistic locking, no machine lock
    // ------------------------------------------------------------------

    public function editField(int $id, array $fields, int $expectedLockVersion): LoadingPlanEntry
    {
        $existing = LoadingPlanEntry::find($id);

        $affected = LoadingPlanEntry::where('id', $id)
            ->where('lock_version', $expectedLockVersion)
            ->whereNull('finalized_at')
            ->update([...$fields, 'lock_version' => DB::raw('lock_version + 1')]);

        if ($affected === 0) {
            if ($existing && $existing->finalized_at !== null) {
                throw new LoadingPlanDateFinalizedException($existing->scheduled_date, $existing->id);
            }
            throw new StaleWriteException($existing);
        }

        $entry = LoadingPlanEntry::findOrFail($id);

        // accu_time changes need to cascade — anything else (remarks, tag,
        // status) doesn't affect timing at all
        if (array_key_exists('accu_time', $fields) && $entry->machine_id !== null) {
            app(LotScheduleCalculator::class)->recomputeTimeStartAndEnd($entry, $entry->machine_id);
            $entry = $entry->fresh();
        }

        return $entry;
    }

    public function editLotField(int $entry_id, string $date, array $fields, ?int $expectedLockVersion): LoadingPlanEntry
    {
        $entryFields = collect($fields)->except(['qty', 'part_name'])->all();

        $existing = LoadingPlanEntry::where('id', $entry_id)->first();

        if (!$existing) {
            $this->assertDateNotFinalized($date);

            return LoadingPlanEntry::create([
                'entry_type'     => 'lot',
                'lot_id'         => $lotId,
                'scheduled_date' => $date,
                'machine_id'     => null,
                'sequence_order' => null,
                'lock_version'   => 1,
                ...$entryFields,
            ]);
        }

        $this->assertNotFinalized($existing);

        $affected = LoadingPlanEntry::where('id', $existing->id)
            ->where('lock_version', $expectedLockVersion)
            ->whereNull('finalized_at')
            ->update([...$entryFields, 'lock_version' => DB::raw('lock_version + 1')]);

        if ($affected === 0) {
            throw new StaleWriteException(LoadingPlanEntry::find($existing->id));
        }

        if (array_key_exists('qty', $fields) || array_key_exists('part_name', $fields)) {
            $row = LotQuantity::firstOrNew(['lot_id' => $lotId, 'scheduled_date' => $date]);

            if (array_key_exists('qty', $fields)) {
                $row->qty_base = $fields['qty'];
            }

            $row->save();

            app(LotScheduleCalculator::class, ['dates' => [$date], 'lotIds' => [$lotId]])
                ->recalculateAndRetime($lotId, $date, $existing->machine_id);
        }

        return LoadingPlanEntry::findOrFail($existing->id);
    }

    public function bulkEditField(array $updates): array
    {
        return DB::transaction(function () use ($updates) {
            $entries = [];
            $conflicts = [];

            // Collect all lot_ids + scheduled_date up front so the calculator
            // can be constructed once for the whole batch, scoped correctly.
            $lotIds = collect($updates)->pluck('lot_id')->filter()->unique()->values()->all();
            $date = $updates[0]['scheduled_date'] ?? null; // this assumes that all updates shares exactly one scheduled_date

            $calc = app(LotScheduleCalculator::class, ['dates' => [$date], 'lotIds' => $lotIds]);

            foreach ($updates as $u) {
                $id = $u['id'] ?? null;
                $fields = $u['fields'];
                $lotId = $u['lot_id'];
                $scheduledDate = $u['scheduled_date'];
                $entryFields = collect($fields)->except(['qty', 'part_name'])->all();

                if ($id) {
                    $existing = LoadingPlanEntry::find($id);
                    $this->assertNotFinalized($existing);

                    $affected = LoadingPlanEntry::where('id', $id)
                        ->where('lock_version', $u['lock_version'] ?? null)
                        ->whereNull('finalized_at')
                        ->update([...$entryFields, 'lock_version' => DB::raw('lock_version + 1')]);

                    if ($affected === 0) {
                        $conflicts[] = LoadingPlanEntry::find($id);
                        continue;
                    }

                    if (array_key_exists('qty', $fields) || array_key_exists('part_name', $fields)) {
                        $row = LotQuantity::firstOrNew(['lot_id' => $lotId, 'scheduled_date' => $scheduledDate]);

                        if (array_key_exists('qty', $fields)) {
                            $row->qty_base = $fields['qty'];
                        }

                        $row->save();

                        $calc->recalculateAndRetime($lotId, $scheduledDate, $existing->machine_id);
                    }

                    $entries[] = LoadingPlanEntry::find($id);
                    continue;
                }

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
                        ...$entryFields,
                    ]);

                    if (array_key_exists('qty', $fields) || array_key_exists('part_name', $fields)) {
                        $row = LotQuantity::firstOrNew(['lot_id' => $lotId, 'scheduled_date' => $scheduledDate]);

                        if (array_key_exists('qty', $fields)) {
                            // brand-new row here — this is an origin value, not a correction
                            $row->qty_base = $fields['qty'];
                        }

                        $row->save();

                        // $calc->recalculateAndRetime($lotId, $scheduledDate, $affected->machine_id);
                    }
                } catch (\Illuminate\Database\QueryException $e) {
                    $existing = LoadingPlanEntry::where('lot_id', $lotId)
                        ->where('scheduled_date', $scheduledDate)
                        ->first();

                    if (!$existing) {
                        throw $e;
                    }

                    $this->assertNotFinalized($existing);

                    $existing->update([...$entryFields, 'lock_version' => DB::raw('lock_version + 1')]);

                    if (array_key_exists('qty', $fields) || array_key_exists('part_name', $fields)) {
                        $row = LotQuantity::firstOrNew(['lot_id' => $lotId, 'scheduled_date' => $scheduledDate]);

                        // this landed in the catch because a row already existed (race)
                        // so this is a correction, not an origin — same rule as editLotField
                        if (array_key_exists('qty', $fields)) {
                            $row->qty_base = $fields['qty'];
                        }

                        $row->save();

                        $calc->recalculateAndRetime($lotId, $scheduledDate, $existing->machine_id);
                    }

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

        return $this->machineIdByNum[$machineName] ?? null;
    }

    /** Batch version — returns just the ids, order not guaranteed to match input. */
    private function resolveMachineIds(array $machineNames): array
    {
        if (empty($machineNames)) {
            return [];
        }

        return QdnMachine::whereIn('machine_num', $machineNames)->pluck('id')->all();
    }

    /** Given a target sequence_order that may no longer be free, find the
     *  real before/after entry ids on this machine that currently straddle
     *  it — so a caller can re-insert as close as possible to where
     *  something used to sit, landing exactly on it if it's still free. */
    public function findNeighborsForTargetPosition(string $machine, string $date, float $targetOrder): array
    {
        $machineId = $this->resolveMachineId($machine);

        $rows = LoadingPlanEntry::where('machine_id', $machineId)
            ->where('scheduled_date', $date)
            ->orderBy('sequence_order')
            ->get();

        if ($rows->isEmpty()) {
            return [null, null];
        }

        // Exact spot still free — no neighbors needed, resolveSequenceOrder's
        // before/after=null,null + a max() check would push to the end instead,
        // so instead we bracket it directly: find the row immediately before
        // and after the target value.
        $before = $rows->filter(fn($r) => $r->sequence_order <= $targetOrder)->last();
        $after = $rows->filter(fn($r) => $r->sequence_order > $targetOrder)->first();

        return [$before?->id, $after?->id];
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

        // var_dump("LOG ~ LoadingPlanEntryService.php:857 ~ LoadingPlanEntryService ~ rebalance :", $rows);
        \Illuminate\Support\Facades\Log::debug(json_encode($rows, JSON_PRETTY_PRINT));

        if ($rows->isEmpty()) {
            return $rows;
        }

        // Single UPDATE with CASE avoids any intermediate per-row collision
        // window entirely — the whole set changes atomically in one statement.
        $cases = [];
        $bindings = [];
        $ids = [];

        foreach ($rows as $i => $row) {
            $cases[] = "WHEN id = ? THEN ?";
            $bindings[] = $row->id;
            $bindings[] = ($i + 1) * self::GAP_SEED;
            $ids[] = $row->id;
        }

        $placeholders = implode(',', array_fill(0, count($ids), '?'));

        DB::statement(
            "UPDATE loading_plan_entries
         SET sequence_order = CASE " . implode(' ', $cases) . " END
         WHERE id IN ($placeholders)",
            [...$bindings, ...$ids]
        );

        return LoadingPlanEntry::whereIn('id', $ids)->get();
    }

    private function applyBulkReorder(array $op, string $date)
    {
        $machine = $op['machine'];
        $machineId = $this->resolveMachineId($machine);
        $placements = $op['placements'];

        $entries = LoadingPlanEntry::whereIn('id', collect($placements)->pluck('entry_id'))->get();
        $dates = $entries->pluck('scheduled_date')->map(fn($d) => $d->toDateString())->unique();

        if ($dates->count() > 1) {
            throw new \InvalidArgumentException("Reordering lots got planned in different dates is not allowed — got: " . $dates->implode(', '));
        }

        // var_dump("LOG ~ LoadingPlanEntryService.php:892 ~ LoadingPlanEntryService ~ applyBulkReorder ~:", $placements);

        $rows = $this->rebalance($machineId, $date);

        var_dump("LOG ~ LoadingPlanEntryService.php:896 ~ LoadingPlanEntryService ~ applyBulkReorder ~ $rows:", $rows);

        // $rows already contains every lot/block entry on this machine for this
        // date (rebalance() pulled the full locked set) — match against it
        // directly instead of firing another query.
        $resolvedPlacements = collect($placements)->map(function ($p) use ($rows) {
            $entry = $rows->firstWhere('id', $p['entry_id']);

            if (!$entry) {
                throw new \RuntimeException("Bulk reorder: could not resolve entry for placement: " . json_encode($p));
            }

            $this->assertNotFinalized($entry);

            return [
                'id'              => $entry->id,
                'entry_type'      => $p['entry_type'],
                'lot_id'          => $p['entry_type'] === 'lot' ? $entry->lot_id : null,
                'scheduled_date'  => $entry->scheduled_date->toDateString(),
                'before_entry_id' => $p['before_entry_id'] ?? null,
                'after_entry_id'  => $p['after_entry_id'] ?? null,
            ];
        })->all();

        $positions = $this->computeBulkPositions($rows, $resolvedPlacements, $machine, $date);

        $this->applyPositionsInBulk($positions, $machineId, $date);

        $lotIds = collect($resolvedPlacements)
            ->where('entry_type', 'lot')
            ->pluck('lot_id')
            ->filter()
            ->unique()
            ->values()
            ->all();

        $calc = app(LotScheduleCalculator::class, ['dates' => [$date], 'lotIds' => $lotIds]);

        // Timing cascade: no date cutoff here — recomputeTimeStartAndEnd
        // already walks forward via findNextInSequence across scheduled_date
        // boundaries by design, and that's correct — a changed duration on a
        // leaked lot genuinely does shift tomorrow's real start times.
        foreach ($resolvedPlacements as $p) {
            if ($p['entry_type'] === 'lot') {
                $calc->recalculateAndRetime($p['lot_id'], $p['scheduled_date'], $machineId);
            }
        }

        return LoadingPlanEntry::whereIn('id', array_column($positions, 'id'))
            ->get();
    }

    private function computeBulkPositions(Collection $rows, array $placements, string $machine, string $date): array
    {
        $positions = [];

        foreach ($placements as $p) {
            $before = $p['before_entry_id'] ? $rows->firstWhere('id', $p['before_entry_id'])?->sequence_order : null;
            $after  = $p['after_entry_id'] ? $rows->firstWhere('id', $p['after_entry_id'])?->sequence_order : null;

            if ($before === null && $after === null) {
                $currentMax = $rows->max('sequence_order');
                if ($currentMax !== null) {
                    $before = $currentMax;
                }
            }

            if ($before !== null && $after !== null && $before > $after) {
                [$before, $after] = [$after, $before];
            }

            $order = match (true) {
                $before === null && $after === null => self::GAP_SEED,
                $before === null => $after - self::GAP_SEED,
                $after === null => $before + self::GAP_SEED,
                default => ($before + $after) / 2,
            };

            $positions[] = ['id' => $p['id'], 'sequence_order' => $order];
        }

        return $positions;
    }

    private function applyPositionsInBulk(array $positions, int $machineId, string $date): void
    {
        $cases = [];
        $bindings = [];

        foreach ($positions as $pos) {
            $cases[] = "WHEN id = ? THEN ?";
            $bindings[] = $pos['id'];
            $bindings[] = $pos['sequence_order'];
        }

        $ids = array_column($positions, 'id');
        $placeholders = implode(',', array_fill(0, count($ids), '?'));

        $sql = "UPDATE loading_plan_entries
            SET sequence_order = CASE " . implode(' ', $cases) . " END,
                machine_id = ?,
                lock_version = lock_version + 1
            WHERE scheduled_date = ? AND id IN ($placeholders)";

        // get all ids of positions (loading plan entries)
        // SET 

        DB::statement($sql, [...$bindings, $machineId, $date, ...$ids]);
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

            // Group 'move' ops by target machine to detect which machines
            // qualify for bulk treatment (more than one move batched together).
            $moveOpsByMachine = collect($operations)
                ->filter(fn($op) => $op['type'] === 'move')
                ->groupBy('machine');

            $bulkMachines = $moveOpsByMachine
                ->filter(fn($ops) => $ops->count() > 1)
                ->keys()
                ->all();

            // Track which operation indexes get resolved via the bulk path,
            // so the main loop below can skip re-processing them individually.
            $bulkHandledIndexes = [];
            $bulkResultsByIndex = [];

            foreach ($bulkMachines as $machine) {
                // Any create_block ops targeting this machine must run first —
                // moves in this batch may reference the new block's id as an
                // anchor, so it needs to exist before rebalance() snapshots
                // the machine for bulk reorder.
                foreach ($operations as $idx => $op) {
                    if ($op['type'] === 'create_block' && $op['machine'] === $machine) {
                        $bulkResultsByIndex[$idx] = $this->addBlock(
                            $op['machine'],
                            $date,
                            $op['label'],
                            $op['duration'],
                            $op['before_entry_id'] ?? null,
                            $op['after_entry_id'] ?? null,
                        );
                        $bulkHandledIndexes[] = $idx;
                    }
                }

                $placements = $moveOpsByMachine[$machine]->map(fn($op) => [
                    'entry_type'      => $op['entry_type'],
                    'lot_id'          => $op['lot_id'] ?? null,
                    'entry_id'        => $op['entry_id'] ?? null,
                    'before_entry_id' => $op['before_entry_id'] ?? null,
                    'after_entry_id'  => $op['after_entry_id'] ?? null,
                ])->values()->all();

                $entries = $this->applyBulkReorder(['machine' => $machine, 'placements' => $placements], $date);
                $entriesById = $entries->keyBy('id');

                foreach ($operations as $idx => $op) {
                    if ($op['type'] !== 'move' || $op['machine'] !== $machine) {
                        continue;
                    }

                    $entryId = $op['entry_id'];

                    $bulkResultsByIndex[$idx] = $entriesById[$entryId] ?? null;
                    $bulkHandledIndexes[] = $idx;
                }
            }

            $results = [];

            foreach ($operations as $idx => $op) {
                if (in_array($idx, $bulkHandledIndexes, true)) {
                    $results[] = $bulkResultsByIndex[$idx];
                    continue;
                }

                $results[] = match ($op['type']) {
                    'move' => $this->applyMove($op, $date),
                    'transfer' => $this->applyTransfer($op, $date),
                    'create_lot' => $this->applyCreateLot($op, $date),
                    'unrevert_split' => $this->applyUnrevertSplit($op),
                    'create_block' => $this->addBlock(
                        $op['machine'],
                        $date,
                        $op['label'],
                        $op['duration'],
                        $op['before_entry_id'] ?? null,
                        $op['after_entry_id'] ?? null,
                    ),
                    'delete' => $this->applyDelete($op),
                    'update_field' => $this->applyUpdateField($op, $date),
                    'split' => $this->applySplit($op, $date),
                    'revert_split' => $this->applyRevertSplit($op),
                    'merge' => $this->applyMerge($op, $date),
                    'revert_merge' => $this->applyRevertMerge($op),
                    default => throw new \InvalidArgumentException("Unknown batch operation type: {$op['type']}"),
                };
            }

            return $results;
        });
    }

    private function applyMerge(array $op, string $date)
    {
        $mergeService = app(\App\Services\LotMergeService::class);

        $result = $mergeService->merge(
            $op['lot_id_a'],
            $op['lot_id_b'],
            $date,
            $op['created_by'] ?? null,
        );

        return [
            'merge_id'      => $result['merge']->id,
            'target'        => $result['target'],
            'source'        => $result['source'],
        ];
    }

    private function applyRevertMerge(array $op)
    {
        $mergeService = app(\App\Services\LotMergeService::class);

        $result = $mergeService->revert($op['merge_id'], $op['reverted_by'] ?? null);

        return [
            'merge_id' => $op['merge_id'],
            'target'   => $result['target'],
            'source'   => $result['source'],
        ];
    }

    private function applySplit(array $op, string $date)
    {
        $splitService = app(\App\Services\LotSplitService::class);

        $result = $splitService->split(
            $op['parent_lot_id'],
            $date,
            $op['child_qty'],
            $op['target_machine'],
            $op['before_entry_id'] ?? null,
            $op['after_entry_id'] ?? null,
            $op['child_lot_id'] ?? null,
            $op['created_by'] ?? null,
        );

        return [
            'split_id' => $result['split']->id,
            'parent'   => $result['parent'],
            'child'    => $result['child'],
        ];
    }

    private function applyRevertSplit(array $op)
    {
        $splitService = app(\App\Services\LotSplitService::class);
        $result = $splitService->revert($op['split_id'], $op['reverted_by'] ?? null);

        return [
            'deleted'            => $result['deleted'],
            'parent'             => $result['parent'],
            'parentQty'          => $result['parentQty'],
            'parentDoable'       => $result['parentDoable'],
            'parentDoableStatus' => $result['parentDoableStatus'],
            'parentCapacityUph'  => $result['parentCapacityUph'],
            'parentSplitInfo'    => $result['parentSplitInfo'],
        ];
    }

    private function applyUnrevertSplit(array $op)
    {
        $splitService = app(\App\Services\LotSplitService::class);
        $result = $splitService->unrevert($op['split_id'], $op['unreverted_by'] ?? null);

        return [
            // primary "entry for this row" — matches the flat id/lock_version/
            // sequence_order contract every other operation follows
            'id'                 => $result['child']->id,
            'lock_version'       => $result['child']->lock_version,
            'sequence_order'     => $result['child']->sequence_order,
            'splitInfo'          => $result['childSplitInfo'],
            'doable'             => $result['childDoable'],
            'doableStatus'       => $result['childDoableStatus'],
            'capacityUph'        => $result['childCapacityUph'],

            // parent side effect, carried alongside
            'parent'             => $result['parent'],
            'parentQty'          => $result['parentQty'],
            'parentDoable'       => $result['parentDoable'],
            'parentDoableStatus' => $result['parentDoableStatus'],
            'parentCapacityUph'  => $result['parentCapacityUph'],
            'parentSplitInfo'    => $result['parentSplitInfo'],
        ];
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

    private function applyDelete(array $op)
    {
        $entry = LoadingPlanEntry::with('machineModel')->findOrFail($op['entry_id']);
        $this->deleteEntry($op['entry_id'], $entry->getMachineName(), forceDelete: true);
        return ['deleted' => $op['entry_id']];
    }

    private function applyUpdateField(array $op, string $date)
    {
        return $op['entry_type'] === 'block'
            ? $this->editField($op['entry_id'], $op['fields'], $op['lock_version'] ?? null)
            : $this->editLotField($op['lot_id'], $date, $op['fields'], $op['lock_version'] ?? null);
    }

    /**
     * Attaches qty/doable/capacity + inherited WIP display fields (Lead_Count,
     * Body_Size, CR3, etc.) onto a lot entry for API response purposes.
     * Split children have no WIP row of their own, so these are pulled from
     * the root lot's CustomerDataWip row rather than stored/duplicated.
     *
     * Mutates $entry in place and returns the LotQuantity row it looked up,
     * so callers can reuse it if they need anything else off it.
     */
    public function enrichEntryForResponse(LoadingPlanEntry $entry, string $rootLotId): ?LotQuantity
    {
        $entryDate = $entry->scheduled_date->toDateString();

        $quantity = LotQuantity::where('lot_id', $entry->lot_id)
            ->where('scheduled_date', $entryDate)
            ->first();

        $entry->setAttribute('qty', $quantity?->effectiveQty());
        $entry->setAttribute('doable', $quantity?->commit);
        $entry->setAttribute('doableStatus', $quantity?->recipe_status);
        $entry->setAttribute('doableRecipeSource', ($quantity && $quantity->recipe_source_id) ? [
            'devicename'  => $quantity->part_name,
            'recipe'      => $quantity->recipe_used,
            'packageType' => DB::table('qdn_db.package_list')
                ->where('id', $quantity->recipe_source_id)
                ->value('package_type'),
        ] : null);
        $entry->setAttribute('capacityUph', $quantity?->capacity_uph_snapshot);

        $rootWip = CustomerDataWip::query()
            ->where('Lot_Id', $rootLotId)
            ->orderByDesc('import_date')
            ->first();

        $ct = LoadingPlanFormulas::computeCT($rootWip->Date_Loaded, $rootWip->BE_Starttime);
        $osl = LoadingPlanFormulas::computeOSL($ct, $rootWip->Backend_Leadtime);

        if ($rootWip) {
            $entry->setAttribute('Lead_Count', $rootWip->Lead_Count);
            $entry->setAttribute('Station', $rootWip->Station);
            $entry->setAttribute('Lot_Type', $rootWip->Lot_Type);
            $entry->setAttribute('Prod_Area', $rootWip->Prod_Area);
            $entry->setAttribute('Lot_Status', $rootWip->Lot_Status);
            $entry->setAttribute('Focus_Group', $rootWip->Focus_Group);
            $entry->setAttribute('CT', $ct);
            $entry->setAttribute('OSL', $osl);
            $entry->setAttribute('Stage', $rootWip->Stage);
            $entry->setAttribute('Lot_Entry_Time_Days', $rootWip->Lot_Entry_Time_Days);
            $entry->setAttribute('CR3', $rootWip->CR3);
            $entry->setAttribute('BE_OSL_Days', $rootWip->BE_OSL_Days);
            $entry->setAttribute('Body_Size', $rootWip->Body_Size);
            $entry->setAttribute('Ramp_Time', $rootWip->Ramp_Time);
            $entry->setAttribute('Backend_Leadtime', $rootWip->Backend_Leadtime);
        }

        return $quantity;
    }

    /**
     * Fetch today's plan entries for the selected location.
     *
     * @param string $date
     * @param array<int, string> $allowedPackages
     * @return Collection<int, LoadingPlanEntry>
     */
    public static function getToday(string $date, array $allowedPackages): Collection
    {
        if (empty($allowedPackages)) {
            return collect();
        }

        return LoadingPlanEntry::with(['machineModel', 'lotQuantity.packageListEntry'])
            ->where('scheduled_date', $date)
            ->where(function ($query) use ($allowedPackages) {
                $query->whereIn('package_name', $allowedPackages)
                    ->orWhere('entry_type', 'block'); // Ensure block rows are fetched
            })
            ->get();
    }

    /**
     * Fetch entries from the previous scheduled date that spilled past midnight (> 1440 mins).
     *
     * @param string $previousDate
     * @param array<int, string> $allowedPackages
     * @return Collection<int, LoadingPlanEntry>
     */
    public static function getTodayLeaked(string $previousDate, array $allowedPackages): Collection
    {
        if (empty($allowedPackages)) {
            return collect();
        }

        $leakedCalc = DB::table('loading_plan_entries')
            ->select('id')
            ->selectRaw('SUM(accu_time) OVER (PARTITION BY machine_id ORDER BY sequence_order) AS running_total')
            ->where('scheduled_date', $previousDate)
            ->where(function ($query) use ($allowedPackages) {
                $query->whereIn('package_name', $allowedPackages)
                    ->orWhere('entry_type', 'block'); // Ensure block rows are fetched
            })
            ->whereNotNull('machine_id');

        $leakedIds = DB::query()
            ->fromSub($leakedCalc, 'leaked_calc')
            ->where('running_total', '>', 1440)
            ->pluck('id');

        if ($leakedIds->isEmpty()) {
            return collect();
        }

        return LoadingPlanEntry::with(['machineModel', 'lotQuantity.packageListEntry'])
            ->whereIn('id', $leakedIds)
            ->get();
    }
}
