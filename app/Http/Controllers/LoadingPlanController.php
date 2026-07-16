<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\LoadingPlanEntry;
use App\Models\CustomerDataWip;
use App\Models\QdnMachine;
use App\Services\LotScheduleCalculator;
use App\Services\LoadingPlanFormulas;
use Illuminate\Support\Facades\Log;
use App\Helpers\ShiftDay;

class LoadingPlanController extends Controller
{
    public function index(Request $request)
    {
        $date = $request->get('date', ShiftDay::current());
        Log::info("date", array($date));
        $activeMachines = QdnMachine::active()
            ->select('machine_num', 'machine_platform')
            ->get()
            ->map(fn($machine) => [
                'name' => $machine->machine_num,
                'platform' => match (strtoupper($machine->machine_platform)) {
                    'GRAVITY' => 'G6L',
                    'TRAY' => 'Vitrox',
                    'TURRET' => 'HSI',
                    default => $machine->machine_platform,
                },
            ])
            ->values();

        [$result, $wipRows] = $this->buildPlanRows($date);

        return Inertia::render(
            'LoadingPlanTable',
            [
                'data'   => $result,
                'date'   => $date,
                'machines' => $activeMachines,
                'status' => $wipRows->isEmpty() ? 'not_imported' : 'ok',
            ]
        );
    }

    public function byMachine(Request $request)
    {
        $data = $request->validate([
            'date'       => 'required|date',
            'machines'   => 'required|array|min:1',
            'machines.*' => 'string',
        ]);

        [$result, $wipRows] = $this->buildPlanRows($data['date']);
        Log::info("resultresultresult", array($result));

        $filtered = $result
            ->whereIn('machine', $data['machines'])
            ->values();

        Log::info("filtered", array($filtered));

        $status = match (true) {
            $wipRows->isEmpty()  => 'not_imported', // no WIP data for this date at all
            $filtered->isEmpty() => 'no_match',      // WIP exists, but not for these machines
            default              => 'ok',
        };

        return Inertia::render(
            'LoadingPlanTableByMachine',
            [
                'data'   => $filtered,
                'date'   => $data['date'],
                'status' => $status,
                'machines' => $data['machines'],
            ]
        );
    }

    /** Shared assembly: returns [Collection $result, Collection $wipRows]. */
    private function buildPlanRows(string $date): array
    {
        $allEntries = LoadingPlanEntry::with('machineModel')->where('scheduled_date', $date)->get();

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

            $machine = $entry?->finalized_at
                ? $entry->machine_snapshot
                : $entry?->getMachineName();

            $doable = $calc->doable($wip->Lot_Id, $wip->Qty);

            $capacityUph = $entry?->finalized_at
                ? $entry->capacity_uph_snapshot
                : $calc->capacityUph($machine, $wip->Qty);
            $accuTime = $entry->accu_time ?? $calc->accuTime($doable, $capacityUph);

            $ct = LoadingPlanFormulas::computeCT($wip->Date_Loaded, $wip->BE_Starttime);
            $osl = LoadingPlanFormulas::computeOSL($ct, $wip->Backend_Leadtime);

            $cycleTimeExceedResidual = ($wip->CR3 == "RES") && ($wip->Lot_Entry_Time_Days > 2);
            $cycleTimeExceed = $ct > 2;

            $stationList = ["GTBKLDBE_T", "GTIQA_T", "GTLPI_T", "GTTRANS_T", "GTBRAND_T"];

            $isBakeHighlight = ($wip->Bake == "For Bake")
                && in_array($wip->Station, $stationList)
                && $wip->Bake_Count == 0;

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
                'CT'                  => $ct,
                'OSL'                 => $osl,
                'Remarks'             => $entry->remarks ?? null,
                'tag'                 => $entry->tag ?? null,
                'lockVersion'         => $entry->lock_version ?? null,
                'isBlock'             => false,
                'cycleTimeExceedResidual' => $cycleTimeExceedResidual,
                'cycleTimeExceed'     => $cycleTimeExceed,
                'isBakeHighlight'     => $isBakeHighlight
            ];
        });

        $wipLotIds = $wipRows->pluck('Lot_Id')->all();
        $manualLotEntries = $lotEntries->reject(fn($entry, $lotId) => in_array($lotId, $wipLotIds));

        $manualLotResults = $manualLotEntries->map(function ($entry) {
            $machine = $entry->finalized_at ? $entry->machine_snapshot : $entry->getMachineName();

            return [
                'id'                  => null,
                'entryId'             => $entry->id,
                'entryType'           => 'lot',
                'machine'             => $machine,
                'sequenceOrder'       => $entry->sequence_order,
                'item'                => $entry->sequence_order,
                'Part_Name'           => $entry->part_name ?? '',
                'Lead_Count'          => null,
                'Package_Name'        => $entry->package_name,
                'Lot_Id'              => $entry->lot_id,
                'status'              => $entry->status ?? null,
                'Station'             => null,
                'Qty'                 => $entry->qty ?? 0,
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
                'Capacity_UPH'        => $entry->finalized_at ? $entry->capacity_uph_snapshot : null,
                'accuTime'            => $entry->accu_time,
                'Remarks'             => $entry->remarks ?? null,
                'tag'                 => $entry->tag ?? null,
                'lockVersion'         => $entry->lock_version,
                'isBlock'             => false,
                'isManual'            => true,
            ];
        })->values();

        $blockResults = $blockEntries->map(function ($entry) {
            $machine = $entry->finalized_at ? $entry->machine_snapshot : $entry->getMachineName();

            return [
                'id'                  => null,
                'entryId'             => $entry->id,
                'entryType'           => 'block',
                'machine'             => $machine,
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

        $result = $lotResults->concat($manualLotResults)->concat($blockResults)
            ->sort(function ($a, $b) {
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

        return [$result, $wipRows];
    }
}
