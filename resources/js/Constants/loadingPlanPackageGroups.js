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

const PACKAGE_GROUPS = {
    // "LFCSP": ["LFCSP", "LGA", "LGA_CAV", "CBGA"],
    // "DFN-QFN": ["LQFN", "DFN", "QFN", "LQFN_EP"],
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
