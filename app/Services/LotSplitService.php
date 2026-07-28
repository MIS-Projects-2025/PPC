<?php

namespace App\Services;

use App\Exceptions\LoadingPlanDateFinalizedException;
use App\Exceptions\InvalidSplitException; // new — see note below
use App\Models\LoadingPlanEntry;
use App\Models\QdnMachine;
use App\Models\LotSplit;
use App\Models\CustomerDataWip;
use Illuminate\Support\Facades\DB;

class LotSplitService
{
    public function __construct(
        private LoadingPlanEntryService $entryService,
    ) {}

    public function split(
        string $parentLotId,
        string $date,
        int $childQty,
        string $targetMachine,
        ?int $beforeEntryId,
        ?int $afterEntryId,
        ?string $customChildLotId,
        ?string $createdBy,
    ): array {
        return DB::transaction(function () use (
            $parentLotId,
            $date,
            $childQty,
            $targetMachine,
            $beforeEntryId,
            $afterEntryId,
            $customChildLotId,
            $createdBy
        ) {
            $this->assertDateNotFinalized($date);

            if (!QdnMachine::where('machine_num', $targetMachine)->exists()) {
                throw new InvalidSplitException("Target [{$targetMachine}] does not exist.");
            }

            $parentEntry = LoadingPlanEntry::where('lot_id', $parentLotId)
                ->where('scheduled_date', $date)
                ->lockForUpdate()
                ->first();

            $parentAttrs = $this->resolveParentAttributes($parentLotId, $date, $parentEntry);

            $totalQty = $this->resolveBaseQty($parentLotId, $date, $parentEntry);

            if ($childQty <= 0 || $childQty >= $totalQty) {
                throw new InvalidSplitException("child_qty must be between 1 and " . ($totalQty - 1) . " (total was {$totalQty}).");
            }

            $rootLotId = $this->resolveRootLotId($parentLotId);
            $childLotId = $customChildLotId ?? $this->nextChildLotId($rootLotId);

            if (
                LoadingPlanEntry::where('lot_id', $childLotId)->where('scheduled_date', $date)->exists()
                || LotSplit::where('child_lot_id', $childLotId)->exists()
            ) {
                throw new InvalidSplitException("Lot ID [{$childLotId}] is already in use.");
            }

            if (!$parentEntry) {
                $parentEntry = LoadingPlanEntry::create([
                    'entry_type'     => 'lot',
                    'lot_id'         => $parentLotId,
                    'part_name'      => $parentAttrs['part_name'],
                    'package_name'   => $parentAttrs['package_name'],
                    'scheduled_date' => $date,
                    'qty_base'       => $totalQty,
                    'lock_version'   => 1,
                ]);
            } elseif ($parentEntry->qty_base === null) {
                $parentEntry->update(['qty_base' => $totalQty]);
            }

            $percentage = round(($childQty / $totalQty) * 100, 2);

            $split = LotSplit::create([
                'parent_lot_id'    => $parentLotId,
                'child_lot_id'     => $childLotId,
                'root_lot_id'      => $rootLotId,
                'scheduled_date'   => $date,
                'child_qty'        => $childQty,
                'split_percentage' => $percentage,
                'created_by'       => $createdBy,
            ]);

            // Create the child Unassigned first, then place it via the
            // exact same locking/sequencing path every other placement
            // uses — no duplicated logic, no risk of drifting behavior.
            $childEntry = LoadingPlanEntry::create([
                'entry_type'     => 'lot',
                'lot_id'         => $childLotId,
                'part_name'      => $parentAttrs['part_name'],
                'package_name'   => $parentAttrs['package_name'],
                'qty'            => $childQty,
                'scheduled_date' => $date,
                'machine_id'     => null,
                'status'         => $parentEntry->status,
                'lock_version'   => 1,
            ]);

            $childEntry = $this->entryService->transferEntry(
                'lot',
                $childLotId,
                null,
                $targetMachine,
                $beforeEntryId,
                $afterEntryId,
                $date,
            );

            $this->recalculateParentQty($parentEntry, $date);

            return [
                'split'  => $split->fresh(),
                'parent' => $parentEntry->fresh(),
                'child'  => $childEntry,
            ];
        });
    }

    public function revert(int $splitId, ?string $revertedBy): void
    {
        DB::transaction(function () use ($splitId, $revertedBy) {
            $split = LotSplit::active()->lockForUpdate()->findOrFail($splitId);

            $this->assertDateNotFinalized($split->scheduled_date->toDateString());

            $childEntry = LoadingPlanEntry::where('lot_id', $split->child_lot_id)
                ->where('scheduled_date', $split->scheduled_date)
                ->first();

            // Deliberately not deleting a child that's already been transferred
            // or edited — flagged as an open question below.
            $childEntry?->delete();

            $split->update([
                'reverted_at' => now(),
                'reverted_by' => $revertedBy,
            ]);

            $parentEntry = LoadingPlanEntry::where('lot_id', $split->parent_lot_id)
                ->where('scheduled_date', $split->scheduled_date)
                ->first();

            if ($parentEntry) {
                $this->recalculateParentQty($parentEntry, $split->scheduled_date->toDateString());
            }
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

        $entries = LoadingPlanEntry::whereIn('lot_id', $allLotIds)
            ->orderBy('scheduled_date')
            ->get()
            ->groupBy('lot_id'); // a lot_id can have multiple rows across dates

        return $splits->map(function ($split) use ($entries) {
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
                'parentAppearances' => $parentEntries->map(fn($e) => [
                    'date'    => $e->scheduled_date->toDateString(),
                    'machine' => $e->finalized_at ? $e->machine_snapshot : $e->getMachineName(),
                    'qty'     => $e->qty_override ?? $e->qty_base ?? $e->qty,
                ])->values(),
                'childAppearances' => $childEntries->map(fn($e) => [
                    'date'    => $e->scheduled_date->toDateString(),
                    'machine' => $e->finalized_at ? $e->machine_snapshot : $e->getMachineName(),
                    'qty'     => $e->qty_override ?? $e->qty,
                ])->values(),
            ];
        })->values();
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    private function recalculateParentQty(LoadingPlanEntry $parentEntry, string $date): void
    {
        $activeChildQty = LotSplit::active()
            ->where('parent_lot_id', $parentEntry->lot_id)
            ->where('scheduled_date', $date)
            ->sum('child_qty');

        $base = $parentEntry->qty_base;

        $parentEntry->update([
            'qty_override' => $activeChildQty > 0 ? ($base - $activeChildQty) : null,
        ]);
    }

    private function resolveParentAttributes(string $lotId, string $date, ?LoadingPlanEntry $entry): array
    {
        // Prefer the entry's own values if it already has them (manual lot,
        // or already-split-before parent that inherited correctly last time).
        if ($entry && $entry->part_name && $entry->package_name) {
            return [
                'part_name'    => $entry->part_name,
                'package_name' => $entry->package_name,
            ];
        }

        // Otherwise this is a WIP-backed lot whose own row never carries these —
        // pull from customer_data_wip directly, same source buildPlanRows() uses.
        $wip = CustomerDataWip::query()->forDate($date)->where('Lot_Id', $lotId)->first();

        if (!$wip) {
            throw new InvalidSplitException("Could not resolve part/package name for lot [{$lotId}] on {$date}.");
        }

        return [
            'part_name'    => $wip->Part_Name,
            'package_name' => $wip->Package_Name,
        ];
    }

    /** The qty to split from: entry's current effective qty if it already
     *  exists (qty_override or qty_base or qty), else the WIP source. */
    private function resolveBaseQty(string $lotId, string $date, ?LoadingPlanEntry $entry): int
    {
        if ($entry) {
            return $entry->qty_override ?? $entry->qty_base ?? $entry->qty ?? $this->wipQty($lotId, $date);
        }

        return $this->wipQty($lotId, $date);
    }

    private function wipQty(string $lotId, string $date): int
    {
        // NOTE: confirm CustomerDataWip::forDate() scope supports a single
        // lot lookup like this — see open question below.
        $qty = CustomerDataWip::query()->forDate($date)->where('Lot_Id', $lotId)->value('Qty');

        if ($qty === null) {
            throw new InvalidSplitException("Could not resolve original quantity for lot [{$lotId}] on {$date}.");
        }

        return (int) $qty;
    }

    /** Strip a trailing .N suffix, if any, to get the root lot id. */
    private function resolveRootLotId(string $lotId): string
    {
        // A lot_id is only ever a "child" if it's itself a recorded child
        // in lot_splits — walk up via that table rather than guessing from
        // the string shape, since real Lot_Ids might legitimately contain dots.
        $asChild = LotSplit::where('child_lot_id', $lotId)->value('root_lot_id');

        return $asChild ?? $lotId;
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
        $isChild = $splitsByChild->has($lotId);

        if (!$isParent && !$isChild) {
            return null;
        }

        // rootLotId lets the frontend call historyFor() directly without
        // needing to strip the .N suffix itself — same value regardless of
        // whether this row is the parent or a child, since it's one family.
        $rootLotId = $isChild
            ? $splitsByChild->get($lotId)->root_lot_id
            : $splitsByParent->get($lotId)->first()->root_lot_id;

        return [
            'isParent'   => $isParent,
            'isChild'    => $isChild,
            'rootLotId'  => $rootLotId,
        ];
    }
}
