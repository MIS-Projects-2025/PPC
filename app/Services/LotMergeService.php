<?php

namespace App\Services;

use App\Models\LoadingPlanEntry;
use App\Models\LotMerge;
use App\Models\LotQuantity;
use App\Exceptions\InvalidMergeException;
use App\Exceptions\LoadingPlanDateFinalizedException;
use Illuminate\Support\Facades\DB;

class LotMergeService
{
    public function __construct(
        private LoadingPlanEntryService $entryService,
    ) {}

    public function merge(string $lotIdA, string $lotIdB, string $date, ?string $createdBy): array
    {
        return DB::transaction(function () use ($lotIdA, $lotIdB, $date, $createdBy) {
            $this->assertDateNotFinalized($date);

            if ($lotIdA === $lotIdB) {
                throw new InvalidMergeException("Cannot merge a lot into itself.");
            }

            $quantityA = LotQuantity::where('lot_id', $lotIdA)->where('scheduled_date', $date)->first();
            $quantityB = LotQuantity::where('lot_id', $lotIdB)->where('scheduled_date', $date)->first();

            if (!$quantityA || !$quantityB) {
                throw new InvalidMergeException("Both lots must have a resolvable quantity to merge.");
            }

            if ($quantityA->part_name !== $quantityB->part_name) {
                throw new InvalidMergeException("Cannot merge lots with different part names ([{$quantityA->part_name}] vs [{$quantityB->part_name}]).");
            }

            $qtyA = $quantityA->effectiveQty();
            $qtyB = $quantityB->effectiveQty();

            // Larger qty is target/parent; smaller is source/child. Equal → A wins arbitrarily.
            [$targetLotId, $sourceLotId, $targetQty, $sourceQty, $targetQuantity, $sourceQuantity] = ($qtyA >= $qtyB)
                ? [$lotIdA, $lotIdB, $qtyA, $qtyB, $quantityA, $quantityB]
                : [$lotIdB, $lotIdA, $qtyB, $qtyA, $quantityB, $quantityA];

            // Target absorbs source's qty on top of whatever it currently has.
            $targetQuantity->update(['merge_adjustment' => $targetQuantity->merge_adjustment + $sourceQty]);

            // Source zeroes out but stays visible — merged marker, not deleted.
            $sourceQuantity->update(['merge_adjustment' => $sourceQuantity->merge_adjustment - $sourceQty]);

            $merge = LotMerge::create([
                'target_lot_id'    => $targetLotId,
                'source_lot_id'    => $sourceLotId,
                'scheduled_date'   => $date,
                'transferred_qty'  => $sourceQty,
                'created_by'       => $createdBy,
            ]);

            $calc = app(LotScheduleCalculator::class, [
                'date' => $date,
                'lotIds' => [$targetLotId, $sourceLotId],
            ]);

            $targetEntry = LoadingPlanEntry::where('lot_id', $targetLotId)->where('scheduled_date', $date)->first();
            $calc->recalculate($targetLotId, $date);
            $targetEntry = $targetEntry->fresh();
            $this->entryService->enrichEntryForResponse($targetEntry, $targetEntry->resolveRootLotId(), $date);

            $sourceEntry = LoadingPlanEntry::where('lot_id', $sourceLotId)->where('scheduled_date', $date)->first();
            $calc->recalculate($sourceLotId, $date);
            $sourceEntry = $sourceEntry->fresh();
            $this->entryService->enrichEntryForResponse($sourceEntry, $sourceEntry->resolveRootLotId(), $date);

            $targetEntry->mergeInfo = ['isTarget' => true, 'isSource' => false, 'mergeId' => $merge->id, 'mergedFrom' => $sourceLotId];
            $sourceEntry->mergeInfo = ['isTarget' => false, 'isSource' => true, 'mergeId' => $merge->id, 'mergedInto' => $targetLotId];

            return [
                'merge'  => $merge->fresh(),
                'target' => $targetEntry,
                'source' => $sourceEntry,
            ];
        });
    }

    public function revert(int $mergeId, ?string $revertedBy): array
    {
        return DB::transaction(function () use ($mergeId, $revertedBy) {
            $merge = LotMerge::active()->lockForUpdate()->findOrFail($mergeId);
            $date = $merge->scheduled_date->toDateString();

            $this->assertDateNotFinalized($date);

            $targetQuantity = LotQuantity::where('lot_id', $merge->target_lot_id)
                ->where('scheduled_date', $merge->scheduled_date)->first();
            $sourceQuantity = LotQuantity::where('lot_id', $merge->source_lot_id)
                ->where('scheduled_date', $merge->scheduled_date)->first();

            if ($targetQuantity) {
                $targetQuantity->update([
                    'merge_adjustment' => $targetQuantity->merge_adjustment - $merge->transferred_qty,
                ]);
            }

            if ($sourceQuantity) {
                $sourceQuantity->update([
                    'merge_adjustment' => $sourceQuantity->merge_adjustment + $merge->transferred_qty,
                ]);
            }

            $merge->update(['reverted_at' => now(), 'reverted_by' => $revertedBy]);

            $targetEntry = LoadingPlanEntry::where('lot_id', $merge->target_lot_id)->where('scheduled_date', $merge->scheduled_date)->first();
            $sourceEntry = LoadingPlanEntry::where('lot_id', $merge->source_lot_id)->where('scheduled_date', $merge->scheduled_date)->first();

            $calc = app(LotScheduleCalculator::class, [
                'date' => $date,
                'lotIds' => [$merge->target_lot_id, $merge->source_lot_id],
            ]);

            if ($targetEntry) {
                $calc->recalculate($merge->target_lot_id, $date);
                $targetEntry = $targetEntry->fresh();
                $this->entryService->enrichEntryForResponse($targetEntry, $targetEntry->resolveRootLotId(), $date);
                $targetEntry->mergeInfo = null;
            }

            if ($sourceEntry) {
                $calc->recalculate($merge->source_lot_id, $date);
                $sourceEntry = $sourceEntry->fresh();
                $this->entryService->enrichEntryForResponse($sourceEntry, $sourceEntry->resolveRootLotId(), $date);
                $sourceEntry->mergeInfo = null;
            }

            return [
                'merge'  => $merge->fresh(),
                'target' => $targetEntry,
                'source' => $sourceEntry,
            ];
        });
    }

    public function unrevert(int $mergeId, ?string $unrevertedBy): array
    {
        return DB::transaction(function () use ($mergeId, $unrevertedBy) {
            $merge = LotMerge::whereNotNull('reverted_at')->lockForUpdate()->findOrFail($mergeId);
            $date = $merge->scheduled_date->toDateString();

            $this->assertDateNotFinalized($date);

            // re-apply the same qty transfer revert() undid
            $targetQuantity = LotQuantity::where('lot_id', $merge->target_lot_id)->where('scheduled_date', $merge->scheduled_date)->first();
            $sourceQuantity = LotQuantity::where('lot_id', $merge->source_lot_id)->where('scheduled_date', $merge->scheduled_date)->first();

            if (!$targetQuantity || !$sourceQuantity) {
                throw new InvalidMergeException("Missing quantity record for one of these lots — can't restore merge.");
            }

            $targetQuantity->update([
                'merge_adjustment' => $targetQuantity->merge_adjustment + $merge->transferred_qty,
            ]);
            $sourceQuantity->update([
                'merge_adjustment' => $sourceQuantity->merge_adjustment - $merge->transferred_qty,
            ]);

            $merge->update(['reverted_at' => null, 'reverted_by' => null]);

            $targetEntry = LoadingPlanEntry::where('lot_id', $merge->target_lot_id)->where('scheduled_date', $merge->scheduled_date)->first();
            $sourceEntry = LoadingPlanEntry::where('lot_id', $merge->source_lot_id)->where('scheduled_date', $merge->scheduled_date)->first();

            $calc = app(LotScheduleCalculator::class, [
                'date' => $date,
                'lotIds' => [$merge->target_lot_id, $merge->source_lot_id],
            ]);

            if ($targetEntry) {
                $calc->recalculate($merge->target_lot_id, $date);
                $targetEntry = $targetEntry->fresh();
                $this->entryService->enrichEntryForResponse($targetEntry, $targetEntry->resolveRootLotId(), $date);
                $targetEntry->mergeInfo = ['isTarget' => true, 'isSource' => false, 'mergeId' => $merge->id, 'mergedFrom' => $merge->source_lot_id];
            }

            if ($sourceEntry) {
                $calc->recalculate($merge->source_lot_id, $date);
                $sourceEntry = $sourceEntry->fresh();
                $this->entryService->enrichEntryForResponse($sourceEntry, $sourceEntry->resolveRootLotId(), $date);
                $sourceEntry->mergeInfo = ['isTarget' => false, 'isSource' => true, 'mergeId' => $merge->id, 'mergedInto' => $merge->target_lot_id];
            }

            return ['merge' => $merge->fresh(), 'target' => $targetEntry, 'source' => $sourceEntry];
        });
    }

    public static function buildMergeMeta(?string $lotId, $mergesByTarget, $mergesBySource): ?array
    {
        if (!$lotId) return null;
        // TODO: what if the lot is both source and target
        $asTarget = $mergesByTarget->has($lotId);
        $asSource = $mergesBySource->get($lotId);

        if (!$asTarget && !$asSource) return null;

        return [
            'isTarget'   => $asTarget,
            'isSource'   => $asSource !== null,
            'mergeId'    => $asSource?->id ?? $mergesByTarget->get($lotId)?->first()?->id,
            'mergedInto' => $asSource?->target_lot_id ?? null,
            'mergedFrom' => $asSource ?? $mergesByTarget->get($lotId)?->first()?->source_lot_id
        ];
    }

    private function currentQty(string $lotId, string $date): ?int
    {
        $quantity = LotQuantity::where('lot_id', $lotId)->where('scheduled_date', $date)->first();
        return $quantity?->effectiveQty();
    }

    private function assertDateNotFinalized(string $date): void
    {
        $isFinalized = LoadingPlanEntry::where('scheduled_date', $date)->whereNotNull('finalized_at')->exists();
        if ($isFinalized) {
            throw new LoadingPlanDateFinalizedException($date);
        }
    }

    public function historyFor(string $lotId): \Illuminate\Support\Collection
    {
        return LotMerge::where('target_lot_id', $lotId)
            ->orWhere('source_lot_id', $lotId)
            ->orderBy('created_at')
            ->get()
            ->map(fn($m) => [
                'mergeId'         => $m->id,
                'targetLotId'     => $m->target_lot_id,
                'sourceLotId'     => $m->source_lot_id,
                'scheduledDate'   => $m->scheduled_date->toDateString(),
                'transferredQty'  => $m->transferred_qty,
                'createdBy'       => $m->created_by,
                'createdAt'       => $m->created_at,
                'revertedAt'      => $m->reverted_at,
                'revertedBy'      => $m->reverted_by,
            ]);
    }
}
