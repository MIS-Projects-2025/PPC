export const MACHINE_MANUAL = "MANUAL";
export const MACHINE_UNASSIGNED = null;

const MACHINES = [
    { name: "08G6L", platform: "G6L" },
    { name: "54AT28", platform: "G6L" },
];

// Reverse lookup: machine name -> platform.
export const MACHINE_TO_PLATFORM = Object.fromEntries(
    MACHINES.map((m) => [m.name, m.platform]),
);

/** Real machine name list, in config order — does NOT include MANUAL/null. */
export const REAL_MACHINE_NAMES = MACHINES.map((m) => m.name);

/** Platform for a real machine name, or null for MANUAL/unassigned/unknown. */
export function platformOf(machine) {
    return MACHINE_TO_PLATFORM[machine] ?? null;
}

/** Whether `machine` has its own timeline (real machine or MANUAL).
 *  False for null/undefined (truly unassigned — no schedule at all). */
export function hasTimeline(machine) {
    // return machine === MACHINE_MANUAL || Boolean(MACHINE_TO_PLATFORM[machine]);
    // return machine === MACHINE_MANUAL;
    return true;
}

/** capacity_uph for a given qty on a given platform, per CAPACITY_BANDS.
 *  Returns null if platform is unknown or qty falls outside every band
 *  (e.g. no platform — MANUAL/unassigned — or qty <= 0). */
// export function lookupCapacityUPH(qty, platform) {
//     if (!platform) return null;
//     const q = Number(qty) || 0;
//     const band = CAPACITY_BANDS.find(
//         (b) => b.platform === platform && q >= b.qty_min && q <= b.qty_max,
//     );
//     return band ? band.capacity_uph : null;
// }
