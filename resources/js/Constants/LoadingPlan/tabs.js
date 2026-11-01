export const ALL_PACKAGES_TAB = "ALL PACKAGE";
export const UNASSIGNED_TAB = "Unassigned";
export const RES_TAB = "RES";
export const FOR_BAKE_TAB = "FOR BAKE";
export const PICKUP_TAB = "PICKUP";
export const ORPHAN_TAB = "OTHER MACHINE";
export const MANUAL_TAB = "MANUAL";

export const RES_STATION = "GTTRES_T";
export const F3_FLAG = "F3";

export const PICKUP_POOL_TABS = [UNASSIGNED_TAB, PICKUP_TAB];

/** Tabs that don't map to a single package group. */
export const NON_PACKAGE_TABS = [
    ALL_PACKAGES_TAB,
    RES_TAB,
    FOR_BAKE_TAB,
    PICKUP_TAB,
    ORPHAN_TAB,
    UNASSIGNED_TAB,
];

export function buildTabItems({ readOnly, isF3, hasOrphans, packageGroupNames }) {
    return [
        ...(readOnly ? [] : [UNASSIGNED_TAB]),
        ALL_PACKAGES_TAB,
        ...(isF3 ? [] : [RES_TAB]),
        FOR_BAKE_TAB,
        ...(isF3 ? [] : [PICKUP_TAB]),
        ...(hasOrphans ? [ORPHAN_TAB] : []),
        ...(packageGroupNames ?? []),
    ];
}