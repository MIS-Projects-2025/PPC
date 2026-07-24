/** All valid Package_Name values for a given group/tab label. */
export function packagesInGroup(group, packageGroups) {
    return packageGroups[group] ?? [group];
}

export function toReverseMap(packageGroups) {
    return Object.fromEntries(
        Object.entries(packageGroups).flatMap(([group, pkgs]) =>
            pkgs.map((pkg) => [pkg, group]),
        ),
    );
}

export function groupOf(packageName, reverseMap) {
    if (!packageName) return packageName;
    return reverseMap[packageName] ?? packageName;
}
