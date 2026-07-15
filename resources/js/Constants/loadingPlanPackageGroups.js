// ---------------------------------------------------------------------------
// Package grouping config
// ---------------------------------------------------------------------------
//
// Each key is a tab label (the "group"); each value is the list of
// Package_Name values that belong under that tab. This will eventually be
// loaded from a DB-backed config — for now it's a static object you can
// edit directly.
//
// Any Package_Name that does NOT appear in any group below falls back to
// being its own single-package group (see groupOf()), so nothing already
// in the data needs to be listed here unless you want it grouped.

// const PACKAGE_GROUPS = {
// "LFCSP": ["LFCSP", "LGA", "LGA_CAV", "CBGA"],
// "DFN-QFN": ["LQFN", "DFN", "QFN", "LQFN_EP"],
// };

const PACKAGE_GROUPS = {
    RN: ["QSOP", "QSOP_EP", "SOIC_N", "SOIC_N_EP"],
    MSOP: ["MINI_SO", "MINI_SO_EP"],
    "QFP/BGA": [
        "BGA",
        "BGA_CAV",
        "BGA_ED",
        "CBGA",
        "CSP_BGA",
        "LGA",
        "LGA_CAV",
        "LQFN",
        "LQFN_EP",
        "LQFP",
        "LQFP_EP",
        "TQFP",
        "TQFP_EP",
        "WLBGA",
        "MQFP",
        "SOIC_CAV",
        "LCC",
        "LCC_HS",
    ],
    CSP: ["LFCSP", "LFCSP_CAV", "LFCSP_RT", "LFCSP_SS"],
    "SOT/TSOT/SC": [
        "SOT_23",
        "SOT_23_3",
        "SOT_89",
        "SOT-223",
        "SOT-23",
        "TSOT",
        "SC70",
    ],
    "QFN/DFN": ["DFN", "GQFN", "QFN", "UTQFN"],
    PLCC: ["PLCC"],
    T0: ["TO", "TO220", "TO-220", "TO-46", "TO92", "TO-92"],
    RU: ["TSSOP", "TSSOP_4.4", "TSSOP_4.4_EP", "TSSOP_6.1", "TSSOP-W"],
    RS: ["SSOP", "SSOP-W"],
    DDPAK: ["DDPAK"],
    BRAND: ["CERDIP", "SBDIP", "CERPACK", "CERPAK", "FLATPACK"],
    CHIP: ["CHIP"],
    LPI: ["MCML", "MSML"],
    PDIP: ["PDIP"],
    RW: ["PSOP_3", "SOIC_IC", "SOIC_W", "SOIC_W_FP"],
};

// Reverse lookup: Package_Name -> group label (tab name).
const PACKAGE_TO_GROUP = Object.fromEntries(
    Object.entries(PACKAGE_GROUPS).flatMap(([group, pkgs]) =>
        pkgs.map((pkg) => [pkg, group]),
    ),
);

/** Resolve a row's Package_Name to its tab/group label.
 *  Ungrouped packages are their own group (1:1, same as before grouping existed). */
export function groupOf(packageName) {
    if (!packageName) return packageName;
    return PACKAGE_TO_GROUP[packageName] ?? packageName;
}

/** All valid Package_Name values for a given group/tab label. */
export function packagesInGroup(group) {
    return PACKAGE_GROUPS[group] ?? [group];
}
