import {
    ALL_PACKAGES_TAB,
    FOR_BAKE_TAB,
    ORPHAN_TAB,
    PICKUP_TAB,
    RES_STATION,
    RES_TAB,
} from "@/Constants/LoadingPlan/tabs";
import { MACHINE_MANUAL } from "@/Constants/machines.js";
import { isNonMachineKey } from "@/Hooks/LoadingPlan/useNonMachineOperations";
import { isBlockRow } from "./helpers";

export const isResRow = (r) => r.station === RES_STATION;
export const isForBakeRow = (r) => !!r.is_for_bake;

/** package name, then lead count ascending (missing lead_count last). */
export function compareUnassigned(a, b) {
    const pkg = (a.package_name ?? "").localeCompare(b.package_name ?? "", undefined, { numeric: true });
    if (pkg !== 0) return pkg;

    const an = a.lead_count == null ? NaN : Number(a.lead_count);
    const bn = b.lead_count == null ? NaN : Number(b.lead_count);
    if (Number.isNaN(an) && Number.isNaN(bn)) return 0;
    if (Number.isNaN(an)) return 1;
    if (Number.isNaN(bn)) return -1;
    return an - bn;
}

export function getMachineLabel(machine, nonMachineNameByKey) {
    if (machine === null) return "Unassigned";
    if (machine === MACHINE_MANUAL) return "MANUAL";
    return nonMachineNameByKey.get(machine) ?? machine;
}

/** Predicates that depend on the active tab / location / known machines. */
export function createRowMatchers({ activePackage, selectedLocation, knownMachineNames }) {
    const isOtherLoc = (r) => !isBlockRow(r) && r.location != null && r.location !== selectedLocation;

    const isOrphanRow = (r) =>
        !!r.machine &&
        r.machine !== MACHINE_MANUAL &&
        !isNonMachineKey(r.machine) &&
        !knownMachineNames.has(r.machine);

    /** Matches the active tab, ignoring which location the row lives in. */
    const rowInActiveTabOwn = (r) => {
        if (activePackage === ORPHAN_TAB) return isOrphanRow(r);
        if (activePackage === PICKUP_TAB) return !!r.is_pickup;
        if (activePackage === RES_TAB) return isResRow(r);
        if (activePackage === FOR_BAKE_TAB) return isForBakeRow(r);
        if (isResRow(r)) return false;
        if (activePackage === ALL_PACKAGES_TAB) return true;
        return (r.package_group ?? r.package_name) === activePackage;
    };

    const rowInActiveTab = (r) => {
        if (r.machine !== null && r.machine !== MACHINE_MANUAL && isOtherLoc(r)) return false;
        return rowInActiveTabOwn(r);
    };

    return { isOtherLoc, isOrphanRow, rowInActiveTabOwn, rowInActiveTab };
}