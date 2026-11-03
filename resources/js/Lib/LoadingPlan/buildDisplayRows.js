import {
    ALL_PACKAGES_TAB,
    MANUAL_TAB,
    ORPHAN_TAB,
    PICKUP_TAB,
    UNASSIGNED_TAB,
} from "@/Constants/LoadingPlan/tabs";
import { MACHINE_MANUAL } from "@/Constants/machines.js";
import { isNonMachineKey } from "@/Hooks/LoadingPlan/useNonMachineOperations";
import { isBlockRow } from "./helpers";
import { compareUnassigned, getMachineLabel, isResRow } from "./rowPredicates";

// ---------------------------------------------------------------------
// Data-row wrapper (memoised per source row so the grid keeps row identity)
// ---------------------------------------------------------------------
const dataRowCache = new WeakMap();

export function asDataRow(row, machineLabel) {
    const hit = dataRowCache.get(row);
    if (hit && hit.label === machineLabel) return hit.row;
    const wrapped = {
        ...row,
        __type: "data",
        ...(machineLabel !== undefined ? { machine_label: machineLabel } : {}),
    };
    dataRowCache.set(row, { label: machineLabel, row: wrapped });
    return wrapped;
}

const toDataRow = (r) => asDataRow(r);
const byBucketPosition = (a, b) => (a.bucket_position ?? 0) - (b.bucket_position ?? 0);

// ---------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------

/** Group headers (+ their lots) under `machineKey` (null = top-level groups). */
function bucketSections(ctx, machineKey, isVisible) {
    const { bucketsByMachine, rowsByBucket, collapsedMachines } = ctx;

    return (bucketsByMachine.get(machineKey) ?? []).flatMap((bucket) => {
        const key = `bucket:${bucket.id}`; // string: can't collide with machine names
        const rows = (rowsByBucket.get(bucket.id) ?? []).filter(isVisible).sort(byBucketPosition);

        const header = {
            id: `header-${key}`,
            __type: "header",
            __headerKind: "bucket",
            bucketId: bucket.id,
            collapseKey: key,
            label: bucket.label,
            nested: machineKey !== null,
            __rowCount: rows.length,
            __isCollapsed: collapsedMachines.has(key),
            isLocked: true,
        };

        return header.__isCollapsed ? [header] : [header, ...rows.map(toDataRow)];
    });
}

/** Rows planned on a machine that no longer exists in the machine list. */
function orphanSections(ctx, isVisible) {
    const { orphanMachines, rowsByMachine, isParked, collapsedMachines } = ctx;

    return orphanMachines.flatMap((m) => {
        const rows = (rowsByMachine.get(m) ?? []).filter((r) => !isParked(r) && isVisible(r));
        if (rows.length === 0) return [];

        const isCollapsed = collapsedMachines.has(m);
        const header = {
            id: `header-${m}`,
            __type: "header",
            machine: m,
            machineLabel: m,
            __rowCount: rows.length,
            __lotCount: rows.filter((r) => !isBlockRow(r)).length,
            otherPackageCount: 0,
            __isCollapsed: isCollapsed,
            isLocked: true,
        };
        return isCollapsed ? [header] : [header, ...rows.map(toDataRow)];
    });
}

/** "Unassigned" tab: every unplanned, non-parked lot across all packages. */
function buildUnassignedTab(ctx) {
    const { rowsByMachine, isParked, isOtherLoc, collapsedMachines } = ctx;

    const rows = (rowsByMachine.get(null) ?? [])
        .filter((r) => !isResRow(r) && !isParked(r) && !isOtherLoc(r))
        .sort(compareUnassigned);
    const isCollapsed = collapsedMachines.has(null);

    const header = {
        id: "header-unassigned-all",
        __type: "header",
        machine: null,
        machineLabel: "Unassigned",
        platform: undefined,
        __rowCount: rows.length,
        __lotCount: rows.filter((r) => !isBlockRow(r)).length,
        otherPackageCount: 0,
        __isCollapsed: isCollapsed,
        isLocked: true,
    };

    return [
        header,
        ...(isCollapsed ? [] : rows.map(toDataRow)),
        ...bucketSections(ctx, null, (r) => !isResRow(r)), // groups stay visible when collapsed
    ];
}

/**
 * Consecutive rows hidden by the current tab/location collapse into a single
 * display-only "collapsed" row. Unassigned / MANUAL just drop hidden rows.
 */
function collapseHiddenRuns(machineRows, { machine, canCollapse, kindOf, toRow }) {
    const shown = [];
    let run = [];
    let runKind = null;

    const flush = () => {
        if (!run.length) return;
        const first = run[0];
        const last = run[run.length - 1];
        shown.push({
            id: `collapsed-${first.id}`,
            __type: "collapsed",
            __kind: runKind, // "package" | "location"
            isLocked: true,
            machine,
            firstRowId: first.id,
            lastRowId: last.id,
            __count: run.length,
            __packages: [...new Set(run.map((r) => r.package_name).filter(Boolean))],
            __locations: [...new Set(run.map((r) => r.location).filter(Boolean))],
            time_start: first.time_start,
            time_start_day_offset: first.time_start_day_offset,
            time_end: last.time_end,
            time_end_day_offset: last.time_end_day_offset,
        });
        run = [];
        runKind = null;
    };

    for (const r of machineRows) {
        const kind = kindOf(r);
        if (!kind) {
            flush();
            shown.push(toRow(r));
        } else if (canCollapse) {
            if (runKind && runKind !== kind) flush(); // package and location runs never merge
            runKind = kind;
            run.push(r);
        }
    }
    flush();
    return shown;
}

function machineSection(ctx, m) {
    const {
        activePackage, readOnly, rowsByMachine, isParked, isOtherLoc, rowInActiveTab, rowInActiveTabOwn,
        expandedMachines, expandedLocations, collapsedMachines, nonMachineNameByKey, machinesByName,
        machinePlatform, otherPackageCounts, showAllMachines, lockedMachine,
    } = ctx;

    const isAll = activePackage === ALL_PACKAGES_TAB;
    const isUnassigned = m === null;
    const isManual = m === MACHINE_MANUAL;
    const isNonMachine = isNonMachineKey(m);

    // machine view: this is the one machine the page is about (`!= null`: m === null is Unassigned)
    const locked = lockedMachine != null && m === lockedMachine;

    if (isUnassigned && readOnly) return [];
    if (isManual && activePackage !== MANUAL_TAB && !isAll && activePackage !== PICKUP_TAB) return [];

    const canCollapse = !isUnassigned && !isManual;
    const showAll = locked || (canCollapse && expandedMachines.has(m));
    const showLoc = locked || !canCollapse || expandedLocations.has(m);

    const machineRows = (rowsByMachine.get(m) ?? []).filter(
        (r) => !isParked(r) && !(isUnassigned && isOtherLoc(r)),
    );
    if (isUnassigned) machineRows.sort(compareUnassigned);

    const matchingLots = machineRows.filter(
        (r) => !isBlockRow(r) && !isOtherLoc(r) && rowInActiveTabOwn(r),
    ).length;

    const hiddenKind = (r) => {
        if (isBlockRow(r)) return null;
        if (isOtherLoc(r)) return showLoc ? null : "location";
        return showAll || rowInActiveTabOwn(r) ? null : "package";
    };

    const nmName = nonMachineNameByKey.get(m);
    const shown = collapseHiddenRuns(machineRows, {
        machine: m,
        canCollapse,
        kindOf: hiddenKind,
        toRow: (r) => asDataRow(r, nmName),
    });

    const dataShown = shown.filter((r) => r.__type === "data");
    const parked = isUnassigned || isNonMachine
        ? []
        : bucketSections(ctx, m, showAll ? () => true : rowInActiveTab);
    const parkedCount = parked.filter((r) => r.__type === "data").length;

    if (matchingLots === 0 && parkedCount === 0 && canCollapse && !showAllMachines && !locked) return [];

    const header = {
        id: `header-${m ?? "unassigned"}`,
        __type: "header",
        machine: m,
        isNonMachine,
        nonMachineId: isNonMachine ? Number(m.slice(3)) : undefined,
        machineLocation: machinesByName[m]?.location,
        machineId: machinesByName[m]?.id,
        machineLabel: getMachineLabel(m, nonMachineNameByKey),
        platform: machinePlatform.get(m),
        __rowCount: dataShown.length,
        __lotCount: dataShown.filter((r) => !isBlockRow(r)).length,
        otherPackageCount: isUnassigned || locked ? 0 : (otherPackageCounts[m] ?? 0),
        // a collapse saved from the full view must not hide the only section in the machine view
        __isCollapsed: collapsedMachines.has(m) && !locked,
        isLocked: true,
    };

    return header.__isCollapsed ? [header] : [header, ...shown, ...parked];
}

function buildMachineTab(ctx) {
    const { activePackage, machines, nonMachineKeys, rowInActiveTab } = ctx;
    const isAll = activePackage === ALL_PACKAGES_TAB;

    const machineSections = [...machines, ...nonMachineKeys].flatMap((m) => machineSection(ctx, m));

    const orphans = isAll || activePackage === PICKUP_TAB
        ? orphanSections(ctx, activePackage === PICKUP_TAB ? (r) => !!r.is_pickup : () => true)
        : [];

    // top-level groups (Anticipate, Upcoming, ...) go below every machine
    return [...machineSections, ...orphans, ...bucketSections(ctx, null, rowInActiveTab)];
}

/**
 * Pure builder for the machine grid's rows: headers, data rows, collapsed runs.
 * `ctx` is everything it needs, see the call site in Deemo.jsx.
 * With `ctx.lockedMachine` set (machine view) only that machine's section is built.
 */
export function buildDisplayRows(ctx) {
    if (ctx.lockedMachine) return machineSection(ctx, ctx.lockedMachine);
    if (ctx.activePackage === UNASSIGNED_TAB && !ctx.readOnly) return buildUnassignedTab(ctx);
    if (ctx.activePackage === ORPHAN_TAB) return orphanSections(ctx, () => true);
    return buildMachineTab(ctx);
}

// ---------------------------------------------------------------------
// Bake tab
// ---------------------------------------------------------------------
function compareOvens(a, b) {
    const an = Number(a);
    const bn = Number(b);
    if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
    return String(a).localeCompare(String(b));
}

export function buildBakeDisplayRows(bakeLots, collapsedOvens) {
    const byOven = new Map();
    for (const r of bakeLots ?? []) {
        if (!byOven.has(r.oven_num)) byOven.set(r.oven_num, []);
        byOven.get(r.oven_num).push(r);
    }

    return [...byOven.keys()].sort(compareOvens).flatMap((oven) => {
        const rows = byOven.get(oven).map(toDataRow);
        const isCollapsed = collapsedOvens.has(oven);

        const header = {
            id: `bake-header-${oven}`,
            __type: "header",
            ovenLabel: oven,
            __rowCount: rows.length, // shown even while collapsed
            __isCollapsed: isCollapsed,
            isLocked: true,
        };
        return isCollapsed ? [header] : [header, ...rows];
    });
}