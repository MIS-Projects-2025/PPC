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
use App\Traits\ValidatesLoadingPlanEntries;
use Exception;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LoadingPlanEntryService
{
    use ValidatesLoadingPlanEntries;

    private const GAP_SEED = 1000.0;
    private const MIN_GAP = 0.001;

    /** @var array<string,int> machine_num => id */
    private array $machineIdByNum;

    public function __construct(int|string|null $machine = null)
    {
        $this->machineIdByNum = QdnMachine::query()
            ->when($machine, function ($query, $machine) {
                $query->where(function ($q) use ($machine) {
                    $q->where('id', $machine)
                        ->orWhere('machine_num', $machine);
                });
            })
            ->pluck('id', 'machine_num')
            ->all();
    }

    public function resolveEntry(int $entryId): LoadingPlanEntry
    {
        return LoadingPlanEntry::with(['machineModel', 'lotQuantity'])
            ->whereKey($entryId)
            ->firstOrFail();
    }

    public function moveEntry(string $entryType, ?int $entryId, ?int $beforeEntryId, ?int $afterEntryId, string $machine)
    {
        return DB::transaction(function () use ($entryType, $entryId, $beforeEntryId, $afterEntryId, $machine) {
            $entry = $this->resolveEntry($entryId);
            $this->assertNotFinalized($entry);

            $anchorEntries = collect([$entry]);

            if ($beforeEntryId) {
                $before = LoadingPlanEntry::find($beforeEntryId);
                if ($before) $anchorEntries->push($before);
            }

            if ($afterEntryId) {
                $after = LoadingPlanEntry::find($afterEntryId);
                if ($after) $anchorEntries->push($after);
            }

            $resolvedDate = $this->assertConsistentDates($anchorEntries);

            $machineId = $this->resolveMachineId($machine);

            $rows = $this->lockMachineRows([$machineId], $resolvedDate);
            $newOrder = $this->resolveSequenceOrder($rows, $beforeEntryId, $afterEntryId, $machine, $resolvedDate);

            $entry->update(['sequence_order' => $newOrder, 'lock_version' => DB::raw('lock_version + 1')]);

            $allEntriesOnMachine = LoadingPlanEntry::where('machine_id', $machineId)
                ->orderBy('sequence_order')
                ->where('scheduled_date', $resolvedDate)
                ->get();

            Log::info('Machine entry export', ['test' => $allEntriesOnMachine->toArray()]);

            if ($entryType === 'lot') {
                (new LotScheduleCalculator([$resolvedDate], [$entry->lot_id]))
                    ->loadPackageList()
                    ->recalculateAndRetime($entryId, $machineId);
            }

            $wip = CustomerDataWip::query()
                ->where('Lot_Id', $entry->lot_id)
                ->where('import_date', $entry->scheduled_date)
                ->firstOrFail();

            $freshEntry = $entry->fresh(['machineModel', 'lotQuantity']);

            return (new LoadingPlanService($resolvedDate))->createPlannedLot(
                $wip,
                $freshEntry,
                $freshEntry->lotQuantity // Fresh relation
            );
        });
    }

    public function transferEntry(string $entryType, ?int $entryId, string $targetMachine, ?int $beforeEntryId, ?int $afterEntryId): array
    {
        return DB::transaction(function () use ($entryType, $entryId, $targetMachine, $beforeEntryId, $afterEntryId) {
            $entry = $this->resolveEntry($entryId);
            $this->assertNotFinalized($entry);

            $anchorEntries = collect([$entry]);
            if ($beforeEntryId) {
                $before = LoadingPlanEntry::find($beforeEntryId);
                if ($before) $anchorEntries->push($before);
            }
            if ($afterEntryId) {
                $after = LoadingPlanEntry::find($afterEntryId);
                if ($after) $anchorEntries->push($after);
            }

            $resolvedDate = $this->assertConsistentDates($anchorEntries);

            $sourceMachineId = $entry->machine_id;
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
                (new LotScheduleCalculator([$resolvedDate], [$entry->lot_id]))
                    ->loadPackageList()
                    ->recalculateAndRetime($entryId, $targetMachineId);

                if ($sourceMachineId && $sourceMachineId !== $targetMachineId) {
                    $sourceRestart = $this->findFirstRemainingRow($sourceMachineId, $resolvedDate);
                    if ($sourceRestart) {
                        app(LotScheduleCalculator::class)->recomputeTimeStartAndEnd($sourceRestart, $sourceMachineId);
                    }
                }
            }

            // Fetch WIP data to pass into planned lot creation
            $wip = CustomerDataWip::query()
                ->where('Lot_Id', $entry->lot_id)
                ->where('import_date', $entry->scheduled_date)
                ->firstOrFail();

            // Refresh entry and reload required relationships
            $freshEntry = $entry->fresh(['machineModel', 'lotQuantity']);

            return (new LoadingPlanService($resolvedDate))->createPlannedLot(
                $wip,
                $freshEntry,
                $freshEntry->lotQuantity
            );
        });
    }

    /**
     * The first row remaining on $machineId for $scheduledDate, in sequence
     * order — used after a lot is removed from this machine (e.g. via
     * transferEntry) to find where to restart the timing walk. Returns null
     * if the machine now has no rows left for this date at all.
     */
    public static function findFirstRemainingRow(int $machineId, string $date): ?LoadingPlanEntry
    {
        return LoadingPlanEntry::where('machine_id', $machineId)
            ->where('scheduled_date', $date)
            ->orderBy('sequence_order')
            ->first();
    }

    public function addBlock(int|string $machine, string $date, string $label, int $durationMinutes, ?int $beforeEntryId, ?int $afterEntryId): array
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

            return (new LoadingPlanService($date))->createPlannedLot(
                null,
                $entry->fresh(),
                $entry->lotQuantity
            );
        });
    }

    public function deleteEntry(int $id, ?string $machine, bool $forceDelete = false): void
    {
        DB::transaction(function () use ($id, $machine, $forceDelete) {
            $machineId = $machine ? $this->resolveMachineId($machine) : null;
            $entry = LoadingPlanEntry::whereKey($id)->firstOrFail();

            if (!$entry) {
                throw new Exception("Lot not found");
            }

            $date = $entry->scheduled_date;

            if ($machineId) {
                $this->lockMachineRows([$machineId], $date);
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

    public function bulkTransfer(array $lotIds, array $blockEntryIds, ?string $targetMachine, string $date): Collection
    {
        return DB::transaction(function () use ($lotIds, $blockEntryIds, $targetMachine, $date) {
            $targetMachineId = $this->resolveMachineId($targetMachine);

            $lotEntries = LoadingPlanEntry::with('machineModel')->whereIn('lot_id', $lotIds)
                ->where('scheduled_date', $date)
                ->where('entry_type', 'lot')
                ->get();

            $blockEntries = empty($blockEntryIds)
                ? collect()
                : LoadingPlanEntry::whereKey($blockEntryIds)
                ->where('entry_type', 'block')
                ->get();

            $plannedLotIds = $lotEntries->pluck('lot_id')->all();
            $unplannedLotIds = array_values(array_diff($lotIds, $plannedLotIds));

            $allEntries = $lotEntries->concat($blockEntries);

            if ($allEntries->isNotEmpty()) {
                $this->assertConsistentDates($allEntries);
            }

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

            $updatedEntries = collect();

            $calculator = new LotScheduleCalculator([$date], $allEntries->pluck('lot_id')->all());
            $calculator->loadPackageList();

            foreach ($movers as $entry) {
                $this->assertNotFinalized($entry);

                $entry->update([
                    'machine_id'     => $targetMachineId,
                    'sequence_order' => $nextSeq,
                    'lock_version'   => DB::raw('lock_version + 1'),
                ]);

                if ($entry->entry_type === 'lot') {
                    $calculator->recalculateAndRetime($entry->getKey(), $targetMachineId);
                }

                $updatedEntries->push($entry->fresh('machineModel'));
                $nextSeq += self::GAP_SEED;
            }

            $wip = CustomerDataWip::query()
                ->select('Lot_Id', 'Package_Name', 'import_date', 'Qty', 'Part_Name')
                ->whereIn('Lot_Id', $unplannedLotIds)
                ->orderBy('Lot_Id')
                ->orderByDesc('import_date')
                ->get()
                ->unique('Lot_Id')
                ->keyBy('Lot_Id');

            foreach ($unplannedLotIds as $lotId) {
                $wipItem = $wip->get($lotId);
                // DD($wipItem);
                $entry = LoadingPlanEntry::create([
                    'entry_type'     => 'lot',
                    'lot_id'         => $lotId,
                    'scheduled_date' => $date,
                    'machine_id'     => $targetMachineId,
                    'package_name'   => $wipItem?->Package_Name ?? null,
                    'sequence_order' => $nextSeq,
                    'lock_version'   => 1,
                ]);

                $lot = LotQuantity::firstOrNew([
                    'lot_id'         => $lotId,
                    'scheduled_date' => $date,
                ]);

                $lot->part_name = $wipItem?->Part_Name ?? '';
                $lot->qty_base  = $wipItem?->Qty ?? 0;

                if ($lot->isDirty()) {
                    $lot->save();
                }

                $calculator->recalculateAndRetime($entry->getKey(), $targetMachineId);

                $updatedEntries->push($entry->fresh('machineModel'));
                $nextSeq += self::GAP_SEED;
            }

            // 1. Eager load relationships needed by createPlannedLot()
            $entryIds = $updatedEntries->pluck('id');
            $freshEntries = LoadingPlanEntry::with(['machineModel', 'lotQuantity.packageListEntry'])
                ->whereKey($entryIds)
                ->get()
                ->keyBy('id');

            // 2. Fetch WIP records for all entries that have a lot_id
            $allLotIds = $freshEntries->pluck('lot_id')->filter()->unique();

            $wipMap = CustomerDataWip::query()
                ->whereIn('Lot_Id', $allLotIds)
                ->orderBy('Lot_Id')
                ->orderByDesc('import_date')
                ->get()
                ->unique('Lot_Id')
                ->keyBy('Lot_Id');

            $loadingPlanService = new LoadingPlanService($date, "I Do not need location");

            // 3. Map into createPlannedLot() structure
            $updated = $updatedEntries->map(function ($rawEntry) use ($loadingPlanService, $freshEntries, $wipMap) {
                /** @var LoadingPlanEntry $entry */
                $entry = $freshEntries->get($rawEntry->id);
                $wipRow = $entry->lot_id ? $wipMap->get($entry->lot_id) : null;

                return $loadingPlanService->createPlannedLot(
                    wipRow: $wipRow,
                    entry: $entry,
                    quantity: $entry->lotQuantity
                );
            })->values();

            return $updated;
        });
    }

    /**
     * Same as bulkTransfer(), but each lot can go to a different machine.
     * $assignments: array<int, array{lot_id: string, machine: string}>
     */
    public function bulkTransferMulti(array $assignments, string $date): Collection
    {
        return DB::transaction(function () use ($assignments, $date) {
            $this->assertDateNotFinalized($date);

            // lot_id => resolved target machine_id
            $targetByLotId = collect($assignments)
                ->mapWithKeys(fn($a) => [$a['lot_id'] => $this->resolveMachineId($a['machine'])]);

            $lotIds = collect($assignments)->pluck('lot_id')->unique()->all();

            $lotEntries = LoadingPlanEntry::with(['machineModel', 'lotQuantity'])
                ->whereIn('lot_id', $lotIds)
                ->where('scheduled_date', $date)
                ->where('entry_type', 'lot')
                ->get();

            $plannedLotIds = $lotEntries->pluck('lot_id')->all();
            $unplannedLotIds = array_values(array_diff($lotIds, $plannedLotIds));

            $allEntries = $lotEntries;

            $wip = CustomerDataWip::query()->forDate($date)->whereIn('Lot_Id', $lotIds)->get()->keyBy('Lot_Id');

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
            $loadingPlanService = new LoadingPlanService($date);
            $loadingPlanService->initSplitsAndMerges();

            $calculator = new LotScheduleCalculator([$date], $lotIds);
            $calculator->loadPackageList();

            \Log::info('calculator', ['mb_start_for_loop' => memory_get_usage(true) / 1048576]);

            foreach ($movers as $i => $entry) {
                if ($i % 50 === 0) {
                    Log::info("bulkTransferMulti checkpoint", ['i' => $i, 'mb' => memory_get_usage(true) / 1048576]);
                }

                $this->assertNotFinalized($entry);

                $targetMachineId = $targetByLotId->get($entry->lot_id);
                $seq = $nextSeqByMachine->get($targetMachineId, self::GAP_SEED);

                $entry->update([
                    'machine_id'     => $targetMachineId,
                    'sequence_order' => $seq,
                    'lock_version'   => DB::raw('lock_version + 1'),
                ]);

                if ($entry->entry_type === 'lot') {
                    $calculator->recalculateAndRetime($entry->getKey(), $targetMachineId);
                }

                $refreshedEntry = $entry->fresh(['machineModel', 'lotQuantity']);
                $updated->push(
                    $loadingPlanService->createPlannedLot(
                        $wip->get($entry->lot_id),
                        $refreshedEntry,
                        $refreshedEntry->lotQuantity
                    )
                );

                $nextSeqByMachine[$targetMachineId] = $seq + self::GAP_SEED;
            }

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

                $refreshedEntry = $entry->fresh(['machineModel', 'lotQuantity']);
                $calculator->recalculateAndRetime($refreshedEntry, $targetMachineId);

                $updated->push(
                    $loadingPlanService->createPlannedLot(
                        $wip->get($entry->lot_id),
                        $refreshedEntry,
                        $refreshedEntry->lotQuantity
                    )
                );
                $nextSeqByMachine[$targetMachineId] = $seq + self::GAP_SEED;
            }

            return $updated;
        });
    }

    public function bulkDelete(array $ids): array
    {
        return DB::transaction(function () use ($ids) {
            $entries = LoadingPlanEntry::whereKey($ids)
                ->get();

            $date = $this->assertConsistentDates($entries);

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
                LoadingPlanEntry::whereKey($deleted)->delete();
            }

            $unassignedIds = $others->pluck('id')->all();
            if (!empty($unassignedIds)) {
                LoadingPlanEntry::whereKey($unassignedIds)->update([
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

    public function createManualLot(int|string|null $machine, string $date, array $fields, ?int $beforeEntryId, ?int $afterEntryId): array
    {
        return DB::transaction(function () use ($machine, $date, $fields, $beforeEntryId, $afterEntryId) {
            $this->assertDateNotFinalized($date);

            $lotId = $fields['lot_id'] ?? ('MANUAL-' . now()->format('YmdHis') . '-' . strtoupper(Str::random(4)));

            $machineId = null;
            $newOrder = null;

            if ($machine !== null) {
                $machineId = $this->resolveMachineId($machine);
                $rows = $this->lockMachineRows([$machineId], $date);
                $newOrder = $this->resolveSequenceOrder($rows, $beforeEntryId, $afterEntryId, $machine, $date);
            }

            $allowedEntryFields = ['package_name', 'lot_id']; // extend as needed — see editLotField discussion on allowlisting $fields
            $entryFields = collect($fields)->only($allowedEntryFields)->all();

            $entry = LoadingPlanEntry::create([
                'entry_type'     => 'lot',
                'lot_id'         => $lotId,
                'package_name'   => $fields['package_name'] ?? null,
                'scheduled_date' => $date,
                'machine_id'     => $machineId,
                'sequence_order' => $newOrder,
                'status'         => 'NONE',
                'lock_version'   => 1,
                ...$entryFields,
            ]);

            $lot = LotQuantity::firstOrNew([
                'lot_id'         => $lotId,
                'scheduled_date' => $date,
            ]);

            $lot->part_name = $fields['part_name'] ?? '';
            $lot->qty_base  = $fields['qty'] ?? 0;

            if ($lot->isDirty()) {
                $lot->save();
            }

            // unplaced lot when $machineId is null — recalculate() still runs
            // (sets commit/recipe_status off qty/recipe), recalculateAndRetime
            // skips the retime step safely per its own null-machine guard
            (new LotScheduleCalculator([$date], [$lotId]))
                ->loadPackageList()
                ->recalculateAndRetime($entry->getKey(), $machineId);

            $entry->refresh();

            return (new LoadingPlanService($date))->createPlannedLot(
                null,
                $entry,
                $entry->lotQuantity
            );
        });
    }

    // ------------------------------------------------------------------
    // Field-only edits — optimistic locking, no machine lock
    // ------------------------------------------------------------------

    public function editField(int $id, array $fields, int $expectedLockVersion): LoadingPlanEntry
    {

        // var_dump("LOG ~ LoadingPlanEntryService.php:528 ~ LoadingPlanEntryService ~ editField ~ expectedLockVersion:", $expectedLockVersion);

        // var_dump("LOG ~ LoadingPlanEntryService.php:528 ~ LoadingPlanEntryService ~ editField ~ fields:", $fields);

        // var_dump("LOG ~ LoadingPlanEntryService.php:528 ~ LoadingPlanEntryService ~ editField ~ id:", $id);
        // TODO: might be used to edit capacity UPH and others that might need recalculation
        $this->assertSupportedEditField($fields);

        $existing = LoadingPlanEntry::find($id);

        if (! $existing) {
            throw new Exception("Row not found");
        }

        $affected = LoadingPlanEntry::whereKey($id)
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

        // accu_time changes need to cascade — anything else this method allows
        // (remarks, tag, status, etc.) doesn't affect timing at all
        if (array_key_exists('accu_time', $fields) && $entry->machine_id !== null) {
            app(LotScheduleCalculator::class)->recomputeTimeStartAndEnd($entry, $entry->machine_id);
            $entry = $entry->fresh();
        }

        return $entry;
    }

    public function editLotField(int $entry_id, array $fields, ?int $expectedLockVersion): LoadingPlanEntry
    {
        $this->assertSupportedEditField($fields);

        $entryFields = collect($fields)->except(['qty', 'part_name'])->all();

        $existing = LoadingPlanEntry::whereKey($entry_id)
            ->where('lock_version', $expectedLockVersion)
            ->whereNull('finalized_at')
            ->firstOrFail();

        $this->assertNotFinalized($existing);

        $lotId = $existing->lot_id;
        $machineId = $existing->machine_id;
        $date = $existing->scheduled_date;

        $affected = LoadingPlanEntry::whereKey($existing->id)
            ->where('lock_version', $expectedLockVersion)
            ->whereNull('finalized_at')
            ->update([...$entryFields, 'lock_version' => DB::raw('lock_version + 1')]);

        if ($affected === 0) {
            throw new StaleWriteException(LoadingPlanEntry::find($existing->id));
        }

        $needsRecalculate = array_key_exists('qty', $fields) || array_key_exists('part_name', $fields);
        $needsRetimeOnly = !$needsRecalculate && array_key_exists('accu_time', $fields) && $machineId !== null;

        if ($needsRecalculate) {
            $lotQuantity = LotQuantity::firstOrNew(['lot_id' => $lotId, 'scheduled_date' => $date]);

            if (array_key_exists('qty', $fields)) {
                $lotQuantity->qty_base = $fields['qty'];
            }

            $lotQuantity->save();

            $entry = LoadingPlanEntry::findOrFail($existing->id);
            app(LotScheduleCalculator::class, ['dates' => [$date], 'lotIds' => [$lotId]])
                ->loadPackageList()
                ->recalculateAndRetime($entry, $machineId);
        } elseif ($needsRetimeOnly) {
            $entry = LoadingPlanEntry::findOrFail($existing->id);
            app(LotScheduleCalculator::class)->recomputeTimeStartAndEnd($entry, $machineId);
        }

        return LoadingPlanEntry::findOrFail($entry_id);
    }

    public function bulkEditField(array $updates): array
    {
        return DB::transaction(function () use ($updates) {
            $entries = [];
            $conflicts = [];

            $entryIds = collect($updates)->pluck('entry_id')->unique()->values()->all();

            $existingEntries = LoadingPlanEntry::whereIn('id', $entryIds)
                ->get()
                ->keyBy('id');

            $dates = $existingEntries->pluck('scheduled_date')
                ->map(fn($d) => $d->toDateString())
                ->unique();

            if ($dates->count() > 1) {
                throw new \InvalidArgumentException(
                    "Bulk edit cannot span multiple scheduled dates — got: " . $dates->implode(', ')
                );
            }

            $date = $dates->first();
            $lotIds = $existingEntries->pluck('lot_id')->filter()->unique()->values()->all();

            $calc = app(LotScheduleCalculator::class, ['dates' => [$date], 'lotIds' => $lotIds])->loadPackageList();

            foreach ($updates as $u) {
                $entryId = $u['entry_id'];
                $fields = $u['fields'];
                $entryFields = collect($fields)->except(['qty', 'part_name'])->all();

                $existing = $existingEntries->get($entryId);

                if (!$existing) {
                    throw new \RuntimeException("Entry [{$entryId}] not found.");
                }

                $this->assertNotFinalized($existing);

                $affected = LoadingPlanEntry::whereKey($entryId)
                    ->where('lock_version', $u['lock_version'] ?? null)
                    ->whereNull('finalized_at')
                    ->update([...$entryFields, 'lock_version' => DB::raw('lock_version + 1')]);

                if ($affected === 0) {
                    $conflicts[] = LoadingPlanEntry::find($entryId);
                    continue;
                }

                $needsRecalculate = array_key_exists('qty', $fields) || array_key_exists('part_name', $fields);
                $needsRetimeOnly = !$needsRecalculate && array_key_exists('accu_time', $fields) && $existing->machine_id !== null;

                if ($needsRecalculate) {
                    $lotQuantity = LotQuantity::firstOrNew(['lot_id' => $existing->lot_id, 'scheduled_date' => $date]);

                    if (array_key_exists('qty', $fields)) {
                        $lotQuantity->qty_base = $fields['qty'];
                    }

                    $lotQuantity->save();

                    $entry = LoadingPlanEntry::findOrFail($entryId);
                    $calc->recalculateAndRetime($entry, $existing->machine_id);
                } elseif ($needsRetimeOnly) {
                    $entry = LoadingPlanEntry::findOrFail($entryId);
                    $calc->recomputeTimeStartAndEnd($entry, $existing->machine_id);
                }

                $entries[] = LoadingPlanEntry::find($entryId);
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

    /** Resolve a machine name (from frontend/legacy callers) to its id in qdn_db. */
    private function resolveMachineId(int|string|null $machine): ?int
    {
        if ($machine === null || $machine === '') {
            return null;
        }

        if (is_int($machine)) {
            return $machine;
        }

        // Handles string values (e.g. numeric strings "12" or machine names)
        if (is_numeric($machine)) {
            return (int) $machine;
        }

        return $this->machineIdByNum[$machine] ?? null;
    }

    /** Batch version — returns just the ids, order not guaranteed to match input. */
    private function resolveMachineIds(array $machineNames): array
    {
        if (empty($machineNames)) {
            return [];
        }

        return collect($machineNames)
            ->map(fn($name) => $this->machineIdByNum[$name] ?? null)
            ->filter()
            ->unique()
            ->values()
            ->all();
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
        $machineIds = collect($machineIds)->filter()->unique()->sort()->values()->all();

        return LoadingPlanEntry::with('machineModel')
            ->whereIn('machine_id', $machineIds)
            ->where('scheduled_date', $date)
            ->orderBy('sequence_order')
            ->lockForUpdate()
            ->get();
    }

    private function resolveSequenceOrder(
        Collection $machineRows,
        ?int $beforeEntryId,
        ?int $afterEntryId,
        int|string $machine,
        string $date
    ): float {
        $sorted = $machineRows->sortBy('sequence_order')->values();

        [$before, $after] = $this->resolveNeighborOrders($sorted, $beforeEntryId, $afterEntryId);

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

    private function resolveNeighborOrders(Collection $sortedRows, ?int $beforeEntryId, ?int $afterEntryId): array
    {
        $before = $beforeEntryId ? $sortedRows->firstWhere('id', $beforeEntryId)?->sequence_order : null;
        $after  = $afterEntryId ? $sortedRows->firstWhere('id', $afterEntryId)?->sequence_order : null;

        if ($before !== null && $after === null) {
            $anchorIndex = $sortedRows->search(fn($row) => $row->id === $beforeEntryId);
            if ($anchorIndex !== false && $anchorIndex < $sortedRows->count() - 1) {
                $after = $sortedRows[$anchorIndex + 1]->sequence_order;
            }
        } elseif ($after !== null && $before === null) {
            $anchorIndex = $sortedRows->search(fn($row) => $row->id === $afterEntryId);
            if ($anchorIndex !== false && $anchorIndex > 0) {
                $before = $sortedRows[$anchorIndex - 1]->sequence_order;
            }
        }

        return [$before, $after];
    }

    private function computeSequenceOrder(?float $before, ?float $after, int|string $machine, string $date): float
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
            throw new SequenceExhaustedException((string) $machine, $date);
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

        if ($rows->isEmpty()) {
            return $rows;
        }

        $ids = $rows->pluck('id')->all();
        $this->stageTempSequenceOrders($ids);

        $cases = [];
        $bindings = [];
        foreach ($rows as $i => $row) {
            $cases[] = "WHEN id = ? THEN ?";
            $bindings[] = $row->id;
            $bindings[] = ($i + 1) * self::GAP_SEED;
        }

        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        DB::statement(
            "UPDATE loading_plan_entries
         SET sequence_order = CASE " . implode(' ', $cases) . " END
         WHERE id IN ($placeholders)",
            [...$bindings, ...$ids]
        );

        return LoadingPlanEntry::whereKey($ids)->get();
    }

    private function applyBulkReorder(array $op, string $date)
    {
        $machine = $op['machine'];
        $machineId = $this->resolveMachineId($machine);
        $placements = $op['placements'];
        // Log::info('placements', ['placements' => $placements]);
        $rows = $this->rebalance($machineId, $date);
        // Log::info("rows", ["rows" => $rows]);

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
                'entry_id'        => $entry->id,
                'entry_type'      => $p['entry_type'],
                'lot_id'          => $p['entry_type'] === 'lot' ? $entry->lot_id : null,
                'scheduled_date'  => $entry->scheduled_date->toDateString(),
                'before_entry_id' => $p['before_entry_id'] ?? null,
                'after_entry_id'  => $p['after_entry_id'] ?? null,
            ];
        })->all();

        $positions = $this->computeBulkPositions($rows, $resolvedPlacements);
        Log::info("resolvedPlacements", ["resolvedPlacements" => $resolvedPlacements]);
        Log::info("positions", ["positions" => $positions]);

        $this->applyPositionsInBulk($positions, $machineId, $date);

        $lotIds = collect($resolvedPlacements)
            ->where('entry_type', 'lot')
            ->pluck('lot_id')
            ->filter()
            ->unique()
            ->values()
            ->all();

        $calc = app(LotScheduleCalculator::class, ['dates' => [$date], 'lotIds' => $lotIds])->loadPackageList();
        // Timing cascade: no date cutoff here — recomputeTimeStartAndEnd
        // already walks forward via findNextInSequence across scheduled_date
        // boundaries by design, and that's correct — a changed duration on a
        // leaked lot genuinely does shift tomorrow's real start times.
        foreach ($resolvedPlacements as $p) {
            if ($p['entry_type'] === 'lot') {
                $calc->recalculateAndRetime($p['entry_id'], $machineId);
            }
        }

        return LoadingPlanEntry::whereKey(array_column($positions, 'id'))
            ->get();
    }

    private function computeBulkPositions(Collection $rows, array $placements): array
    {
        $movedIds = collect($placements)->pluck('entry_id')->all();

        $occupied = $rows->whereNotIn('id', $movedIds)
            ->pluck('sequence_order')
            ->map(fn($v) => (string) (float) $v)
            ->flip()
            ->all();

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

            $lo = $before ?? ($order - self::GAP_SEED);
            $hi = $after ?? ($order + self::GAP_SEED);
            while (isset($occupied[(string) (float) $order]) && abs($hi - $lo) > 0.0001) {
                $order = $order == $lo ? ($order + $hi) / 2 : ($lo + $order) / 2;
                $lo = min($lo, $order);
            }

            $occupied[(string) (float) $order] = true;

            $positions[] = ['entry_id' => $p['entry_id'], 'sequence_order' => $order];
        }

        return $positions;
    }

    /**
     * Shift the given rows to row-unique negative sequence_order values.
     * Guarantees no row can collide with another row in the same batch,
     * or with an untouched row, while real values are written afterward —
     * MySQL checks the unique constraint per-row-write, not deferred.
     */
    private function stageTempSequenceOrders(array $ids): void
    {
        $cases = [];
        $bindings = [];

        foreach ($ids as $id) {
            $cases[] = "WHEN id = ? THEN ?";
            $bindings[] = $id;
            $bindings[] = -$id;
        }

        $placeholders = implode(',', array_fill(0, count($ids), '?'));

        DB::statement(
            "UPDATE loading_plan_entries
         SET sequence_order = CASE " . implode(' ', $cases) . " END
         WHERE id IN ($placeholders)",
            [...$bindings, ...$ids]
        );
    }

    private function applyPositionsInBulk(array $positions, int $machineId, string $date): void
    {
        $ids = array_column($positions, 'entry_id');
        $this->stageTempSequenceOrders($ids);

        $cases = [];
        $bindings = [];
        foreach ($positions as $pos) {
            $cases[] = "WHEN id = ? THEN ?";
            $bindings[] = $pos['entry_id'];
            $bindings[] = $pos['sequence_order'];
        }

        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $sql = "UPDATE loading_plan_entries
        SET sequence_order = CASE " . implode(' ', $cases) . " END,
            machine_id = ?,
            lock_version = lock_version + 1
        WHERE scheduled_date = ? AND id IN ($placeholders)";

        DB::statement($sql, [...$bindings, $machineId, $date, ...$ids]);
    }

    public function syncRows(array $rows, array $order, array $deletedEntryIds, string $date): array
    {
        return DB::transaction(function () use ($rows, $order, $deletedEntryIds, $date) {
            $this->assertDateNotFinalized($date);

            $deletedEntries = empty($deletedEntryIds)
                ? collect()
                : LoadingPlanEntry::whereKey($deletedEntryIds)->get();

            $machineIds = $this->resolveMachineIds([
                ...collect($rows)->pluck('machine')->filter()->all(),
                ...$deletedEntries->pluck('machine_id')->filter()->all(),
            ]);
            if (!empty($machineIds)) {
                $this->lockMachineRows($machineIds, $date);
            }

            foreach ($deletedEntries as $entry) {
                $this->assertNotFinalized($entry);

                // Guard against the split-child landmine: a plain vanished-row
                // delete (e.g. an undone auto-gap block) is safe to hard-delete,
                // but a split child carries a qty invariant on its parent
                // (LotSplit::child_qty / recalculateParentQty) that only
                // LotSplitService::revert() knows how to unwind correctly.
                $isActiveSplitChild = \App\Models\LotSplit::active()
                    ->where('child_lot_id', $entry->lot_id)
                    ->where('scheduled_date', $entry->scheduled_date)
                    ->exists();

                if ($isActiveSplitChild) {
                    throw new \RuntimeException(
                        "Entry [{$entry->id}] is an active split child — revert the split instead of deleting the row directly."
                    );
                }

                $entry->delete();
            }

            $vacatedMachineIds = $deletedEntries->pluck('machine_id')->filter()->unique()->values()->all();
            foreach ($vacatedMachineIds as $machineId) {
                $restart = $this->findFirstRemainingRow($machineId, $date);
                if ($restart) {
                    app(LotScheduleCalculator::class)->recomputeTimeStartAndEnd($restart, $machineId);
                }
            }

            $dndToEntryId = [];
            $results = [];

            foreach ($rows as $row) {
                $entry = $row['entry_id'] === null
                    ? ($row['entry_type'] === 'block'
                        ? $this->createBlockRow($row, $date)
                        : $this->createLotRow($row, $date))
                    : $this->updateRow($row);

                $dndToEntryId[$row['dnd_id']] = $entry->id;
                $results[] = $entry;
            }

            foreach ($order as $machine => $ids) {
                $entryIds = collect($ids)->map(fn($id) => $dndToEntryId[$id] ?? $id)->all();
                $this->resequenceMachine($entryIds, $machine, $date);
            }

            return ['results' => $results];
        });
    }

    private function createLotRow(array $row, string $date)
    {
        $lotId = $row['lot_id'] ?? throw new \InvalidArgumentException('create row missing lot_id for entry_type lot');
        $fields = $row['fields'] ?? [];
        $machineId = $row['machine'] !== null ? $this->resolveMachineId($row['machine']) : null;

        // Mirrors bulkTransfer()'s unplannedLotIds branch — this is a WIP lot
        // being placed for the first time, not a synthetic manual lot, so pull
        // package/part/qty from CustomerDataWip the same way that path does.
        $wipItem = CustomerDataWip::query()
            ->where('Lot_Id', $lotId)
            ->where('import_date', $date)
            ->first();

        $entry = LoadingPlanEntry::create([
            'entry_type'     => 'lot',
            'lot_id'         => $lotId,
            'package_name'   => $wipItem?->Package_Name,
            'scheduled_date' => $date,
            'machine_id'     => $machineId,
            'sequence_order' => null, // phase 3 resequence sets the real value
            'status'         => $fields['status'] ?? 'NONE',
            'remarks'        => $fields['remarks'] ?? null,
            'tag'            => $fields['tag'] ?? null,
            'accu_time'      => $fields['accu_time'] ?? null,
            'lock_version'   => 1,
        ]);

        $lot = LotQuantity::firstOrNew(['lot_id' => $lotId, 'scheduled_date' => $date]);
        $lot->part_name = $wipItem?->Part_Name ?? $lot->part_name ?? '';
        $lot->qty_base  = $wipItem?->Qty ?? $lot->qty_base ?? 0;
        if ($lot->isDirty()) {
            $lot->save();
        }

        $freshEntry = $entry->fresh(['machineModel', 'lotQuantity']);

        return (new LoadingPlanService($date))->createPlannedLot(
            $wipItem,
            $entry,
            $freshEntry->lotQuantity
        );
    }

    private function createBlockRow(array $row, string $date)
    {
        $fields = $row['fields'] ?? [];
        $machineId = $row['machine'] !== null ? $this->resolveMachineId($row['machine']) : null;

        $entry = LoadingPlanEntry::create([
            'entry_type'     => 'block',
            'lot_id'         => null,
            'scheduled_date' => $date,
            'machine_id'     => $machineId,
            'sequence_order' => null,
            'block_label'    => $fields['block_label'] ?? 'Gap',
            'accu_time'      => $fields['accu_time'] ?? 0,
            'lock_version'   => 1,
        ]);

        return (new LoadingPlanService($date))->createPlannedLot(
            null,
            $entry,
            null
        );
    }

    private function updateRow(array $row)
    {
        $entryId = $row['entry_id'];
        $existing = LoadingPlanEntry::find($entryId);
        if (!$existing) {
            throw new \RuntimeException("Row [{$entryId}] not found.");
        }
        $this->assertNotFinalized($existing);

        $fields = $row['fields'] ?? [];
        $this->assertSupportedEditField($fields);

        $machineId = $row['machine'] !== null ? $this->resolveMachineId($row['machine']) : null;
        if ($machineId !== $existing->machine_id) {
            $fields['machine_id'] = $machineId;
        }

        $affected = LoadingPlanEntry::whereKey($entryId)
            ->where('lock_version', $row['lock_version'] ?? null)
            ->whereNull('finalized_at')
            ->update([...$fields, 'lock_version' => DB::raw('lock_version + 1')]);

        if ($affected === 0) {
            throw new StaleWriteException(LoadingPlanEntry::find($entryId));
        }

        $freshEntry = LoadingPlanEntry::findOrFail($entryId);

        $wipItem = CustomerDataWip::query()
            ->where('Lot_Id', $freshEntry->lot_id)
            ->where('import_date', $freshEntry->scheduled_date)
            ->first();

        return (new LoadingPlanService($freshEntry->scheduled_date))->createPlannedLot(
            $wipItem,
            $freshEntry,
            $freshEntry->lotQuantity
        );
    }

    /**
     * Full ordered list per machine → sequence_order is just index * GAP_SEED,
     * no before/after anchor resolution needed since every row on the machine
     * is present, not just the ones that moved.
     */
    private function resequenceMachine(array $entryIds, string $machine, string $date): void
    {
        if (empty($entryIds)) return;

        $machineId = $this->resolveMachineId($machine);

        $currentRows = LoadingPlanEntry::where('machine_id', $machineId)
            ->where('scheduled_date', $date)
            ->lockForUpdate()
            ->get();

        $currentIds = $currentRows->pluck('id')->all();
        $stray = array_diff($currentIds, $entryIds);

        if (!empty($stray)) {
            Log::warning('resequenceMachine: stray rows on machine not in entryIds', [
                'machine' => $machine,
                'date' => $date,
                'stray' => $stray,
            ]);
        }

        // Stage the full current set, not just $entryIds — guarantees zero
        // collision even if $entryIds is incomplete.
        $this->stageTempSequenceOrders($currentIds);

        $cases = [];
        $bindings = [];
        foreach ($entryIds as $i => $id) {
            $cases[] = "WHEN id = ? THEN ?";
            $bindings[] = $id;
            $bindings[] = ($i + 1) * self::GAP_SEED;
        }
        // Strays keep their place at the end rather than vanishing into limbo.
        $nextSeq = (count($entryIds) + 1) * self::GAP_SEED;
        foreach ($stray as $id) {
            $cases[] = "WHEN id = ? THEN ?";
            $bindings[] = $id;
            $bindings[] = $nextSeq;
            $nextSeq += self::GAP_SEED;
        }

        $allIds = [...$entryIds, ...$stray];
        $placeholders = implode(',', array_fill(0, count($allIds), '?'));

        DB::statement(
            "UPDATE loading_plan_entries
         SET sequence_order = CASE " . implode(' ', $cases) . " END,
             machine_id = ?,
             lock_version = lock_version + 1
         WHERE id IN ($placeholders)",
            [...$bindings, $machineId, ...$allIds]
        );

        $lotIds = LoadingPlanEntry::whereKey($allIds)
            ->where('entry_type', 'lot')
            ->pluck('lot_id')->filter()->unique()->values()->all();

        $calc = app(LotScheduleCalculator::class, ['dates' => [$date], 'lotIds' => $lotIds])->loadPackageList();
        foreach ($allIds as $id) {
            if (LoadingPlanEntry::find($id)?->entry_type === 'lot') {
                $calc->recalculateAndRetime($id, $machineId);
            }
        }

        $restart = $this->findFirstRemainingRow($machineId, $date);
        if ($restart) {
            DB::table('machine_day_starts')->updateOrInsert(
                ['machine_id' => $machineId, 'scheduled_date' => $date],
                ['day_start_time' => $restart->fresh()->time_start?->format('H:i:s'), 'updated_at' => now()]
            );
        }
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
                            $op['label'] ?? "Gap",
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
                    // TODO: does the order here matter?
                    'create_block' => $this->addBlock(
                        $op['machine'],
                        $date,
                        $op['label'],
                        $op['duration'],
                        $op['before_entry_id'] ?? null,
                        $op['after_entry_id'] ?? null,
                    ),
                    'create_lot' => $this->applyCreateLot($op, $date),

                    'update_field' => $this->applyUpdateField($op),

                    'revert_split' => $this->applyRevertSplit($op),
                    'split' => $this->applySplit($op),

                    'merge' => $this->applyMerge($op),
                    'revert_merge' => $this->applyRevertMerge($op),
                    'unrevert_split' => $this->applyUnrevertSplit($op),

                    'move' => $this->applyMove($op),
                    'transfer' => $this->applyTransfer($op),

                    'delete' => $this->applyDelete($op),
                    default => throw new \InvalidArgumentException("Unknown batch operation type: {$op['type']}"),
                };
            }

            return $results;
        });
    }

    private function applyMerge(array $op)
    {
        $mergeService = app(\App\Services\LotMergeService::class);

        $result = $mergeService->merge(
            $op['lot_id_a'],
            $op['lot_id_b'],
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

    private function applySplit(array $op)
    {
        $splitService = app(\App\Services\LotSplitService::class);

        $result = $splitService->split(
            $op['parent_lot_id'],
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

    private function applyMove(array $op)
    {
        return $this->moveEntry(
            $op['entry_type'],
            $op['entry_id'] ?? null,
            $op['before_entry_id'] ?? null,
            $op['after_entry_id'] ?? null,
            $op['machine'],
        );
    }

    private function applyTransfer(array $op)
    {
        return $this->transferEntry(
            $op['entry_type'],
            $op['entry_id'] ?? null,
            $op['target_machine'],
            $op['before_entry_id'] ?? null,
            $op['after_entry_id'] ?? null,
        );
    }

    private function applyCreateLot(array $op, string $date)
    {
        $entry = $this->createManualLot(
            $op['machine'] ?? null,
            $date,
            $op['fields'] ?? [],
            $op['before_entry_id'] ?? null,
            $op['after_entry_id'] ?? null,
        );

        return $entry;
    }

    private function applyDelete(array $op)
    {
        $entry = LoadingPlanEntry::with('machineModel')->findOrFail($op['entry_id']);
        $this->deleteEntry($op['entry_id'], $entry->getMachineName(), forceDelete: true);
        return ['deleted' => $op['entry_id']];
    }

    private function applyUpdateField(array $op)
    {
        return $op['entry_type'] === 'block'
            ? $this->editField($op['entry_id'], $op['fields'], $op['lock_version'] ?? null)
            : $this->editLotField($op['entry_id'], $op['fields'], $op['lock_version'] ?? null);
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

        logger()->debug('DB check', [
            'db' => DB::connection()->getDatabaseName(),
            'host' => DB::connection()->getConfig('host'),
            'port' => DB::connection()->getConfig('port'),
        ]);

        $leakedCalc = DB::table('loading_plan_entries')
            ->select('id')
            ->selectRaw('SUM(accu_time) OVER (PARTITION BY machine_id ORDER BY sequence_order) AS running_total')
            ->where('loading_plan_entries.scheduled_date', $previousDate)
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
            ->whereKey($leakedIds)
            ->get();
    }
}
