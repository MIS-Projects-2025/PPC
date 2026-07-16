export const MACHINE_MANUAL = "MANUAL";
export const MACHINE_UNASSIGNED = null;

const MACHINES = [
    { name: "08G6L", platform: "G6L" },
    { name: "54AT28", platform: "G6L" },

    // { name: "09G6L", platform: "G6L" },
    // { name: "12HSI", platform: "HSI" },
    // { name: "VTX-01", platform: "VITROX" },
];

// export const CAPACITY_BANDS = [
//     { platform: "VITROX", qty_min: 1, qty_max: 500, capacity_uph: 110 },
//     { platform: "VITROX", qty_min: 501, qty_max: 750, capacity_uph: 357 },
//     { platform: "VITROX", qty_min: 751, qty_max: 1000, capacity_uph: 524 },
//     { platform: "VITROX", qty_min: 1001, qty_max: 2500, capacity_uph: 679 },
//     { platform: "VITROX", qty_min: 2501, qty_max: 5000, capacity_uph: 1187 },
//     { platform: "VITROX", qty_min: 5001, qty_max: 7500, capacity_uph: 2095 },
//     { platform: "VITROX", qty_min: 7501, qty_max: 10000, capacity_uph: 2752 },
//     { platform: "VITROX", qty_min: 10001, qty_max: 999999, capacity_uph: 4000 },
//     { platform: "HSI", qty_min: 1, qty_max: 500, capacity_uph: 110 },
//     { platform: "HSI", qty_min: 501, qty_max: 750, capacity_uph: 357 },
//     { platform: "HSI", qty_min: 751, qty_max: 1000, capacity_uph: 524 },
//     { platform: "HSI", qty_min: 1001, qty_max: 2500, capacity_uph: 679 },
//     { platform: "HSI", qty_min: 2501, qty_max: 5000, capacity_uph: 1276 },
//     { platform: "HSI", qty_min: 5001, qty_max: 7500, capacity_uph: 2263 },
//     { platform: "HSI", qty_min: 7501, qty_max: 10000, capacity_uph: 3050 },
//     { platform: "HSI", qty_min: 10001, qty_max: 999999, capacity_uph: 4000 },
//     { platform: "G6L", qty_min: 1, qty_max: 500, capacity_uph: 110 },
//     { platform: "G6L", qty_min: 501, qty_max: 750, capacity_uph: 357 },
//     { platform: "G6L", qty_min: 751, qty_max: 1000, capacity_uph: 524 },
//     { platform: "G6L", qty_min: 1001, qty_max: 2500, capacity_uph: 679 },
//     { platform: "G6L", qty_min: 2501, qty_max: 5000, capacity_uph: 1132 },
//     { platform: "G6L", qty_min: 5001, qty_max: 7500, capacity_uph: 1845 },
//     { platform: "G6L", qty_min: 7501, qty_max: 10000, capacity_uph: 2337 },
//     { platform: "G6L", qty_min: 10001, qty_max: 999999, capacity_uph: 4000 },
// ];

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
    return machine === MACHINE_MANUAL || Boolean(MACHINE_TO_PLATFORM[machine]);
}

/** Capacity_UPH for a given qty on a given platform, per CAPACITY_BANDS.
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
