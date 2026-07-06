/**
 * LoadingPlanTable.jsx
 *
 * Install:
 *   npm install @tanstack/react-table @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
 *
 * Usage:
 *   <LoadingPlanTable
 *     data={lots}
 *     baseTimes={{ "08G6L": "05:12", "09G6L": "05:04", MANUAL: "08:00" }}
 *     onLotTransfer={(lotId, fromMachine, toMachine) => { ... }}
 *     onReorder={(machine, newOrderedLots) => { ... }}
 *   />
 *
 * Layout contract:
 *   This component renders as a flex column that fills its parent.
 *   The parent (page/layout) must be a flex column with overflow hidden,
 *   e.g. <div className="flex flex-col flex-1 min-h-0">.
 *   The SelectionToolbar renders as a sibling *below* the scroll area,
 *   so it sits naturally above the Footer — never overlapping it.
 *
 * Lot row shape (main data source — all read-only except the editable fields):
 *   {
 *     machine:            string|null, // real machine name, "MANUAL", or
 *                                       // null (Unassigned). Source data
 *                                       // has no machine info at all — the
 *                                       // user assigns it entirely by hand,
 *                                       // via drag-and-drop or transfer.
 *                                       // A brand-new lot with no `machine`
 *                                       // field defaults to null on seed;
 *                                       // an already-saved plan keeps
 *                                       // whatever machine/MANUAL it has.
 *     item:               number,   // 1-based queue position — auto-managed
 *     Part_Name:          string,
 *     Lead_Count:         number,   // integer, read-only
 *     Package_Name:       string,
 *     Lot_Id:             string,
 *     status:             string,   // dropdown: "DONE" | "RUNNING" | "FOR PROCESS" | "FVI" | "BOXING" | "LWAIT" | null
 *     Station:            string,
 *     Qty:                number,
 *     Lot_Type:           string,
 *     Lot_Status:         string,
 *     Focus_Group:        string,
 *     Stage:              string,
 *     Lot_Entry_Time_Days:number,
 *     CR3:                string|number,
 *     BE_OSL_Days:        number,
 *     Body_Size:          string,
 *     Ramp_Time:          number|string,
 *     // Hidden columns used for derived calculations:
 *     Date_Loaded:        string,   // "6/23/2026 4:38:45 AM"
 *     BE_Starttime:       string,   // "6/23/2026 4:38:45 AM"
 *     Backend_Leadtime:   number,   // integer (days)
 *     tag:                string|null, // "expedite" | "hold" | "flag" | null
 *   }
 *
 * Editable fields (stored in a separate table, merged on the frontend):
 *   Doable, accuTime (the duration in minutes), Remarks
 *
 * Derived (computed, never stored directly):
 *   timeStart, timeEnd  — recomputed from accuTime + baseTimes; null/blank
 *                          for Unassigned (machine === null), since there's
 *                          no schedule there to compute
 *   expectedPT          — accuTime / 60, displayed as "Xh Ymin"
 *   CT                  — (Date_Loaded - BE_Starttime) in days, 2 dp
 *   OSL                 — CT - Backend_Leadtime, 2 dp
 *   Capacity_UPH         — looked up from CAPACITY_BANDS using (Qty, the
 *                          lot's CURRENT machine's platform). Re-derives
 *                          live on every render — moving a lot to a
 *                          different machine/platform, or editing Qty,
 *                          changes it instantly with no separate recompute
 *                          step needed. null for Unassigned/MANUAL (no
 *                          platform to look up).
 *
 * Package grouping:
 *   Package tabs are no longer 1:1 with Package_Name. A tab represents a
 *   GROUP of related packages (see PACKAGE_GROUPS below). Any Package_Name
 *   not listed in PACKAGE_GROUPS falls back to being its own group (so
 *   existing ungrouped packages keep behaving exactly as before).
 *
 *   The machine timeline (timeStart/timeEnd) is computed ONCE per machine,
 *   in true row order, completely independent of Package_Name/groups — a
 *   single machine can only run one lot at a time, regardless of which
 *   package/tab that lot belongs to. Package tabs are a pure VIEW FILTER
 *   on top of that one shared timeline; they never create separate
 *   parallel schedules.
 *
 * Machine assignment — Unassigned / MANUAL / real machines:
 *   Lots arrive from the source system with no machine info at all. The
 *   user decides machine placement entirely by hand. Three buckets exist,
 *   always rendered (pinned at the top in this order), independent of
 *   whether any lot currently sits in them:
 *
 *     - Unassigned (machine === null) — a holding pen. NO timeline: order
 *       is purely cosmetic, never recomputed, no Capacity_UPH. Ignores the
 *       active package-group filter entirely (always shows ALL unassigned
 *       lots, regardless of which tab is selected) — there's no "view" to
 *       filter against until a lot has a machine.
 *     - MANUAL (machine === "MANUAL") — work done by a person, not a
 *       machine. HAS its own independent timeline, exactly like a real
 *       machine (same recomputeMachine() path) — it's just not backed by a
 *       platform, so Capacity_UPH is always null there.
 *     - Real machines — from the MACHINES config (mocked for now; will be
 *       DB-backed). Each has a `platform`, used only for Capacity_UPH
 *       lookups against CAPACITY_BANDS (also mocked).
 *
 *   Lots can be dragged/transferred freely between any of the three at any
 *   time, in any direction — nothing here is one-way.
 */
import { initialData as _initialData } from "@/Constants/loadingPlanData.js";
import { useMutation } from "@/Hooks/useMutation";
import { useToast } from "@/Hooks/useToast";
import { createUndoStore } from "@/Store/undoStore";
import toSnakeCase from "@/Utils/toSnakeCase";
import {
    closestCenter,
    DndContext,
    DragOverlay,
    PointerSensor,
    useDroppable,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
    createContext,
    Fragment,
    memo,
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
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
function groupOf(packageName) {
    if (!packageName) return packageName;
    return PACKAGE_TO_GROUP[packageName] ?? packageName;
}

/** All valid Package_Name values for a given group/tab label. */
function packagesInGroup(group) {
    return PACKAGE_GROUPS[group] ?? [group];
}

// ---------------------------------------------------------------------------
// Machine / platform / capacity-band config
// ---------------------------------------------------------------------------
//
// MOCKED FOR NOW — these three will eventually come from the database
// (machines table with name+platform, and a capacity_bands table keyed by
// platform). Until then, edit these arrays directly.
//
// A lot's `machine` field is one of:
//   - a real machine name listed in MACHINES (has a platform, has a
//     timeline, has a Capacity_UPH derived from its platform's bands)
//   - MACHINE_MANUAL  ("MANUAL" pseudo-machine — processed by a person.
//     Has its OWN independent timeline (timeStart/timeEnd), just like a
//     real machine, but no platform, so no Capacity_UPH.)
//   - null            (truly unassigned — no timeline at all, order is
//     purely cosmetic, never recomputed.)
//
// Package tabs are a pure view filter; machine assignment is completely
// orthogonal to that — every lot, on any machine/bucket, still belongs to
// whichever package group it always belonged to.

const MACHINE_MANUAL = "MANUAL";

const MACHINES = [
    { name: "08G6L", platform: "G6L" },
    { name: "54AT28", platform: "G6L" },

    // { name: "09G6L", platform: "G6L" },
    // { name: "12HSI", platform: "HSI" },
    // { name: "VTX-01", platform: "VITROX" },
];

const CAPACITY_BANDS = [
    { platform: "VITROX", qty_min: 1, qty_max: 500, capacity_uph: 110 },
    { platform: "VITROX", qty_min: 501, qty_max: 750, capacity_uph: 357 },
    { platform: "VITROX", qty_min: 751, qty_max: 1000, capacity_uph: 524 },
    { platform: "VITROX", qty_min: 1001, qty_max: 2500, capacity_uph: 679 },
    { platform: "VITROX", qty_min: 2501, qty_max: 5000, capacity_uph: 1187 },
    { platform: "VITROX", qty_min: 5001, qty_max: 7500, capacity_uph: 2095 },
    { platform: "VITROX", qty_min: 7501, qty_max: 10000, capacity_uph: 2752 },
    { platform: "VITROX", qty_min: 10001, qty_max: 999999, capacity_uph: 4000 },
    { platform: "HSI", qty_min: 1, qty_max: 500, capacity_uph: 110 },
    { platform: "HSI", qty_min: 501, qty_max: 750, capacity_uph: 357 },
    { platform: "HSI", qty_min: 751, qty_max: 1000, capacity_uph: 524 },
    { platform: "HSI", qty_min: 1001, qty_max: 2500, capacity_uph: 679 },
    { platform: "HSI", qty_min: 2501, qty_max: 5000, capacity_uph: 1276 },
    { platform: "HSI", qty_min: 5001, qty_max: 7500, capacity_uph: 2263 },
    { platform: "HSI", qty_min: 7501, qty_max: 10000, capacity_uph: 3050 },
    { platform: "HSI", qty_min: 10001, qty_max: 999999, capacity_uph: 4000 },
    { platform: "G6L", qty_min: 1, qty_max: 500, capacity_uph: 110 },
    { platform: "G6L", qty_min: 501, qty_max: 750, capacity_uph: 357 },
    { platform: "G6L", qty_min: 751, qty_max: 1000, capacity_uph: 524 },
    { platform: "G6L", qty_min: 1001, qty_max: 2500, capacity_uph: 679 },
    { platform: "G6L", qty_min: 2501, qty_max: 5000, capacity_uph: 1132 },
    { platform: "G6L", qty_min: 5001, qty_max: 7500, capacity_uph: 1845 },
    { platform: "G6L", qty_min: 7501, qty_max: 10000, capacity_uph: 2337 },
    { platform: "G6L", qty_min: 10001, qty_max: 999999, capacity_uph: 4000 },
];

const VALID_WIP_STATUSES = ["ok", "not_imported", "invalid_date"];

const statusMessages = {
    ok: "",
    not_imported: "Today's data hasn't been imported yet.",
    invalid_date: "The selected date is invalid.",
};

function getStatusMessage(status) {
    if (!VALID_WIP_STATUSES.includes(status)) {
        console.warn(`Unknown status: ${status}`);
    }
    return statusMessages[status] ?? "Unexpected error.";
}

// Reverse lookup: machine name -> platform.
const MACHINE_TO_PLATFORM = Object.fromEntries(
    MACHINES.map((m) => [m.name, m.platform]),
);

/** Real machine name list, in config order — does NOT include MANUAL/null. */
const REAL_MACHINE_NAMES = MACHINES.map((m) => m.name);

/** Platform for a real machine name, or null for MANUAL/unassigned/unknown. */
function platformOf(machine) {
    return MACHINE_TO_PLATFORM[machine] ?? null;
}

/** Whether `machine` has its own timeline (real machine or MANUAL).
 *  False for null/undefined (truly unassigned — no schedule at all). */
function hasTimeline(machine) {
    return machine === MACHINE_MANUAL || Boolean(MACHINE_TO_PLATFORM[machine]);
}

/** Capacity_UPH for a given qty on a given platform, per CAPACITY_BANDS.
 *  Returns null if platform is unknown or qty falls outside every band
 *  (e.g. no platform — MANUAL/unassigned — or qty <= 0). */
function lookupCapacityUPH(qty, platform) {
    if (!platform) return null;
    const q = Number(qty) || 0;
    const band = CAPACITY_BANDS.find(
        (b) => b.platform === platform && q >= b.qty_min && q <= b.qty_max,
    );
    return band ? band.capacity_uph : null;
}

// ---------------------------------------------------------------------------
// Queue time computation
// ---------------------------------------------------------------------------

const useLoadingPlanStore = createUndoStore([]);
const PREFIX_EMPTY_DROPPABLE = "empty-";
const UNASSIGNED_DROPPABLE_TOKEN = "__unassigned__";

/** machine value -> stable string id usable in dnd-kit droppable/over ids.
 *  null (Unassigned) needs an explicit token — string-coercing null gives
 *  the literal text "null", which would round-trip back as a string, not
 *  the actual null value, corrupting machine assignment on drop. */
function machineToDroppableToken(machine) {
    return machine === null ? UNASSIGNED_DROPPABLE_TOKEN : machine;
}

/** Inverse of machineToDroppableToken(). */
function droppableTokenToMachine(token) {
    return token === UNASSIGNED_DROPPABLE_TOKEN ? null : token;
}

/** Given the full data array (post-move) and a row's _dndId, find the
 *  entryId of its immediate same-machine neighbors — what moveLot/moveBlock
 *  need to compute the new sequence_order server-side. Works for both lot
 *  and block rows, since sequence_order is a property of the row's
 *  position, not its type. */
function findMachineNeighbors(rows, dndId, machine) {
    const machineRows = rows.filter((r) => r.machine === machine);

    const idx = machineRows.findIndex((r) => r._dndId === dndId);
    if (idx === -1) return { beforeEntryId: null, afterEntryId: null };

    // Skip neighbors that don't have a server-side id yet (a row just
    // added locally via handleAddRow/handleAddBlock and not yet
    // persisted) — walk outward to the nearest neighbor that does.
    let beforeIdx = idx - 1;
    while (beforeIdx >= 0 && !machineRows[beforeIdx].entryId) beforeIdx--;
    let afterIdx = idx + 1;
    while (afterIdx < machineRows.length && !machineRows[afterIdx].entryId)
        afterIdx++;

    return {
        beforeEntryId: machineRows[beforeIdx]?.entryId ?? null,
        afterEntryId: machineRows[afterIdx]?.entryId ?? null,
    };
}

function parseTime(hhmm) {
    const [h, m] = (hhmm ?? "06:00").split(":").map(Number);
    return h * 60 + m;
}

function formatTime(totalMinutes) {
    if (!isFinite(totalMinutes) || totalMinutes < 0) return "—";
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = Math.round(totalMinutes % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Computes ONE continuous timeline for `machine`, in true row order,
 * regardless of Package_Name. A machine (or the MANUAL pseudo-machine,
 * which has its own independent timeline the same way) can only process
 * one lot at a time, so there is exactly one schedule per bucket —
 * package tabs are a pure view filter on top of this, never a separate
 * parallel schedule.
 *
 * Truly unassigned lots (`machine === null`) have NO timeline at all —
 * order there is purely cosmetic, so this clears timeStart/timeEnd
 * instead of computing anything.
 */
function recomputeMachine(rows, machine, baseTimes) {
    const machineRows = rows.filter((r) => r.machine === machine);

    if (!hasTimeline(machine)) {
        machineRows.forEach((row) => {
            row.timeStart = null;
            row.timeEnd = null;
        });
        return;
    }

    const baseTime = baseTimes[machine] ?? "06:00";
    machineRows.reduce((prevEnd, row) => {
        const dur = Number(row.accuTime) || 0;
        row.timeStart = formatTime(prevEnd);
        row.timeEnd = formatTime(prevEnd + dur);
        return prevEnd + dur;
    }, parseTime(baseTime));
}

// ---------------------------------------------------------------------------
// Derived value helpers
// ---------------------------------------------------------------------------

/** accuTime (minutes) → "Xh Ymin" */
function formatExpectedPT(accuTime) {
    const mins = Number(accuTime) || 0;
    if (mins <= 0) return "—";
    const totalHours = mins / 60;
    const h = Math.floor(totalHours);
    const m = Math.round((totalHours - h) * 60);
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
}

/** Parse "6/23/2026 4:38:45 AM" → Date | null */
function parseDatetime(str) {
    if (!str) return null;
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
}

/** CT = Date_Loaded - BE_Starttime in days, 2 dp */
function computeCT(row) {
    const loaded = parseDatetime(row.Date_Loaded);
    const beStart = parseDatetime(row.BE_Starttime);
    if (!loaded || !beStart) return null;
    const diffMs = loaded - beStart;
    return parseFloat((diffMs / (1000 * 60 * 60 * 24)).toFixed(2));
}

/** OSL = CT - Backend_Leadtime, 2 dp */
function computeOSL(ct, backendLeadtime) {
    if (ct === null || backendLeadtime == null) return null;
    return parseFloat((ct - Number(backendLeadtime)).toFixed(2));
}

function fmt2dp(val) {
    if (val === null || val === undefined || !isFinite(val)) return "—";
    return val.toFixed(2);
}

function mergeRefs(...refs) {
    return (node) => {
        refs.forEach((ref) => {
            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;
        });
    };
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

const columnHelper = createColumnHelper();

/**
 * Editable columns and their input types.
 * accuTime replaces the old "duration" as the editable queue-time field.
 * Package_Name is intentionally NOT here — it has its own dropdown editor
 * (handlePackageClick), scoped to the row's current group, mirroring how
 * `status` already works.
 * Capacity_UPH is intentionally NOT here either — it's fully derived from
 * (Qty, the lot's current machine's platform) via CAPACITY_BANDS, so it's
 * a display column now, recomputed live on every render (see its
 * columnHelper.display definition below).
 */
const EDITABLE_COLUMNS = {
    Doable: "integer",
    accuTime: "integer",
    Remarks: "string",
};

const isBlockRow = (row) => row?.isBlock === true;

const COLUMNS = [
    // ── Drag handle (display only) ──────────────────────────────────────────
    columnHelper.display({
        id: "drag",
        size: 36,
        enableSorting: false,
        header: () => null,
        cell: () => null,
    }),

    // ── # (item / queue position) ───────────────────────────────────────────
    columnHelper.display({
        id: "item",
        header: "#",
        size: 40,
    }),

    // ── Read-only data columns ──────────────────────────────────────────────
    columnHelper.accessor("Part_Name", {
        header: "Part Name",
        size: 200,
        cell: (info) => (
            <span className="font-mono text-xs">{info.getValue() ?? "—"}</span>
        ),
    }),

    columnHelper.accessor("Lead_Count", {
        header: "Leads",
        size: 55,
        cell: (info) => info.getValue() ?? "—",
    }),

    columnHelper.accessor("Package_Name", {
        header: "Package",
        size: 100,
        // Rendering for normal rows is special-cased in RowContent (clickable,
        // opens the package dropdown) — this default cell is only used as a
        // fallback (e.g. DragGhostRow reads Package_Name directly, not via
        // this columnDef).
        cell: (info) => info.getValue() ?? "—",
    }),

    columnHelper.accessor("Lot_Id", {
        header: "Lot ID",
        size: 120,
    }),

    columnHelper.accessor("status", {
        header: "Status",
        size: 110,
        cell: (info) => (
            <StatusBadge
                status={info.getValue() === null ? "NONE" : info.getValue()}
            />
        ),
    }),

    columnHelper.accessor("Station", {
        header: "Station",
        size: 120,
    }),

    columnHelper.accessor("Qty", {
        header: "Qty",
        size: 80,
        cell: (info) => info.getValue()?.toLocaleString() ?? "—",
    }),

    // ── Editable columns ────────────────────────────────────────────────────
    columnHelper.accessor("Doable", {
        header: "Doable",
        size: 80,
        cell: (info) =>
            info.getValue() > 0 ? info.getValue().toLocaleString() : "—",
    }),

    // ── Derived: Capacity_UPH (from Qty + current machine's platform) ──────
    columnHelper.display({
        id: "Capacity_UPH",
        header: "Capacity UPH",
        size: 90,
        enableSorting: false,
        cell: (info) => {
            const r = info.row.original;
            const uph = lookupCapacityUPH(r.Qty, platformOf(r.machine));
            return uph != null ? uph.toLocaleString() : "—";
        },
    }),

    columnHelper.accessor("accuTime", {
        header: "Accu. Time",
        size: 85,
        cell: (info) => {
            const v = info.getValue();
            if (!v && v !== 0) return "—";
            const h = Math.floor(v / 60);
            const m = v % 60;
            return h > 0 ? `${h}h ${m}m` : `${m}m`;
        },
    }),

    // ── Derived time columns ────────────────────────────────────────────────
    columnHelper.accessor("timeStart", {
        header: "Time Start",
        size: 75,
        enableSorting: false,
    }),

    columnHelper.accessor("timeEnd", {
        header: "Time End",
        size: 75,
        enableSorting: false,
    }),

    columnHelper.display({
        id: "expectedPT",
        header: "Expected PT",
        size: 85,
        enableSorting: false,
        cell: (info) => formatExpectedPT(info.row.original.accuTime),
    }),

    // ── More read-only data columns ─────────────────────────────────────────
    columnHelper.accessor("Lot_Type", {
        header: "Lot Type",
        size: 65,
    }),

    columnHelper.accessor("Lot_Status", {
        header: "Lot Status",
        size: 90,
    }),

    columnHelper.display({
        id: "focusGroupStage",
        header: "Focus Group / Stage",
        size: 140,
        cell: (info) => {
            const r = info.row.original;
            const fg = r.Focus_Group ?? "";
            const st = r.Stage ?? "";
            if (!fg && !st) return "—";
            if (!st) return fg;
            if (!fg) return st;
            return `${fg} / ${st}`;
        },
    }),

    columnHelper.accessor("Lot_Entry_Time_Days", {
        header: "Entry Days",
        size: 75,
        cell: (info) => fmt2dp(info.getValue()),
    }),

    columnHelper.accessor("CR3", {
        header: "CR3",
        size: 65,
        cell: (info) => info.getValue() ?? "—",
    }),

    columnHelper.accessor("BE_OSL_Days", {
        header: "BE OSL Days",
        size: 85,
        cell: (info) => fmt2dp(info.getValue()),
    }),

    // ── Derived CT / OSL ────────────────────────────────────────────────────
    columnHelper.display({
        id: "CT",
        header: "CT",
        size: 65,
        enableSorting: false,
        cell: (info) => {
            const ct = computeCT(info.row.original);
            return fmt2dp(ct);
        },
    }),

    columnHelper.display({
        id: "OSL",
        header: "OSL",
        size: 65,
        enableSorting: false,
        cell: (info) => {
            const ct = computeCT(info.row.original);
            const osl = computeOSL(ct, info.row.original.Backend_Leadtime);
            return fmt2dp(osl);
        },
    }),

    // ── More read-only data columns ─────────────────────────────────────────
    columnHelper.accessor("Body_Size", {
        header: "Body Size",
        size: 75,
        cell: (info) => info.getValue() ?? "—",
    }),

    columnHelper.accessor("Ramp_Time", {
        header: "Ramp Time",
        size: 80,
        cell: (info) => info.getValue() ?? "—",
    }),

    // ── Editable free-text ──────────────────────────────────────────────────
    columnHelper.accessor("Remarks", {
        header: "Remarks",
        size: 160,
        cell: (info) => (
            <span className="text-xs text-base-content/60 italic">
                {info.getValue() || ""}
            </span>
        ),
    }),
];

const TOTAL_MIN_WIDTH = COLUMNS.reduce((s, c) => s + (c.size ?? 100), 0);
const COL_WIDTHS = Object.fromEntries(
    COLUMNS.map((c) => [c.accessorKey ?? c.id, c.size ?? 100]),
);

// ---------------------------------------------------------------------------
// Tag config
// ---------------------------------------------------------------------------

const TAGS = {
    expedite: {
        label: "Expedite",
        border: "border-l-orange-400",
        bg: "bg-orange-400/10",
        dot: "bg-orange-400",
        toolbar: "bg-orange-400/20 text-orange-400 hover:bg-orange-400/30",
    },
    hold: {
        label: "Hold",
        border: "border-l-red-400",
        bg: "bg-red-400/10",
        dot: "bg-red-400",
        toolbar: "bg-red-400/20 text-red-400 hover:bg-red-400/30",
    },
    flag: {
        label: "Flag",
        border: "border-l-yellow-400",
        bg: "bg-yellow-400/10",
        dot: "bg-yellow-400",
        toolbar: "bg-yellow-400/20 text-yellow-400 hover:bg-yellow-400/30",
    },
};

function TagDot({ tag }) {
    if (!tag || !TAGS[tag]) return null;
    return (
        <span
            className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${TAGS[tag].dot}`}
            title={TAGS[tag].label}
        />
    );
}

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATUS_STYLES = {
    DONE: "bg-success/20 text-success",
    RUNNING: "bg-info/20 text-info",
    "FOR PROCESS": "bg-warning/20 text-warning",
    FVI: "bg-warning/20 text-warning",
    BOXING: "bg-base-content/10 text-base-content/60",
    LWAIT: "bg-base-content/10 text-base-content/60",
    NONE: "bg-base-content/10 text-base-content/60",
};

function StatusBadge({ status }) {
    const cls =
        STATUS_STYLES[status] ?? "bg-base-content/10 text-base-content/50";
    return (
        <span
            className={`flex px-1 rounded-lg items-center text-left text-[11px] font-medium w-full h-full whitespace-nowrap ${cls}`}
        >
            {status}
        </span>
    );
}

// ---------------------------------------------------------------------------
// Grip icon
// ---------------------------------------------------------------------------

function GripIcon() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="currentColor"
            aria-hidden="true"
        >
            <circle cx="4" cy="3" r="1.2" />
            <circle cx="10" cy="3" r="1.2" />
            <circle cx="4" cy="7" r="1.2" />
            <circle cx="10" cy="7" r="1.2" />
            <circle cx="4" cy="11" r="1.2" />
            <circle cx="10" cy="11" r="1.2" />
        </svg>
    );
}

function RowCheckbox({ checked, indeterminate, onChange, title }) {
    const ref = useRef(null);
    useEffect(() => {
        if (ref.current) ref.current.indeterminate = Boolean(indeterminate);
    }, [indeterminate]);
    return (
        <input
            ref={ref}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            title={title ?? "Select row"}
            className="checkbox checkbox-info cursor-pointer"
            onClick={(e) => e.stopPropagation()}
        />
    );
}

// ── Thin shell: takes the dnd-kit hit, passes stable props down ──────────────
const SortableRow = memo(function SortableRow({
    row,
    orderedDndIds,
    itemNumber,
    measureElement,
    virtualIndex,
    isSortable = true,
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: row.original._dndId, disabled: !isSortable });

    return (
        <RowContent
            row={row}
            orderedDndIds={orderedDndIds}
            setNodeRef={mergeRefs(setNodeRef, measureElement)}
            virtualIndex={virtualIndex}
            transform={transform}
            transition={transition}
            isDragging={isDragging}
            dragHandleProps={{ ...attributes, ...listeners }}
            itemNumber={itemNumber}
            isSortable={isSortable}
        />
    );
});

// ── Heavy component: all JSX, context, handlers live here ───────────────────
const RowContent = memo(
    function RowContent({
        row,
        orderedDndIds,
        setNodeRef,
        virtualIndex,
        transform,
        transition,
        isDragging,
        dragHandleProps,
        itemNumber,
        isSortable,
    }) {
        const {
            handleStatusClick,
            handleCellClick,
            handlePackageClick,
            selectedIds,
            handleRowSelect,
        } = useContext(TableActionsContext);

        const isSelected = selectedIds.has(row.original._dndId);
        const tag = row.original.tag ?? null;
        const tagCfg = tag ? TAGS[tag] : null;

        const handleItemClick = useCallback(
            (e) => {
                e.stopPropagation();
                handleRowSelect(
                    row.original._dndId,
                    e.shiftKey,
                    e.ctrlKey || e.metaKey,
                    orderedDndIds,
                );
            },
            [row.original._dndId, handleRowSelect, orderedDndIds],
        );

        const handleCheckboxChange = useCallback(
            (e) => {
                handleRowSelect(
                    row.original._dndId,
                    e.nativeEvent.shiftKey,
                    e.nativeEvent.ctrlKey || e.nativeEvent.metaKey,
                    orderedDndIds,
                );
            },
            [row.original._dndId, handleRowSelect, orderedDndIds],
        );

        // ── Block row ────────────────────────────────────────────────────────
        if (isBlockRow(row.original)) {
            const r = row.original;
            return (
                <tr
                    ref={setNodeRef}
                    data-index={virtualIndex}
                    style={{
                        transform: CSS.Transform.toString(transform),
                        transition,
                        opacity: isDragging ? 0.3 : 1,
                        backgroundImage: isSelected
                            ? undefined
                            : "repeating-linear-gradient(45deg,oklch(var(--bc)/0.06),oklch(var(--bc)/0.12) 10px,transparent 10px,transparent 20px)",
                    }}
                    className={`border-b border-base-300 last:border-0 border-l-2 ${
                        isSelected
                            ? "bg-info/10 border-l-info"
                            : tagCfg
                              ? `${tagCfg.bg} ${tagCfg.border}`
                              : "border-l-transparent"
                    }`}
                >
                    <td className="px-1 text-center">
                        <div className="flex items-center gap-1">
                            <RowCheckbox
                                checked={isSelected}
                                onChange={handleCheckboxChange}
                                title="Select row (Shift+click for range, Ctrl+click to add)"
                            />
                            <button
                                className="btn btn-ghost cursor-grab text-base-content/20 hover:text-base-content/70 active:cursor-grabbing p-1 rounded"
                                {...dragHandleProps}
                                disabled={!isSortable}
                                tabIndex={-1}
                                aria-label="Drag to reorder"
                            >
                                <GripIcon />
                            </button>
                        </div>
                    </td>
                    <td
                        style={{
                            width: COL_WIDTHS.item,
                            maxWidth: COL_WIDTHS.item,
                        }}
                        className="px-2.5 text-xs text-base-content/40"
                    >
                        <div className="flex items-center gap-1">
                            <TagDot tag={tag} />
                            {itemNumber}
                        </div>
                    </td>
                    <td
                        colSpan={4}
                        style={{
                            width:
                                COL_WIDTHS.Part_Name +
                                COL_WIDTHS.Lead_Count +
                                COL_WIDTHS.Package_Name +
                                COL_WIDTHS.Lot_Id,
                        }}
                        className="px-2.5 text-sm font-medium text-base-content whitespace-nowrap overflow-hidden text-ellipsis"
                    >
                        - - - - - - {r.blockLabel || "Time block"} - - - - - -
                    </td>
                    <td style={{ width: COL_WIDTHS.status }} />
                    <td style={{ width: COL_WIDTHS.Station }} />
                    <td style={{ width: COL_WIDTHS.Qty }} />
                    <td style={{ width: COL_WIDTHS.Doable }} />
                    <td style={{ width: COL_WIDTHS.Capacity_UPH }} />
                    <td
                        style={{
                            width: COL_WIDTHS.accuTime,
                            maxWidth: COL_WIDTHS.accuTime,
                        }}
                        className="px-2.5 text-sm cursor-text hover:bg-info/10 hover:ring-1 hover:ring-info/30"
                        onClick={(e) =>
                            handleCellClick(e, r._dndId, "accuTime")
                        }
                    >
                        {(() => {
                            const v = Number(r.accuTime) || 0;
                            const h = Math.floor(v / 60);
                            const m = v % 60;
                            return h > 0 ? `${h}h ${m}m` : `${m}m`;
                        })()}
                    </td>
                    <td
                        style={{ width: COL_WIDTHS.timeStart }}
                        className="px-2.5 text-sm text-base-content"
                    >
                        {r.timeStart}
                    </td>
                    <td
                        style={{ width: COL_WIDTHS.timeEnd }}
                        className="px-2.5 text-sm text-base-content"
                    >
                        {r.timeEnd}
                    </td>
                    <td
                        style={{ width: COL_WIDTHS.expectedPT }}
                        className="px-2.5 text-sm text-base-content"
                    >
                        {formatExpectedPT(r.accuTime)}
                    </td>
                    <td style={{ width: COL_WIDTHS.Lot_Type }} />
                    <td style={{ width: COL_WIDTHS.Lot_Status }} />
                    <td style={{ width: COL_WIDTHS.focusGroupStage }} />
                    <td style={{ width: COL_WIDTHS.Lot_Entry_Time_Days }} />
                    <td style={{ width: COL_WIDTHS.CR3 }} />
                    <td style={{ width: COL_WIDTHS.BE_OSL_Days }} />
                    <td style={{ width: COL_WIDTHS.CT }} />
                    <td style={{ width: COL_WIDTHS.OSL }} />
                    <td style={{ width: COL_WIDTHS.Body_Size }} />
                    <td style={{ width: COL_WIDTHS.Ramp_Time }} />
                    <td style={{ width: COL_WIDTHS.Remarks }} />
                </tr>
            );
        }

        // ── Normal lot row ───────────────────────────────────────────────────
        return (
            <tr
                ref={setNodeRef}
                data-index={virtualIndex}
                style={{
                    transform: CSS.Transform.toString(transform),
                    transition,
                    opacity: isDragging ? 0.3 : 1,
                }}
                className={`border-b border-base-300 last:border-0 border-l-2 transition-colors ${
                    isSelected
                        ? "bg-info/10 border-l-info"
                        : tagCfg
                          ? `${tagCfg.bg} ${tagCfg.border} hover:brightness-95`
                          : !row.original.Lot_Id
                            ? "bg-warning/10 border-l-warning/60 hover:bg-base-200"
                            : "border-l-transparent hover:bg-base-200"
                }`}
            >
                <td className="w-9 px-1 text-center">
                    <div className="flex items-center gap-1">
                        <RowCheckbox
                            checked={isSelected}
                            onChange={handleCheckboxChange}
                            title="Select row (Shift+click for range, Ctrl+click to add)"
                        />
                        <button
                            className="btn btn-ghost cursor-grab text-base-content/20 hover:text-base-content/50 active:cursor-grabbing p-1 rounded"
                            {...dragHandleProps}
                            tabIndex={-1}
                            disabled={!isSortable}
                            aria-label="Drag to reorder or transfer"
                        >
                            <GripIcon />
                        </button>
                    </div>
                </td>
                {row.getVisibleCells().map((cell) => {
                    if (cell.column.id === "drag") return null;

                    if (cell.column.id === "item") {
                        return (
                            <td
                                key={cell.id}
                                style={{
                                    width: cell.column.getSize(),
                                    maxWidth: cell.column.getSize(),
                                }}
                                className="px-2.5 text-sm cursor-pointer select-none hover:text-info"
                                onClick={handleItemClick}
                                title="Click to select · Shift+click to range-select · Ctrl+click to add/remove"
                            >
                                <div className="flex items-center gap-1">
                                    <TagDot tag={tag} />
                                    <span
                                        className={`text-xs font-mono ${isSelected ? "text-info font-medium" : "text-base-content/40"}`}
                                    >
                                        {itemNumber}
                                    </span>
                                </div>
                            </td>
                        );
                    }

                    if (cell.column.id === "status") {
                        return (
                            <td
                                key={cell.id}
                                style={{
                                    width: cell.column.getSize(),
                                    maxWidth: cell.column.getSize(),
                                }}
                                className="px-2.5 text-sm"
                            >
                                <button
                                    className="btn btn-ghost w-full px-0 justify-start items-center"
                                    onClick={(e) =>
                                        handleStatusClick(
                                            e,
                                            row.original._dndId,
                                        )
                                    }
                                >
                                    <StatusBadge
                                        status={
                                            row.original.status === null
                                                ? "NONE"
                                                : row.original.status
                                        }
                                    />
                                </button>
                            </td>
                        );
                    }

                    if (cell.column.id === "Package_Name") {
                        return (
                            <td
                                key={cell.id}
                                style={{
                                    width: cell.column.getSize(),
                                    maxWidth: cell.column.getSize(),
                                }}
                                className="px-2.5 text-sm"
                            >
                                <button
                                    className="btn btn-ghost w-full text-left justify-start px-1.5 hover:bg-info/10 hover:ring-1 hover:ring-info/30 rounded"
                                    onClick={(e) =>
                                        handlePackageClick(
                                            e,
                                            row.original._dndId,
                                            row.original.Package_Name,
                                        )
                                    }
                                >
                                    <span className="text-sm whitespace-nowrap overflow-hidden text-ellipsis">
                                        {row.original.Package_Name ?? "—"}
                                    </span>
                                </button>
                            </td>
                        );
                    }

                    const colId = cell.column.id;
                    const isEditable = Boolean(EDITABLE_COLUMNS[colId]);

                    return (
                        <td
                            key={cell.id}
                            style={{
                                width: cell.column.getSize(),
                                maxWidth: cell.column.getSize(),
                            }}
                            className={`px-2.5 text-sm whitespace-nowrap overflow-hidden text-ellipsis text-base-content ${
                                isEditable
                                    ? "cursor-text hover:bg-info/10 hover:ring-1 hover:ring-info/30"
                                    : ""
                            } ${colId === "Doable" ? "text-error" : ""}`}
                            title={
                                typeof cell.getValue() === "string" ||
                                typeof cell.getValue() === "number"
                                    ? String(cell.getValue())
                                    : undefined
                            }
                            onClick={
                                isEditable
                                    ? (e) =>
                                          handleCellClick(
                                              e,
                                              row.original._dndId,
                                              colId,
                                          )
                                    : undefined
                            }
                        >
                            {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                            )}
                        </td>
                    );
                })}
            </tr>
        );
    },
    (prev, next) => {
        const po = prev.row.original;
        const no = next.row.original;
        return (
            po === no &&
            prev.orderedDndIds === next.orderedDndIds &&
            prev.isDragging === next.isDragging &&
            prev.virtualIndex === next.virtualIndex &&
            prev.transform?.x === next.transform?.x &&
            prev.transform?.y === next.transform?.y &&
            prev.transition === next.transition
        );
    },
);

// ---------------------------------------------------------------------------
// MachineSection
// ---------------------------------------------------------------------------

/** Display label for a machine bucket — Unassigned/Manual get real words
 *  instead of null/"MANUAL" literal. */
function machineLabel(machine) {
    if (machine === null) return "Unassigned";
    if (machine === MACHINE_MANUAL) return "Manual";
    return machine;
}

const MachineSection = memo(
    function MachineSection({
        machine,
        rows,
        isDropTarget,
        justAdded,
        otherPackageCount,
        globalSorting,
        onSortingChange,
        onAddRow,
        onAddBlock,
    }) {
        const [collapsed, setCollapsed] = useState(true);

        const prevAutoExpand = useRef(false);
        const shouldAutoExpand = isDropTarget || justAdded;
        if (shouldAutoExpand && !prevAutoExpand.current) {
            prevAutoExpand.current = true;
            if (collapsed) setCollapsed(false);
        }
        if (!shouldAutoExpand) prevAutoExpand.current = false;

        const totalQty = useMemo(
            () =>
                rows.reduce((s, r) => s + (isBlockRow(r) ? 0 : r.Qty || 0), 0),
            [rows],
        );
        const totalDoable = useMemo(
            () =>
                rows.reduce(
                    (s, r) => s + (isBlockRow(r) ? 0 : r.Doable || 0),
                    0,
                ),
            [rows],
        );
        const incompleteCount = useMemo(
            () => rows.filter((r) => !isBlockRow(r) && !r.Lot_Id).length,
            [rows],
        );

        const isUnassigned = machine === null;
        const isManual = machine === MACHINE_MANUAL;
        const isPseudo = isUnassigned || isManual;

        return (
            <div
                id={`machine-section-${machine ?? "unassigned"}`}
                className={`mb-2 rounded-xl transition-all duration-150 ${
                    isDropTarget
                        ? "ring-2 ring-info shadow-md"
                        : isPseudo
                          ? "ring-1 ring-base-300 opacity-60"
                          : "ring-1 ring-base-300"
                }`}
                // className={`mb-2 border rounded-xl transition-all duration-150 ${
                //     isDropTarget
                //         ? "border-info ring-2 ring-info/30 shadow-md"
                //         : isPseudo
                //           ? "border-base-300 border-dashed"
                //           : "border-base-300"
                // }`}
            >
                {/* Sticky machine header */}
                <div className="sticky top-7 z-10 rounded-t-xl">
                    <table
                        className="shadow-lg w-full border-collapse cursor-pointer select-none bg-base-200 border-b border-base-300"
                        style={{
                            tableLayout: "fixed",
                            minWidth: TOTAL_MIN_WIDTH,
                        }}
                        onClick={() => setCollapsed((c) => !c)}
                    >
                        <colgroup>
                            {COLUMNS.map((col) => (
                                <col
                                    key={col.id ?? col.accessorKey}
                                    style={{ width: col.size ?? 100 }}
                                />
                            ))}
                        </colgroup>
                        <tbody>
                            <tr>
                                {/* + lot / + block buttons — Unassigned never
                                    gets either (lots only arrive there via
                                    drag/transfer, and there's no timeline to
                                    interrupt with a block). Manual gets both,
                                    same as a real machine, since it has its
                                    own real queue. */}
                                <td className="flex flex-col">
                                    {!isUnassigned && (
                                        <button
                                            className="btn btn-ghost btn-sm w-16 text-left h-5 leading-0 text-[10px] font-medium text-info hover:text-info/80 hover:bg-info/10"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onAddRow(machine);
                                            }}
                                        >
                                            + lot
                                        </button>
                                    )}
                                    {!isUnassigned && (
                                        <button
                                            className="btn btn-ghost btn-sm w-16 text-left h-5 leading-0 text-[10px] font-medium text-base-content/50 hover:text-base-content/80 hover:bg-base-300"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onAddBlock(machine);
                                            }}
                                        >
                                            + block
                                        </button>
                                    )}
                                </td>

                                {/* Collapse chevron */}
                                <td className="py-2 text-center">
                                    <svg
                                        className="text-base-content/30 transition-transform duration-150 inline-block"
                                        style={{
                                            transform: collapsed
                                                ? "rotate(-90deg)"
                                                : "rotate(0deg)",
                                        }}
                                        width="12"
                                        height="12"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </td>

                                {/* Lot count + machine name */}
                                <td className="px-2.5 py-2">
                                    <div className="leading-0">
                                        <div>
                                            {rows.length === 0 ? (
                                                <div className="text-[11px] font-medium text-base-content/30 italic">
                                                    0 lots
                                                    {otherPackageCount > 0 &&
                                                        ` · ${otherPackageCount} in other packages`}
                                                </div>
                                            ) : (
                                                <span className="text-[11px] font-mono font-medium text-base-content/50">
                                                    {rows.length} lot
                                                    {rows.length !== 1
                                                        ? "s"
                                                        : ""}
                                                </span>
                                            )}
                                            {incompleteCount > 0 && (
                                                <span className="ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full bg-warning/20 text-warning font-medium">
                                                    {incompleteCount} incomplete
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </td>

                                {/* Machine name */}
                                <td className="px-2.5 py-2">
                                    <span
                                        className={`text-sm font-semibold ${
                                            isPseudo
                                                ? "italic text-base-content/60"
                                                : rows.length === 0
                                                  ? "text-base-content/30"
                                                  : "text-base-content"
                                        }`}
                                    >
                                        {machineLabel(machine)}
                                    </span>
                                </td>

                                {/* Package — empty */}
                                <td />

                                {/* Lot ID — drop target indicator */}
                                <td className="px-2.5 py-2">
                                    {isDropTarget && (
                                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-info/20 text-info font-medium animate-pulse">
                                            ↓ transfer here
                                        </span>
                                    )}
                                </td>

                                {/* Status */}
                                <td />
                                {/* Station */}
                                <td />

                                {/* Qty total */}
                                <td className="px-2.5 py-2">
                                    <span className="text-[11px] font-medium text-base-content/60">
                                        {totalQty.toLocaleString()}
                                    </span>
                                </td>

                                {/* Doable total */}
                                <td className="px-2.5 py-2">
                                    <span className="text-error font-bold text-[11px]">
                                        {totalDoable.toLocaleString()}
                                    </span>
                                </td>

                                {/* Rest empty */}
                                <td />
                                <td />
                                <td />
                                <td />
                                <td />
                                <td />
                                <td />
                                <td />
                                <td />
                                <td />
                                <td />
                                <td />
                                <td />
                                <td />
                                <td />
                            </tr>
                        </tbody>
                    </table>
                </div>

                {!collapsed && (
                    <MachineSectionBody
                        rows={rows}
                        globalSorting={globalSorting}
                        onSortingChange={onSortingChange}
                        machine={machine}
                    />
                )}
            </div>
        );
    },
    (prev, next) =>
        prev.rows === next.rows &&
        prev.isDropTarget === next.isDropTarget &&
        prev.justAdded === next.justAdded &&
        prev.otherPackageCount === next.otherPackageCount &&
        prev.globalSorting === next.globalSorting,
);

function EmptyMachineDropRow({ machine }) {
    const { setNodeRef, isOver } = useDroppable({
        id: `${PREFIX_EMPTY_DROPPABLE}${machineToDroppableToken(machine)}`,
    });
    return (
        <tr ref={setNodeRef}>
            <td
                colSpan={COLUMNS.length}
                className={`px-2.5 py-6 text-center text-xs ${
                    isOver ? "bg-info/10 text-info" : "text-base-content/30"
                }`}
            >
                Drop a lot here
            </td>
        </tr>
    );
}

function GapHintRow({ segments }) {
    const totalMinutes = segments.reduce((s, seg) => s + seg.minutes, 0);
    const totalH = Math.floor(totalMinutes / 60);
    const totalM = totalMinutes % 60;
    const totalDur = totalH > 0 ? `${totalH}h ${totalM}m` : `${totalM}m`;

    return (
        <tr className="bg-base-300/50">
            <td
                colSpan={COLUMNS.length}
                className="px-2.5 py-1.5 text-center text-[11px] text-base-content/40 italic"
            >
                <span className="mr-1.5">— {totalDur} elapsed —</span>
                {segments.map((seg, i) => (
                    <span
                        key={i}
                        className={`not-italic font-medium px-1.5 py-0.5 rounded-full mx-0.5 ${
                            seg.kind === "block"
                                ? "bg-base-content/10 text-base-content/50"
                                : "bg-info/10 text-info/70"
                        }`}
                    >
                        {seg.label} {formatExpectedPT(seg.minutes)}
                    </span>
                ))}
            </td>
        </tr>
    );
}

const MachineSectionBody = memo(function MachineSectionBody({
    rows,
    globalSorting,
    onSortingChange,
    machine,
}) {
    const isSortable = useContext(SortableTableContext);
    const scrollParentRef = useContext(ScrollParentContext);
    const sectionRef = useRef(null); // the section's own <table> wrapper, NOT scrollable

    const table = useReactTable({
        data: rows,
        columns: COLUMNS,
        state: { sorting: globalSorting },
        onSortingChange,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getRowId: (row) => row._dndId,
        defaultColumn: { minSize: 40 },
    });
    const allGapInfo = useContext(GapInfoContext);
    const machineGapInfo = allGapInfo[machine] ?? {};

    const tableRows = table.getRowModel().rows;
    const dndIds = useMemo(
        () => tableRows.map((r) => r.original._dndId),
        [tableRows],
    );

    const scrollMarginRef = useRef(0);
    useLayoutEffect(() => {
        if (sectionRef.current) {
            scrollMarginRef.current = sectionRef.current.offsetTop;
        }
    }); // no deps — runs after every commit of this component

    const rowVirtualizer = useVirtualizer({
        count: tableRows.length,
        getScrollElement: () => scrollParentRef.current,
        estimateSize: () => 33,
        overscan: 5,
        scrollMargin: scrollMarginRef.current, // read fresh value, no render lag
        measureElement: (el) => el?.getBoundingClientRect().height,
    });

    const virtualRows = rowVirtualizer.getVirtualItems();
    // const paddingTop = virtualRows[0]?.start ?? 0;
    const paddingTop = virtualRows[0]
        ? virtualRows[0].start - rowVirtualizer.options.scrollMargin
        : 0;
    const paddingBottom =
        rowVirtualizer.getTotalSize() - (virtualRows.at(-1)?.end ?? 0);

    return (
        <div ref={sectionRef} className="rounded-b-xl">
            <table
                className="w-full border-collapse"
                style={{ tableLayout: "fixed", minWidth: TOTAL_MIN_WIDTH }}
            >
                <colgroup>
                    {table.getAllColumns().map((col) => (
                        <col key={col.id} style={{ width: col.getSize() }} />
                    ))}
                </colgroup>
                {/* <thead>
                    {table.getHeaderGroups().map((hg) => (
                        <tr
                            key={hg.id}
                            className="bg-base-200 border-b border-base-300"
                        >
                            {hg.headers.map((header) => (
                                <th
                                    key={header.id}
                                    style={{ width: header.getSize() }}
                                    className={`px-2.5 py-1.5 text-left text-[11px] font-medium text-base-content/50 whitespace-nowrap overflow-hidden text-ellipsis ${
                                        header.column.getCanSort()
                                            ? "cursor-pointer hover:text-base-content/80 select-none"
                                            : ""
                                    }`}
                                    onClick={header.column.getToggleSortingHandler()}
                                >
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(
                                              header.column.columnDef.header,
                                              header.getContext(),
                                          )}
                                    {header.column.getIsSorted() === "asc" && (
                                        <span className="ml-1 text-info">
                                            ↑
                                        </span>
                                    )}
                                    {header.column.getIsSorted() === "desc" && (
                                        <span className="ml-1 text-info">
                                            ↓
                                        </span>
                                    )}
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead> */}
                <tbody>
                    <SortableContext
                        items={dndIds}
                        strategy={verticalListSortingStrategy}
                    >
                        {tableRows.length === 0 ? (
                            <EmptyMachineDropRow machine={machine} />
                        ) : (
                            <>
                                {paddingTop > 0 && (
                                    <tr>
                                        <td
                                            style={{ height: paddingTop }}
                                            colSpan={COLUMNS.length}
                                        />
                                    </tr>
                                )}
                                {virtualRows.map((vRow) => {
                                    const row = tableRows[vRow.index];
                                    const segments =
                                        allGapInfo[machine]?.[
                                            row.original._dndId
                                        ];
                                    return (
                                        <Fragment key={row.original._dndId}>
                                            <SortableRow
                                                row={row}
                                                orderedDndIds={dndIds}
                                                itemNumber={vRow.index + 1}
                                                measureElement={
                                                    rowVirtualizer.measureElement
                                                }
                                                virtualIndex={vRow.index}
                                                isSortable={isSortable}
                                            />
                                            {segments && (
                                                <GapHintRow
                                                    segments={segments}
                                                />
                                            )}
                                        </Fragment>
                                    );
                                })}
                                {paddingBottom > 0 && (
                                    <tr>
                                        <td
                                            style={{ height: paddingBottom }}
                                            colSpan={COLUMNS.length}
                                        />
                                    </tr>
                                )}
                            </>
                        )}
                    </SortableContext>
                </tbody>
            </table>
        </div>
    );
});

// ---------------------------------------------------------------------------
// PackageTabs
// ---------------------------------------------------------------------------

function PackageTabs({ packages, active, onChange }) {
    const scrollRef = useRef(null);
    const tabRefs = useRef(new Map());
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const updateScrollState = () => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 1);
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    };

    useEffect(() => {
        updateScrollState();
        const el = scrollRef.current;
        if (!el) return;
        el.addEventListener("scroll", updateScrollState);
        const ro = new ResizeObserver(updateScrollState);
        ro.observe(el);
        return () => {
            el.removeEventListener("scroll", updateScrollState);
            ro.disconnect();
        };
    }, [packages]);

    useEffect(() => {
        tabRefs.current
            .get(active)
            ?.scrollIntoView({ block: "nearest", inline: "nearest" });
    }, [active]);

    const scrollByAmount = (dir) => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollBy({ left: dir * el.clientWidth * 0.6, behavior: "smooth" });
    };

    return (
        <div className="relative flex items-center border-base-300">
            {canScrollLeft && (
                <div className="relative flex-shrink-0 z-10">
                    <button
                        type="button"
                        onClick={() => scrollByAmount(-1)}
                        aria-label="Scroll tabs left"
                        className="btn btn-ghost px-2 flex items-center justify-center text-base-content/50 hover:text-base-content/80 hover:bg-base-200"
                    >
                        <MdChevronLeft size={26} />
                    </button>
                    <div className="pointer-events-none absolute top-0 bottom-0 -right-20 w-20 bg-gradient-to-r from-base-200 to-transparent" />
                </div>
            )}

            <div
                ref={scrollRef}
                className="flex overflow-x-auto scrollbar-none scroll-smooth"
            >
                {packages.map((pkg, idx) => (
                    <button
                        key={pkg}
                        ref={(node) => {
                            if (node) tabRefs.current.set(pkg, node);
                            else tabRefs.current.delete(pkg);
                        }}
                        onClick={() => onChange(pkg)}
                        className={`btn btn-sm px-1.5 h-auto flex-shrink-0 text-sm font-medium rounded-none transition-colors whitespace-nowrap ${
                            active === pkg
                                ? "btn-primary -mb-px"
                                : idx % 2 === 0
                                  ? "btn-ghost bg-base-200/60 text-base-content/60 hover:text-base-content/80 hover:bg-base-200"
                                  : "btn-ghost bg-base-100 text-base-content/60 hover:text-base-content/80 hover:bg-base-200"
                        }`}
                    >
                        {pkg}
                    </button>
                ))}
            </div>

            {canScrollRight && (
                <div className="relative flex-shrink-0 z-10">
                    <div className="pointer-events-none absolute top-0 bottom-0 -left-20 w-20 bg-gradient-to-l from-base-200 to-transparent" />
                    <button
                        type="button"
                        onClick={() => scrollByAmount(1)}
                        aria-label="Scroll tabs right"
                        className="btn btn-ghost px-2 flex items-center justify-center text-base-content/50 hover:text-base-content/80 hover:bg-base-200"
                    >
                        <MdChevronRight size={26} />
                    </button>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// DragGhostRow
// ---------------------------------------------------------------------------

function DragGhostRow({ row }) {
    return (
        <div
            className="rounded-lg border border-info/40 bg-base-100 shadow-xl opacity-95 overflow-hidden"
            style={{ minWidth: 500 }}
        >
            <table style={{ tableLayout: "fixed", width: "100%" }}>
                <colgroup>
                    {COLUMNS.map((col) => (
                        <col
                            key={col.id ?? col.accessorKey}
                            style={{ width: col.size ?? 100 }}
                        />
                    ))}
                </colgroup>
                <tbody>
                    <tr className="bg-info/10">
                        <td className="w-9 px-1 text-center">
                            <div className="flex items-center gap-1">
                                <input className="checkbox checkbox-info cursor-none" />
                                <button
                                    className="btn btn-ghost cursor-none pointer-events-none text-base-content/20 hover:text-base-content/50 active:cursor-grabbing p-1 rounded"
                                    tabIndex={-1}
                                    aria-label="Drag to reorder or transfer"
                                >
                                    <GripIcon />
                                </button>
                            </div>
                        </td>

                        {COLUMNS.filter(
                            (c) => (c.id ?? c.accessorKey) !== "drag",
                        ).map((col) => {
                            const key = col.accessorKey ?? col.id;
                            const value = row[key];
                            let display;

                            if (key === "status") {
                                display = (
                                    <StatusBadge
                                        status={value === null ? "NONE" : value}
                                    />
                                );
                            } else if (key === "item") {
                                display = (
                                    <span className="text-xs text-base-content/40">
                                        {value}
                                    </span>
                                );
                            } else if (key === "accuTime") {
                                const v = Number(value) || 0;
                                const h = Math.floor(v / 60);
                                const m = v % 60;
                                display = h > 0 ? `${h}h ${m}m` : `${m}m`;
                            } else if (key === "expectedPT") {
                                display = formatExpectedPT(row.accuTime);
                            } else if (key === "CT") {
                                display = fmt2dp(computeCT(row));
                            } else if (key === "OSL") {
                                const ct = computeCT(row);
                                display = fmt2dp(
                                    computeOSL(ct, row.Backend_Leadtime),
                                );
                            } else if (key === "focusGroupStage") {
                                const fg = row.Focus_Group ?? "";
                                const st = row.Stage ?? "";
                                display =
                                    fg && st
                                        ? `${fg} / ${st}`
                                        : fg || st || "—";
                            } else if (key === "Capacity_UPH") {
                                const uph = lookupCapacityUPH(
                                    row.Qty,
                                    platformOf(row.machine),
                                );
                                display =
                                    uph != null ? uph.toLocaleString() : "—";
                            } else {
                                display = value ?? "—";
                            }

                            return (
                                <td
                                    key={key}
                                    style={{
                                        width: col.size ?? 100,
                                        maxWidth: col.size ?? 100,
                                    }}
                                    className="px-2.5 py-2 text-sm whitespace-nowrap overflow-hidden text-ellipsis text-base-content"
                                >
                                    {display}
                                </td>
                            );
                        })}
                    </tr>
                </tbody>
            </table>
        </div>
    );
}

// ---------------------------------------------------------------------------
// SelectionToolbar
// ---------------------------------------------------------------------------

function SelectionToolbar({
    selectedIds,
    allData,
    machines,
    onTag,
    onClearTag,
    onStatusChange,
    onTransfer,
    onDelete,
    onClearSelection,
}) {
    const count = selectedIds.size;
    const [transferOpen, setTransferOpen] = useState(false);
    const [statusOpen, setStatusOpen] = useState(false);

    const selectedMachines = useMemo(() => {
        const s = new Set();
        allData.forEach((r) => {
            if (selectedIds.has(r._dndId)) s.add(r.machine);
        });
        return s;
    }, [selectedIds, allData]);

    if (count === 0) return null;

    return (
        <div className="sticky bottom-0 z-99">
            {(transferOpen || statusOpen) && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => {
                        setTransferOpen(false);
                        setStatusOpen(false);
                    }}
                />
            )}

            <div className="flex-none flex items-center justify-center px-4 py-2 border-t border-base-300 bg-base-200">
                <div className="relative flex items-center gap-2 px-4 py-2 bg-neutral text-neutral-content rounded-2xl shadow-lg border border-base-content/10 select-none">
                    <span className="text-xs font-semibold bg-info text-info-content px-2 py-0.5 rounded-full mr-1">
                        {count} selected
                    </span>

                    <div className="w-px h-5 bg-base-content/20" />

                    <span className="text-[11px] text-neutral-content/50 ml-1">
                        Mark:
                    </span>
                    {Object.entries(TAGS).map(([key, cfg]) => (
                        <button
                            key={key}
                            onClick={() => onTag(key)}
                            className={`flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg ${cfg.toolbar}`}
                            title={`Mark as ${cfg.label}`}
                        >
                            <span
                                className={`w-2 h-2 rounded-full ${cfg.dot}`}
                            />
                            {cfg.label}
                        </button>
                    ))}
                    <button
                        onClick={onClearTag}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-base-content/10 text-neutral-content/60 hover:bg-base-content/20"
                    >
                        Clear tag
                    </button>

                    <div className="w-px h-5 bg-base-content/20" />

                    {/* Bulk status */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                setStatusOpen((v) => !v);
                                setTransferOpen(false);
                            }}
                            className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-base-content/10 text-neutral-content/80 hover:bg-base-content/20 flex items-center gap-1"
                        >
                            Set status
                            <svg
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                            >
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>
                        {statusOpen && (
                            <div className="absolute bottom-full mb-1 left-0 bg-base-100 border border-base-300 rounded-lg shadow-lg py-1 min-w-36 z-50">
                                {[
                                    "DONE",
                                    "RUNNING",
                                    "FOR PROCESS",
                                    "FVI",
                                    "BOXING",
                                    "LWAIT",
                                    "NONE",
                                ].map((s) => (
                                    <button
                                        key={s}
                                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-base-200 flex items-center gap-2"
                                        onClick={() => {
                                            onStatusChange(s);
                                            setStatusOpen(false);
                                        }}
                                    >
                                        <StatusBadge status={s} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="w-px h-5 bg-base-content/20" />

                    {/* Transfer */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                setTransferOpen((v) => !v);
                                setStatusOpen(false);
                            }}
                            className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-base-content/10 text-neutral-content/80 hover:bg-base-content/20 flex items-center gap-1"
                        >
                            Transfer to…
                            <svg
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                            >
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>
                        {transferOpen && (
                            <div className="absolute bottom-full mb-1 left-0 bg-base-100 border border-base-300 rounded-lg shadow-lg py-1 min-w-40 z-50 max-h-60 overflow-y-auto">
                                {machines
                                    .filter(
                                        (m) =>
                                            !selectedMachines.has(m) ||
                                            selectedMachines.size > 1,
                                    )
                                    .map((m) => (
                                        <button
                                            key={m ?? "unassigned"}
                                            className={`w-full text-left px-3 py-1.5 text-sm text-base-content hover:bg-base-200 ${
                                                selectedMachines.size === 1 &&
                                                selectedMachines.has(m)
                                                    ? "opacity-40 cursor-not-allowed"
                                                    : ""
                                            }`}
                                            disabled={
                                                selectedMachines.size === 1 &&
                                                selectedMachines.has(m)
                                            }
                                            onClick={() => {
                                                if (
                                                    selectedMachines.size ===
                                                        1 &&
                                                    selectedMachines.has(m)
                                                )
                                                    return;
                                                onTransfer(m);
                                                setTransferOpen(false);
                                            }}
                                        >
                                            {machineLabel(m)}
                                        </button>
                                    ))}
                            </div>
                        )}
                    </div>

                    <div className="w-px h-5 bg-base-content/20" />

                    <button
                        onClick={onDelete}
                        className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-error/20 text-error hover:bg-error/30"
                    >
                        Delete
                    </button>

                    <button
                        onClick={onClearSelection}
                        className="ml-1 text-neutral-content/40 hover:text-neutral-content"
                        title="Clear selection (Esc)"
                    >
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                        >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
}

const TableActionsContext = createContext(null);
const GapInfoContext = createContext({});
const ScrollParentContext = createContext(null);
const SortableTableContext = createContext(null);

function CellEditor({ editCell, onCommit, onCancel }) {
    const inputRef = useRef(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, []);

    const commit = useCallback(() => {
        onCommit(inputRef.current?.value ?? "");
    }, [onCommit]);

    return (
        <>
            <div className="fixed inset-0 z-40" onClick={commit} />
            <input
                ref={inputRef}
                type={editCell.type === "integer" ? "number" : "text"}
                defaultValue={editCell.value}
                style={{
                    position: "fixed",
                    top: editCell.y,
                    left: editCell.x,
                    width: editCell.width,
                    height: editCell.height,
                    zIndex: 50,
                }}
                className="border border-info ring-2 ring-info/30 rounded px-2 text-sm outline-none bg-base-100 text-base-content"
                onKeyDown={(e) => {
                    if (e.key === "Enter") commit();
                    if (e.key === "Escape") onCancel();
                }}
            />
        </>
    );
}

function GlobalTableHeader({ sorting, onSortingChange }) {
    const table = useReactTable({
        data: [], // header-only instance, no rows needed
        columns: COLUMNS,
        state: { sorting },
        onSortingChange,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });
    return (
        <table
            className="w-full border-collapse"
            style={{ tableLayout: "fixed", minWidth: TOTAL_MIN_WIDTH }}
        >
            <colgroup>
                {table.getAllColumns().map((col) => (
                    <col key={col.id} style={{ width: col.getSize() }} />
                ))}
            </colgroup>
            <thead>
                {table.getHeaderGroups().map((hg) => (
                    <tr
                        key={hg.id}
                        className="bg-base-200 border-b border-base-300"
                    >
                        {hg.headers.map((header) => (
                            <th
                                key={header.id}
                                style={{ width: header.getSize() }}
                                className={`px-2.5 py-1.5 text-left text-[11px] font-medium text-base-content/50 whitespace-nowrap overflow-hidden text-ellipsis ${
                                    header.column.getCanSort()
                                        ? "cursor-pointer hover:text-base-content/80 select-none"
                                        : ""
                                }`}
                                onClick={header.column.getToggleSortingHandler()}
                            >
                                {header.isPlaceholder
                                    ? null
                                    : flexRender(
                                          header.column.columnDef.header,
                                          header.getContext(),
                                      )}
                                {header.column.getIsSorted() === "asc" && (
                                    <span className="ml-1 text-info">↑</span>
                                )}
                                {header.column.getIsSorted() === "desc" && (
                                    <span className="ml-1 text-info">↓</span>
                                )}
                            </th>
                        ))}
                    </tr>
                ))}
            </thead>
        </table>
    );
}

/** After undo/redo swaps local state, diff the before/after snapshots
 *  into a list of backend operations and apply them as ONE atomic batch
 *  — either the whole undo persists, or none of it does. This replaces
 *  firing N independent calls per changed row, which could partially
 *  succeed/fail and leave local state and the DB disagreeing about which
 *  of the undo's changes actually landed. */
function syncUndoRedoToServer(prevRows, nextRows, date, mutate, update) {
    const prevById = new Map(prevRows.map((r) => [r._dndId, r]));
    const nextById = new Map(nextRows.map((r) => [r._dndId, r]));

    const removed = prevRows.filter((r) => !nextById.has(r._dndId));
    const added = nextRows.filter((r) => !prevById.has(r._dndId));

    // Per-machine position maps, keyed by _dndId — needed because a pure
    // in-machine reorder (drag within the same machine, no field or
    // machine change) wouldn't otherwise be detected as a "change" at all.
    const buildPositions = (rows) => {
        const byMachine = new Map();
        rows.forEach((r) => {
            if (r.machine === null) return; // Unassigned has no persisted order
            if (!byMachine.has(r.machine)) byMachine.set(r.machine, []);
            byMachine.get(r.machine).push(r._dndId);
        });
        const positions = new Map();
        byMachine.forEach((ids) => {
            ids.forEach((id, idx) => positions.set(id, idx));
        });
        return positions;
    };

    const prevPositions = buildPositions(prevRows);
    const nextPositions = buildPositions(nextRows);

    const changed = nextRows.filter((r) => {
        const p = prevById.get(r._dndId);
        if (!p) return false;
        const positionChanged =
            prevPositions.get(r._dndId) !== nextPositions.get(r._dndId);
        return (
            p.machine !== r.machine ||
            p.status !== r.status ||
            p.Remarks !== r.Remarks ||
            p.tag !== r.tag ||
            p.accuTime !== r.accuTime ||
            p.Doable !== r.Doable ||
            positionChanged
        );
    });

    const operations = [];
    // Track which _dndId each pushed operation corresponds to, so the
    // single response array (same order as operations) can be mapped
    // back onto local rows after the batch succeeds.
    const opOwners = [];

    // --- Undo of an add → delete it again ---
    removed.forEach((r) => {
        if (!r.entryId) return;
        operations.push({
            type: "delete",
            entry_id: r.entryId,
            machine: r.machine,
        });
        opOwners.push({ dndId: r._dndId, kind: "delete", snapshot: r });
    });

    // --- Undo of a delete → recreate it ---
    added.forEach((r) => {
        const isBlock = isBlockRow(r);
        const { beforeEntryId, afterEntryId } = findMachineNeighbors(
            nextRows,
            r._dndId,
            r.machine,
        );

        if (isBlock) {
            operations.push({
                type: "create_block",
                machine: r.machine,
                label: r.blockLabel,
                duration: r.accuTime,
                before_entry_id: beforeEntryId,
                after_entry_id: afterEntryId,
            });
        } else {
            operations.push({
                type: "create_lot",
                lot_id: r.Lot_Id,
                fields: {
                    status: r.status,
                    remarks: r.Remarks,
                    tag: r.tag,
                    accu_time: r.accuTime,
                    doable: r.Doable,
                },
                machine: r.machine,
                before_entry_id: beforeEntryId,
                after_entry_id: afterEntryId,
            });
        }
        opOwners.push({ dndId: r._dndId, kind: "create" });
    });

    // --- Machine and/or position changed, and/or fields changed ---
    changed.forEach((r) => {
        const p = prevById.get(r._dndId);
        const isBlock = isBlockRow(r);
        const machineChanged = p.machine !== r.machine;
        const positionChanged =
            prevPositions.get(r._dndId) !== nextPositions.get(r._dndId);

        if (machineChanged || positionChanged) {
            const { beforeEntryId, afterEntryId } = findMachineNeighbors(
                nextRows,
                r._dndId,
                r.machine,
            );

            operations.push({
                type: machineChanged ? "transfer" : "move",
                entry_type: isBlock ? "block" : "lot",
                lot_id: isBlock ? null : r.Lot_Id,
                entry_id: isBlock ? r.entryId : null,
                target_machine: machineChanged ? r.machine : undefined,
                machine: r.machine,
                before_entry_id: beforeEntryId,
                after_entry_id: afterEntryId,
            });
            opOwners.push({ dndId: r._dndId, kind: "reposition", snapshot: p });
        }

        const fields = {};
        if (p.status !== r.status) fields.status = r.status;
        if (p.Remarks !== r.Remarks) fields.remarks = r.Remarks;
        if (p.tag !== r.tag) fields.tag = r.tag;
        if (p.accuTime !== r.accuTime) fields.accu_time = r.accuTime;
        if (p.Doable !== r.Doable) fields.doable = r.Doable;

        if (Object.keys(fields).length > 0) {
            operations.push({
                type: "update_field",
                entry_type: isBlock ? "block" : "lot",
                lot_id: isBlock ? null : r.Lot_Id,
                entry_id: isBlock ? r.entryId : null,
                fields,
                lock_version: r.lockVersion ?? null,
            });
            opOwners.push({ dndId: r._dndId, kind: "field", snapshot: p });
        }
    });

    if (operations.length === 0) return;

    mutate(route("loading-plan.batch-apply"), {
        body: { operations, scheduled_date: date },
    })
        .then(({ results }) => {
            // Sync every returned entry back into local state, matched by
            // position in the array (same order operations were sent).
            update((prev) =>
                prev.map((row) => {
                    const ownerIdx = opOwners.findIndex(
                        (o) => o.dndId === row._dndId,
                    );
                    if (ownerIdx === -1) return row;
                    const result = results[ownerIdx];
                    if (!result || result.deleted) return row;
                    return {
                        ...row,
                        entryId: result.id,
                        lockVersion: result.lock_version,
                        sequenceOrder:
                            result.sequence_order ?? row.sequenceOrder,
                    };
                }),
            );
        })
        .catch((err) => {
            console.error("Undo/redo batch failed to persist:", err);
            // Atomic on the backend means NOTHING in this batch applied —
            // safe to revert the entire local diff back to prevRows in
            // one shot, rather than reverting row-by-row.
            update(() => prevRows);
            toast?.error?.("That undo couldn't be saved and was reverted.");
        });
}

// ---------------------------------------------------------------------------
// LoadingPlanTable — root component
// ---------------------------------------------------------------------------

export default function LoadingPlanTable({
    data: initialData,
    date,
    status,
    baseTimes = {},
    onLotTransfer,
    onReorder,
}) {
    const {
        present: data,
        update,
        undo,
        redo,
        canUndo,
        canRedo,
    } = useLoadingPlanStore();

    const toast = useToast();
    const { mutate } = useMutation();

    const resolvedData = initialData ?? _initialData;
    const [isDirty, setIsDirty] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);

    const isDirtyRef = useRef(isDirty);
    useEffect(() => {
        isDirtyRef.current = isDirty;
    }, [isDirty]);

    // Package_Name (via groupOf) drives tabs — a tab represents a GROUP of
    // related packages, not a single Package_Name. See PACKAGE_GROUPS.
    const packages = useMemo(
        () =>
            [
                ...new Set(
                    data
                        .filter((r) => !isBlockRow(r))
                        .map((r) => groupOf(r.Package_Name))
                        .filter(Boolean),
                ),
            ].sort(),
        [data],
    );

    // const [activePackage, setActivePackage] = useState(() => packages[0] ?? "");
    const [activePackage, setActivePackage] = useState("LGA");

    const handleSave = useCallback(async () => {
        setIsDirty(false);
        setLastSaved(new Date());
    }, []); // was [data] — never used in the body

    // ── Selection state ──────────────────────────────────────────────────────
    const [selectedIds, setSelectedIds] = useState(() => new Set());
    const anchorIdRef = useRef(null);
    const scrollParentRef = useRef(null);

    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
        anchorIdRef.current = null;
    }, []);

    const handleRowSelect = useCallback(
        (dndId, isShift, isCtrl, orderedDndIds) => {
            setSelectedIds((prev) => {
                const next = new Set(prev);

                if (isShift && anchorIdRef.current && orderedDndIds) {
                    const anchorIdx = orderedDndIds.indexOf(
                        anchorIdRef.current,
                    );
                    const targetIdx = orderedDndIds.indexOf(dndId);
                    if (anchorIdx !== -1 && targetIdx !== -1) {
                        const [lo, hi] =
                            anchorIdx < targetIdx
                                ? [anchorIdx, targetIdx]
                                : [targetIdx, anchorIdx];
                        orderedDndIds
                            .slice(lo, hi + 1)
                            .forEach((id) => next.add(id));
                        return next;
                    }
                }

                if (isCtrl) {
                    if (next.has(dndId)) {
                        next.delete(dndId);
                    } else {
                        next.add(dndId);
                        anchorIdRef.current = dndId;
                    }
                    return next;
                }

                if (next.size === 1 && next.has(dndId)) {
                    anchorIdRef.current = null;
                    return new Set();
                }
                anchorIdRef.current = dndId;
                return new Set([dndId]);
            });
        },
        [],
    );

    // ── Bulk operations ──────────────────────────────────────────────────────

    const handleBulkTag = useCallback(
        (tag) => {
            const targets = data.filter((r) => selectedIds.has(r._dndId));

            update((prev) =>
                prev.map((r) =>
                    selectedIds.has(r._dndId) ? { ...r, tag } : r,
                ),
            );
            setIsDirty(true);

            mutate(route("loading-plan.bulk-update"), {
                body: {
                    updates: targets.map((r) => ({
                        id: r.entryId ?? null,
                        lot_id: r.Lot_Id,
                        scheduled_date: date,
                        fields: { tag },
                        lock_version: r.lockVersion ?? 0,
                    })),
                },
            })
                .then(({ entries }) => {
                    update(
                        (prev) =>
                            prev.map((r) => {
                                const match = entries?.find(
                                    (e) =>
                                        e.id === r.entryId ||
                                        e.lot_id === r.Lot_Id,
                                );
                                return match
                                    ? {
                                          ...r,
                                          entryId: match.id,
                                          lockVersion: match.lock_version,
                                      }
                                    : r;
                            }),
                        true,
                    );
                })
                .catch((err) => {
                    console.error("Bulk tag update failed:", err);
                    undo();
                    toast?.error?.("Couldn't apply tag — reverted.");
                });
        },
        [selectedIds, update, data, date, undo],
    );

    const handleBulkClearTag = useCallback(() => {
        const targets = data.filter((r) => selectedIds.has(r._dndId));

        update((prev) =>
            prev.map((r) =>
                selectedIds.has(r._dndId) ? { ...r, tag: null } : r,
            ),
        );
        setIsDirty(true);

        mutate(route("loading-plan.bulk-update"), {
            body: {
                updates: targets.map((r) => ({
                    id: r.entryId ?? null,
                    lot_id: r.Lot_Id,
                    scheduled_date: date,
                    fields: { tag: null },
                    lock_version: r.lockVersion ?? 0,
                })),
            },
        })
            .then(({ entries }) => {
                update(
                    (prev) =>
                        prev.map((r) => {
                            const match = entries?.find(
                                (e) =>
                                    e.id === r.entryId || e.lot_id === r.Lot_Id,
                            );
                            return match
                                ? {
                                      ...r,
                                      entryId: match.id,
                                      lockVersion: match.lock_version,
                                  }
                                : r;
                        }),
                    true,
                );
            })
            .catch((err) => {
                console.error("Bulk clear tag failed:", err);
                undo();
                toast?.error?.("Couldn't clear tag — reverted.");
            });
    }, [selectedIds, update, data, date, undo]);

    const handleBulkStatus = useCallback(
        (newStatus) => {
            const normalizedStatus = newStatus === "NONE" ? null : newStatus;
            const targets = data.filter(
                (r) => selectedIds.has(r._dndId) && !isBlockRow(r),
            );

            update((prev) =>
                prev.map((r) =>
                    selectedIds.has(r._dndId) && !isBlockRow(r)
                        ? { ...r, status: normalizedStatus }
                        : r,
                ),
            );
            setIsDirty(true);

            mutate(route("loading-plan.bulk-update"), {
                body: {
                    updates: targets.map((r) => ({
                        id: r.entryId ?? null,
                        lot_id: r.Lot_Id,
                        scheduled_date: date,
                        fields: { status: normalizedStatus },
                        lock_version: r.lockVersion ?? 0,
                    })),
                },
            })
                .then(({ entries }) => {
                    update(
                        (prev) =>
                            prev.map((r) => {
                                const match = entries?.find(
                                    (e) => e.lot_id === r.Lot_Id,
                                );
                                return match
                                    ? {
                                          ...r,
                                          entryId: match.id,
                                          lockVersion: match.lock_version,
                                      }
                                    : r;
                            }),
                        true,
                    );
                })
                .catch((err) => {
                    console.error("Bulk status update failed:", err);
                    undo();
                    toast?.error?.("Couldn't update status — reverted.");
                });
        },
        [selectedIds, update, data, date, undo],
    );

    const handleBulkTransfer = useCallback(
        (targetMachine) => {
            const selectedRows = data.filter((r) => selectedIds.has(r._dndId));
            const lotIds = selectedRows
                .filter((r) => !isBlockRow(r) && r.Lot_Id)
                .map((r) => r.Lot_Id);
            const blockEntryIds = selectedRows
                .filter((r) => isBlockRow(r) && r.entryId)
                .map((r) => r.entryId);

            const affectedMachines = new Set();
            update((prev) => {
                const next = prev.map((r) => {
                    if (!selectedIds.has(r._dndId)) return { ...r };
                    affectedMachines.add(r.machine);
                    affectedMachines.add(targetMachine);
                    return { ...r, machine: targetMachine };
                });
                affectedMachines.forEach((m) =>
                    recomputeMachine(next, m, baseTimes),
                );
                return next;
            });
            setIsDirty(true);
            clearSelection();

            if (lotIds.length > 0 || blockEntryIds.length > 0) {
                mutate(route("loading-plan.bulk-transfer"), {
                    body: {
                        lot_ids: lotIds,
                        block_entry_ids: blockEntryIds,
                        target_machine: targetMachine,
                        scheduled_date: date,
                    },
                })
                    .then((updatedEntries) => {
                        update(
                            (prev) =>
                                prev.map((r) => {
                                    const match = updatedEntries?.find((e) =>
                                        isBlockRow(r)
                                            ? e.id === r.entryId
                                            : e.lot_id === r.Lot_Id,
                                    );
                                    return match
                                        ? {
                                              ...r,
                                              entryId: match.id,
                                              sequenceOrder:
                                                  match.sequence_order,
                                              lockVersion: match.lock_version,
                                          }
                                        : r;
                                }),
                            true, // skipHistory — server-sync bookkeeping, not a new user action
                        );
                    })
                    .catch((err) =>
                        console.error("Bulk transfer failed:", err),
                    );
            }
        },
        [selectedIds, update, baseTimes, clearSelection, data, date],
    );

    const handleBulkDelete = useCallback(() => {
        const entryIds = data
            .filter((r) => selectedIds.has(r._dndId) && r.entryId)
            .map((r) => r.entryId);

        update((prev) => {
            const removed = new Set(
                prev
                    .filter((r) => selectedIds.has(r._dndId))
                    .map((r) => r.machine),
            );
            const next = prev.filter((r) => !selectedIds.has(r._dndId));
            removed.forEach((m) => recomputeMachine(next, m, baseTimes));
            return next;
        });
        setIsDirty(true);
        clearSelection();

        if (entryIds.length > 0) {
            mutate(route("loading-plan.bulk-delete"), {
                body: { ids: entryIds, scheduled_date: date },
            }).catch((err) => {
                console.error("Bulk delete failed:", err);
                undo();
                toast?.error?.("Couldn't delete — restored.");
            });
        }
    }, [selectedIds, update, baseTimes, clearSelection, data, date, undo]);

    const dataRef = useRef(data);
    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") {
                clearSelection();
            }
            if (e.ctrlKey || e.metaKey) {
                if (e.key === "z" && !e.shiftKey) {
                    e.preventDefault();
                    const prevSnapshot = dataRef.current;
                    undo();
                    const nextSnapshot = useLoadingPlanStore.getState().present;
                    syncUndoRedoToServer(
                        prevSnapshot,
                        nextSnapshot,
                        date,
                        mutate,
                        update,
                    );
                }
                if (e.key === "y" || (e.key === "z" && e.shiftKey)) {
                    e.preventDefault();
                    const prevSnapshot = dataRef.current;
                    redo();
                    const nextSnapshot = useLoadingPlanStore.getState().present;
                    syncUndoRedoToServer(
                        prevSnapshot,
                        nextSnapshot,
                        date,
                        mutate,
                        update,
                    );
                }
                if (e.key === "s") {
                    e.preventDefault();
                    if (isDirtyRef.current) handleSave();
                }
                if (e.key === "a") {
                    e.preventDefault();
                    setSelectedIds(
                        new Set(dataRef.current.map((r) => r._dndId)),
                    );
                }
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [undo, redo, clearSelection, handleSave]); // handleSave now stable ([] deps), so this only re-subscribes if undo/redo/clearSelection identity changes

    // NOTE: now that `machines` (below) is driven entirely by the MACHINES
    // config rather than by scanning data, this ref is write-only — nothing
    // currently reads it for rendering. Left in place (harmless bookkeeping)
    // in case it's useful later (e.g. "recently used machines" UI); safe to
    // remove if you want to trim it.
    const seenMachinePackagePairsRef = useRef(new Map());

    const addSeenPair = useCallback((machine, pkg) => {
        const map = seenMachinePackagePairsRef.current;
        if (!map.has(machine)) map.set(machine, new Set());
        map.get(machine).add(pkg);
    }, []);

    // ── Seed data on mount ───────────────────────────────────────────────────
    useEffect(() => {
        const seeded = resolvedData.map((row, i) => {
            const { item, ...rest } = row; // ← strip item
            return {
                ...rest,
                // Brand-new lots (no machine field at all, or explicitly
                // null) start life Unassigned. A previously-saved plan that
                // already has a machine/MANUAL value keeps it as-is — this
                // is NOT a one-way reset on every reload.
                machine: row.machine ?? null,
                tag: row.tag ?? null,
                Doable: row.Doable ?? 0,
                accuTime: row.accuTime ?? row.duration ?? 0,
                Remarks: row.Remarks ?? "",
                _dndId: `lot-${i}`,
            };
        });

        // One continuous timeline per machine/MANUAL bucket, independent of
        // package/group. Unassigned (null) is skipped automatically inside
        // recomputeMachine (hasTimeline() returns false for it).
        const machineBuckets = new Set(seeded.map((r) => r.machine));
        machineBuckets.forEach((machine) => {
            recomputeMachine(seeded, machine, baseTimes);
        });

        // machine -> set of Package_Name values seen on it. Currently
        // write-only (see note on seenMachinePackagePairsRef above) but
        // kept for parity / potential future use.
        const machinePkgPairs = new Map();
        seeded.forEach((r) => {
            if (!machinePkgPairs.has(r.machine))
                machinePkgPairs.set(r.machine, new Set());
            machinePkgPairs.get(r.machine).add(r.Package_Name);
        });

        useLoadingPlanStore.getState().reset(seeded);
        seenMachinePackagePairsRef.current = machinePkgPairs;
    }, []);

    // ── UI state ─────────────────────────────────────────────────────────────
    const [sorting, setSorting] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const [overMachine, setOverMachine] = useState(undefined);
    const [statusMenu, setStatusMenu] = useState(null);
    const [packageMenu, setPackageMenu] = useState(null);
    const [editCell, setEditCell] = useState(null);

    const isSortable = sorting.length === 0;

    const handleStatusClick = useCallback((e, dndId) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setStatusMenu({ dndId, x: rect.left, y: rect.bottom + 4 });
    }, []);

    const handleStatusChange = useCallback(
        (newStatus) => {
            const normalizedStatus = newStatus === "NONE" ? null : newStatus;
            const dndId = statusMenu.dndId;
            const row = data.find((r) => r._dndId === dndId);

            update((prev) =>
                prev.map((r) =>
                    r._dndId === dndId ? { ...r, status: normalizedStatus } : r,
                ),
            );
            setIsDirty(true);
            setStatusMenu(null);

            if (!row) return;

            mutate(
                route("loading-plan.entries.update", { id: row.entryId ?? 0 }),
                {
                    method: "PATCH",
                    body: {
                        entry_type: isBlockRow(row) ? "block" : "lot",
                        lot_id: row.Lot_Id,
                        scheduled_date: date,
                        fields: { status: normalizedStatus },
                        lock_version: row.lockVersion ?? null,
                    },
                },
            )
                .then((entry) => {
                    update(
                        (prev) =>
                            prev.map((r) =>
                                r._dndId === dndId
                                    ? {
                                          ...r,
                                          entryId: entry.id,
                                          lockVersion: entry.lock_version,
                                      }
                                    : r,
                            ),
                        true,
                    );
                })
                .catch((err) => {
                    console.error("Status update failed:", err);
                    undo();
                    toast?.error?.("Couldn't save status change — reverted.");
                });
        },
        [statusMenu, update, data, date, undo],
    );

    // Package_Name editor — same pattern as status, but options are scoped
    // to the row's CURRENT group (you're correcting which package within
    // the family this lot belongs to, not moving it to a different tab).
    const handlePackageClick = useCallback((e, dndId, currentPackage) => {
        e.stopPropagation();
        const rect = e.currentTarget.getBoundingClientRect();
        setPackageMenu({
            dndId,
            x: rect.left,
            y: rect.bottom + 4,
            currentPackage,
        });
    }, []);

    const handlePackageChange = useCallback(
        (newPackageName) => {
            update((prev) =>
                prev.map((r) =>
                    r._dndId === packageMenu.dndId
                        ? { ...r, Package_Name: newPackageName }
                        : r,
                ),
            );
            setIsDirty(true);
            setPackageMenu(null);
        },
        [packageMenu, update],
    );

    // Standalone source of truth for which sections render: Unassigned and
    // Manual are always shown (pinned at the top, in that order), followed
    // by every real machine from the MACHINES config, in config order —
    // regardless of whether any lot currently sits in a given bucket. This
    // is what lets a user drag a lot onto a machine that has nothing on it
    // yet, and lets freshly-seeded (all-unassigned) data render correctly
    // before anything has been placed.
    const machines = useMemo(() => {
        return [null, MACHINE_MANUAL, ...REAL_MACHINE_NAMES];
    }, []);

    const groupedRows = useMemo(() => {
        const map = {};
        data.forEach((r) => {
            // Unassigned (machine === null) ignores the package filter
            // entirely — it's a holding pen, not tied to any tab's view.
            if (
                r.machine !== null &&
                !isBlockRow(r) &&
                groupOf(r.Package_Name) !== activePackage
            )
                return;
            const key = r.machine ?? "unassigned";
            if (!map[key]) map[key] = [];
            map[key].push(r);
        });
        return map;
    }, [data, activePackage]);

    const machinesWithRows = useMemo(() => {
        return machines.filter((machine) => {
            const key = machine ?? "unassigned";
            return (groupedRows[key]?.length ?? 0) > 0;
        });
    }, [machines, groupedRows]);

    const scrollToMachine = useCallback((machine) => {
        const key = machine ?? "unassigned";
        const el = document.getElementById(`machine-section-${key}`);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, []);

    // machine -> _dndId -> [{ kind: 'block'|'package', minutes, label }, ...]
    // Describes, for each visible lot, what (if anything) sits between it
    // and its next same-GROUP successor in the true machine timeline — so
    // a filtered tab can show "this isn't really idle, X is hidden here"
    // instead of a misleading gap. Only meaningful for buckets that HAVE a
    // timeline (real machines + MANUAL) — Unassigned has no schedule, so
    // it's excluded entirely (no gap-hints there, ever).
    const gapInfo = useMemo(() => {
        const result = {};
        const byMachine = {};
        data.forEach((r) => {
            if (!hasTimeline(r.machine)) return; // skip Unassigned
            if (!byMachine[r.machine]) byMachine[r.machine] = [];
            byMachine[r.machine].push(r);
        });

        Object.entries(byMachine).forEach(([machine, rows]) => {
            result[machine] = {};

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                if (isBlockRow(row)) continue; // anchor only on real lots
                const group = groupOf(row.Package_Name);

                const segments = [];
                let j = i + 1;

                while (j < rows.length) {
                    const r = rows[j];
                    if (!isBlockRow(r) && groupOf(r.Package_Name) === group)
                        break; // reached next same-group lot

                    const minutes = Number(r.accuTime) || 0;
                    const last = segments[segments.length - 1];

                    if (isBlockRow(r)) {
                        if (last && last.kind === "block") {
                            last.minutes += minutes; // merge consecutive blocks
                        } else {
                            segments.push({
                                kind: "block",
                                minutes,
                                label: r.blockLabel || "Time block",
                            });
                        }
                    } else {
                        const otherGroup = groupOf(r.Package_Name);
                        if (
                            last &&
                            last.kind === "package" &&
                            last.label === otherGroup
                        ) {
                            last.minutes += minutes; // merge consecutive same-other-group lots
                        } else {
                            segments.push({
                                kind: "package",
                                minutes,
                                label: otherGroup,
                            });
                        }
                    }
                    j++;
                }

                if (segments.length > 0) {
                    result[machine][row._dndId] = segments;
                }
            }
        });

        return result;
    }, [data]);

    const otherPackageCounts = useMemo(() => {
        const map = {};
        data.forEach((r) => {
            if (r.machine === null) return; // Unassigned ignores the package filter
            if (groupOf(r.Package_Name) === activePackage) return;
            map[r.machine] = (map[r.machine] ?? 0) + 1;
        });
        return map;
    }, [data, activePackage]);

    const activeRow = useMemo(
        () => (activeId ? data.find((r) => r._dndId === activeId) : null),
        [activeId, data],
    );

    // ── DnD ──────────────────────────────────────────────────────────────────
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    );

    // undefined = "no drag-over target resolved yet" (true unset sentinel).
    // null is a legitimate, distinct value here — it means "currently over
    // the Unassigned section" — so it must never be used as the reset value.
    const dndOverMachineRef = useRef(undefined);

    const handleDragStart = useCallback(
        ({ active }) => {
            setActiveId(active.id);
            dndOverMachineRef.current = undefined;
            clearSelection();
        },
        [clearSelection],
    );

    const dndMap = useMemo(() => {
        const map = new Map();
        data.forEach((r) => map.set(r._dndId, r));
        return map;
    }, [data]);

    const handleDragOverFull = useCallback(
        ({ over }) => {
            if (!over) {
                setOverMachine(null);
                dndOverMachineRef.current = undefined;
                return;
            }

            let machine;
            if (
                typeof over.id === "string" &&
                over.id.startsWith(PREFIX_EMPTY_DROPPABLE)
            ) {
                machine = droppableTokenToMachine(
                    over.id.slice(PREFIX_EMPTY_DROPPABLE.length),
                );
            } else {
                const overRow = dndMap.get(over.id);
                machine = overRow ? overRow.machine : undefined;
            }

            // machine can legitimately be null (Unassigned) — only skip updating
            // the ref when we genuinely couldn't resolve a target at all.
            if (machine !== undefined) dndOverMachineRef.current = machine;

            setOverMachine((prev) => (prev === machine ? prev : machine));
        },
        [dndMap],
    );

    const handleDragEnd = useCallback(
        ({ active, over }) => {
            console.log(
                `[dragend #${++window.__dragEndCounter || (window.__dragEndCounter = 1)}]`,
                {
                    activeId: active?.id,
                    overId: over?.id,
                    time: performance.now(),
                },
            );
            console.trace();

            setActiveId(null);
            setOverMachine(undefined);

            if (!over || active.id === over.id) return;

            // Track what needs recomputing + callbacks, set during the move update
            let pendingRecompute = null;
            let finalRows = null;

            update((prev) => {
                const next = prev.map((r) => ({ ...r }));
                const fromIdx = next.findIndex((r) => r._dndId === active.id);
                let toIdx = next.findIndex((r) => r._dndId === over.id);

                if (fromIdx === -1) return prev;

                let moved, fromMachine, toMachine, isTransfer;

                if (toIdx === -1) {
                    const fallbackMachine = dndOverMachineRef.current;
                    if (fallbackMachine === undefined) return prev;

                    [moved] = next.splice(fromIdx, 1);
                    fromMachine = moved.machine;
                    toMachine = fallbackMachine;
                    isTransfer = fromMachine !== toMachine;
                    if (isTransfer) moved.machine = toMachine;
                    addSeenPair(toMachine, moved.Package_Name);

                    let insertAt = next.length;
                    for (let i = next.length - 1; i >= 0; i--) {
                        if (next[i].machine === toMachine) {
                            insertAt = i + 1;
                            break;
                        }
                    }
                    next.splice(insertAt, 0, moved);
                } else {
                    fromMachine = next[fromIdx].machine;
                    toMachine = next[toIdx].machine;
                    isTransfer = fromMachine !== toMachine;
                    const draggingDown = fromIdx < toIdx;

                    [moved] = next.splice(fromIdx, 1);
                    if (isTransfer) moved.machine = toMachine;
                    addSeenPair(toMachine, moved.Package_Name);

                    let insertAt = next.findIndex((r) => r._dndId === over.id);
                    if (insertAt === -1) insertAt = next.length;
                    else if (draggingDown) insertAt += 1;
                    next.splice(insertAt, 0, moved);
                }

                // Recompute in the SAME pass — one update(), one undo entry
                recomputeMachine(next, toMachine, baseTimes);
                if (isTransfer) recomputeMachine(next, fromMachine, baseTimes);

                onReorder?.(
                    toMachine,
                    next.filter((r) => r.machine === toMachine),
                );
                if (isTransfer) {
                    onReorder?.(
                        fromMachine,
                        next.filter((r) => r.machine === fromMachine),
                    );
                    onLotTransfer?.(moved.Lot_Id, fromMachine, toMachine);
                }

                pendingRecompute = {
                    fromMachine,
                    toMachine,
                    isTransfer,
                    moved,
                };
                finalRows = next;
                return next;
            });

            setIsDirty(true);

            if (!pendingRecompute) return;
            const { fromMachine, toMachine, isTransfer, moved } =
                pendingRecompute;

            // Unassigned has no persisted order — nothing to save
            // when the destination is the holding pen and this
            // wasn't a transfer (a pure Unassigned-to-Unassigned
            // reorder is purely cosmetic, per the JSDoc contract).
            if (toMachine === null && !isTransfer) return;
            const isBlock = isBlockRow(moved);
            if (isBlock && !moved.entryId) return; // block was never persisted (shouldn't happen — addBlock always creates it)

            const { beforeEntryId, afterEntryId } = findMachineNeighbors(
                finalRows,
                moved._dndId,
                toMachine,
            );

            const persist = isTransfer
                ? mutate(route("loading-plan.transfer"), {
                      body: {
                          entry_type: isBlock ? "block" : "lot",
                          lot_id: isBlock ? null : moved.Lot_Id,
                          entry_id: isBlock ? moved.entryId : null,
                          target_machine: toMachine,
                          before_entry_id: beforeEntryId,
                          after_entry_id: afterEntryId,
                          scheduled_date: date,
                      },
                  })
                : mutate(route("loading-plan.move"), {
                      body: {
                          entry_type: isBlock ? "block" : "lot",
                          lot_id: isBlock ? null : moved.Lot_Id,
                          entry_id: isBlock ? moved.entryId : null,
                          before_entry_id: beforeEntryId,
                          after_entry_id: afterEntryId,
                          machine: toMachine,
                          scheduled_date: date,
                      },
                  });

            persist
                .then((entry) => {
                    // sync the authoritative sequence_order/lock_version
                    // back into local state so the next move's
                    // neighbor lookup and future edits use fresh values
                    update(
                        (prev) =>
                            prev.map((r) =>
                                r._dndId === moved._dndId
                                    ? {
                                          ...r,
                                          sequenceOrder: entry.sequence_order,
                                          lockVersion: entry.lock_version,
                                          entryId: entry.id,
                                      }
                                    : r,
                            ),
                        true,
                    );
                })
                .catch((err) => {
                    console.error("Failed to persist move/transfer:", err);
                    // Consider: revert local state or show a toast here.
                });
        },
        [baseTimes, onLotTransfer, onReorder, update, addSeenPair],
    );

    const handleDragCancel = useCallback(() => {
        setActiveId(null);
        setOverMachine(undefined);
        dndOverMachineRef.current = undefined;
    }, []);

    // ── Cell editing ─────────────────────────────────────────────────────────
    const handleCellClick = useCallback(
        (e, dndId, field) => {
            const type = EDITABLE_COLUMNS[field];
            if (!type) return;
            const row = data.find((r) => r._dndId === dndId);
            // Block rows can only edit accuTime
            if (isBlockRow(row) && field !== "accuTime") return;
            const rect = e.currentTarget.getBoundingClientRect();
            setEditCell({
                dndId,
                field,
                value: String(row[field] ?? ""),
                type,
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height,
            });
        },
        [data],
    );

    const handleCellCommit = useCallback(
        (rawValue) => {
            if (!editCell) return;
            const { dndId, field, type } = editCell;
            const value =
                type === "integer"
                    ? parseInt(rawValue, 10) || 0
                    : rawValue.trim();

            const row = data.find((r) => r._dndId === dndId);

            update((prev) => {
                const next = prev.map((r) =>
                    r._dndId !== dndId ? { ...r } : { ...r, [field]: value },
                );
                if (field === "accuTime") {
                    const row = next.find((r) => r._dndId === dndId);
                    if (row) recomputeMachine(next, row.machine, baseTimes);
                }
                return next;
            });

            setIsDirty(true);
            setEditCell(null);

            if (!row) return;
            console.log("🚀 ~ LoadingPlanTable ~ row:", row);

            // Backend field name for accuTime is snake_case (accu_time)
            const backendField = toSnakeCase(field);

            mutate(
                route("loading-plan.entries.update", { id: row.entryId ?? 0 }),
                {
                    method: "PATCH",
                    body: {
                        entry_type: isBlockRow(row) ? "block" : "lot",
                        lot_id: row.Lot_Id,
                        scheduled_date: date,
                        fields: { [backendField]: value },
                        lock_version: row.lockVersion ?? null,
                    },
                },
            )
                .then((entry) => {
                    update(
                        (prev) =>
                            prev.map((r) =>
                                r._dndId === dndId
                                    ? {
                                          ...r,
                                          entryId: entry.id,
                                          lockVersion: entry.lock_version,
                                      }
                                    : r,
                            ),
                        true,
                    );
                })
                .catch((err) => {
                    if (err.status === 409) {
                        const current = err.data?.current;
                        update(
                            (prev) =>
                                prev.map((r) =>
                                    r._dndId === dndId
                                        ? {
                                              ...r,
                                              [field]:
                                                  current?.[backendField] ??
                                                  r[field],
                                              lockVersion:
                                                  current?.lock_version ??
                                                  r.lockVersion,
                                          }
                                        : r,
                                ),
                            true,
                        );
                        toast?.error?.(
                            "Someone else updated this lot — showing their latest value.",
                        );
                    } else if (err.status === 422) {
                        // Laravel's default validation error shape: { message, errors: { "fields.remarks": [...] } }
                        const firstError = Object.values(
                            err.data?.errors ?? {},
                        )[0]?.[0];
                        toast?.error?.(firstError ?? "That value isn't valid.");
                    } else {
                        toast?.error?.(
                            err.data?.message ??
                                "Failed to save your change. Please try again.",
                        );
                        console.error("Failed to save field edit:", err);
                    }
                });
        },
        [editCell, update, baseTimes, data, date],
    );

    const handleCellCancel = useCallback(() => setEditCell(null), []);

    // ── Add row / block ──────────────────────────────────────────────────────
    const [justAddedMachine, setJustAddedMachine] = useState(null);

    const handleAddRow = useCallback(
        (machine) => {
            // Default to the first package in the active group — the user
            // can correct it afterwards via the Package cell's dropdown,
            // same as fixing a status.
            const groupPkgs = packagesInGroup(activePackage);
            const packageName = groupPkgs[0] ?? activePackage;

            update((prev) => {
                const next = [...prev];
                const newRow = {
                    machine,
                    item: 0,
                    Part_Name: "",
                    Lead_Count: null,
                    Package_Name: packageName,
                    Lot_Id: "",
                    status: "NONE",
                    Station: "",
                    Qty: 0,
                    Doable: 0,
                    accuTime: 0,
                    Lot_Type: "",
                    Lot_Status: "",
                    Focus_Group: "",
                    Stage: "",
                    Lot_Entry_Time_Days: null,
                    CR3: null,
                    BE_OSL_Days: null,
                    Body_Size: "",
                    Ramp_Time: null,
                    Remarks: "",
                    // Hidden columns for derived calcs
                    Date_Loaded: null,
                    BE_Starttime: null,
                    Backend_Leadtime: null,
                    tag: null,
                    _dndId: `lot-new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                };
                next.push(newRow);
                recomputeMachine(next, machine, baseTimes);
                return next;
            });
            setIsDirty(true);
            addSeenPair(machine, packageName);
            setJustAddedMachine(machine);
        },
        [activePackage, baseTimes, update, addSeenPair],
    );

    const handleAddBlock = useCallback(
        (machine) => {
            const label = window.prompt(
                "Block label (e.g. Preventative Maintenance, Changeover, Lunch):",
                "Preventative Maintenance",
            );
            if (label === null) return;
            const durationStr = window.prompt("Duration in minutes:", "60");
            const duration = parseInt(durationStr, 10);
            if (!duration || duration <= 0) return;

            mutate(route("loading-plan.blocks.store"), {
                body: {
                    machine,
                    scheduled_date: date,
                    label: label.trim() || "Time block",
                    duration,
                    before_entry_id: null,
                    after_entry_id: null, // appends to end — adjust if you add a "drop position" UI for blocks
                },
            })
                .then((entry) => {
                    update((prev) => {
                        const next = [...prev];
                        next.push({
                            machine,
                            item: 0,
                            Lot_Id: null,
                            Part_Name: null,
                            Package_Name: null,
                            status: null,
                            Station: null,
                            Qty: null,
                            Doable: null,
                            accuTime: duration,
                            Lot_Type: null,
                            Lot_Status: null,
                            Remarks: null,
                            tag: null,
                            isBlock: true,
                            blockLabel: entry.block_label,
                            entryId: entry.id,
                            lockVersion: entry.lock_version,
                            _dndId: `block-${entry.id}`,
                        });
                        recomputeMachine(next, machine, baseTimes);
                        return next;
                    });
                    setIsDirty(true);
                    setJustAddedMachine(machine);
                })
                .catch((err) => {
                    console.error("Failed to save block:", err);
                    window.alert(
                        "Could not save the block — please try again.",
                    );
                });
        },
        [baseTimes, update, date],
    );

    useEffect(() => {
        if (justAddedMachine === null) return;
        const id = requestAnimationFrame(() => setJustAddedMachine(null));
        return () => cancelAnimationFrame(id);
    }, [justAddedMachine]);

    // ── Context value ────────────────────────────────────────────────────────
    const tableActionsValue = useMemo(
        () => ({
            handleStatusClick,
            handleCellClick,
            handlePackageClick,
            selectedIds,
            handleRowSelect,
            anchorIdRef,
        }),
        [
            handleStatusClick,
            handleCellClick,
            handlePackageClick,
            selectedIds,
            handleRowSelect,
        ],
    );

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="relative h-full">
            <TableActionsContext.Provider value={tableActionsValue}>
                <div className="absolute inset-0 overflow-hidden flex flex-col">
                    <div
                        onPaste={(e) => {
                            console.log(
                                "plain text:",
                                e.clipboardData.getData("text/plain"),
                            );
                            console.log(
                                "html:",
                                e.clipboardData.getData("text/html"),
                            );
                        }}
                    >
                        paste here
                    </div>
                    {sorting.length > 0 && (
                        <div className="text-xs text-warning px-4 pb-2">
                            Sorted by {sorting[0].id} — clear sort to
                            drag/reorder lots.
                            <button
                                onClick={() => setSorting([])}
                                className="underline ml-1"
                            >
                                Clear sort
                            </button>
                        </div>
                    )}
                    {status && (
                        <div className="text-sm text-muted-foreground">
                            {getStatusMessage(status)}
                        </div>
                    )}
                    {/* <div className="w-full min-w-0 flex flex-col flex-1 min-h-0"> */}
                    {/* ── Top bar: undo/redo + package tabs ── */}
                    <div className="flex-none px-4 pt-4">
                        <div className="flex items-center gap-2 mb-3">
                            <button
                                onClick={undo}
                                disabled={!canUndo()}
                                className="px-2 py-1 text-xs rounded border border-base-300 text-base-content/60 disabled:opacity-30 hover:bg-base-200"
                                title="Undo (Ctrl+Z)"
                            >
                                ↩ Undo
                            </button>
                            <button
                                onClick={redo}
                                disabled={!canRedo()}
                                className="px-2 py-1 text-xs rounded border border-base-300 text-base-content/60 disabled:opacity-30 hover:bg-base-200"
                                title="Redo (Ctrl+Y)"
                            >
                                ↪ Redo
                            </button>
                            {isDirty && (
                                <span className="text-xs text-warning ml-2">
                                    Unsaved changes ·{" "}
                                    <button
                                        onClick={handleSave}
                                        className="underline"
                                    >
                                        Save
                                    </button>
                                </span>
                            )}
                            {lastSaved && !isDirty && (
                                <span className="text-xs text-base-content/40">
                                    Saved {lastSaved.toLocaleTimeString()}
                                </span>
                            )}
                            {selectedIds.size > 0 && (
                                <span className="text-xs text-info ml-2">
                                    {selectedIds.size} row
                                    {selectedIds.size !== 1 ? "s" : ""} selected
                                    {" · "}
                                    <button
                                        onClick={clearSelection}
                                        className="underline"
                                    >
                                        Deselect all
                                    </button>
                                </span>
                            )}
                        </div>

                        <PackageTabs
                            packages={packages}
                            active={activePackage}
                            onChange={(pkg) => {
                                setActivePackage(pkg);
                                clearSelection();
                            }}
                        />

                        {/* <div className="flex gap-1.5 flex-wrap mt-2">
                            {machinesWithRows.map((machine) => (
                                <button
                                    key={machine ?? "unassigned"}
                                    onClick={() => scrollToMachine(machine)}
                                    className="px-2.5 py-1 text-xs rounded-full border border-base-300 hover:bg-base-200 font-medium"
                                >
                                    {machineLabel(machine)}
                                    <span className="ml-1 text-base-content/40">
                                        {groupedRows[machine ?? "unassigned"]
                                            ?.length ?? 0}
                                    </span>
                                </button>
                            ))}
                        </div> */}
                    </div>

                    {/* ── Scrollable machine list ── */}
                    {/*
                            overflow-x-auto lives HERE on the vertical scroll container.
                            This makes it the single horizontal scroll viewport for every
                            MachineSection. The sticky headers inside each section use
                            position:sticky top:0 which works relative to this same
                            ancestor — so stickiness is preserved and there is only one
                            scrollbar that moves header + body together.
                            */}
                    <div
                        ref={scrollParentRef}
                        className="flex-1 min-h-0 px-4 pb-4 overflow-auto"
                    >
                        {/* <div className="flex-1 overflow-x-auto px-4 pb-4"> */}
                        <ScrollParentContext.Provider value={scrollParentRef}>
                            <DndContext
                                sensors={sensors}
                                autoScroll={{
                                    acceleration: 30,
                                    threshold: { x: 0.2, y: 0.2 },
                                    interval: 5,
                                }}
                                collisionDetection={closestCenter}
                                onDragStart={handleDragStart}
                                onDragOver={handleDragOverFull}
                                onDragEnd={handleDragEnd}
                                onDragCancel={handleDragCancel}
                            >
                                <div style={{ minWidth: TOTAL_MIN_WIDTH }}>
                                    <div className="sticky top-0 z-20 px-1">
                                        <GlobalTableHeader
                                            sorting={sorting}
                                            onSortingChange={setSorting}
                                        />
                                    </div>
                                    <GapInfoContext.Provider value={gapInfo}>
                                        <SortableTableContext.Provider
                                            value={isSortable}
                                        >
                                            {machines.map((machine) => (
                                                <MachineSection
                                                    key={
                                                        machine ?? "unassigned"
                                                    }
                                                    machine={machine}
                                                    rows={
                                                        groupedRows[
                                                            machine ??
                                                                "unassigned"
                                                        ] ?? []
                                                    }
                                                    isDropTarget={
                                                        overMachine ===
                                                            machine &&
                                                        activeRow?.machine !==
                                                            machine
                                                    }
                                                    justAdded={
                                                        justAddedMachine ===
                                                        machine
                                                    }
                                                    otherPackageCount={
                                                        otherPackageCounts[
                                                            machine
                                                        ] ?? 0
                                                    }
                                                    globalSorting={sorting}
                                                    onSortingChange={setSorting}
                                                    onAddRow={handleAddRow}
                                                    onAddBlock={handleAddBlock}
                                                />
                                            ))}
                                        </SortableTableContext.Provider>
                                    </GapInfoContext.Provider>
                                </div>
                                {/* end minWidth div */}

                                <DragOverlay
                                    dropAnimation={{
                                        duration: 150,
                                        easing: "ease",
                                    }}
                                >
                                    {activeRow ? (
                                        <DragGhostRow row={activeRow} />
                                    ) : null}
                                </DragOverlay>
                            </DndContext>
                        </ScrollParentContext.Provider>
                    </div>

                    {/* ── Selection toolbar ── */}
                    <SelectionToolbar
                        selectedIds={selectedIds}
                        allData={data}
                        machines={machines}
                        onTag={handleBulkTag}
                        onClearTag={handleBulkClearTag}
                        onStatusChange={handleBulkStatus}
                        onTransfer={handleBulkTransfer}
                        onDelete={handleBulkDelete}
                        onClearSelection={clearSelection}
                    />
                </div>

                {/* ── Single-row status dropdown (portal-style, fixed) ── */}
                {statusMenu && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setStatusMenu(null)}
                        />
                        <div
                            className="fixed z-10000 bg-base-100 border border-base-300 rounded-lg shadow-lg py-1 min-w-36"
                            style={{
                                top: statusMenu.y,
                                left: statusMenu.x,
                            }}
                        >
                            {[
                                "DONE",
                                "RUNNING",
                                "FOR PROCESS",
                                "FVI",
                                "BOXING",
                                "LWAIT",
                                "NONE",
                            ].map((s) => (
                                <button
                                    key={s}
                                    className="btn btn-ghost w-full text-left px-0 text-sm hover:bg-base-200 flex items-center gap-2"
                                    onClick={() => handleStatusChange(s)}
                                >
                                    <StatusBadge status={s} />
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {/* ── Single-row package dropdown (portal-style, fixed) ── */}
                {packageMenu && (
                    <>
                        <div
                            className="fixed inset-0 z-40"
                            onClick={() => setPackageMenu(null)}
                        />
                        <div
                            className="fixed z-50 bg-base-100 border border-base-300 rounded-lg shadow-lg py-1 min-w-32"
                            style={{
                                top: packageMenu.y,
                                left: packageMenu.x,
                            }}
                        >
                            {packagesInGroup(
                                groupOf(packageMenu.currentPackage),
                            ).map((pkg) => (
                                <button
                                    key={pkg}
                                    className="btn btn-ghost w-full text-left px-3 py-1.5 text-sm hover:bg-base-200"
                                    onClick={() => handlePackageChange(pkg)}
                                >
                                    {pkg}
                                </button>
                            ))}
                        </div>
                    </>
                )}

                {/* ── Inline cell editor (portal-style, fixed) ── */}
                {editCell && (
                    <CellEditor
                        editCell={editCell}
                        onCommit={handleCellCommit}
                        onCancel={handleCellCancel}
                    />
                )}
            </TableActionsContext.Provider>
        </div>
    );
}
