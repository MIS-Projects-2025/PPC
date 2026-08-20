<?php

namespace App\Services;

use App\Models\LoadingPlanEntry;
use App\Models\LotMerge;
use App\Models\LotQuantity;
use App\Exceptions\InvalidMergeException;
use App\Traits\ValidatesLoadingPlanEntries;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\Eloquent\Collection;

class LotMergeService
{
    use ValidatesLoadingPlanEntries;

    public function __construct() {}

    public function merge(int $entryIdA, int $entryIdB, ?string $createdBy): array
    {
        return DB::transaction(function () use ($entryIdA, $entryIdB, $createdBy) {
            if ($entryIdA === $entryIdB) {
                throw new InvalidMergeException("Cannot merge an entry into itself.");
            }

            $entryA = LoadingPlanEntry::findOrFail($entryIdA);
            $entryB = LoadingPlanEntry::findOrFail($entryIdB);

            // Derive and validate that both entries share the exact same scheduled date
            $date = $this->assertConsistentDates([$entryA, $entryB]);

            $this->assertDateNotFinalized($date);

            if ($entryA->lot_id === $entryB->lot_id) {
                throw new InvalidMergeException("Cannot merge a lot into itself.");
            }

            // Fetch LotQuantity records via LoadingPlanEntry attributes
            $quantityA = $entryA->getQuantityRow();
            $quantityB = $entryB->getQuantityRow();

            if (!$quantityA || !$quantityB) {
                throw new InvalidMergeException("Both lots must have a resolvable quantity to merge.");
            }

            if ($quantityA->part_name !== $quantityB->part_name) {
                throw new InvalidMergeException("Cannot merge lots with different part names ([{$quantityA->part_name}] vs [{$quantityB->part_name}]).");
            }

            $qtyA = $quantityA->effectiveQty();
            $qtyB = $quantityB->effectiveQty();

            // Larger qty is target/parent; smaller is source/child. Equal → A wins arbitrarily.
            [$targetEntry, $sourceEntry, $targetQuantity, $sourceQuantity, $targetQty, $sourceQty] = ($qtyA >= $qtyB)
                ? [$entryA, $entryB, $quantityA, $quantityB, $qtyA, $qtyB]
                : [$entryB, $entryA, $quantityB, $quantityA, $qtyB, $qtyA];

            $targetLotId = $targetEntry->lot_id;
            $sourceLotId = $sourceEntry->lot_id;

            // Target absorbs source's qty on top of whatever it currently has.
            $targetQuantity->update(['merge_adjustment' => $targetQuantity->merge_adjustment + $sourceQty]);

            // Source zeroes out but stays visible — merged marker, not deleted.
            $sourceQuantity->update(['merge_adjustment' => $sourceQuantity->merge_adjustment - $sourceQty]);

            $merge = LotMerge::create([
                'target_lot_id'   => $targetLotId,
                'source_lot_id'   => $sourceLotId,
                'scheduled_date'  => $date,
                'transferred_qty' => $sourceQty,
                'created_by'      => $createdBy,
            ]);

            $calc = app(LotScheduleCalculator::class, [
                'dates'  => [$date],
                'lotIds' => [$targetLotId, $sourceLotId],
            ]);
            $calc->loadPackageList();

            $loadingPlanService = new LoadingPlanService($date);

            $calc->recalculateAndRetime($targetEntry->getKey(), $targetEntry->machine_id);
            $targetEnriched = $loadingPlanService->enrichEntryForResponse(
                $targetEntry->fresh(),
                $targetEntry->resolveRootLotId()
            );

            $calc->recalculateAndRetime($sourceEntry->getKey(), $sourceEntry->machine_id);
            $sourceEnriched = $loadingPlanService->enrichEntryForResponse(
                $sourceEntry->fresh(),
                $sourceEntry->resolveRootLotId()
            );

            $targetEnriched->merge_info = ['isTarget' => true, 'isSource' => false, 'mergeId' => $merge->id, 'mergedFrom' => $sourceLotId];
            $sourceEnriched->merge_info = ['isTarget' => false, 'isSource' => true, 'mergeId' => $merge->id, 'mergedInto' => $targetLotId];

            return [
                'merge'  => $merge->fresh(),
                'target' => $targetEnriched,
                'source' => $sourceEnriched,
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
                'dates' => [$date],
                'lotIds' => [$merge->target_lot_id, $merge->source_lot_id],
            ]);
            $calc->loadPackageList();

            $loadingPlanService = new LoadingPlanService($date);

            if ($targetEntry) {
                $calc->recalculateAndRetime($targetEntry->getKey(), $targetEntry->machine_id);
                $targetEntry = $loadingPlanService->enrichEntryForResponse(
                    $targetEntry->fresh(),
                    $targetEntry->resolveRootLotId()
                );
                $targetEntry->merge_info = null;
            }

            if ($sourceEntry) {
                $calc->recalculateAndRetime($sourceEntry->getKey(), $sourceEntry->machine_id);
                $sourceEntry = $loadingPlanService->enrichEntryForResponse(
                    $sourceEntry->fresh(),
                    $sourceEntry->resolveRootLotId()
                );
                $sourceEntry->merge_info = null;
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
                'dates' => [$date],
                'lotIds' => [$merge->target_lot_id, $merge->source_lot_id],
            ]);
            $calc->loadPackageList();

            $loadingPlanService = new LoadingPlanService($date);

            if ($targetEntry) {
                $calc->recalculateAndRetime($targetEntry->getKey(), $targetEntry->machine_id);
                $targetEntry = $loadingPlanService->enrichEntryForResponse(
                    $targetEntry->fresh(),
                    $targetEntry->resolveRootLotId()
                );
                $targetEntry->merge_info = ['isTarget' => true, 'isSource' => false, 'mergeId' => $merge->id, 'mergedFrom' => $merge->source_lot_id];
            }

            if ($sourceEntry) {
                $calc->recalculateAndRetime($sourceEntry->getKey(), $sourceEntry->machine_id);
                $sourceEntry = $loadingPlanService->enrichEntryForResponse(
                    $sourceEntry->fresh(),
                    $sourceEntry->resolveRootLotId()
                );
                $sourceEntry->merge_info = ['isTarget' => false, 'isSource' => true, 'mergeId' => $merge->id, 'mergedInto' => $merge->target_lot_id];
            }

            return ['merge' => $merge->fresh(), 'target' => $targetEntry, 'source' => $sourceEntry];
        });
    }

    public static function buildMergeMeta(
        ?string $lotId,
        ?Collection $mergesByTarget = null,
        ?Collection $mergesBySource = null,
        string|array|null $scheduledDate = null
    ): ?array {
        if (! $lotId) {
            return null;
        }

        // Fetch from DB if collections are not provided
        if ($mergesByTarget === null || $mergesBySource === null) {
            $query = LotMerge::active()
                ->where(function ($q) use ($lotId) {
                    $q->where('target_lot_id', $lotId)
                        ->orWhere('source_lot_id', $lotId);
                });

            if ($scheduledDate !== null) {
                $dates = (array) $scheduledDate;
                $query->whereIn('scheduled_date', $dates);
            }

            $merges = $query->get();
            $mergesByTarget = $merges->groupBy('target_lot_id');
            $mergesBySource = $merges->keyBy('source_lot_id');
        }

        $asTarget = $mergesByTarget->has($lotId);
        $asSource = $mergesBySource->get($lotId);

        if (! $asTarget && ! $asSource) {
            return null;
        }

        return [
            'isTarget'   => $asTarget,
            'isSource'   => $asSource !== null,
            'mergeId'    => $asSource?->id ?? $mergesByTarget->get($lotId)?->first()?->id,
            'mergedInto' => $asSource?->target_lot_id ?? null,
            'mergedFrom' => $asSource ?? $mergesByTarget->get($lotId)?->first()?->source_lot_id,
        ];
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
