<?php

namespace App\Repositories;

use Illuminate\Database\Eloquent\Collection;
use App\Models\LotPosition;
use App\Models\Lot;
use App\Models\BoxDimension;
use App\Repositories\Interfaces\LotPositionRepositoryInterface;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class LotPositionRepository implements LotPositionRepositoryInterface
{
    public function activeByLot(int $lotId): Collection
    {
        return LotPosition::with('rackSlot')
            ->where('lot_id', $lotId)
            ->active()
            ->get();
    }

    public function activeBySlot(int $rackSlotId): ?LotPosition
    {
        return LotPosition::with('lot')
            ->where('rack_slot_id', $rackSlotId)
            ->active()
            ->first();
    }

    public function assign(int $lotId, int $rackSlotId, int $lotStagingId, string $by, int $productionLineId, int $rackPageId): LotPosition
    {
        return LotPosition::create([
            'lot_id'       => $lotId,
            'rack_slot_id' => $rackSlotId,
            'lot_staging_id'   => $lotStagingId,
            'production_line_id' => $productionLineId,
            'rack_page_id' => $rackPageId,
            'assigned_at'  => now(),
            'assigned_by'  => $by,
        ]);
    }

    public function releaseByLot(int $lotId, string $by): void
    {
        DB::transaction(function () use ($lotId, $by) {
            LotPosition::where('lot_id', $lotId)
                ->whereNull('released_at')
                ->update([
                    'released_at' => Carbon::now('UTC'),
                    'released_by' => $by,
                ]);

            Lot::where('id', $lotId)->update([
                'released_by' => $by,
                'released_at' => Carbon::now('UTC')
            ]);
        });
    }

    // Renamed from getOccupancyByProductionLine. Filters by rack_page_id
    // (the page being viewed), not production_line_id — a ResCon page needs
    // to show occupancy for lots physically sourced from multiple PLs, which
    // production_line_id alone can't express.
    public function getOccupancyByRackPage(int $rackPageId)
    {
        $dims = (new BoxDimension)->getTable();

        $rows = LotPosition::whereNull('lot_positions.released_at')
            ->where('lot_positions.rack_page_id', $rackPageId)
            ->join('lots', 'lots.id', '=', 'lot_positions.lot_id')
            ->leftJoin('lot_stagings', 'lot_stagings.id', '=', 'lot_positions.lot_staging_id')
            ->leftJoin($dims, "{$dims}.id", '=', 'lot_stagings.dimension_id')
            ->select(
                'lot_positions.rack_slot_id',
                'lot_positions.lot_id as lot_pk',
                'lots.lot_id as lot_code',
                'lots.received_at',
                'lot_stagings.box_group_id',
                'lot_stagings.box_count as staging_box_count',
                'lot_stagings.dimension_id as staging_dimension_id',
                'lot_stagings.box_source',
                'lot_stagings.source_group_id',
                'lot_positions.box_count as slot_box_count',
                'lots.partname',
                'lots.qty',
                'lot_stagings.box_details',
                "{$dims}.name as dimension_name",
                "{$dims}.depth_units as depth_units",
            )
            ->get();

        $slotIdsByLot = $rows->groupBy('lot_pk')->map(
            fn($group) => $group->pluck('rack_slot_id')->map(fn($id) => (int) $id)->unique()->values()->all()
        );

        $threshold = Carbon::now('UTC')->subDays(3);

        return $rows->toBase()->map(fn($row) => [
            'id'                         => $row->lot_code,
            'slot_ids'                   => $slotIdsByLot[$row->lot_pk],
            'has_exceeded_age_threshold' => Carbon::parse($row->received_at, 'UTC')->lte($threshold),
            'rack_slot_id'               => (int) $row->rack_slot_id,
            'box_group_id'               => $row->box_group_id ? (int) $row->box_group_id : null,
            'box_count'                  => $row->staging_box_count ? (int) $row->staging_box_count : null,
            'dimension_id'               => $row->staging_dimension_id ? (int) $row->staging_dimension_id : null,
            // Lots that leave together on release. Stagings from before the source fields fall back to the box set.
            'release_group' => $row->box_source && $row->source_group_id
                ? $row->box_source . ':' . $row->source_group_id
                : ($row->box_group_id ? 'b:' . $row->box_group_id : null),
            'slot_box_count' => $row->slot_box_count ? (int) $row->slot_box_count : null,
            'partname'       => $row->partname,
            'qty'            => (int) $row->qty,
            'box_details'    => $row->box_details,
            'dimension_name' => $row->dimension_name,
            'depth_units'    => $row->depth_units ? (int) $row->depth_units : null,
        ])->groupBy('rack_slot_id');
    }

    public function getOccupancyByProductionLine(int $productionLineId): Collection
    {
        return
            LotPosition::whereNull('released_at')
            ->whereHas('rackSlot', fn($q) => $q->whereHas(
                'rack',
                fn($q) =>
                $q->where('production_line_id', $productionLineId)
            ))
            ->select('rack_slot_id', 'lot_id')
            ->get()
            ->makeHidden(['created_at', 'updated_at', 'marked_full_by'])
            ->groupBy('rack_slot_id');
        // LotPosition::with('lot:id,lot_id,partname,qty,status')
        //   ->whereNull('released_at')
        //   ->whereHas('rackSlot', fn($q) => $q->whereHas(
        //     'rack',
        //     fn($q) =>
        //     $q->where('production_line_id', $productionLineId)
        //   ))
        //   ->select('rack_slot_id', 'lot_id')
        //   ->get()
        //   ->groupBy('rack_slot_id');
    }
}
