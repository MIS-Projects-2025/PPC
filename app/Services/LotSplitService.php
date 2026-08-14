<?php

namespace App\Services;

use App\Exceptions\LoadingPlanDateFinalizedException;
use App\Exceptions\InvalidSplitException; // new — see note below
use App\Models\LoadingPlanEntry;
use App\Models\QdnMachine;
use App\Models\LotQuantity;
use App\Models\LotSplit;
use App\Models\CustomerDataWip;
use Exception;
use Illuminate\Support\Facades\DB;

class LotSplitService
{
    public function __construct(
        private LoadingPlanEntryService $entryService,
    ) {}

    public function split(
        int $parentEntryLotId,
        int $childQty,
        string $targetMachine,
        ?int $beforeEntryId,
        ?int $afterEntryId,
        ?string $customChildLotId,
        ?string $createdBy,
    ): array {
        return DB::transaction(function () use (
            $parentEntryLotId,
            $childQty,
            $targetMachine,
            $beforeEntryId,
            $afterEntryId,
            $customChildLotId,
            $createdBy
        ) {
            $parentEntry = LoadingPlanEntry::findOrFailNotFinalized($parentEntryLotId);
            $date = $parentEntry->scheduled_date;

            if (!QdnMachine::where('machine_num', $targetMachine)->exists()) {
                throw new InvalidSplitException("Target [{$targetMachine}] does not exist.");
            }

            $parentAttrs = $this->resolveParentAttributes($parentEntry);

            $totalQty = $this->resolveBaseQty($parentEntry);

            if ($childQty <= 0 || $childQty >= $totalQty) {
                throw new InvalidSplitException("child_qty must be between 1 and " . ($totalQty - 1) . " (total was {$totalQty}).");
            }

            $rootLotId = $parentEntry->resolveRootLotId();
            $childLotId = $customChildLotId ?? $this->nextChildLotId($rootLotId);

            if (
                LoadingPlanEntry::where('lot_id', $childLotId)->where('scheduled_date', $date)->exists()
                || LotSplit::active()->where('child_lot_id', $childLotId)->exists()
            ) {
                throw new InvalidSplitException("Lot ID [{$childLotId}] is already in use.");
            }

            $percentage = round(($childQty / $totalQty) * 100, 2);

            // Create the child Unassigned first, then place it via the
            // exact same locking/sequencing path every other placement
            // uses — no duplicated logic, no risk of drifting behavior.
            $childEntry = LoadingPlanEntry::create([
                'entry_type'     => 'lot',
                'lot_id'         => $childLotId,
                'package_name'   => $parentAttrs['package_name'],
                'scheduled_date' => $date,
                'machine_id'     => null,
                'status'         => $parentEntry->status,
                'lock_version'   => 1,
            ]);

            LotQuantity::updateOrCreate(
                ['lot_id' => $childLotId, 'scheduled_date' => $date],
                ['part_name' => $parentAttrs['part_name'], 'qty_base' => $childQty, 'split_adjustment' => 0, 'merge_adjustment' => 0]
            );

            $childEntry = $this->entryService->transferEntry(
                'lot',
                $childLotId,
                null,
                $targetMachine,
                $beforeEntryId,
                $afterEntryId,
            );

            $split = LotSplit::create([
                'parent_lot_id'    => $parentEntry->lot_id,
                'child_lot_id'     => $childLotId,
                'root_lot_id'      => $rootLotId,
                'scheduled_date'   => $date,
                'child_qty'        => $childQty,
                'split_percentage' => $percentage,
                'target_machine'   => $targetMachine,
                'sequence_order_at_split' => $childEntry->sequence_order,
                'created_by'       => $createdBy,
            ]);

            $this->entryService->enrichEntryForResponse($childEntry, $rootLotId);

            $this->recalculateParentQty($parentEntry);

            $freshParent = $parentEntry->fresh();
            $this->entryService->enrichEntryForResponse($freshParent, $rootLotId);

            $freshParent->splitInfo = [
                'isParent'  => true,
                'isChild'   => false,
                'rootLotId' => $rootLotId,
                'splitId'   => null, // ambiguous when a parent has multiple splits — matches buildSplitMeta()'s convention
            ];

            $childEntry->splitInfo = [
                'isParent'  => false,
                'isChild'   => true,
                'rootLotId' => $rootLotId,
                'splitId'   => $split->id, // unambiguous for a child — always exactly one
            ];

            return [
                'split'  => $split->fresh(),
                'parent' => $freshParent,
                'child'  => $childEntry,
            ];
        });
    }

    public function revert(int $splitId, ?string $revertedBy): array
    {
        return DB::transaction(function () use ($splitId, $revertedBy) {
            $split = LotSplit::active()->lockForUpdate()->findOrFail($splitId);

            $this->assertDateNotFinalized($split->scheduled_date->toDateString());
            $this->assertNotInvolvedInMerge($split->child_lot_id, $split->scheduled_date->toDateString());

            $childEntry = LoadingPlanEntry::where('lot_id', $split->child_lot_id)
                ->where('scheduled_date', $split->scheduled_date)
                ->first();

            $childLotId = $split->child_lot_id;
            $childMachine = $childEntry?->finalized_at
                ? $childEntry->machine_snapshot
                : $childEntry?->getMachineName();

            $childEntry?->delete();

            $split->update([
                'reverted_at' => now(),
                'reverted_by' => $revertedBy,
            ]);

            $parentEntry = LoadingPlanEntry::where('lot_id', $split->parent_lot_id)
                ->where('scheduled_date', $split->scheduled_date)
                ->first();

            $parentQuantity = null;
            $parentSplitInfo = null;

            if ($parentEntry) {
                $this->recalculateParentQty($parentEntry);
                $parentEntry = $parentEntry->fresh();

                $this->entryService->enrichEntryForResponse($parentEntry, $split->root_lot_id);

                $parentQuantity = LotQuantity::where('lot_id', $parentEntry->lot_id)
                    ->where('scheduled_date', $split->scheduled_date)
                    ->first();

                $stillActiveSplits = LotSplit::active()
                    ->where('parent_lot_id', $parentEntry->lot_id)
                    ->where('scheduled_date', $split->scheduled_date)
                    ->exists();

                $parentSplitInfo = $stillActiveSplits ? [
                    'isParent'  => true,
                    'isChild'   => false,
                    'rootLotId' => $split->root_lot_id,
                    'splitId'   => null,
                ] : null;
            }

            return [
                'split'              => $split->fresh(),
                'parent'             => $parentEntry,
                'parentQty'          => $parentQuantity?->effectiveQty(),
                'parentDoable'       => $parentQuantity?->commit,
                'parentDoableStatus' => $parentQuantity?->recipe_status,
                'parentCapacityUph'  => $parentQuantity?->capacity_uph_snapshot,
                'parentSplitInfo'    => $parentSplitInfo,
                'deleted'            => $childLotId,
            ];
        });
    }

    private function assertNotInvolvedInMerge(string $lotId, string $date): void
    {
        $isMergeTarget = \App\Models\LotMerge::active()
            ->where('target_lot_id', $lotId)->where('scheduled_date', $date)->exists();
        $isMergeSource = \App\Models\LotMerge::active()
            ->where('source_lot_id', $lotId)->where('scheduled_date', $date)->exists();

        if ($isMergeTarget || $isMergeSource) {
            throw new InvalidSplitException("Lot [{$lotId}] is currently part of an active merge — revert the merge first.");
        }
    }

    public function unrevert(int $splitId, ?string $unrevertedBy): array
    {
        return DB::transaction(function () use ($splitId, $unrevertedBy) {
            $split = LotSplit::whereNotNull('reverted_at')->lockForUpdate()->findOrFail($splitId);

            $this->assertDateNotFinalized($split->scheduled_date->toDateString());

            if (LoadingPlanEntry::where('lot_id', $split->child_lot_id)
                ->where('scheduled_date', $split->scheduled_date)
                ->exists()
            ) {
                throw new InvalidSplitException("Lot ID [{$split->child_lot_id}] is now in use and can't be restored.");
            }

            $parentEntry = LoadingPlanEntry::where('lot_id', $split->parent_lot_id)
                ->where('scheduled_date', $split->scheduled_date)
                ->first();

            if (!$parentEntry) {
                throw new InvalidSplitException("Parent lot [{$split->parent_lot_id}] no longer has an entry on {$split->scheduled_date->toDateString()}.");
            }

            $parentQuantityForPartName = LotQuantity::where('lot_id', $parentEntry->lot_id)
                ->where('scheduled_date', $split->scheduled_date)
                ->first();

            $childEntry = LoadingPlanEntry::create([
                'entry_type'     => 'lot',
                'lot_id'         => $split->child_lot_id,
                'package_name'   => $parentEntry->package_name,
                'scheduled_date' => $split->scheduled_date,
                'machine_id'     => null,
                'status'         => $parentEntry->status,
                'lock_version'   => 1,
            ]);

            LotQuantity::updateOrCreate(
                ['lot_id' => $split->child_lot_id, 'scheduled_date' => $split->scheduled_date],
                ['part_name' => $parentQuantityForPartName?->part_name, 'qty_base' => $split->child_qty, 'split_adjustment' => 0, 'merge_adjustment' => 0]
            );

            [$beforeEntryId, $afterEntryId] = $this->entryService->findNeighborsForTargetPosition(
                $split->target_machine,
                $split->scheduled_date->toDateString(),
                $split->sequence_order_at_split,
            );

            $childEntry = $this->entryService->transferEntry(
                'lot',
                $split->child_lot_id,
                null,
                $split->target_machine,
                $beforeEntryId,
                $afterEntryId,
                $split->scheduled_date->toDateString(),
            );

            $this->entryService->enrichEntryForResponse($childEntry, $split->root_lot_id);

            $childQuantity = LotQuantity::where('lot_id', $childEntry->lot_id)
                ->where('scheduled_date', $split->scheduled_date)
                ->first();

            $split->update(['reverted_at' => null, 'reverted_by' => null]);

            $this->recalculateParentQty($parentEntry);
            $parentEntry = $parentEntry->fresh();

            $parentQuantity = LotQuantity::where('lot_id', $parentEntry->lot_id)
                ->where('scheduled_date', $split->scheduled_date)
                ->first();

            $parentSplitInfo = [
                'isParent'  => true,
                'isChild'   => false,
                'rootLotId' => $split->root_lot_id,
                'splitId'   => null,
            ];

            $childSplitInfo = [
                'isParent'  => false,
                'isChild'   => true,
                'rootLotId' => $split->root_lot_id,
                'splitId'   => $split->id,
            ];

            $this->recalculateParentQty($parentEntry);
            $parentEntry = $parentEntry->fresh();

            $parentQuantity = LotQuantity::where('lot_id', $parentEntry->lot_id)
                ->where('scheduled_date', $split->scheduled_date)
                ->first();

            $stillActiveSplits = LotSplit::active()
                ->where('parent_lot_id', $parentEntry->lot_id)
                ->where('scheduled_date', $split->scheduled_date)
                ->exists();

            $parentSplitInfo = $stillActiveSplits ? [
                'isParent'  => true,
                'isChild'   => false,
                'rootLotId' => $split->root_lot_id,
                'splitId'   => null,
            ] : null;

            return [
                'split'  => $split->fresh(),

                'parent'             => $parentEntry,
                'parentQty'          => $parentQuantity?->effectiveQty(),
                'parentDoable'       => $parentQuantity?->commit,
                'parentDoableStatus' => $parentQuantity?->recipe_status,
                'parentCapacityUph'  => $parentQuantity?->capacity_uph_snapshot,
                'parentSplitInfo'    => $parentSplitInfo,

                'child'              => $childEntry,
                'childQty'           => $childQuantity?->effectiveQty(),
                'childDoable'        => $childQuantity?->commit,
                'childDoableStatus'  => $childQuantity?->recipe_status,
                'childCapacityUph'   => $childQuantity?->capacity_uph_snapshot,
                'childSplitInfo'     => $childSplitInfo,
            ];
        });
    }

    /** Every split in this lot's family tree, with machine/date context for
     *  each side, regardless of what date any individual fragment landed on. */
    public function historyFor(string $rootLotId): \Illuminate\Support\Collection
    {
        $splits = LotSplit::where('root_lot_id', $rootLotId)
            ->orderBy('created_at')
            ->get();

        if ($splits->isEmpty()) {
            return collect();
        }

        // Every lot_id that appears anywhere in this family, across every date
        // it was ever scheduled on — not just today's.
        $allLotIds = $splits->pluck('parent_lot_id')
            ->concat($splits->pluck('child_lot_id'))
            ->push($rootLotId)
            ->unique()
            ->values();

        $quantities = LotQuantity::whereIn('lot_id', $allLotIds)
            ->get()
            ->groupBy('lot_id'); // keyed collection, one lot_id can have rows across multiple dates

        $entries = LoadingPlanEntry::whereIn('lot_id', $allLotIds)
            ->orderBy('scheduled_date')
            ->get()
            ->groupBy('lot_id'); // a lot_id can have multiple rows across dates

        return $splits->map(function ($split) use ($entries, $quantities) {
            $parentEntries = $entries->get($split->parent_lot_id, collect());
            $childEntries  = $entries->get($split->child_lot_id, collect());

            return [
                'splitId'         => $split->id,
                'parentLotId'     => $split->parent_lot_id,
                'childLotId'      => $split->child_lot_id,
                'scheduledDate'   => $split->scheduled_date->toDateString(),
                'childQty'        => $split->child_qty,
                'percent'         => (float) $split->split_percentage,
                'createdBy'       => $split->created_by,
                'createdAt'       => $split->created_at,
                'revertedAt'      => $split->reverted_at,
                'revertedBy'      => $split->reverted_by,
                'parentAppearances' => $parentEntries->map(function ($e) use ($quantities) {
                    $q = $quantities->get($e->lot_id, collect())
                        ->firstWhere('scheduled_date', $e->scheduled_date);
                    return [
                        'date'    => $e->scheduled_date->toDateString(),
                        'machine' => $e->finalized_at ? $e->machine_snapshot : $e->getMachineName(),
                        'qty'     => $q?->effectiveQty(),
                    ];
                })->values(),
                'childAppearances' => $childEntries->map(function ($e) use ($quantities) {
                    $q = $quantities->get($e->lot_id, collect())
                        ->firstWhere('scheduled_date', $e->scheduled_date);
                    return [
                        'date'    => $e->scheduled_date->toDateString(),
                        'machine' => $e->finalized_at ? $e->machine_snapshot : $e->getMachineName(),
                        'qty'     => $q?->effectiveQty(),
                    ];
                })->values(),
            ];
        })->values();
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    private function recalculateParentQty(LoadingPlanEntry $parentEntry): void
    {
        $date = $parentEntry->scheduled_date;

        $activeChildQty = LotSplit::active()
            ->where('parent_lot_id', $parentEntry->lot_id)
            ->where('scheduled_date', $date)
            ->sum('child_qty');

        $parentQuantity = LotQuantity::where('lot_id', $parentEntry->lot_id)
            ->where('scheduled_date', $date)
            ->first();

        if (! $parentQuantity) {
            throw new InvalidSplitException("Apparently there's no LotQuantity entries for the parent of this splitting");
        }

        $parentQuantity->update([
            'split_adjustment' => -$activeChildQty,
        ]);

        app(LotScheduleCalculator::class, [
            'dates' => [$date],
            'lotIds' => [$parentEntry->lot_id],
        ])->recalculateAndRetime($parentEntry->lot_id, $date, $parentEntry->machine_id);
    }

    private function resolveParentAttributes(LoadingPlanEntry $entry): array
    {
        $lotId = $entry->lot_id;
        $date = $entry->scheduled_date;

        $quantity = LotQuantity::where('lot_id', $lotId)
            ->where('scheduled_date', $date)
            ->first();

        $packageName = $entry->package_name;
        $wip = null;

        if (!$packageName || !$quantity) {
            $wip = CustomerDataWip::query()
                ->where('Lot_Id', $lotId)
                ->orderByDesc('import_date')
                ->first();

            if (!$packageName) {
                $packageName = $wip->Package_Name ?? null;
            }
        }

        if ($quantity) {
            return [
                'part_name'    => $quantity->part_name,
                'package_name' => $packageName,
            ];
        }

        if (!$wip) {
            throw new InvalidSplitException("Could not resolve part/package name for lot [{$lotId}] on {$date}.");
        }

        return [
            'part_name'    => $wip->Part_Name,
            'package_name' => $packageName,
        ];
    }

    /** The qty to split from: entry's current effective qty if a LotQuantity
     *  row already exists, else the WIP source. */
    private function resolveBaseQty(LoadingPlanEntry $entry): int
    {
        $lotId = $entry->lot_id;
        $date = $entry->scheduled_date;

        $quantity = LotQuantity::where('lot_id', $lotId)->where('scheduled_date', $date)->first();

        if ($quantity) {
            return $quantity->effectiveQty();
        }

        return $this->wipQty($lotId);
    }

    private function wipQty(string $lotId): int
    {
        $qty = CustomerDataWip::query()
            ->where('Lot_Id', $lotId)
            ->orderByDesc('import_date')
            ->value('Qty');

        if ($qty === null) {
            throw new InvalidSplitException("Could not resolve original quantity for lot [{$lotId}].");
        }

        return (int) $qty;
    }

    private function nextChildLotId(string $rootLotId): string
    {
        $usedSuffixes = LotSplit::where('root_lot_id', $rootLotId)
            ->pluck('child_lot_id')
            ->map(function ($id) use ($rootLotId) {
                $suffix = ltrim(substr($id, strlen($rootLotId)), '.');
                return is_numeric($suffix) ? (int) $suffix : null;
            })
            ->filter()
            ->push(1) // root itself counts as ".1" conceptually
            ->max();

        return $rootLotId . '.' . ($usedSuffixes + 1);
    }

    private function assertDateNotFinalized(string $date): void
    {
        $isFinalized = LoadingPlanEntry::where('scheduled_date', $date)
            ->whereNotNull('finalized_at')
            ->exists();

        if ($isFinalized) {
            throw new LoadingPlanDateFinalizedException($date);
        }
    }

    public static function buildSplitMeta(?string $lotId, $splitsByParent, $splitsByChild): ?array
    {
        if (!$lotId) {
            return null;
        }

        $isParent = $splitsByParent->has($lotId);
        $childSplit = $splitsByChild->get($lotId); // null if not a child

        if (!$isParent && !$childSplit) {
            return null;
        }

        $rootLotId = $childSplit
            ? $childSplit->root_lot_id
            : $splitsByParent->get($lotId)->first()->root_lot_id;

        return [
            'isParent'  => $isParent,
            'isChild'   => $childSplit !== null,
            'rootLotId' => $rootLotId,
            'splitId'   => $childSplit?->id, // unambiguous for children, null for parents
        ];
    }
}
