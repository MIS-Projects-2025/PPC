<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\LoadingPlanEntry;
use App\Models\CustomerDataWip;
use App\Models\QdnMachine;
use App\Models\ProductionLinePackageReference;
use App\Services\LotScheduleCalculator;
use App\Services\PackageGroups;
use App\Services\LoadingPlanFormulas;
use Illuminate\Support\Facades\Log;
use App\Helpers\ShiftDay;

class LoadingPlanController extends Controller
{
    public function index(Request $request)
    {
        $date = $request->get('date', ShiftDay::current());
        $selectedLocation = $request->get('location', 'PL1');

        Log::info('index: date', ['date' => $date]);
        Log::info('index: selectedLocation', ['selectedLocation' => $selectedLocation]);

        $packageLineMap = ProductionLinePackageReference::pluck('production_line', 'package');
        Log::info('index: packageLineMap', ['packageLineMap' => $packageLineMap->toArray()]);

        $activeMachines = QdnMachine::active()
            ->where('location', $selectedLocation)
            ->select('machine_num', 'machine_platform', 'location')
            ->get()
            ->map(fn($machine) => [
                'name' => $machine->machine_num,
                'platform' => match (strtoupper($machine->machine_platform)) {
                    'GRAVITY' => 'G6L',
                    'TRAY' => 'Vitrox',
                    'TURRET' => 'HSI',
                    default => $machine->machine_platform,
                },
                'location' => $machine->location,
            ])
            ->values();
        Log::info('index: activeMachines', ['activeMachines' => $activeMachines->toArray()]);

        [$result, $wipRows] = $this->buildPlanRows($date, $selectedLocation, $packageLineMap);
        Log::info('index: result', ['result' => $result->toArray()]);
        Log::info('index: wipRows', ['wipRows' => $wipRows->toArray()]);

        $packages = $result
            ->filter(fn($row) => !$row['isBlock'])
            ->pluck('Package_Name')
            ->filter()
            ->unique()
            ->filter(fn($pkg) => $packageLineMap->get($pkg) === $selectedLocation)
            ->map(fn($pkg) => PackageGroups::groupOf($pkg))
            ->unique()
            ->sort()
            ->values();
        Log::info('index: packages', ['packages' => $packages->toArray()]);

        $status = $wipRows->isEmpty() ? 'not_imported' : 'ok';
        Log::info('index: status', ['status' => $status]);

        return Inertia::render(
            'LoadingPlanTable',
            [
                'data'              => $result,
                'date'              => $date,
                'machines'          => $activeMachines,
                'packages'          => $packages,
                'selectedLocation'  => $selectedLocation,
                'status'            => $status,
            ]
        );
    }

    public function byMachine(Request $request)
    {
        $data = $request->validate([
            'date'       => 'required|date',
            'machines'   => 'required|array|min:1',
            'machines.*' => 'string',
            'location'   => 'sometimes|array',
            'location.*' => 'string',
        ]);

        $selectedLocation = $request->get('location', 'PL1');
        $packageLineMap = ProductionLinePackageReference::pluck('production_line', 'package');

        [$result, $wipRows] = $this->buildPlanRows($data['date'], $selectedLocation, $packageLineMap);
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
                'data'              => $filtered,
                'date'              => $data['date'],
                'status'            => $status,
                'machines'          => $data['machines'],
                'selectedLocation' => $selectedLocation,
            ]
        );
    }

    /** Shared assembly: returns [Collection $result, Collection $wipRows]. */
    private function buildPlanRows(string $date, string $selectedLocation, $packageLineMap): array
    {
        Log::info('buildPlanRows: input', [
            'date' => $date,
            'selectedLocation' => $selectedLocation,
            'packageLineMap' => $packageLineMap->toArray(),
        ]);

        $allEntries = LoadingPlanEntry::with('machineModel')->where('scheduled_date', $date)->get();
        Log::info('buildPlanRows: allEntries count', ['count' => $allEntries->count()]);

        $lotEntries = $allEntries->where('entry_type', 'lot')->keyBy('lot_id');
        Log::info('buildPlanRows: lotEntries', ['lotEntries' => $lotEntries->toArray()]);

        $blockEntries = $allEntries->where('entry_type', 'block');
        Log::info('buildPlanRows: blockEntries (before location filter)', ['blockEntries' => $blockEntries->values()->toArray()]);

        $blockEntries = $blockEntries->filter(function ($entry) use ($selectedLocation) {
            $location = $entry->machineModel?->location;
            return $location === null || $location === $selectedLocation;
        });
        Log::info('buildPlanRows: blockEntries (after location filter)', ['blockEntries' => $blockEntries->values()->toArray()]);

        $packages = ProductionLinePackageReference::query()
            ->where('production_line', $selectedLocation)
            ->pluck('package');

        $pl1 = ProductionLinePackageReference::where('production_line', 'PL1')->pluck('package')->sort()->values();
        $pl6 = ProductionLinePackageReference::where('production_line', 'PL6')->pluck('package')->sort()->values();

        Log::info('pl compare', [
            'pl1' => $pl1->toArray(),
            'pl6' => $pl6->toArray(),
            'diff_pl1_minus_pl6' => $pl1->diff($pl6)->values()->toArray(),
            'diff_pl6_minus_pl1' => $pl6->diff($pl1)->values()->toArray(),
        ]);

        Log::info('buildPlanRows: packages', ['packages' => $packages->toArray()]);
        $packages = ProductionLinePackageReference::query()
            ->where('production_line', $selectedLocation)
            ->pluck('package')
            ->map(fn($p) => trim($p));

        Log::info('package compare', [
            'ref_packages' => $packages->map(fn($p) => "[$p]")->toArray(),
            'wip_packages' => CustomerDataWip::forDate($date)->tapeReelStations()->excludingPostTnr()
                ->pluck('Package_Name')->unique()->map(fn($p) => "[$p]")->toArray(),
        ]);

        $wipRows = CustomerDataWip::query()
            ->forDate($date)
            ->tapeReelStations()
            ->excludingPostTnr()
            ->whereIn('Package_Name', $packages)
            ->get();

        Log::info('buildPlanRows: wipRows', ['count' => $wipRows->count(), 'wipRows' => $wipRows->toArray()]);

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

            if ($entry && !$entry->finalized_at) {
                $entry->refreshCapacityUphSnapshot($wip->Qty);
            }

            $accuTime = $entry->accu_time ?? $calc->accuTime($doable, $capacityUph);

            $ct = LoadingPlanFormulas::computeCT($wip->Date_Loaded, $wip->BE_Starttime);
            $osl = LoadingPlanFormulas::computeOSL($ct, $wip->Backend_Leadtime);

            $cycleTimeExceedResidual = ($wip->CR3 == "RES") && ($wip->Lot_Entry_Time_Days > 2);
            $cycleTimeExceed = $ct > 2;

            $stationList = ["GTBKLDBE_T", "GTIQA_T", "GTLPI_T", "GTTRANS_T", "GTBRAND_T"];

            $isBakeHighlight = ($wip->Bake == "For Bake")
                && in_array($wip->Station, $stationList)
                && $wip->Bake_Count == 0;

            Log::info('buildPlanRows: lot row calc', [
                'Lot_Id' => $wip->Lot_Id,
                'machine' => $machine,
                'doable' => $doable,
                'capacityUph' => $capacityUph,
                'accuTime' => $accuTime,
                'ct' => $ct,
                'osl' => $osl,
                'cycleTimeExceedResidual' => $cycleTimeExceedResidual,
                'cycleTimeExceed' => $cycleTimeExceed,
                'isBakeHighlight' => $isBakeHighlight,
            ]);

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
        Log::info('buildPlanRows: lotResults count', ['count' => $lotResults->count()]);

        $wipLotIds = $wipRows->pluck('Lot_Id')->all();
        Log::info('buildPlanRows: wipLotIds', ['wipLotIds' => $wipLotIds]);

        $manualLotEntries = $lotEntries->reject(function ($entry, $lotId) use ($wipLotIds, $selectedLocation, $packageLineMap) {
            if (in_array($lotId, $wipLotIds)) return true;
            return $packageLineMap->get($entry->package_name) !== $selectedLocation;
        });
        Log::info('buildPlanRows: manualLotEntries', ['manualLotEntries' => $manualLotEntries->values()->toArray()]);

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
        Log::info('buildPlanRows: manualLotResults count', ['count' => $manualLotResults->count()]);

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
        Log::info('buildPlanRows: blockResults count', ['count' => $blockResults->count()]);

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

        Log::info('buildPlanRows: final result', ['count' => $result->count(), 'result' => $result->toArray()]);

        return [$result, $wipRows];
    }
}
