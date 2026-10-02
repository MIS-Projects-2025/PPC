<?php

namespace App\Services;

use App\Exceptions\SequenceExhaustedException;
use App\Exceptions\BulkStaleWriteException;
use App\Exceptions\StaleWriteException;
use App\Exceptions\LoadingPlanDateFinalizedException;
use App\Exceptions\ActiveMergeParticipantException;
use App\Exceptions\ActiveSplitChildException;
use App\Models\LoadingPlanEntry;
use App\Models\QdnMachine;
use App\Models\LotBucketItem;
use App\Models\LoadingPlanBucket;
use App\Models\LotQuantity;
use App\Models\LoadingPlanEntryHistory;
use App\Models\LotQuantityHistory;
use App\Models\CustomerDataWip;
use App\Traits\ValidatesLoadingPlanEntries;
use Exception;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

use function Illuminate\Log\log;

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

    private function retimeFromFirstRow(array $machineIds, string $date, LotScheduleCalculator $calc): void
    {
        foreach (array_unique(array_filter($machineIds)) as $machineId) {
            $restart = self::findFirstRemainingRow($machineId, $date);
            if ($restart) {
                $calc->recomputeTimeStartAndEnd($restart, $machineId);
            }
        }
    }

    public static function timingsFor(array $machineIds, string $date): array
    {
        $machineIds = array_values(array_filter(array_unique($machineIds)));
        if (!$machineIds) return [];

        $from = Carbon::parse($date)->subDay()->toDateString();
        $to   = Carbon::parse($date)->addDay()->toDateString();

        return LoadingPlanEntry::whereIn('machine_id', $machineIds)
            ->whereBetween('scheduled_date', [$from, $to])
            ->get(['id', 'scheduled_date', 'sequence_order', 'accu_time', 'time_start', 'time_end'])
            ->map(fn($e) => [
                'entry_id'       => $e->id,
                'scheduled_date' => $e->scheduled_date->toDateString(),
                'sequence_order' => $e->sequence_order,
                'accu_time'      => $e->accu_time,
                'time_start_at'  => $e->time_start?->format('Y-m-d H:i:s'),
                'time_end_at'    => $e->time_end?->format('Y-m-d H:i:s'),
            ])->all();
    }

    private function withTimings(array $payload, array $machineIds, string $date): array
    {
        return [...$payload, 'affected_timings' => self::timingsFor($machineIds, $date)];
    }

    public function bulkMove(array $items, string $targetMachine, ?int $beforeEntryId, ?int $afterEntryId, string $requestDate): array
    {
        return DB::transaction(function () use ($items, $targetMachine, $beforeEntryId, $afterEntryId, $requestDate) {
            $targetMachineId = $this->resolveMachineId($targetMachine);
            if ($targetMachineId === null) {
                throw new \InvalidArgumentException("Target machine [{$targetMachine}] does not exist.");
            }

            $entryIds   = collect($items)->pluck('entry_id')->filter()->values()->all();
            $newLotIds  = collect($items)->filter(fn($i) => empty($i['entry_id']))->pluck('lot_id')->filter()->values()->all();

            if (count($entryIds) + count($newLotIds) !== count($items)) {
                throw new \InvalidArgumentException('Every item needs an entry_id or a lot_id.');
            }
            if (in_array($beforeEntryId, $entryIds, true) || in_array($afterEntryId, $entryIds, true)) {
                throw new \InvalidArgumentException('The drop position cannot be one of the rows being moved.');
            }

            $existing = LoadingPlanEntry::with('machineModel')->whereKey($entryIds)->get()->keyBy('id');
            if ($existing->count() !== count(array_unique($entryIds))) {
                throw new \InvalidArgumentException('Some rows no longer exist — refresh and try again.');
            }

            $anchors = LoadingPlanEntry::whereKey(array_filter([$beforeEntryId, $afterEntryId]))->get();
            if ($anchors->contains(fn($a) => $a->machine_id !== $targetMachineId)) {
                throw new \InvalidArgumentException('The drop position is not on the target machine.');
            }

            $dateSource = $existing->values()->concat($anchors);
            $date = $dateSource->isNotEmpty() ? $this->assertConsistentDates($dateSource) : $requestDate;

            if (!empty($newLotIds) && $date !== $requestDate) {
                throw new \InvalidArgumentException('Selected rows belong to different dates.');
            }

            $this->assertDateNotFinalized($date);
            foreach ($existing as $e) {
                $this->assertNotFinalized($e);
            }

            $this->releaseFromBuckets(
                $existing->where('rework_seq', 0)->pluck('lot_id')->filter()->concat($newLotIds)->unique()->values()->all(),
                $date,
            );

            // Lots with no entry yet (unplanned or parked): create them unassigned first,
            // then treat every mover the same way.
            $created = [];
            if (!empty($newLotIds)) {
                $wip = CustomerDataWip::query()
                    ->select('Lot_Id', 'Package_Name', 'import_date', 'Qty', 'Part_Name')
                    ->whereIn('Lot_Id', $newLotIds)
                    ->orderBy('Lot_Id')->orderByDesc('import_date')
                    ->get()->unique('Lot_Id')->keyBy('Lot_Id');

                foreach ($newLotIds as $lotId) {
                    $wipItem = $wip->get($lotId);

                    $created[$lotId] = LoadingPlanEntry::create([
                        'entry_type'     => 'lot',
                        'lot_id'         => $lotId,
                        'scheduled_date' => $date,
                        'machine_id'     => null,
                        'package_name'   => $wipItem?->Package_Name,
                        'sequence_order' => null,
                        'rework_seq'     => 0,
                        'lock_version'   => 1,
                    ]);

                    $lot = LotQuantity::firstOrNew(['lot_id' => $lotId, 'scheduled_date' => $date, 'rework_seq' => 0]);
                    $lot->part_name = $wipItem?->Part_Name ?? '';
                    $lot->qty_base  = $wipItem?->Qty ?? 0;
                    if ($lot->isDirty()) {
                        $lot->save();
                    }
                }
            }

            // item order = display order = final order
            $movers = collect($items)
                ->map(fn($i) => !empty($i['entry_id']) ? $existing->get($i['entry_id']) : $created[$i['lot_id']])
                ->values();
            $moverIds = $movers->pluck('id')->all();

            $sourceMachineIds = $movers->pluck('machine_id')->filter()->unique()
                ->reject(fn($id) => $id === $targetMachineId)->values()->all();

            $machinesToLock = collect([...$sourceMachineIds, $targetMachineId])->unique()->sort()->values()->all();
            $lockedRows = $this->lockMachineRows($machinesToLock, $date);

            $sequences = $this->resolveGroupPositions(
                $lockedRows->where('machine_id', $targetMachineId),
                $moverIds,
                $beforeEntryId,
                $afterEntryId,
                count($moverIds),
                $targetMachineId,
                $date,
            );

            $positions = collect($sequences)
                ->map(fn($seq, $i) => ['entry_id' => $moverIds[$i], 'sequence_order' => $seq])
                ->all();
            $this->applyPositionsInBulk($positions, $targetMachineId, $date);

            $lotIds = $movers->pluck('lot_id')->filter()->unique()->values()->all();
            $calc = app(LotScheduleCalculator::class, ['dates' => [$date], 'lotIds' => $lotIds]);
            $calc->loadPackageList(); // after the quantities exist, so new lots' part names are found

            foreach ($movers as $m) {
                if ($m->entry_type === 'lot') {
                    $calc->recalculateAndRetime($m->id, $targetMachineId, retime: false);
                }
            }

            $this->retimeFromFirstRow([$targetMachineId, ...$sourceMachineIds], $date, $calc);

            // response, same shape as bulkTransfer
            $fresh = LoadingPlanEntry::with(['machineModel', 'lotQuantity.packageListEntry'])
                ->whereKey($moverIds)->get()->keyBy('id');

            $wipMap = CustomerDataWip::query()
                ->whereIn('Lot_Id', $lotIds)
                ->orderBy('Lot_Id')->orderByDesc('import_date')
                ->get()->unique('Lot_Id')->keyBy('Lot_Id');

            $svc = new LoadingPlanService($date);

            $entries = $movers->map(function ($m) use ($fresh, $wipMap, $svc) {
                $entry = $fresh->get($m->id);
                return $svc->createPlannedLot(
                    wipRow: $entry->lot_id ? $wipMap->get($entry->lot_id) : null,
                    entry: $entry,
                    quantity: $entry->lotQuantity,
                );
            })->values();

            return [
                'entries'          => $entries,
                'affected_timings' => self::timingsFor($machinesToLock, $date),
            ];
        });
    }

    /** Evenly spaced sequence_orders for $n rows landing between the two anchors. */
    private function resolveGroupPositions(Collection $targetRows, array $moverIds, ?int $before, ?int $after, int $n, int $machineId, string $date): array
    {
        $others = fn(Collection $rows) => $rows->reject(fn($r) => in_array($r->id, $moverIds, true));

        $plan = function (Collection $rows) use ($before, $after, $n) {
            [$lo, $hi] = $this->resolveBounds($rows, $before, $after);

            return match (true) {
                $lo !== null && $hi !== null => [$lo, ($hi - $lo) / ($n + 1)],
                $lo !== null                 => [$lo, self::GAP_SEED],
                $hi !== null                 => [$hi - ($n + 1) * self::GAP_SEED, self::GAP_SEED],
                default                      => [0.0, self::GAP_SEED],
            };
        };

        [$start, $step] = $plan($others($targetRows));

        if ($step < self::MIN_GAP) {
            [$start, $step] = $plan($others($this->rebalance($machineId, $date)));
        }

        return array_map(fn($i) => round($start + $step * ($i + 1), 4), range(0, $n - 1));
    }

    public function reworkEntry(int $entryId, ?string $targetMachine = null, ?int $beforeEntryId = null, ?int $afterEntryId = null): array
    {
        return DB::transaction(function () use ($entryId, $targetMachine, $beforeEntryId, $afterEntryId) {
            $source = $this->resolveEntry($entryId);

            if ($source->entry_type !== 'lot') {
                throw new \InvalidArgumentException('Only lot rows can be reworked.');
            }
            $this->assertNotFinalized($source);

            $machineId = $targetMachine !== null ? $this->resolveMachineId($targetMachine) : $source->machine_id;
            if ($machineId === null) {
                throw new \InvalidArgumentException('Place the lot on a machine before reworking it.');
            }

            $date = $source->scheduled_date->toDateString();

            $rows = $this->lockMachineRows([$machineId], $date);
            $newOrder = $this->resolveSequenceOrder($rows, $beforeEntryId, $afterEntryId, $machineId, $date);

            $nextSeq = (int) LoadingPlanEntry::where('lot_id', $source->lot_id)
                ->where('scheduled_date', $date)
                ->lockForUpdate()
                ->max('rework_seq') + 1;

            log_entities($nextSeq);

            $sourceQty = $source->lotQuantity;

            if (($sourceQty?->effectiveQty() ?? 0) <= 0) {
                throw new \InvalidArgumentException('This lot has no remaining quantity to rework.');
            }

            LotQuantity::create([
                'lot_id'           => $source->lot_id,
                'scheduled_date'   => $date,
                'rework_seq'       => $nextSeq,
                'part_name'        => $sourceQty?->part_name ?? '',
                'qty_base'         => $sourceQty?->effectiveQty() ?? 0, // snapshot of the parent's current effective qty
                'split_adjustment' => 0,
                'merge_adjustment' => 0,
            ]);

            $rework = LoadingPlanEntry::create([
                'entry_type'         => 'lot',
                'lot_id'             => $source->lot_id,
                'package_name'       => $source->package_name,
                'scheduled_date'     => $date,
                'machine_id'         => $machineId,
                'sequence_order'     => $newOrder,
                'status'             => 'NONE',
                'tag'                => $source->tag,
                'remarks'            => $source->remarks,
                'accu_time'          => $source->accu_time,
                'is_pickup'          => $source->is_pickup,
                'rework_seq'         => $nextSeq,
                'rework_of_entry_id' => $source->id,
                'lock_version'       => 1,
            ]);

            app(LotScheduleCalculator::class, ['dates' => [$date], 'lotIds' => [$source->lot_id]])
                ->loadPackageList()
                ->recalculateAndRetime($rework->id, $machineId);

            $fresh = $rework->fresh(['machineModel', 'lotQuantity']);
            $wip = CustomerDataWip::query()
                ->where('Lot_Id', $fresh->lot_id)
                ->whereDate('import_date', $date)
                ->first();

            return $this->withTimings(
                (new LoadingPlanService($date))->createPlannedLot($wip, $fresh, $fresh->lotQuantity),
                [$machineId],
                $date,
            );
        });
    }

    private function purgeReworkQuantity(LoadingPlanEntry $entry): void
    {
        if (($entry->rework_seq ?? 0) > 0) {
            LotQuantity::where('lot_id', $entry->lot_id)
                ->where('scheduled_date', $entry->scheduled_date->toDateString())
                ->where('rework_seq', $entry->rework_seq)
                ->delete();
        }
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

            $oldOrder = $entry->sequence_order;
            $entry->update(['sequence_order' => $newOrder, 'lock_version' => DB::raw('lock_version + 1')]);

            $calc = app(LotScheduleCalculator::class, ['dates' => [$resolvedDate], 'lotIds' => [$entry->lot_id]]);

            $wip = null;
            if ($entryType === 'lot') {
                $calc->loadPackageList()->recalculateAndRetime($entryId, $machineId, retime: false);

                $wip = CustomerDataWip::query()
                    ->where('Lot_Id', $entry->lot_id)
                    ->whereDate('import_date', $entry->scheduled_date)
                    ->first();
            }

            $restart = $this->findFirstRemainingRow($machineId, $resolvedDate);
            if ($restart) {
                $calc->recomputeTimeStartAndEnd($restart, $machineId);
            }

            $freshEntry = $entry->fresh(['machineModel', 'lotQuantity']);

            return $this->withTimings(
                (new LoadingPlanService($resolvedDate))->createPlannedLot($wip, $freshEntry, $freshEntry->lotQuantity),
                [$machineId],
                $resolvedDate,
            );
        });
    }

    public function transferEntry(
        string $entryType,
        ?int $entryId,
        string $targetMachine,
        ?int $beforeEntryId,
        ?int $afterEntryId,
        ?string $lotId = null,
        ?string $scheduledDate = null,
    ): array {
        return DB::transaction(function () use ($entryType, $entryId, $targetMachine, $beforeEntryId, $afterEntryId, $lotId, $scheduledDate) {
            if ($entryId === null) {
                if ($entryType !== 'lot' || !$lotId || !$scheduledDate) {
                    abort(422, 'lot_id and scheduled_date are required to create an entry for an unassigned WIP.');
                }

                $wip = CustomerDataWip::query()
                    ->where('Lot_Id', $lotId)
                    ->whereDate('import_date', $scheduledDate)
                    ->firstOrFail();

                $entry = LoadingPlanEntry::create([
                    'lot_id'         => $lotId,
                    'scheduled_date' => $scheduledDate,
                    'package_name'   => $wip->Package_Name,
                    'machine_id'     => null,
                    'sequence_order' => null,
                    'entry_type'     => 'lot',
                    'rework_seq'     => 0,
                    'lock_version'   => 0,
                ]);
            } else {
                $entry = $this->resolveEntry($entryId);
                $this->assertNotFinalized($entry);
            }

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
            log_entities($entry);
            if ($entryType === 'lot' && $entry->rework_seq === 0) $this->releaseFromBuckets([$entry->lot_id], $resolvedDate);

            $sourceMachineId = $entry->machine_id; // null for the newly-created row — fine
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

            $calc = app(LotScheduleCalculator::class, ['dates' => [$resolvedDate], 'lotIds' => [$entry->lot_id]]);
            if ($entryType === 'lot') {
                $calc->loadPackageList()->recalculateAndRetime($entry->id, $targetMachineId, retime: false);
            }
            $calc->recomputeTimeStartAndEnd($entry->fresh(), $targetMachineId);

            if ($sourceMachineId && $sourceMachineId !== $targetMachineId) {
                $sourceRestart = $this->findFirstRemainingRow($sourceMachineId, $resolvedDate);
                if ($sourceRestart) {
                    $calc->recomputeTimeStartAndEnd($sourceRestart, $sourceMachineId);
                }
            }

            $wip = CustomerDataWip::query()
                ->where('Lot_Id', $entry->lot_id)
                ->whereDate('import_date', $entry->scheduled_date)
                ->first();

            $freshEntry = $entry->fresh(['machineModel', 'lotQuantity']);

            return $this->withTimings(
                (new LoadingPlanService($resolvedDate))->createPlannedLot($wip, $freshEntry, $freshEntry->lotQuantity),
                [$targetMachineId, $sourceMachineId],
                $resolvedDate,
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

            return $this->withTimings(
                (new LoadingPlanService($date))->createPlannedLot(
                    null,
                    $entry->fresh(),
                    $entry->lotQuantity
                ),
                [$machineId],
                $date,
            );;
        });
    }

    public function deleteEntry(int $id, ?string $machine, bool $forceDelete = false): array
    {
        return DB::transaction(function () use ($id, $machine, $forceDelete) {
            $machineId = $machine ? $this->resolveMachineId($machine) : null;
            $entry = LoadingPlanEntry::whereKey($id)->firstOrFail();

            $date = $entry->scheduled_date->toDateString();

            if ($machineId) {
                $this->lockMachineRows([$machineId], $date);
            }

            $this->assertNotFinalized($entry);

            $vacatedMachineId = $entry->machine_id;

            if ($forceDelete || $entry->entry_type === 'block' || $entry->rework_seq > 0) {
                $entry->delete();
                $this->purgeReworkQuantity($entry);
            } else {
                $entry->update([
                    'machine_id'     => null,
                    'sequence_order' => null,
                    'time_start'     => null,
                    'time_end'       => null,
                    'lock_version'   => DB::raw('lock_version + 1'),
                ]);
            }

            if ($vacatedMachineId) {
                $restart = $this->findFirstRemainingRow($vacatedMachineId, $date);
                if ($restart) {
                    app(LotScheduleCalculator::class)->recomputeTimeStartAndEnd($restart, $vacatedMachineId);
                }
            }

            return self::timingsFor([$vacatedMachineId], $date);
        });
    }

    public function bulkTransfer(array $lotIds, array $blockEntryIds, ?string $targetMachine, string $date, array $entryIds = [])
    {
        return DB::transaction(function () use ($lotIds, $entryIds, $blockEntryIds, $targetMachine, $date) {
            $targetMachineId = $this->resolveMachineId($targetMachine);

            $lotEntries = LoadingPlanEntry::with('machineModel')
                ->where('scheduled_date', $date)
                ->where('entry_type', 'lot')
                ->where(function ($q) use ($entryIds, $lotIds) {
                    $q->whereIn('id', $entryIds)
                        ->orWhere(fn($q2) => $q2->whereIn('lot_id', $lotIds)->where('rework_seq', 0));
                })
                ->get();

            $blockEntries = empty($blockEntryIds)
                ? collect()
                : LoadingPlanEntry::whereKey($blockEntryIds)
                ->where('entry_type', 'block')
                ->get();

            $plannedLotIds = $lotEntries->where('rework_seq', 0)->pluck('lot_id')->all();
            $unplannedLotIds = array_values(array_diff($lotIds, $plannedLotIds));

            $allEntries = $lotEntries->concat($blockEntries);

            if ($targetMachineId === null && $lotEntries->contains(fn($e) => $e->rework_seq > 0)) {
                throw new \InvalidArgumentException('Rework rows cannot be unassigned — delete them instead.');
            }

            if ($allEntries->isNotEmpty()) {
                $this->assertConsistentDates($allEntries);
            }

            $movers = $allEntries->filter(fn($e) => $e->machine_id !== $targetMachineId);

            if ($movers->isEmpty() && empty($unplannedLotIds)) {
                return ['entries' => [], 'affected_timings' => []];
            }

            $this->releaseFromBuckets($lotIds, $date);

            $machinesToLock = $movers->pluck('machine_id')
                ->push($targetMachineId)
                ->filter()
                ->unique()
                ->sort()
                ->values()
                ->all();

            $sourceMachineIds = array_values(array_diff($machinesToLock, [$targetMachineId]));

            $lockedRows = $this->lockMachineRows($machinesToLock, $date);

            $nextSeq = ($lockedRows->where('machine_id', $targetMachineId)->max('sequence_order') ?? 0) + self::GAP_SEED;

            $updatedEntries = collect();
            $firstAffectedEntry = null;

            $calculator = app(LotScheduleCalculator::class, ['dates' => [$date], 'lotIds' => $allEntries->pluck('lot_id')->all()]);
            $calculator->loadPackageList();

            foreach ($movers as $entry) {
                $this->assertNotFinalized($entry);

                $entry->update([
                    'machine_id'     => $targetMachineId,
                    'sequence_order' => $nextSeq,
                    'lock_version'   => DB::raw('lock_version + 1'),
                    'time_start'     => $targetMachineId === null ? null : $entry->time_start,
                    'time_end'       => $targetMachineId === null ? null : $entry->time_end,
                ]);

                if ($entry->entry_type === 'lot') {
                    // accu_time only — no forward walk per lot. One walk covers the
                    // whole batch, done once after both loops below.
                    $calculator->recalculateAndRetime($entry->getKey(), $targetMachineId, retime: false);
                }

                $firstAffectedEntry ??= $entry;

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
                    'rework_seq'     => 0
                ]);

                $lot->part_name = $wipItem?->Part_Name ?? '';
                $lot->qty_base  = $wipItem?->Qty ?? 0;

                if ($lot->isDirty()) {
                    $lot->save();
                }

                $calculator->recalculateAndRetime($entry->getKey(), $targetMachineId, retime: false);

                $firstAffectedEntry ??= $entry;

                $updatedEntries->push($entry->fresh('machineModel'));
                $nextSeq += self::GAP_SEED;
            }

            // Single forward walk for the whole batch — starts from the earliest row
            // this call touched (fresh(), since pass 1 above updated its accu_time)
            // and recomputeTimeStartAndEnd walks every row downstream of it itself.
            if ($firstAffectedEntry !== null && $targetMachineId !== null) {
                $calculator->recomputeTimeStartAndEnd($firstAffectedEntry->fresh(), $targetMachineId);
            }

            $this->retimeFromFirstRow($sourceMachineIds, $date, $calculator);

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

            return [
                'entries'          => $updated,
                'affected_timings' => $this->timingsFor($machinesToLock, $date),
            ];
        });
    }

    /**
     * Same as bulkTransfer(), but each lot can go to a different machine.
     * $assignments: array<int, array{lot_id: string, machine: string}>
     */
    public function bulkTransferMulti(array $assignments, string $date)
    {
        return DB::transaction(function () use ($assignments, $date) {
            $this->assertDateNotFinalized($date);

            // lot_id => resolved target machine_id
            $targetByLotId = collect($assignments)
                ->mapWithKeys(fn($a) => [$a['lot_id'] => $this->resolveMachineId($a['machine'])]);

            $lotIds = collect($assignments)->pluck('lot_id')->unique()->all();

            $lotEntries = LoadingPlanEntry::with(['machineModel', 'lotQuantity'])
                ->whereIn('lot_id', $lotIds)
                ->where('rework_seq', 0)
                ->where('scheduled_date', $date)
                ->where('entry_type', 'lot')
                ->get();

            $plannedLotIds = $lotEntries->pluck('lot_id')->all();
            $unplannedLotIds = array_values(array_diff($lotIds, $plannedLotIds));

            $allEntries = $lotEntries;

            $wip = CustomerDataWip::query()->forDate($date)->whereIn('Lot_Id', $lotIds)->get()->keyBy('Lot_Id');

            $movers = $allEntries->filter(fn($e) => $e->machine_id !== $targetByLotId->get($e->lot_id));

            if ($movers->isEmpty() && empty($unplannedLotIds)) {
                return ['entries' => [], 'affected_timings' => []];
            }

            $this->releaseFromBuckets($lotIds, $date);

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

            // Earliest entry touched per target machine — each machine gets its
            // own single forward walk after both loops, instead of a walk per
            // lot re-covering the same downstream chain on that machine.
            $firstAffectedByMachine = [];

            $updated = collect();
            $loadingPlanService = new LoadingPlanService($date);
            $loadingPlanService->initSplitsAndMerges();

            $calculator = app(LotScheduleCalculator::class, ['dates' => [$date], 'lotIds' => $lotIds]);
            $calculator->loadPackageList();

            \Log::info('calculator', ['mb_start_for_loop' => memory_get_usage(true) / 1048576]);

            $sourceMachineIds = $movers->pluck('machine_id')->filter()->unique()->values()->all();

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
                    // accu_time only — the forward walk runs once per machine,
                    // after both loops below, not once per lot here.
                    $calculator->recalculateAndRetime($entry->getKey(), $targetMachineId, retime: false);
                }

                $firstAffectedByMachine[$targetMachineId] ??= $entry;

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
                    'time_start'     => null,
                    'time_end'       => null,
                ]);

                $calculator->recalculateAndRetime($entry->getKey(), $targetMachineId, retime: false);

                $firstAffectedByMachine[$targetMachineId] ??= $entry;

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

            // One forward walk per affected target machine, starting from the
            // earliest entry that landed on it — recomputeTimeStartAndEnd walks
            // everything downstream on that machine itself.
            $this->retimeFromFirstRow([...$sourceMachineIds, ...array_keys($firstAffectedByMachine)], $date, $calculator);

            return [
                'entries'          => $updated,
                'affected_timings' => $this->timingsFor($machinesToLock, $date),
            ];
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

            [$blocks, $rest] = $entries->partition(fn($e) => $e->entry_type === 'block');
            [$reworks, $others] = $rest->partition(fn($e) => $e->rework_seq > 0);

            $deleted = $blocks->pluck('id')->merge($reworks->pluck('id'))->all();

            if ($blocks->isNotEmpty()) {
                LoadingPlanEntry::whereKey($blocks->pluck('id'))->delete();
            }
            foreach ($reworks as $e) {          // model delete so history observers fire
                $e->delete();
                $this->purgeReworkQuantity($e);
            }

            $unassignedIds = $others->pluck('id')->all();
            if (!empty($unassignedIds)) {
                LoadingPlanEntry::whereKey($unassignedIds)->update([
                    'machine_id'     => null,
                    'sequence_order' => null,
                    'time_start' => null,
                    'time_end'   => null,
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

            return $this->withTimings(['deleted' => $deleted, 'unassigned' => $unassigned], $machines, $date);
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

            $allowedEntryFields = ['package_name', 'lot_id', 'is_pickup']; // extend as needed — see editLotField discussion on allowlisting $fields
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
                'rework_seq'     => 0
            ]);

            $lot->part_name = $fields['part_name'] ?? '';
            $lot->qty_base  = $fields['qty'] ?? 0;

            if ($lot->isDirty()) {
                $lot->save();
            }

            // unplaced lot when $machineId is null — recalculate() still runs
            // (sets commit/recipe_status off qty/recipe), recalculateAndRetime
            // skips the retime step safely per its own null-machine guard
            app(LotScheduleCalculator::class, ['dates' => [$date], 'lotIds' => [$lotId]])
                ->loadPackageList()
                ->recalculateAndRetime($entry->getKey(), $machineId);

            $entry->refresh();

            return $this->withTimings(
                (new LoadingPlanService($date))->createPlannedLot(
                    null,
                    $entry,
                    $entry->lotQuantity
                ),
                [$machineId],
                $date,
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
            $lotQuantity = LotQuantity::firstOrNew(['lot_id' => $lotId, 'scheduled_date' => $date, 'rework_seq' => $existing->rework_seq]);

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

            $date = $this->assertConsistentDates($existingEntries);

            $machineIds = $existingEntries->pluck('machine_id')
                ->filter()
                ->unique()
                ->sort()
                ->values()
                ->all();

            if (!empty($machineIds)) {
                $this->lockMachineRows($machineIds, $date);
            }

            $lotIds = $existingEntries->pluck('lot_id')->filter()->unique()->values()->all();

            $calc = app(LotScheduleCalculator::class, ['dates' => [$date], 'lotIds' => $lotIds])->loadPackageList();

            foreach ($updates as $u) {
                $this->assertSupportedEditField($u['fields']);

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
                    $lotQuantity = LotQuantity::firstOrNew(['lot_id' => $existing->lot_id, 'scheduled_date' => $date, 'rework_seq' => $existing->rework_seq]);

                    if (array_key_exists('qty', $fields)) {
                        $lotQuantity->qty_base = $fields['qty'];
                    }

                    if ($lotQuantity->effectiveQty() < 0) {
                        throw new \InvalidArgumentException(
                            "Lot [{$existing->lot_id}] can't go below what's already been split out or merged away."
                        );
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
        [$before, $after] = $this->resolveBounds($machineRows, $beforeEntryId, $afterEntryId);

        try {
            return $this->computeSequenceOrder($before, $after, $machine, $date);
        } catch (SequenceExhaustedException) {
            $machineId = $this->resolveMachineId($machine);
            $rebalanced = $this->rebalance($machineId, $date);

            // same resolution as the first pass, against the re-spaced rows,
            // so a single-anchor request still gets its other neighbour filled in
            [$before, $after] = $this->resolveBounds($rebalanced, $beforeEntryId, $afterEntryId);

            return $this->computeSequenceOrder($before, $after, $machine, $date);
        }
    }

    private function resolveBounds(Collection $rows, ?int $beforeEntryId, ?int $afterEntryId): array
    {
        $sorted = $rows->sortBy('sequence_order')->values();

        [$before, $after] = $this->resolveNeighborOrders($sorted, $beforeEntryId, $afterEntryId);

        // no anchors at all: append after the current last row
        if ($before === null && $after === null) {
            $currentMax = $rows->max('sequence_order');
            if ($currentMax !== null) {
                $before = $currentMax;
            }
        }

        if ($before !== null && $after !== null && $before > $after) {
            [$before, $after] = [$after, $before];
        }

        return [$before, $after];
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
        if (empty($ids)) return;

        $cases = [];
        $bindings = [];

        foreach ($ids as $id) {
            $cases[] = "WHEN id = ? THEN ?";
            $bindings[] = $id;
            $bindings[] = -$id; // use the id as the sequence order temporarily
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
                ...array_keys($order),
            ]);
            if (!empty($machineIds)) {
                $this->lockMachineRows($machineIds, $date);
            }

            foreach ($deletedEntries as $entry) {
                $this->assertNotFinalized($entry);

                $isActiveSplitChild = \App\Models\LotSplit::active()
                    ->where('child_lot_id', $entry->lot_id)
                    ->where('scheduled_date', $entry->scheduled_date)
                    ->exists();

                if ($isActiveSplitChild) {
                    throw new ActiveSplitChildException(
                        "Entry [{$entry->id}] is an active split child — revert the split instead of deleting the row directly."
                    );
                }

                $isActiveMergeParticipant = \App\Models\LotMerge::active()
                    ->where(function ($q) use ($entry) {
                        $q->where('target_lot_id', $entry->lot_id)->orWhere('source_lot_id', $entry->lot_id);
                    })
                    ->where('scheduled_date', $entry->scheduled_date)
                    ->exists();

                if ($isActiveMergeParticipant) {
                    throw new ActiveMergeParticipantException(
                        "Entry [{$entry->id}] is an active merge participant — revert the merge instead of deleting the row directly."
                    );
                }

                $entry->delete();
                $this->purgeReworkQuantity($entry);
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
                $result = $row['entry_id'] === null
                    ? ($row['entry_type'] === 'block'
                        ? $this->createBlockRow($row, $date)
                        : $this->createLotRow($row, $date))
                    : $this->updateRow($row);

                $dndToEntryId[$row['dnd_id']] = $result['entry_id'] ?? null;
                $results[] = $result;
            }

            $orderEntryIds = collect($order)->flatten()->filter(fn($id) => is_numeric($id))->unique()->values();

            $orderEntries = $orderEntryIds->isEmpty()
                ? collect()
                : LoadingPlanEntry::whereKey($orderEntryIds)->get(['id', 'lot_id', 'scheduled_date', 'entry_type']);

            $allLotIds = $orderEntries->where('entry_type', 'lot')->pluck('lot_id')->filter()->unique()->values()->all();
            $allDates = $orderEntries->pluck('scheduled_date')
                ->map(fn($d) => $d->toDateString())
                ->push($date)
                ->unique()
                ->values()
                ->all();

            // One calculator, loaded once, reused for every machine/date-group this
            // sync touches — replaces a fresh app(LotScheduleCalculator::class, ...)
            // + loadPackageList() per machine per date-group, which could each fall
            // back to an unfiltered ~20k-row scan when a group had no lots.
            $sharedCalc = app(LotScheduleCalculator::class, ['dates' => $allDates, 'lotIds' => $allLotIds])
                ->loadPackageList();

            foreach ($order as $machine => $ids) {
                $entryIds = collect($ids)->map(fn($id) => $dndToEntryId[$id] ?? $id)->all();
                $this->resequenceMachine($entryIds, $machine, $date, $sharedCalc);
            }

            $timingMachineIds = array_values(array_unique([
                ...$this->resolveMachineIds([...collect($rows)->pluck('machine')->filter()->all(), ...array_keys($order)]),
                ...$vacatedMachineIds,
            ]));

            return [
                'results'          => $results,
                'affected_timings' => self::timingsFor($timingMachineIds, $date),
            ];
        });
    }

    private function createLotRow(array $row, string $date)
    {
        $lotId = $row['lot_id'] ?? throw new \InvalidArgumentException('create row missing lot_id for entry_type lot');
        $this->releaseFromBuckets([$lotId], $date);
        $fields = $row['fields'] ?? [];
        $machineId = $row['machine'] !== null ? $this->resolveMachineId($row['machine']) : null;

        // Mirrors bulkTransfer()'s unplannedLotIds branch — this is a WIP lot
        // being placed for the first time, not a synthetic manual lot, so pull
        // package/part/qty from CustomerDataWip the same way that path does.
        $wipItem = CustomerDataWip::query()
            ->where('Lot_Id', $lotId)
            ->whereDate('import_date', $date)
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

        $lot = LotQuantity::firstOrNew(['lot_id' => $lotId, 'scheduled_date' => $date, 'rework_seq' => 0]);
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
            ->whereDate('import_date', $freshEntry->scheduled_date)
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
    private function resequenceMachine(array $entryIds, string $machine, string $date, LotScheduleCalculator $calc): void
    {
        if (empty($entryIds)) return;

        $machineId = $this->resolveMachineId($machine);

        // entryIds can span two dates on one machine: leaked entries still
        // carrying yesterday's scheduled_date, listed first, followed by
        // today's own entries. sequence_order is unique per
        // (machine_id, scheduled_date), so each date's rows must be
        // resequenced within their own date — resolve every id's real date
        // rather than assuming $date covers all of them.
        $requestedEntries = LoadingPlanEntry::whereKey($entryIds)
            ->lockForUpdate()
            ->get()
            ->keyBy('id');

        $missingIds = collect($entryIds)->diff($requestedEntries->keys());
        if ($missingIds->isNotEmpty()) {
            Log::warning('resequenceMachine: entry ids in order payload no longer exist', [
                'machine' => $machine,
                'missing_ids' => $missingIds->values()->all(),
            ]);
        }

        $idsByDate = collect($entryIds)
            ->filter(fn($id) => $requestedEntries->has($id))
            ->groupBy(fn($id) => $requestedEntries->get($id)->scheduled_date->toDateString());

        foreach ($idsByDate as $groupDate => $groupIds) {
            $this->resequenceMachineForDate($groupIds->values()->all(), $machineId, $machine, $groupDate, $calc);
        }
    }

    private function resequenceMachineForDate(array $entryIds, int $machineId, string $machine, string $date, LotScheduleCalculator $calc): void
    {
        if (empty($entryIds)) return;

        $currentRows = LoadingPlanEntry::where('machine_id', $machineId)
            ->where('scheduled_date', $date)
            ->lockForUpdate()
            ->get();

        if ($currentRows->isEmpty()) {
            Log::warning('resequenceMachine: no current rows for machine/date, skipping', [
                'machine' => $machine,
                'date' => $date,
                'requested_entry_ids' => $entryIds,
            ]);
            return;
        }

        $currentIds = $currentRows->pluck('id')->all();
        $stray = array_diff($currentIds, $entryIds);

        if (!empty($stray)) {
            Log::warning('resequenceMachine: stray rows on machine not in entryIds', [
                'machine' => $machine,
                'date' => $date,
                'stray' => $stray,
            ]);
        }

        $this->stageTempSequenceOrders($currentIds);

        $cases = [];
        $bindings = [];
        foreach ($entryIds as $i => $id) {
            $cases[] = "WHEN id = ? THEN ?";
            $bindings[] = $id;
            $bindings[] = ($i + 1) * self::GAP_SEED;
        }
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

        $rowsById = $currentRows->keyBy('id');
        $missingFromCurrent = collect($allIds)->diff($rowsById->keys());

        if ($missingFromCurrent->isNotEmpty()) {
            // ids not in $currentRows are being pulled in from a different
            // machine (a transfer riding along in this order payload) — fetch
            // those in one batch too, instead of one-by-one.
            LoadingPlanEntry::whereKey($missingFromCurrent)->get()
                ->each(fn($e) => $rowsById->put($e->id, $e));
        }

        $restart = $this->findFirstRemainingRow($machineId, $date);

        // Pass 1: per-lot accu_time only (genuinely O(1) work per lot, needs to
        // run per-lot since each lot's qty/recipe/capacity differ). No forward
        // walk here — that's pass 2, done once for the whole machine instead of
        // once per lot re-walking the same downstream chain.
        foreach ($allIds as $id) {
            if ($rowsById->get($id)?->entry_type === 'lot') {
                $calc->recalculateAndRetime($id, $machineId, retime: false);
            }
        }

        // Pass 2: one single forward walk from the machine's new first row.
        // recomputeTimeStartAndEnd already walks the entire downstream chain
        // itself and stops once times stop changing — one call here covers
        // every row pass 1 touched.
        if ($restart) {
            $calc->recomputeTimeStartAndEnd($restart->fresh(), $machineId);

            DB::table('machine_day_starts')->updateOrInsert(
                ['machine_id' => $machineId, 'scheduled_date' => $date],
                ['day_start_time' => $restart->fresh()->time_start?->format('H:i:s'), 'updated_at' => now()]
            );
        }
    }

    // public function batchApply(array $operations, string $date): array
    // {
    //     return DB::transaction(function () use ($operations, $date) {
    //         $machineNames = collect($operations)
    //             ->flatMap(fn($op) => [$op['machine'] ?? null, $op['target_machine'] ?? null])
    //             ->filter()
    //             ->unique()
    //             ->values()
    //             ->all();

    //         $machineIds = $this->resolveMachineIds($machineNames);

    //         if (!empty($machineIds)) {
    //             $this->lockMachineRows($machineIds, $date);
    //         }

    //         // Group 'move' ops by target machine to detect which machines
    //         // qualify for bulk treatment (more than one move batched together).
    //         $moveOpsByMachine = collect($operations)
    //             ->filter(fn($op) => $op['type'] === 'move')
    //             ->groupBy('machine');

    //         $bulkMachines = $moveOpsByMachine
    //             ->filter(fn($ops) => $ops->count() > 1)
    //             ->keys()
    //             ->all();

    //         // Track which operation indexes get resolved via the bulk path,
    //         // so the main loop below can skip re-processing them individually.
    //         $bulkHandledIndexes = [];
    //         $bulkResultsByIndex = [];

    //         foreach ($bulkMachines as $machine) {
    //             // Any create_block ops targeting this machine must run first —
    //             // moves in this batch may reference the new block's id as an
    //             // anchor, so it needs to exist before rebalance() snapshots
    //             // the machine for bulk reorder.
    //             foreach ($operations as $idx => $op) {
    //                 if ($op['type'] === 'create_block' && $op['machine'] === $machine) {
    //                     $bulkResultsByIndex[$idx] = $this->addBlock(
    //                         $op['machine'],
    //                         $date,
    //                         $op['label'] ?? "Gap",
    //                         $op['duration'],
    //                         $op['before_entry_id'] ?? null,
    //                         $op['after_entry_id'] ?? null,
    //                     );
    //                     $bulkHandledIndexes[] = $idx;
    //                 }
    //             }

    //             $placements = $moveOpsByMachine[$machine]->map(fn($op) => [
    //                 'entry_type'      => $op['entry_type'],
    //                 'lot_id'          => $op['lot_id'] ?? null,
    //                 'entry_id'        => $op['entry_id'] ?? null,
    //                 'before_entry_id' => $op['before_entry_id'] ?? null,
    //                 'after_entry_id'  => $op['after_entry_id'] ?? null,
    //             ])->values()->all();

    //             $entries = $this->applyBulkReorder(['machine' => $machine, 'placements' => $placements], $date);
    //             $entriesById = $entries->keyBy('id');

    //             foreach ($operations as $idx => $op) {
    //                 if ($op['type'] !== 'move' || $op['machine'] !== $machine) {
    //                     continue;
    //                 }

    //                 $entryId = $op['entry_id'];

    //                 $bulkResultsByIndex[$idx] = $entriesById[$entryId] ?? null;
    //                 $bulkHandledIndexes[] = $idx;
    //             }
    //         }

    //         $results = [];

    //         foreach ($operations as $idx => $op) {
    //             if (in_array($idx, $bulkHandledIndexes, true)) {
    //                 $results[] = $bulkResultsByIndex[$idx];
    //                 continue;
    //             }

    //             $results[] = match ($op['type']) {
    //                 // TODO: does the order here matter?
    //                 'create_block' => $this->addBlock(
    //                     $op['machine'],
    //                     $date,
    //                     $op['label'],
    //                     $op['duration'],
    //                     $op['before_entry_id'] ?? null,
    //                     $op['after_entry_id'] ?? null,
    //                 ),
    //                 'create_lot' => $this->applyCreateLot($op, $date),

    //                 'update_field' => $this->applyUpdateField($op),
    //                 'rework' => $this->reworkEntry($op['entry_id'], $op['machine'] ?? null, $op['before_entry_id'] ?? null, $op['after_entry_id'] ?? null),
    //                 'revert_split' => $this->applyRevertSplit($op),
    //                 'split' => $this->applySplit($op),

    //                 'merge' => $this->applyMerge($op),
    //                 'revert_merge' => $this->applyRevertMerge($op),
    //                 'unrevert_split' => $this->applyUnrevertSplit($op),

    //                 'move' => $this->applyMove($op),
    //                 'transfer' => $this->applyTransfer($op),

    //                 'delete' => $this->applyDelete($op),
    //                 default => throw new \InvalidArgumentException("Unknown batch operation type: {$op['type']}"),
    //             };
    //         }

    //         return $results;
    //     });
    // }

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

        // logger()->debug('DB check', [
        //     'db' => DB::connection()->getDatabaseName(),
        //     'host' => DB::connection()->getConfig('host'),
        //     'port' => DB::connection()->getConfig('port'),
        // ]);

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

    /**
     * Bulk-writes an entire machine-grouped placement plan in a fixed small
     * number of queries, regardless of lot count. Only valid immediately
     * after every OPEN entry on these machines/date has been deleted —
     * i.e. the precondition rebuildForPickupArrival() already establishes.
     * Nothing pre-existing can collide with a fresh insert, so this skips
     * the midpoint-sequence-order / stageTempSequenceOrders dance entirely
     * and uses plain index * GAP_SEED per machine, same as resequenceMachine().
     *
     * Bypasses Eloquent ::create() (and therefore LoadingPlanEntryObserver /
     * LotQuantityObserver) for the bulk insert — history rows are written
     * manually below to keep audit trail parity. ASSUMPTION: changed_columns/
     * old_values/new_values are array/json-cast on the History models (implied
     * by BaseHistoryObserver::record() passing raw PHP arrays to ::create());
     * confirm this against the actual migration before relying on it, since
     * raw insert() doesn't apply Eloquent casts — this code json_encode()s
     * those columns itself to compensate.
     *
     * $plan: array<int machineId, array<['type' => 'block'|'lot', ...]>>
     *   block: ['type' => 'block', 'label' => string, 'duration' => int]
     *   lot:   ['type' => 'lot', 'lot_id' => string, 'package_name' => ?string,
     *           'part_name' => string, 'qty' => int|float]
     */
    public function bulkPlacePlan(array $plan, string $date, LotScheduleCalculator $calc): Collection
    {
        if (empty($plan)) {
            return collect();
        }

        $calc->loadPackageList();
        $now = now();
        // $changedBy = auth()->id();
        $changedBy = null;

        // --- pass 1: resolve continuity anchor per machine (bounded by
        // machine count, not lot count) ---
        // machine count, not lot count) ---
        $dayStartByMachine = [];
        foreach (array_keys($plan) as $machineId) {
            // Frozen/in-progress entries that survived the open()->delete() pass
            // anchor both the time cursor and the sequence counter for today.
            $frozenToday = LoadingPlanEntry::where('machine_id', $machineId)
                ->where('scheduled_date', $date)
                ->orderByDesc('sequence_order')
                ->first();

            if ($frozenToday && $frozenToday->getRawOriginal('time_end') !== null) {
                $dayStartByMachine[$machineId] = [
                    'cursor' => Carbon::parse($frozenToday->getRawOriginal('time_end')),
                    'isBootstrap' => false,
                    'seqStart' => $frozenToday->sequence_order + self::GAP_SEED,
                ];
                continue;
            }

            $predecessor = LoadingPlanEntry::where('machine_id', $machineId)
                ->where('scheduled_date', '<', $date)
                ->orderByDesc('scheduled_date')
                ->orderByDesc('sequence_order')
                ->first();

            if ($predecessor && $predecessor->getRawOriginal('time_end') !== null) {
                $dayStartByMachine[$machineId] = [
                    'cursor' => Carbon::parse($predecessor->getRawOriginal('time_end')),
                    'isBootstrap' => false,
                    'seqStart' => self::GAP_SEED,
                ];
                continue;
            }

            $row = DB::table('machine_day_starts')
                ->where('machine_id', $machineId)
                ->where('scheduled_date', $date)
                ->first();

            $dayStartByMachine[$machineId] = $row
                ? ['cursor' => Carbon::parse("{$date} {$row->day_start_time}"), 'isBootstrap' => false, 'seqStart' => self::GAP_SEED]
                : ['cursor' => Carbon::parse("{$date} 00:00:00"), 'isBootstrap' => true, 'seqStart' => self::GAP_SEED];
        }

        // dd($dayStartByMachine);

        // --- pass 2: build insert rows, computing accu_time/commit/timing
        // entirely in-memory (no DB round-trip per lot) ---
        $entryInsertRows = [];
        $lotQuantityRows = [];
        $walkMeta = []; // parallel to $entryInsertRows: ['machine_id', 'lot_id'|null]

        foreach ($plan as $machineId => $rows) {
            $seq = $dayStartByMachine[$machineId]['seqStart'];   // was: self::GAP_SEED
            $cursor = $dayStartByMachine[$machineId]['cursor'];
            $machineName = $calc->machineNumFor($machineId);

            foreach ($rows as $row) {
                if ($row['type'] === 'block') {
                    $timeStart = $cursor;
                    $timeEnd = (clone $cursor)->addMinutes($row['duration']);

                    $entryInsertRows[] = [
                        'entry_type' => 'block',
                        'lot_id' => null,
                        'package_name' => null,
                        'scheduled_date' => $date,
                        'machine_id' => $machineId,
                        'sequence_order' => $seq,
                        'status' => null,
                        'block_label' => $row['label'],
                        'is_pickup' => false,
                        'accu_time' => $row['duration'],
                        'time_start' => $timeStart,
                        'time_end' => $timeEnd,
                        'lock_version' => 1,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                    $walkMeta[] = ['machine_id' => $machineId, 'lot_id' => null];
                    $cursor = $timeEnd;
                } else {
                    $metrics = $calc->computeMetrics($row['part_name'], (int) $row['qty'], $machineName);
                    $timeStart = $cursor;
                    $timeEnd = (clone $cursor)->addMinutes($metrics['accu_time'] ?? 0);

                    $entryInsertRows[] = [
                        'entry_type' => 'lot',
                        'lot_id' => $row['lot_id'],
                        'package_name' => $row['package_name'],
                        'scheduled_date' => $date,
                        'machine_id' => $machineId,
                        'sequence_order' => $seq,
                        'status' => 'NONE',
                        'block_label' => null,
                        'is_pickup' => $row['is_pickup'] ?? false,
                        'accu_time' => $metrics['accu_time'],
                        'time_start' => $timeStart,
                        'time_end' => $timeEnd,
                        'lock_version' => 1,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                    $walkMeta[] = ['machine_id' => $machineId, 'lot_id' => $row['lot_id']];

                    $lotQuantityRows[] = [
                        'lot_id' => $row['lot_id'],
                        'scheduled_date' => $date,
                        'part_name' => $row['part_name'],
                        'rework_seq' => 0,
                        'qty_base' => $row['qty'] ?? 0,
                        'recipe_used' => $metrics['recipe_used'],
                        'recipe_source_id' => $metrics['recipe_source_id'],
                        'commit' => $metrics['commit'],
                        'recipe_status' => $metrics['recipe_status'],
                        'capacity_uph_snapshot' => $metrics['capacity_uph_snapshot'],
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];

                    $cursor = $timeEnd;
                }
                $seq += self::GAP_SEED;
            }
        }

        Log::info("entryInsertRows");
        Log::info($entryInsertRows);

        $entries = LoadingPlanEntry::where('scheduled_date', $date)
            ->orderBy('machine_id')
            ->orderBy('sequence_order')
            ->get();

        log_entities($entries, "Loading Plan Entries for {$date}");

        // --- pass 3: bulk write ---
        LoadingPlanEntry::insert($entryInsertRows);

        if (!empty($lotQuantityRows)) {
            LotQuantity::upsert(
                $lotQuantityRows,
                ['lot_id', 'scheduled_date', 'rework_seq'],
                ['part_name', 'qty_base', 'recipe_used', 'recipe_source_id', 'commit', 'recipe_status', 'capacity_uph_snapshot']
            );
        }

        $machineIds = array_keys($plan);
        $freshEntries = LoadingPlanEntry::whereIn('machine_id', $machineIds)
            ->where('scheduled_date', $date)
            ->orderBy('machine_id')->orderBy('sequence_order')
            ->get();

        // day_start_time bootstrap — only machines that had no predecessor
        // and no existing machine_day_starts row
        foreach ($dayStartByMachine as $machineId => $info) {
            if (!$info['isBootstrap']) continue;
            $firstEntry = $freshEntries->firstWhere('machine_id', $machineId);
            if (!$firstEntry) continue;

            DB::table('machine_day_starts')->updateOrInsert(
                ['machine_id' => $machineId, 'scheduled_date' => $date],
                ['day_start_time' => $firstEntry->time_start->format('H:i:s'), 'updated_at' => $now]
            );
        }

        // --- pass 4: manual history rows, mirroring BaseHistoryObserver::created() ---
        $entryHistoryRows = [];
        $lotQuantityHistoryRows = [];
        $ignoredEntryColumns = ['updated_at', 'lock_version'];

        foreach ($freshEntries as $entry) {
            // keys come from getAttributes(), not a literal branch — keep it that way
            $attrs = collect($entry->getAttributes())->except($ignoredEntryColumns)->toArray();
            $entryHistoryRows[] = [
                'entry_id' => $entry->id,
                'changed_by' => $changedBy,
                'change_type' => 'created',
                'changed_columns' => json_encode(array_keys($attrs)),
                'old_values' => null,
                'new_values' => json_encode($attrs),
                'changed_at' => $now,
            ];
        }
        LoadingPlanEntryHistory::insert($entryHistoryRows);

        if (!empty($lotQuantityRows)) {
            $lotIds = collect($lotQuantityRows)->pluck('lot_id');
            $freshQuantities = LotQuantity::where('scheduled_date', $date)->where('rework_seq', 0)->whereIn('lot_id', $lotIds)->get();

            foreach ($freshQuantities as $lq) {
                // keys come from getAttributes(), not a literal branch — keep it that way
                $attrs = collect($lq->getAttributes())->except(['updated_at'])->toArray();
                $lotQuantityHistoryRows[] = [
                    'lot_quantity_id' => $lq->id,
                    'lot_id' => $lq->lot_id,
                    'scheduled_date' => $lq->scheduled_date,
                    'changed_by' => $changedBy,
                    'change_type' => 'created',
                    'changed_columns' => json_encode(array_keys($attrs)),
                    'old_values' => null,
                    'new_values' => json_encode($attrs),
                    'changed_at' => $now,
                ];
            }
            LotQuantityHistory::insert($lotQuantityHistoryRows);
        }

        return $freshEntries;
    }

    public function parkLots(array $lotIds, int $bucketId, string $date, ?string $prevLotId, ?string $nextLotId): array
    {
        return DB::transaction(function () use ($lotIds, $bucketId, $date, $prevLotId, $nextLotId) {
            $this->assertDateNotFinalized($date);
            LoadingPlanBucket::findOrFail($bucketId);

            $entries = LoadingPlanEntry::where('scheduled_date', $date)
                ->where('entry_type', 'lot')
                ->where('rework_seq', 0)
                ->whereIn('lot_id', $lotIds)
                ->get();

            $hasRework = LoadingPlanEntry::where('scheduled_date', $date)
                ->whereIn('lot_id', $lotIds)->where('rework_seq', '>', 0)->exists();

            if ($hasRework) abort(422, 'A selected lot has a rework row — remove it before grouping.');

            if ($entries->isNotEmpty()) {
                $withWip = CustomerDataWip::whereDate('import_date', $date)
                    ->whereIn('Lot_Id', $entries->pluck('lot_id'))
                    ->pluck('Lot_Id')->all();

                foreach ($entries as $e) {
                    $this->assertNotFinalized($e);
                    if (!in_array($e->lot_id, $withWip, true)) {
                        abort(422, "Lot {$e->lot_id} has no WIP row (manual lot) and can't be grouped.");
                    }
                    // ASSUMPTION: LotSplit has parent_lot_id / child_lot_id — check column names
                    $inSplit = \App\Models\LotSplit::active()
                        ->where('scheduled_date', $date)
                        ->where(fn($q) => $q->where('child_lot_id', $e->lot_id)->orWhere('parent_lot_id', $e->lot_id))
                        ->exists();
                    $inMerge = \App\Models\LotMerge::active()
                        ->where('scheduled_date', $date)
                        ->where(fn($q) => $q->where('target_lot_id', $e->lot_id)->orWhere('source_lot_id', $e->lot_id))
                        ->exists();
                    if ($inSplit || $inMerge) {
                        abort(422, "Lot {$e->lot_id} is part of an active split/merge — revert it first.");
                    }
                }
            }

            $machineIds = $entries->pluck('machine_id')->filter()->unique()->sort()->values()->all();
            if ($machineIds) {
                $this->lockMachineRows($machineIds, $date);
            }

            foreach ($entries as $e) {
                $e->delete(); // model delete, not query delete, so history observers fire
            }

            foreach ($machineIds as $machineId) {
                $restart = $this->findFirstRemainingRow($machineId, $date);
                if ($restart) {
                    app(LotScheduleCalculator::class)->recomputeTimeStartAndEnd($restart, $machineId);
                }
            }

            $positions = $this->resolveBucketPositions($bucketId, $lotIds, $date, $prevLotId, $nextLotId);

            foreach ($positions as $lotId => $pos) {
                LotBucketItem::updateOrCreate(
                    ['lot_id' => $lotId, 'scheduled_date' => $date],
                    ['bucket_id' => $bucketId, 'position' => $pos],
                );
            }

            return [
                'items' => collect($positions)
                    ->map(fn($pos, $lotId) => ['lot_id' => $lotId, 'bucket_id' => $bucketId, 'bucket_position' => $pos])
                    ->values()->all(),
                'affected_timings' => self::timingsFor($machineIds, $date),
            ];
        });
    }

    public function releaseFromBuckets(array $lotIds, string $date): void
    {
        $lotIds = array_values(array_filter($lotIds));
        log_entities($lotIds);
        if ($lotIds) {
            LotBucketItem::where('scheduled_date', $date)->whereIn('lot_id', $lotIds)->delete();
        }
    }

    private function resolveBucketPositions(int $bucketId, array $lotIds, string $date, ?string $prevLotId, ?string $nextLotId, bool $retry = true): array
    {
        $items = LotBucketItem::where('bucket_id', $bucketId)
            ->where('scheduled_date', $date)
            ->whereNotIn('lot_id', $lotIds)
            ->orderBy('position')->lockForUpdate()->get();

        $prev = $prevLotId ? $items->firstWhere('lot_id', $prevLotId)?->position : null;
        $next = $nextLotId ? $items->firstWhere('lot_id', $nextLotId)?->position : null;

        if ($prev === null && $next === null) {
            $prev = $items->max('position');                       // append
        }
        if ($prev !== null && $next === null) {
            $next = $items->first(fn($i) => $i->position > $prev)?->position;
        } elseif ($next !== null && $prev === null) {
            $prev = $items->last(fn($i) => $i->position < $next)?->position;
        }

        $n = count($lotIds);
        [$start, $step] = match (true) {
            $prev !== null && $next !== null => [$prev, ($next - $prev) / ($n + 1)],
            $prev !== null                   => [$prev, self::GAP_SEED],
            $next !== null                   => [$next - ($n + 1) * self::GAP_SEED, self::GAP_SEED],
            default                          => [0, self::GAP_SEED],
        };

        if ($step < self::MIN_GAP && $retry) {
            foreach ($items as $i => $item) {
                $item->update(['position' => ($i + 1) * self::GAP_SEED]);
            }
            return $this->resolveBucketPositions($bucketId, $lotIds, $date, $prevLotId, $nextLotId, false);
        }

        $out = [];
        foreach (array_values($lotIds) as $i => $lotId) {
            $out[$lotId] = round($start + $step * ($i + 1), 4);
        }
        return $out;
    }
}
