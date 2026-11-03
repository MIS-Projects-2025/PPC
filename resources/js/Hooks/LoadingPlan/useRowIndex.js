import { isBlockRow } from "@/Lib/LoadingPlan/helpers";
import { useMemo } from "react";
import { isNonMachineKey } from "./useNonMachineOperations";

/** One pass over the rows: lookups and totals that don't depend on the active tab. */
export function useRowIndex(dataRows, knownMachineNames) {
    return useMemo(() => {
        const rowsByMachine = new Map();
        const rowsByBucket = new Map();
        const machineTotalDoable = {};
        const machineTotalQuantity = {};
        const nonMachineRowCounts = {};
        const orphans = new Set();
        const missingParts = new Set();

        for (const r of dataRows) {
            const m = r.machine;
            const block = isBlockRow(r);

            if (!rowsByMachine.has(m)) rowsByMachine.set(m, []);
            rowsByMachine.get(m).push(r);

            if (r.bucket_id != null) {
                if (!rowsByBucket.has(r.bucket_id)) rowsByBucket.set(r.bucket_id, []);
                rowsByBucket.get(r.bucket_id).push(r);
            }

            if (m) {
                const nonMachine = isNonMachineKey(m);
                if (nonMachine) nonMachineRowCounts[m] = (nonMachineRowCounts[m] ?? 0) + 1;
                else if (!knownMachineNames.has(m)) orphans.add(m);

                if (!block) {
                    machineTotalQuantity[m] = (machineTotalQuantity[m] ?? 0) + (Number(r.qty) || 0);
                    if (!r.is_rework) machineTotalDoable[m] = (machineTotalDoable[m] ?? 0) + (Number(r.doable) || 0);
                }
            }

            if (!block && r.source !== "f3" && r.doable_status === "no_recipe") missingParts.add(r.part_name);
        }

        return {
            rowsByMachine,
            rowsByBucket,
            machineTotalDoable,
            machineTotalQuantity,
            nonMachineRowCounts,
            orphanMachines: [...orphans].sort(),
            missingPartCount: missingParts.size,
        };
    }, [dataRows, knownMachineNames]);
}

/** Per-machine counts that DO depend on the active tab / location. */
export function useHiddenRowCounts({ dataRows, isParked, isOtherLoc, rowInActiveTab }) {
    return useMemo(() => {
        const otherLocationCounts = {};
        const otherPackageCounts = {};
        const machineSectionDoable = {};

        for (const r of dataRows) {
            const m = r.machine;
            if (m === null || isBlockRow(r) || isParked(r)) continue;

            const inTab = rowInActiveTab(r);

            if (isOtherLoc(r)) otherLocationCounts[m] = (otherLocationCounts[m] ?? 0) + 1;
            else if (!inTab) otherPackageCounts[m] = (otherPackageCounts[m] ?? 0) + 1;

            if (inTab && m && !r.is_rework) {
                machineSectionDoable[m] = (machineSectionDoable[m] ?? 0) + (Number(r.doable) || 0);
            }
        }
        return { otherLocationCounts, otherPackageCounts, machineSectionDoable };
    }, [dataRows, isParked, isOtherLoc, rowInActiveTab]);
}