<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\LoadingPlanEntry;
use App\Models\CustomerDataWip;
use App\Services\LotScheduleCalculator;
use Illuminate\Support\Facades\Log;

class LoadingPlanController extends Controller
{
    public function index(Request $request)
    {
        $date = $request->get('date', now()->toDateString());

        $allEntries = LoadingPlanEntry::where('scheduled_date', $date)->get();

        // lot_id is unique per (lot_id, scheduled_date) thanks to the
        // uniq_lot_per_day constraint, so this is safe to key by lot_id —
        // block entries (lot_id === null) are handled separately below.
        $lotEntries = $allEntries->where('entry_type', 'lot')->keyBy('lot_id');
        $blockEntries = $allEntries->where('entry_type', 'block');

        $wipRows = CustomerDataWip::query()
            ->forDate($date)
            ->tapeReelStations()
            ->excludingPostTnr()
            ->get();

        $calc = new LotScheduleCalculator();

        $lotResults = $wipRows->map(function ($wip) use ($lotEntries, $calc) {
            $entry = $lotEntries->get($wip->Lot_Id);
            $machine = $entry->machine ?? null;

            $doable = $calc->doable($wip->Lot_Id, $wip->Qty);
            $capacityUph = $calc->capacityUph($machine, $wip->Qty);
            // accu_time on the entry (if the user has ever edited it)
            // takes priority over the derived value — same "editable
            // overrides computed" pattern as the rest of the plan.
            $accuTime = $entry->accu_time ?? $calc->accuTime($doable, $capacityUph);

            return [
                'id'                  => $wip->customer_data_id,
                'entryId'             => $entry->id ?? null,
                'entryType'           => 'lot',
                'machine'             => $machine,
                'sequenceOrder'       => $entry->sequence_order ?? null,
                'item'                => $entry->sequence_order ?? null,
                'Part_Name'           => $wip->Part_Name,
                'Lead_Count'          => $wip->Lead_Count,
                'Package_Name'        => $wip->Package_Name,
                'Lot_Id'              => $wip->Lot_Id,
                'status'              => $entry->status ?? null,
                'Station'             => $wip->Station,
                'Qty'                 => $wip->Qty,
                'Lot_Type'            => $wip->Lot_Type,
                'Prod_Area'           => $wip->Prod_Area,
                'Lot_Status'          => $wip->Lot_Status,
                'Focus_Group'         => $wip->Focus_Group,
                'Stage'               => $wip->Stage,
                'Lot_Entry_Time_Days' => $wip->Lot_Entry_Time_Days,
                'CR3'                 => $wip->CR3,
                'BE_OSL_Days'         => $wip->BE_OSL_Days,
                'Body_Size'           => $wip->Body_Size,
                'Ramp_Time'           => $wip->Ramp_Time,
                'Date_Loaded'         => optional($wip->Date_Loaded)->format('n/j/Y g:i:s A'),
                'BE_Starttime'        => optional($wip->BE_Starttime)->format('n/j/Y g:i:s A'),
                'Backend_Leadtime'    => $wip->Backend_Leadtime,
                'Doable'              => $doable,
                'Capacity_UPH'        => $capacityUph,
                'accuTime'            => $accuTime,
                'Remarks'             => $entry->remarks ?? null,
                'tag'                 => $entry->tag ?? null,
                'lockVersion'         => $entry->lock_version ?? null,
                'isBlock'             => false,
            ];
        });

        $blockResults = $blockEntries->map(function ($entry) {
            return [
                'id'                  => null,
                'entryId'             => $entry->id,
                'entryType'           => 'block',
                'machine'             => $entry->machine,
                'sequenceOrder'       => $entry->sequence_order,
                'item'                => $entry->sequence_order,
                'Part_Name'           => null,
                'Lead_Count'          => null,
                'Package_Name'        => null,
                'Lot_Id'              => null,
                'status'              => null,
                'Station'             => null,
                'Qty'                 => null,
                'Lot_Type'            => null,
                'Prod_Area'           => null,
                'Lot_Status'          => null,
                'Focus_Group'         => null,
                'Stage'               => null,
                'Lot_Entry_Time_Days' => null,
                'CR3'                 => null,
                'BE_OSL_Days'         => null,
                'Body_Size'           => null,
                'Ramp_Time'           => null,
                'Date_Loaded'         => null,
                'BE_Starttime'        => null,
                'Backend_Leadtime'    => null,
                'Doable'              => null,
                'Capacity_UPH'        => null,
                'accuTime'            => $entry->accu_time,
                'Remarks'             => null,
                'tag'                 => null,
                'lockVersion'         => $entry->lock_version,
                'isBlock'             => true,
                'blockLabel'          => $entry->block_label,
            ];
        });

        // Merge, then sort so each machine's rows appear in true saved
        // order (Unassigned/no-entry lots have sequenceOrder === null —
        // sorted last within their bucket, order among themselves is
        // otherwise arbitrary/stable by original WIP fetch order).
        // $result = $lotResults->concat($blockResults)
        //     ->sortBy([
        //         fn($r) => $r['machine'] ?? '',
        //         fn($r) => $r['sequenceOrder'] ?? PHP_FLOAT_MAX,
        //     ])
        //     ->values();

        $result = $lotResults->concat($blockResults)
            ->sort(function ($a, $b) {
                // Nulls (Unassigned) always sort last, unconditionally
                if (($a['machine'] === null) !== ($b['machine'] === null)) {
                    return $a['machine'] === null ? 1 : -1;
                }

                if ($a['machine'] !== $b['machine']) {
                    return strnatcasecmp($a['machine'] ?? '', $b['machine'] ?? '');
                }

                $seqA = $a['sequenceOrder'] ?? PHP_FLOAT_MAX;
                $seqB = $b['sequenceOrder'] ?? PHP_FLOAT_MAX;

                if ($seqA == $seqB) {
                    return 0;
                }
                return ($seqA < $seqB) ? -1 : 1;
            })
            ->values();

        // Log::info('result', $result->toArray());

        return Inertia::render(
            'LoadingPlanTable',
            [
                'data'   => $result,
                'date'   => $date,
                'status' => $wipRows->isEmpty() ? 'not_imported' : 'ok',
            ]
        );
    }
}
