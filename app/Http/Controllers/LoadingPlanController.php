<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\LoadingPlanEntry;
use App\Models\CustomerDataWip;
use App\Services\LotScheduleCalculator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class LoadingPlanController extends Controller
{
    public function index(Request $request)
    {
        Log::info('loading plan: ');

        $date = $request->get('date', now()->toDateString());

        $planEntries = LoadingPlanEntry::where('scheduled_date', $date)
            ->get()
            ->keyBy('lot_id');

        $wipRows = CustomerDataWip::query()
            ->forDate($date)
            ->tapeReelStations()
            ->excludingPostTnr()
            // ->limit(2000)
            ->get();

        $calc = new LotScheduleCalculator();

        $result = $wipRows->map(function ($wip) use ($planEntries, $calc) {
            $entry = $planEntries->get($wip->Lot_Id);
            $machine = $entry->machine ?? null;

            $doable = $calc->doable($wip->Lot_Id, $wip->Qty);
            $capacityUph = $calc->capacityUph($machine, $wip->Qty);
            $accuTime = $calc->accuTime($doable, $capacityUph);

            return [
                'id'                  => $wip->customer_data_id,
                'machine'             => $machine,
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
            ];
        });

        return Inertia::render(
            'LoadingPlanTable',
            [
                'data' => $result,
                'date' => $date,
                'status' => $wipRows->isEmpty() ? 'not_imported' : 'ok',
            ]
        );
    }
}
