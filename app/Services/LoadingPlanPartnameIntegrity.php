<?php

namespace App\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use App\Services\LotScheduleCalculator;

class LoadingPlanPartnameIntegrity
{
    /**
     * Fetch package_list rows for the given WIP rows' part names, keyed by
     * devicename. Call this once per request and pass the result into
     * findMismatches()/findRecipeIssues() so both checks share a single query
     * instead of each hitting package_list independently.
     */
    public function lookupPackageList(Collection $wipRows): Collection
    {
        $partNames = $wipRows->pluck('Part_Name')->filter()->unique()->values();

        if ($partNames->isEmpty()) {
            return collect();
        }

        return DB::table('qdn_db.package_list')
            ->whereIn('devicename', $partNames)
            ->get()
            ->keyBy('devicename');
    }

    public function findMismatches(Collection $wipRows, Collection $packageList): array
    {
        $mismatches = [];

        foreach ($wipRows as $wip) {
            $ref = $packageList->get($wip->Part_Name);

            if (!$ref) {
                $mismatches[] = [
                    'customer_data_id' => $wip->customer_data_id,
                    'Part_Name'        => $wip->Part_Name,
                    'Lot_Id'           => $wip->Lot_Id,
                    'reason'           => 'no_package_list_entry',
                    'fields'           => [],
                ];
                continue;
            }

            $fields = [];

            if (!$this->numbersMatch($wip->Lead_Count, $ref->lead_count)) {
                $fields['Lead_Count'] = ['wip' => $wip->Lead_Count, 'packageList' => $ref->lead_count];
            }
            if ($this->normalize($wip->Focus_Group) !== $this->normalize($ref->focus_grp)) {
                $fields['Focus_Group'] = ['wip' => $wip->Focus_Group, 'packageList' => $ref->focus_grp];
            }
            if ($this->normalize($wip->Body_Size) !== $this->normalize($ref->dimensions)) {
                $fields['Body_Size'] = ['wip' => $wip->Body_Size, 'packageList' => $ref->dimensions];
            }
            if ($this->normalize($wip->Package_Name) !== $this->normalize($ref->package_type)) {
                $fields['Package_Name'] = ['wip' => $wip->Package_Name, 'packageList' => $ref->package_type];
            }

            if (!empty($fields)) {
                $mismatches[] = [
                    'customer_data_id' => $wip->customer_data_id,
                    'Part_Name'        => $wip->Part_Name,
                    'Lot_Id'           => $wip->Lot_Id,
                    'reason'           => 'field_mismatch',
                    'fields'           => $fields,
                ];
            }
        }

        return $mismatches;
    }

    public function findRecipeIssues(
        Collection $wipRows,
        Collection $packageList,
        LotScheduleCalculator $calc,
        Collection $commitsByCustomerDataId,
        Collection $packageListById,
    ): array {
        $issues = [];

        foreach ($wipRows as $wip) {
            $ref = $packageList->get($wip->Part_Name);

            if (!$ref) {
                $issues[] = [
                    'customer_data_id' => $wip->customer_data_id,
                    'Part_Name'        => $wip->Part_Name,
                    'Lot_Id'           => $wip->Lot_Id,
                    'reason'           => 'no_package_list_entry',
                ];
                continue;
            }

            $doableResult = $calc->doable($wip->customer_data_id, $commitsByCustomerDataId, $packageListById);
            $doableStatus = $doableResult['status'];

            if ($doableStatus === 'unknown') {
                $issues[] = [
                    'customer_data_id' => $wip->customer_data_id,
                    'Part_Name'        => $wip->Part_Name,
                    'Lot_Id'           => $wip->Lot_Id,
                    'reason'           => 'no_commit',
                ];
                continue;
            }

            if ($doableStatus === 'no_recipe') {
                $issues[] = [
                    'customer_data_id' => $wip->customer_data_id,
                    'Part_Name'        => $wip->Part_Name,
                    'Lot_Id'           => $wip->Lot_Id,
                    'reason'           => 'no_recipe',
                ];
                continue;
            }

            if ($doableStatus === 'qty_below_recipe') {
                $issues[] = [
                    'customer_data_id' => $wip->customer_data_id,
                    'Part_Name'        => $wip->Part_Name,
                    'Lot_Id'           => $wip->Lot_Id,
                    'reason'           => 'qty_below_recipe',
                    'Qty'              => $wip->Qty,
                    'recipeSource'     => $doableResult['recipeSource'],
                ];
            }
        }

        return $issues;
    }

    private function normalize($value): string
    {
        return trim((string) $value);
    }

    private function numbersMatch($a, $b): bool
    {
        $aTrim = trim((string) $a);
        $bTrim = trim((string) $b);

        if (is_numeric($aTrim) && is_numeric($bTrim)) {
            return (float) $aTrim === (float) $bTrim;
        }

        return $aTrim === $bTrim;
    }
}
