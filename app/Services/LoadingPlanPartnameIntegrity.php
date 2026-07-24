<?php

namespace App\Services;

use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class LoadingPlanPartnameIntegrity
{
    public function findMismatches(Collection $wipRows): array
    {
        $partNames = $wipRows->pluck('Part_Name')->filter()->unique()->values();

        if ($partNames->isEmpty()) {
            return [];
        }

        $packageList = DB::table('qdn_db.package_list')
            ->whereIn('devicename', $partNames)
            ->get()
            ->keyBy('devicename');

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

    private function normalize($value): string
    {
        return trim((string) $value);
    }

    /**
     * Lead_Count is int on the WIP side but varchar(45) on package_list — compare
     * numerically when both sides parse as numbers (handles "08" vs 8, "8 " vs 8,
     * "8.0" vs 8), and fall back to a normalized string compare otherwise (in case
     * package_list ever holds something non-numeric, e.g. a range or blank).
     */
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
