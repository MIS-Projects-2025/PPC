<?php

namespace App\Services;

use App\Models\CustomerDataWip;
use App\Models\LoadingPlanEntry;
use App\Models\LotQuantity;
use Illuminate\Support\Collection;
use App\Traits\ValidatesLoadingPlanEntries;
use Carbon\Carbon;
use App\Models\PartName;
use App\Models\LotBucketItem;
use App\Models\PickUp;
use Illuminate\Support\Facades\DB;
use \Illuminate\Database\UniqueConstraintViolationException;

class PickupPoolService
{
    use ValidatesLoadingPlanEntries;

    public const MAX_DAYS = 31;

    public function available(string $date, string $location, int $days): Collection
    {
        $days = min(max($days, 1), self::MAX_DAYS);
        $from = Carbon::parse($date)->subDays($days)->startOfDay();
        $to   = Carbon::parse($date)->addDay()->startOfDay();

        $rows = PickUp::query()
            ->whereNotNull('LOTID')->where('LOTID', '!=', '')
            ->where('DATE_CREATED', '>=', $from)->where('DATE_CREATED', '<', $to)
            ->orderByDesc('DATE_CREATED')->orderByDesc('id_pickup')
            ->get()
            ->unique('LOTID')          // picked up twice: newest row wins
            ->values();

        if ($rows->isEmpty()) return collect();
        $lotIds = $rows->pluck('LOTID');

        $taken = LoadingPlanEntry::query()
            ->where('entry_type', 'lot')->where('rework_seq', 0)
            ->whereIn('lot_id', $lotIds)
            ->where(fn($q) => $q->where('scheduled_date', $date)
                ->orWhereNotNull('machine_id')
                ->orWhereNotNull('non_machine_id')
                ->orWhereNotNull('finalized_at'))
            ->pluck('lot_id')
            ->merge(LotBucketItem::where('scheduled_date', $date)->whereIn('lot_id', $lotIds)->pluck('lot_id'))
            ->merge(CustomerDataWip::forDate($date)->whereIn('Lot_Id', $lotIds)->pluck('Lot_Id'))
            ->flip();

        $parts = PartName::whereIn('devicename', $rows->pluck('PARTNAME')->filter()->unique())
            ->get(['devicename', 'focus_grp', 'dimensions', 'allocation'])
            ->keyBy(fn($p) => mb_strtolower($p->devicename));
        $partOf = fn($r) => $parts->get(mb_strtolower((string) $r->PARTNAME));

        return $rows
            ->reject(fn($r) => $taken->has($r->LOTID))
            ->filter(fn($r) => PackageLocation::resolve($r->PACKAGE, $partOf($r)?->focus_grp, $r->LC) === $location)
            ->map(fn($r) => [
                'id_pickup'    => $r->id_pickup,
                'lot_id'       => $r->LOTID,
                'part_name'    => $r->PARTNAME,
                'package_name' => trim((string) $r->PACKAGE),
                'qty'          => (int) $r->QTY,
                'lead_count'   => $r->LC,
                'picked_up_at' => $r->DATE_CREATED,
                'part_missing' => $partOf($r) === null,
            ])
            ->values();
    }

    public function pull(array $pickupIds, string $date, string $location): array
    {
        return DB::transaction(function () use ($pickupIds, $date, $location) {
            $this->assertDateNotFinalized($date);

            // re-validate server-side: stale modal, forged ids, or someone else pulled it first
            $eligible = $this->available($date, $location, self::MAX_DAYS)
                ->whereIn('id_pickup', $pickupIds)->values();

            $calc = app(LotScheduleCalculator::class)
                ->loadPackageList($eligible->pluck('part_name')->filter()->unique()->all());

            $entries = collect();
            foreach ($eligible as $p) {
                try {
                    $entry = LoadingPlanEntry::create([
                        'entry_type' => 'lot',
                        'source' => 'wip',
                        'lot_id' => $p['lot_id'],
                        'package_name' => $p['package_name'],
                        'scheduled_date' => $date,
                        'machine_id' => null,
                        'sequence_order' => null,
                        'status' => 'NONE',
                        'rework_seq' => 0,
                        'is_pickup' => true,
                        'lock_version' => 1,
                    ]);
                } catch (UniqueConstraintViolationException) {
                    continue;   // another user pulled the same lot a moment ago
                }

                $m = $calc->computeMetrics($p['part_name'], $p['qty'], null);
                LotQuantity::updateOrCreate(
                    ['lot_id' => $p['lot_id'], 'scheduled_date' => $date, 'rework_seq' => 0],
                    [
                        'part_name' => $p['part_name'] ?? '',
                        'qty_base' => $p['qty'],
                        'split_adjustment' => 0,
                        'merge_adjustment' => 0,
                        'recipe_used' => $m['recipe_used'],
                        'recipe_source_id' => $m['recipe_source_id'],
                        'recipe_source_type' => $m['recipe_source_type'],
                        'commit' => $m['commit'],
                        'recipe_status' => $m['recipe_status'],
                    ],
                );
                $entries->push($entry->id);
            }

            $sources   = app(LotSourceService::class);
            $svc       = new LoadingPlanService($date, $location);
            $fresh     = LoadingPlanEntry::with(['lotQuantity', 'machineModel', 'nonMachine'])->whereKey($entries)->get();
            $wipByEntry = $sources->forEntries($fresh);

            return ['entries' => $fresh
                ->map(fn($e) => $svc->createPlannedLot($wipByEntry->get($e->id), $e, $e->lotQuantity))
                ->values()->all()];
        });
    }
}
