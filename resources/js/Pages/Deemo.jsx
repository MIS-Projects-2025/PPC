import DateNav from "@/Components/DateNav";
import AddEntryModal from "@/Components/LoadingPlan/AddEntriesModal";
import { BakeSelectionToolbar } from "@/Components/LoadingPlan/BakeSelectionToolbar";
import { BucketHeaderBar } from "@/Components/LoadingPlan/BucketHeaderBar";
import { DATA_COLUMNS, TableActionsContext, makeBakeColumns, makeColumns } from "@/Components/LoadingPlan/columns";
import DataIntegrityModal, {
    DATA_INTEGRITY_MODAL_ID,
    TabBadge,
} from "@/Components/LoadingPlan/DataIntegrityModal";
import DisseminationSummaryModal, {
    DISSEMINATION_MODAL_ID,
} from "@/Components/LoadingPlan/DisseminationSummary";
import { DroppableRow } from "@/Components/LoadingPlan/DroppableRow";
import EntryHistoryModal from "@/Components/LoadingPlan/EntryHistoryModal";
import interactiveCursorClasses from "@/Components/LoadingPlan/interactiveCursorClasses";
import { MachineHeaderBar, TableInteractionContext } from "@/Components/LoadingPlan/MachineHeaderBar";
import MergeHistoryModal from "@/Components/LoadingPlan/MergeHistoryModal";
import { OvenHeaderCell } from "@/Components/LoadingPlan/OvenHeaderCell";
import PickupInsertModal from "@/Components/LoadingPlan/PickupInsertModal";
import { SavingCursorBadge } from "@/Components/LoadingPlan/SavingCursorBadge";
import ScrollableTabs from "@/Components/LoadingPlan/ScrollableTabs";
import { SearchBar } from "@/Components/LoadingPlan/SearchBar";
import SelectionToolbar from "@/Components/LoadingPlan/SelectionToolbar";
import SplitHistoryModal from "@/Components/LoadingPlan/SplitHistoryModal";
import StatusMenu from "@/Components/LoadingPlan/StatusMenu";
import { ROW_HEIGHT } from "@/Constants/LoadingPlan/constants";
import { packagesInGroup } from "@/Constants/loadingPlanPackageGroups.js";
import { MACHINE_MANUAL, hasTimeline } from "@/Constants/machines.js";
import { getStatusMessage } from "@/Constants/wipStatus.js";
import { useBucketOperations } from "@/Hooks/LoadingPlan/useBucketOperations";
import { useBulkOperations } from "@/Hooks/LoadingPlan/useBulkOperations";
import { useCellEditPersistence } from "@/Hooks/LoadingPlan/useCellEditPersistence";
import { useDragReorder } from "@/Hooks/LoadingPlan/useDragReorder";
import { useRowHoverInsert } from "@/Hooks/LoadingPlan/useRowHoverInsert";
import { useSplitMergeOperations } from "@/Hooks/LoadingPlan/useSplitMergeOperations";
import { useStickyGroupHeader } from "@/Hooks/LoadingPlan/useStickyGroupHeader";
import { useTableSearch } from "@/Hooks/LoadingPlan/useTableSearch";
import { useUndoRedoSync } from "@/Hooks/LoadingPlan/useUndoRedoSync";
import { useMutation } from "@/Hooks/useMutation";
import { useToast } from "@/Hooks/useToast";
import { isBlockRow } from "@/Lib/LoadingPlan/helpers";
import { downloadExcelBuffer, exportLoadingPlanToExcel } from "@/Lib/LoadingPlan/loadingPlanExcelExporter";
import { applyAffectedTimings, timeFieldsFromDatetimes } from "@/Lib/LoadingPlan/loadingPlanSchedule.js";
import { createUndoStore } from "@/Store/undoStore";
import { usePersistedSet } from "@/Store/usePersistedSet";
import { DndContext, DragOverlay, MeasuringStrategy } from "@dnd-kit/core";
import { autoUpdate, offset, useFloating } from "@floating-ui/react";
import { Deferred, Link, router } from '@inertiajs/react';
import clsx from "clsx";
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DataGrid } from "react-data-grid";
import "react-data-grid/lib/styles.css";
import { createPortal } from "react-dom";
import { BsGear, BsSearch } from "react-icons/bs";
import { FaGear } from "react-icons/fa6";
import { GoAlert } from "react-icons/go";
import { PiOvenDuotone } from "react-icons/pi";

/**
 * DEMO: machine-grouped lot table (react-data-grid based)
 * -----------------------------------------------------------------------
 * react-data-grid rewrite of LoadingPlanTable.jsx (TanStack Table +
 * manual-sections version). Everything below that used to live only in
 * LoadingPlanTable.jsx has been ported across:
 *
 *   - undo/redo (createUndoStore) + Ctrl+Z / Ctrl+Y / Ctrl+A / Escape
 *   - drag-and-drop now PERSISTS (move/transfer) instead of only
 *     touching local state, and recomputes machine timelines
 *   - cell edits (accu_time/remarks/time_start) now PERSIST via
 *     loading-plan.entries.update, with time_start doing the same
 *     applyTimeStartEdit() gap-shift logic as the old table
 *   - status badge is now clickable -> dropdown -> persists
 *   - bulk tag/status/transfer/delete wired to SelectionToolbar
 *   - split/merge handlers + history modals wired up
 *   - add-lot / add-block wired up (exposed via context, plus buttons on
 *     the sticky header overlay — see note below)
 *   - Unassigned + MANUAL sections are now always rendered. Previously
 *     displayRows only flatMapped over `serverMachines`, so anything
 *     with machine === null or machine === "MANUAL" silently never
 *     showed up in the grid at all.
 *   - fixed a live bug: onDragCancel called handleDragCancel, which
 *     didn't exist, so cancelling a drag (e.g. pressing Escape mid-drag)
 *     would throw.
 *   - fixed a self-drop check that compared a number (active.id) against
 *     a string (String(over.id)) and could never actually match.
 *   - NEW: otherPackageCounts, ported from LoadingPlanTable.jsx — shows
 *     how many rows on a machine are hidden by the current package tab
 *     (belong to some other package group), as a badge next to the
 *     header. Previously Deemo filtered rows by activePackageGroup with
 *     no indication anything was hidden.
 *   - NEW: fixed an id/entry_id mix-up in the bulk handlers (see below).
 *   - NEW: a synthetic "Unassigned" package tab that aggregates every
 *     machine === null entry across ALL packages (bake excluded, since
 *     bake never lives in dataRows to begin with) — see displayRows.
 *   - NEW: on a real package tab, a machine section is hidden entirely
 *     once it has nothing but block rows on it (no actual lots) — see
 *     the lotCount check in displayRows.
 *   - NEW: Excel-style column headers — click/ctrl-click/shift-click to
 *     multi-select headers, drag any selected column's resize handle to
 *     resize the whole selection together, and shrink a column down to
 *     a thin colored sliver (still visible as a hint) instead of losing
 *     it entirely. Plus a "Columns" button/modal to toggle the same
 *     collapsed state by checkbox. See the column-selection block below
 *     `columns` / `decoratedColumns`.
 *   - NEW: `readOnly` prop. When true, every write path is disabled:
 *     cell editing, drag-and-drop, status changes, bulk actions,
 *     add-lot/add-block, split/merge, and the scheduler. Undo/redo,
 *     selection, and their toolbars are hidden entirely since there's
 *     nothing to undo or act on. Search, collapse/expand, column
 *     resize/visibility, viewing entry/split/merge history, and Excel
 *     export all still work — none of them write anything. See the
 *     `readOnly` guards sprinkled through this file (search for
 *     "readOnly") rather than a second component, so this file is the
 *     single source of truth for both the editable and view-only pages.
 *
 * STUBBED FOR NOW: every handler that talks to the backend has a
 * `return;` placed immediately before its `withUpdating(mutate(...))` /
 * `fetch(...)` call, NOT at the top of the function — so local/optimistic
 * state (grid updates, timeline recompute, selection clearing, guard
 * clauses) still runs and is testable without a live backend. Remove the
 * `return;` lines (search "stub: skip") once the corresponding routes
 * are ready.
 *
 * Things intentionally NOT ported here, because they read like page-level
 * chrome that belongs to the parent Inertia page rather than this grid
 * component (and Deemo doesn't currently receive their props): DateNav /
 * production-line switching, DataIntegrityModal, DisseminationSummary,
 * PickupInsertModal. Add them back at the page level if Deemo becomes
 * the page's primary table.
 *
 * Still NOT ported (candidates for a future pass, but skipped here since
 * they're either tied to LoadingPlanTable's TanStack-table-only internals
 * (GlobalTableHeader column sorting, gapInfo package-gap segments) or to
 * MachineSection/MachineSectionBody internals not shown in this
 * conversation (idle-machine browsing, justAddedMachine highlight
 * animation, the per-row package-change dropdown)): column sorting,
 * gapInfo, idle-machine grid, justAddedMachine highlight, package menu.
 *
 * Assumptions I couldn't verify (their source wasn't in this conversation
 * — please double check against the real files):
 *   - findMachineNeighbors()/applyTimeStartEdit() key rows off `_dndId`,
 *     exactly like they do when called from LoadingPlanTable.jsx. Seeded
 *     rows here carry a `_dndId: entry-${entry_id}` for that reason.
 *   - MachineHeaderBar reads `row.machine` for its title. For the sticky
 *     overlay I pass `row.machineLabel` ("Unassigned" / "MANUAL" / name)
 *     instead so the pinned sections don't show a blank/raw value — the
 *     real header cell (MachineHeaderCell) still passes the raw row, so
 *     if MachineHeaderBar doesn't already prefer machineLabel you'll want
 *     to add that one-line fallback there too. Same applies to the new
 *     `otherPackageCount` field on header rows — MachineHeaderBar may or
 *     may not render it; the sticky overlay renders its own badge either
 *     way so the feature is visible regardless.
 *   - StatusBadge accepts `status` (+ is just wrapped in a button here
 *     for the click handler, so no onClick prop assumed on StatusBadge
 *     itself).
 *   - createUndoStore()'s returned hook exposes `.getState().present` and
 *     `.getState().reset(rows)` as static methods, matching how
 *     LoadingPlanTable.jsx uses useLoadingPlanStore.
 *   - `baseTimes` needs to be passed down from the parent page for
 *     schedule recompute (move/transfer/edit/split/merge all guard on
 *     `if (baseTimes)` and skip recompute if it's not provided, so
 *     nothing crashes without it — but time_start edits explicitly
 *     require it and will show a toast instead of silently no-op'ing).
 *   - NEW (column headers): `makeColumns()` returns react-data-grid
 *     `Column` objects with a `key`, `name`, and (optionally) its own
 *     `renderHeaderCell`. `decoratedColumns` below wraps whatever
 *     `renderHeaderCell` a column already has rather than replacing it,
 *     so any existing sort/filter UI in a header should still render —
 *     but I don't have columns.js in this conversation, so please check
 *     that the wrapping doesn't clash with anything it already does
 *     (e.g. if it renders its own outer clickable container). Also
 *     assumes `col.width` is a plain number (react-data-grid also
 *     accepts percentage strings / "max-content" — if any column here
 *     uses those, the resize math needs a fallback for it).
 *   - NEW (readOnly): verified against the real columns.js — only
 *     react-data-grid's built-in checkbox column (key `"select-row"`) is
 *     stripped out of the grid when `readOnly` is true. The `"dragHandle"`
 *     column is kept: it also renders MachineHeaderCell for header rows
 *     and carries the colSpan that makes header rows span the grid, so
 *     removing it would blank out every machine/oven header. Its
 *     per-row RowDropTargetCell is harmless without it — no drag can be
 *     initiated since DndContext is mounted with `sensors={[]}` in this
 *     mode. Same reasoning applies to the bake table's structural
 *     `"ovenHeader"` column, which was never in the strip list.
 * -----------------------------------------------------------------------
 */

// Must match the actual row height / header height react-data-grid uses,
// since scroll math below (which group is "at top") depends on it.
const HEADER_ROW_HEIGHT = 35;

// Column-header multi-select + Excel-style linked-resize (see
// handleHeaderClick / handleColumnResize below). MIN_COLUMN_WIDTH is the
// floor a column can be dragged/toggled down to — it's not 0 so there's
// always a thin colored sliver left as a hint that a column is still
// there with data in it. COLLAPSE_HINT_THRESHOLD is the width at/under
// which we treat a column as "collapsed" for styling purposes (lets a
// column land a few px above MIN_COLUMN_WIDTH from a drag and still get
// the hinted styling, not just an exact-match at the floor).
const MIN_COLUMN_WIDTH = 6;
const COLLAPSE_HINT_THRESHOLD = 28;
const COLUMN_WIDTHS_STORAGE_KEY = "loadingPlan:columnWidths";

// readOnly mode: structural (non-data) columns dropped from the grid
// entirely, since neither selection nor drag-reorder exist in that mode.
// See the "NEW (readOnly)" assumption above re: these keys.
const READONLY_STRIP_KEYS = new Set(["select-row"]);
// NOT "dragHandle": that column also renders MachineHeaderCell for header
// rows and carries the colSpan that makes header rows span the grid — it
// isn't purely a drag affordance. Its per-row RowDropTargetCell is
// already inert in read-only mode because DndContext is mounted with
// sensors={[]}, so no drag can ever be initiated; nothing needs removing.

function toReadOnlyColumns(columns) {
    return columns
        .filter((col) => !READONLY_STRIP_KEYS.has(col.key))
        .map((col) => {
            const { renderEditCell, ...rest } = col;
            return { ...rest, editable: false };
        });
}

function buildExportGroups(dataRows, machines) {
    return machines
        .map((m) => {
            const label = m === null ? "Unassigned" : m === MACHINE_MANUAL ? "MANUAL" : m;
            const rows = dataRows.filter((r) => r.machine === m);
            return { machine: label, rows };
        })
        .filter((g) => g.rows.length > 0);
}

function RowInsertButtons({ isHidden = false, anchorElement, onInsertAbove, onInsertBelow, buttonsRef }) {
    const above = useFloating({
        // Places floating element to the left, aligned with top of anchor
        placement: "left-start", 
        strategy: "fixed",
        whileElementsMounted: autoUpdate,
        // Moves button slightly inside or flush with the row's top/left boundary
        middleware: [
            offset(({ rects }) => ({
                // Negate floating width if you want top-right edge flush with left edge
                // Or adjust mainAxis/crossAxis offset to fine-tune exact positioning
                mainAxis: 0,
            })),
        ],
    });

    const below = useFloating({
        // Places floating element to the left, aligned with bottom of anchor
        placement: "left-end", 
        strategy: "fixed",
        whileElementsMounted: autoUpdate,
        middleware: [
            offset({ mainAxis: 0 }),
        ],
    });

    useEffect(() => {
        above.refs.setReference(anchorElement);
        below.refs.setReference(anchorElement);
    }, [anchorElement, above.refs, below.refs]);

    if (isHidden) return null;

    return createPortal(
        <div className="join join-vertical rounded-r-none flex flex-col" ref={buttonsRef}>
            <button
                ref={above.refs.setFloating}
                style={{ ...above.floatingStyles, zIndex: 9999 }}
                className="btn btn-xs join-item border border-opposite-100/25 insert-row-btn rounded-r-none h-[18px] min-h-[18px] flex-1 flex items-center justify-center"
                onClick={onInsertAbove}
            >
                ↓<span className="font-thin text-xs ml-0.5">+</span>
            </button>
            <button
                ref={below.refs.setFloating}
                style={{ ...below.floatingStyles, zIndex: 9999 }}
                className="btn btn-xs join-item border border-opposite-100/25 insert-row-btn rounded-r-none h-[18px] min-h-[18px] flex-1 flex items-center justify-center"
                onClick={onInsertBelow}
            >
                ↑<span className="font-thin text-xs ml-0.5">+</span>
            </button>
        </div>,
        document.body
    );
}

function RowHistoryButton({ isHidden, anchorElement, onViewHistory, buttonsRef }) {
    const { refs, y } = useFloating({
        placement: "left-start", // only using this for vertical (y) tracking
        strategy: "fixed",
        whileElementsMounted: autoUpdate,
        middleware: [offset({ mainAxis: 0 })],
    });

    useEffect(() => {
        refs.setReference(anchorElement);
    }, [anchorElement, refs]);

    if (isHidden) return null;

    return createPortal(
        <button
            ref={(node) => {
                refs.setFloating(node);
                if (buttonsRef) buttonsRef.current = node;
            }}
            style={{
                position: "fixed",
                top: y ?? 0,
                right: 8, // sticky to the far right edge of the viewport
                zIndex: 9999,
            }}
            className="btn btn-xs insert-row-btn border border-opposite-100/25 rounded-l-none h-9 min-h-9 flex items-center justify-center"
            onClick={onViewHistory}
            title="View history"
        >
            🕘
        </button>,
        document.body
    );
}

const ALL_PACKAGES_TAB = "ALL PACKAGE";
const RES_TAB = "RES";
const RES_STATION = "GTTRES_T";
const isResRow = (r) => r.station === RES_STATION;
// ---------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------

const useLoadingPlanStore = createUndoStore([]);

export default function Deemo({
    data,
    bakeLots,
    machines: serverMachines,
    packageGroups,
    packageGroupNames,
    machineCapacity,
    buckets: serverBuckets,
    date,
    selectedLocation,
    status,
    baseTimes, // NEW — needed for schedule recompute; pass from the parent page
    onLotTransfer, // NEW — optional callback, mirrors LoadingPlanTable.jsx
    onReorder, // NEW — optional callback, mirrors LoadingPlanTable.jsx
    disseminationSummary,
    partnameMismatches,
    unknownPackages,
    recipeMismatches,
    schedulerHistory,
    readOnly = false, // NEW — true disables every write path; see file header
}) {
    // console.log("buckets:", serverBuckets.map(b => [b.id, b.label, b.machine]));
    // console.log("parked rows:", data.filter((r) => r.bucket_id != null));

    const machinesByName = useMemo(
        () => Object.fromEntries(Object.values(serverMachines).map((m) => [m.name, m])),
        [serverMachines],
    );

    const {
        present: { rows: dataRows },
        update,
        undo,
        redo,
        canUndo,
        canRedo
    } = useLoadingPlanStore();
    
    // console.log("LOG ~ Deemo.jsx:871 ~ Deemo ~ bakeLots:", bakeLots);
    // console.log("LOG ~ Deemo.jsx:683 ~ Deemo ~ data:", data);

    const toast = useToast();
    const { mutate: rawMutate } = useMutation();
    const [isRunningScheduler, setIsRunningScheduler] = useState(false);
    const [highlightedMatch, setHighlightedMatch] = useState(null); // { rowId, columnKey }

    const [activePackage, setActivePackage] = useState("LGA");
    const [selectedRows, setSelectedRows] = useState(() => new Set());
    const [selectedBakeRows, setSelectedBakeRows] = useState(() => new Set());
    // console.log("🚀 ~ Deemo ~ selectedRows:", selectedRows)
    const [inFlightCount, setInFlightCount] = useState(0);
    const [, setIsDirty] = useState(false);
    const [statusMenu, setStatusMenu] = useState(null);

    // ── Column width overrides (shrink-to-min resize + the "Columns"
    // visibility modal — see the column-decoration block further down,
    // right after `columns` is built). Persisted across reloads the same
    // way collapsedMachines/collapsedOvens do (localStorage), just as a
    // plain key->width map instead of a Set, since usePersistedSet only
    // handles Sets.
    const [columnWidths, setColumnWidths] = useState(() => {
        if (typeof window === "undefined") return {};
        try {
            const raw = window.localStorage.getItem(COLUMN_WIDTHS_STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    });

    useEffect(() => {
        try {
            window.localStorage.setItem(COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(columnWidths));
        } catch {
            // ignore write errors (private browsing quota, etc.)
        }
    }, [columnWidths]);

    const [collapsedMachines, setCollapsedMachines] = usePersistedSet('collapsedMachines');
    const [collapsedOvens, setCollapsedOvens] = usePersistedSet('collapsedOven');

    const addEntryModalRef = useRef(null);
    const splitHistoryModalRef = useRef(null);
    const mergeHistoryModalRef = useRef(null);
    const pickupInsertModalRef = useRef(null);

    const [selectedDate, setSelectedDate] = useState(new Date(date));
    const [showAllMachines, setShowAllMachines] = useState(false);

    // add-block modal
    const [blockModalMachine, setBlockModalMachine] = useState(null);
    const [blockOption, setBlockOption] = useState("setup");
    const [customLabel, setCustomLabel] = useState("");
    const [customDuration, setCustomDuration] = useState("60");
    const BLOCK_PRESETS = {
        setup: { label: "Setup", duration: 120 },
        config: { label: "Config", duration: 240 },
        conversion: { label: "Conversion", duration: 360 },
    };

    const [placementOfNewEntry, setPlacementOfNewEntry] = useState(null);

    const [isExporting, setIsExporting] = useState(false);

    // console.log("LOG ~ Deemo.jsx:831 ~ Deemo ~ hoveredRow:", hoveredRow);

    function handleInsertRow(rowIdx, position) {
        // position: 'above' | 'below'
        // ...your existing addBlock / createManualLot logic here
    }

    // console.log("LOG ~ Deemo.jsx:782 ~ Deemo ~ rowIdxByElement:", rowIdxByElement);

    const isUpdating = inFlightCount > 0;

    const [staleInfo, setStaleInfo] = useState(null);
    const mutate = useCallback((...args) => rawMutate(...args).catch((err) => {
        const status = err?.status ?? err?.response?.status;
        if (status === 409 || status === 404) setStaleInfo({ message: err?.message });
        throw err;
    }), [rawMutate]);

    const handleRefresh = () => router.reload({ preserveScroll: true, onSuccess: () => setStaleInfo(null) });
    const writesLocked = isUpdating || !!staleInfo;

    const handleDateChange = (newDate) => {
        setSelectedDate(newDate);
        router.get(route(readOnly ? "loading-plan.readonly" : "loading-plan.index"), {
            date: newDate.toISOString().slice(0, 10),
            location: selectedLocation,
        });
    };

    const setLocation = (line) => {
        if (line === selectedLocation) return;
        router.get(
            route(readOnly ? "loading-plan.readonly" : "loading-plan.index"),
            { date, location: line },
            { preserveScroll: true, replace: true },
        );
    };

    const withUpdating = useCallback((maybePromise) => {
        const promise = Promise.resolve(maybePromise);
        setInFlightCount((c) => c + 1);
        return promise.finally(() => setInFlightCount((c) => c - 1));
    }, []);

    // ── Seed the undo store from the `data` prop on mount ──────────────────
    useEffect(() => {
        const seeded = (data ?? []).map((row) => ({
            ...row,
            ...timeFieldsFromDatetimes(row.time_start_at, row.time_end_at, date),
            machine: row.machine ?? null,
            tag: row.tag ?? null,
            doable: row.doable ?? 0,
            remarks: row.remarks ?? "",
            // Compatibility shim — findMachineNeighbors/applyTimeStartEdit
            // key rows off `_dndId` in LoadingPlanTable.jsx; keep the same
            // convention here. See assumptions note at top of file.
            _dndId: row.entry_id
                ? `entry-${row.entry_id}`
                : `${row.id ?? Math.random()}`,
        }));

        useLoadingPlanStore.getState().reset(seeded);
    }, [data]);


    const machines = useMemo(() => {
        return [null, MACHINE_MANUAL, ...serverMachines.map((m) => m.name)];
    }, [serverMachines]);

    const [expandedMachines, setExpandedMachines] = usePersistedSet('expandedMachines');

    const toggleExpandedMachine = useCallback((machine) => {
        setExpandedMachines((prev) => {
            const next = new Set(prev);
            if (next.has(machine)) next.delete(machine);
            else next.add(machine);
            return next;
        });
        setSelectedRows(new Set());
    }, []);

    const [expandedLocations, setExpandedLocations] = usePersistedSet('expandedLocations');

    const toggleExpandedLocation = useCallback((machine) => {
        setExpandedLocations((prev) => {
            const next = new Set(prev);
            if (next.has(machine)) next.delete(machine);
            else next.add(machine);
            return next;
        });
        setSelectedRows(new Set());
    }, []);

    const activePackageGroup = useMemo(() => {
        if (
            activePackage === "Unassigned" ||
            activePackage === ALL_PACKAGES_TAB ||
            activePackage === RES_TAB
        ) return null;

        const group = packageGroups?.[activePackage];
        if (!group) return null;
        return Array.isArray(group) ? group : Object.values(group);
    }, [activePackage, packageGroups]);

    // console.log("LOG ~ Deemo.jsx:1001 ~ Deemo ~ activePackageGroup:", activePackageGroup);

    const toggleMachineCollapsed = useCallback((machine) => {
        setCollapsedMachines((prev) => {
            const next = new Set(prev);
            // `machine` can legitimately be `null` (Unassigned) or "MANUAL"
            // — Set handles those as normal distinct values, no coercion needed.
            if (next.has(machine)) next.delete(machine);
            else next.add(machine);
            return next;
        });

        setSelectedRows(new Set());
    }, []);

    const toggleOvenCollapsed = useCallback((oven) => {
        setCollapsedOvens((prev) => {
            const next = new Set(prev);
            if (next.has(oven)) next.delete(oven);
            else next.add(oven);
            return next;
        });
    }, []);

    const gridRef = useRef(null);

    const clearSelection = useCallback(() => {
        setSelectedRows(new Set());
    }, []);

    const [bucketList, setBucketList] = useState(serverBuckets ?? []);

    useEffect(() => setBucketList(serverBuckets ?? []), [serverBuckets]);
    console.log("LOG ~ Deemo.jsx:550 ~ Deemo ~ bucketList:", bucketList);

    const bucketsByMachine = useMemo(() => {
        const map = new Map();
        bucketList.forEach((b) => {
            const k = b.machine ?? null;
            if (!map.has(k)) map.set(k, []);
            map.get(k).push(b);
        });
        map.forEach((l) => l.sort((a, b) => a.sort_order - b.sort_order));
        return map;
    }, [bucketList]);

    const knownBucketIds = useMemo(() => new Set(bucketList.map((b) => b.id)), [bucketList]);
    // A row counts as parked only if its group still exists; orphans fall back to Unassigned.
    const isParked = useCallback(
        (r) => r.bucket_id != null && knownBucketIds.has(r.bucket_id),
        [knownBucketIds],
    );

    const { parkRows, unparkRows, handleBulkPark, handleBulkUnpark, createBucket, renameBucket, deleteBucket } =
        useBucketOperations({
            store: useLoadingPlanStore, dataRows, selectedRows, update, withUpdating, mutate, toast,
            date, selectedLocation, setIsDirty, clearSelection, setBucketList,
        });

    const clearBakeSelection = useCallback(() => setSelectedBakeRows(new Set()), []);

    // ── Status dropdown (ported from LoadingPlanTable.jsx) ──────────────────
    const handleStatusClick = useCallback(
        (e, entryId) => {
            e.stopPropagation();
            if (readOnly) return; // no status-change menu in read-only mode
            if (writesLocked) return;
            const rect = e.currentTarget.getBoundingClientRect();
            setStatusMenu({ entryId, anchor: e.currentTarget });
        },
        [readOnly, writesLocked],
    );

    const autoSortMachine = async ({ machine }) => {
        try {
            const res = await mutate(
                route("loading-plan.auto-sort", { machine }),
                { method: "POST", body: { scheduled_date: date } },
            );

            const sorted = res.entries ?? [];
            const byEntryId = new Map(sorted.map((r) => [r.entry_id, r]));

            let mismatch = false;
            update((prev) => {
                const slots = [];
                const existingById = new Map();
                prev.forEach((r, i) => {
                    if (r.entry_id != null && byEntryId.has(r.entry_id)) {
                        slots.push(i);
                        existingById.set(r.entry_id, r);
                    }
                });

                if (slots.length !== sorted.length || sorted.some((s) => !existingById.has(s.entry_id))) {
                    mismatch = true;
                    return prev;
                }

                const next = [...prev];
                sorted.forEach((s, i) => {
                    const existing = existingById.get(s.entry_id);
                    next[slots[i]] = {
                        ...existing,
                        ...s,
                        id: existing.id,
                        _dndId: existing._dndId,
                        lock_version: s.lock_version ?? existing.lock_version,
                    };
                });
                return next;
            }, true);

            if (mismatch) {
                router.reload({ preserveScroll: true });
                return true;
            }

            applyAffectedTimings(update, res.affected_timings, date);
            // Auto-sort isn't undoable; drop history so Ctrl+Z can't replay the old order to the server.
            useLoadingPlanStore.getState().reset(useLoadingPlanStore.getState().present.rows);
            return true;
        } catch (err) {
            console.error("Auto sort failed:", err);
            toast?.error?.("Auto sort failed. Nothing was changed.");
            return false;
        }
    };

    const handleAutoSortMachine = ({ machine }) => withUpdating(autoSortMachine({ machine }));

    const handleStatusChange = useCallback(
        (newStatus) => {
            if (readOnly) return;
            const normalizedStatus = newStatus === "NONE" ? null : newStatus;
            const entryId = statusMenu.entryId;
            // entryId here IS a backend entry_id (see handleStatusClick /
            // the status column's onClick, which pass row.entry_id) — so
            // matching against r.entry_id is correct in this handler,
            // unlike the bulk handlers below.
            const row = dataRows.find((r) => r.entry_id === entryId);
            if (!row) return;

            const prevSnapshot = dataRows; // capture before mutating

            update((prev) =>
                prev.map((r) =>
                    r.entry_id === entryId
                        ? { ...r, status: normalizedStatus }
                        : r,
                ),
            );
            setIsDirty(true);
            setStatusMenu(null);

            // return; // stub: skip persisting until backend wired up

            withUpdating(
                mutate(
                    route("loading-plan.entries.update", {
                        id: row.entry_id ?? 0,
                    }),
                    {
                        method: "PATCH",
                        body: {
                            entry_type: isBlockRow(row) ? "block" : "lot",
                            lot_id: row.lot_id,
                            scheduled_date: date,
                            fields: { status: normalizedStatus },
                            lock_version: row.lock_version ?? null,
                        },
                    },
                ),
            )
                .then((entry) => {
                    update((prev) => prev.map((r) =>
                        r.entry_id === entryId ? { ...r, entry_id: entry.id, lock_version: entry.lock_version } : r
                    ), true);
                })
                .catch((err) => {
                    console.error("Status update failed:", err);
                    update(() => prevSnapshot, true); // <- skipHistory, no stack pointer movement
                    toast?.error?.("Couldn't save status change — reverted.");
                });
        },
        [readOnly, statusMenu, update, dataRows, date, withUpdating, mutate, toast],
    );

    const syncServerFields = useLoadingPlanStore.getState().syncServerFields;

    const {
        handleBulkTag,
        handleBulkClearTag,
        handleBulkStatus,
        handleBulkFieldUpdate,
        handleBulkTransfer,
        handleBulkDelete,
        handleRework,
    } = useBulkOperations({
        dataRows,
        selectedRows,
        update,
        withUpdating,
        toast,
        mutate,
        setIsDirty,
        clearSelection,
        date,
        syncServerFields
    });

    const { handleUndo, handleRedo, dataRowsRef } = useUndoRedoSync({
        store: useLoadingPlanStore,
        dataRows,
        baseTimes,
        date,
        mutate,
        update,
        toast,
    });

    // ── Add lot / add block ──────────────────────────────────────────────
    const handleAddRow = useCallback(
        (machine, { partName, packageName, qty, beforeEntryId = null, afterEntryId = null } = {}) => {
            if (readOnly) return Promise.reject(new Error("Read-only view"));
            const trimmedPart = (partName ?? "").trim();
            if (!trimmedPart) return Promise.reject(new Error("Part name is required"));

            const groupPkgs = packagesInGroup(activePackage, packageGroups);
            const resolvedPackage = packageName || groupPkgs[0] || activePackage;
            if (activePackage === ALL_PACKAGES_TAB && !packageName) {
                return Promise.reject(new Error("Pick a package for the new lot"));
            }

            return withUpdating(
                mutate(route("loading-plan.manual-lots.store"), {
                    body: {
                        machine,
                        scheduled_date: date,
                        fields: {
                            part_name: trimmedPart,
                            package_name: resolvedPackage,
                            qty: qty ?? 0,
                        },
                        before_entry_id: beforeEntryId,
                        after_entry_id: afterEntryId,
                    },
                }),
            )
                .then((entry) => {
                    const { affected_timings, ...row } = entry;
                    update((prev) => [...prev, { ...row, _dndId: `entry-${row.entry_id}` }]);
                    applyAffectedTimings(update, affected_timings, date);
                    setIsDirty(true);
                    return entry;
                })
                .catch((err) => {
                    console.error("Failed to create manual lot:", err);
                    toast?.error?.("Couldn't create the new lot — please try again.");
                    throw err;
                });
        },
        [readOnly, activePackage, packageGroups, baseTimes, date, update, withUpdating, mutate, toast],
    );

    const handleAddBlock = useCallback((machine) => {
        if (readOnly) return;
        setBlockOption("setup");
        setCustomLabel("");
        setCustomDuration("60");
        setBlockModalMachine(machine);
        document.getElementById("deemo_add_block_modal")?.showModal();
    }, [readOnly]);

    const saveBlock = useCallback(
        (machine, label, duration, { beforeEntryId = null, afterEntryId = null } = {}) => {
            if (readOnly) return Promise.reject(new Error("Read-only view"));
            return withUpdating(
                mutate(route("loading-plan.blocks.store"), {
                    body: {
                        machine,
                        scheduled_date: date,
                        label: label.trim() || "Time block",
                        duration,
                        before_entry_id: beforeEntryId,
                        after_entry_id: afterEntryId,
                    },
                }),
            )
                .then((entry) => {
                    const { affected_timings, ...row } = entry;
                    update((prev) => [...prev, { ...row, _dndId: `entry-${row.entry_id}` }]);
                    applyAffectedTimings(update, affected_timings, date);
                    setIsDirty(true);
                    return entry;
                })
                .catch((err) => {
                    console.error("Failed to save block:", err);
                    toast?.error?.("Could not save the block — please try again.");
                    throw err;
                });
        },
        [readOnly, baseTimes, date, update, withUpdating, mutate, toast],
    );

    // NOTE: no stub here — this handler never talks to the backend itself
    // (it just builds label/duration and delegates to saveBlock, which
    // has its own stub right before its mutate call). Blanket-returning
    // here would also stop the modal from closing.
    const handleConfirmBlock = useCallback(() => {
        if (readOnly) return;
        let label, duration;
        if (blockOption === "custom") {
            label = customLabel.trim();
            duration = parseInt(customDuration, 10);
            if (!label || !duration || duration <= 0) return;
        } else {
            const preset = BLOCK_PRESETS[blockOption];
            label = preset.label;
            duration = preset.duration;
        }
        saveBlock(blockModalMachine, label, duration);
        document.getElementById("deemo_add_block_modal")?.close();
    }, [
        readOnly,
        blockOption,
        customLabel,
        customDuration,
        blockModalMachine,
        saveBlock,
    ]);

    // const handleAddEntry = useCallback(
        // async () => {

        // },
        // [],
    // );

     // ── Split / merge ────────────────────────────────────────────────────
    const {
        splitHistoryData,
        mergeHistoryData,
        currentLotRole,
        historyLoading,
        loadSplitHistory,
        loadMergeHistory,
        revertSplit,
        revertMerge,
        mergeRows,
        splitRow,
        currentLotId: currentLotIdForSplitMergeHistory,
    } = useSplitMergeOperations({ dataRows, update, withUpdating, mutate, date, toast, setIsDirty, syncServerFields });

    const handleShowSplitHistory = useCallback(
        (rootLotId, isParent, isChild, lotId) =>
            loadSplitHistory(rootLotId, isParent, isChild, {
                onOpen: () => splitHistoryModalRef.current?.showModal(),
                onError: () => splitHistoryModalRef.current?.close(),
                lotId,
            }),
        [loadSplitHistory],
    );

    const handleShowMergeHistory = useCallback(
        (targetLotId, isParent, isChild, lotId) =>
            loadMergeHistory(targetLotId, isParent, isChild, {
                onOpen: () => mergeHistoryModalRef.current?.showModal(),
                onError: () => mergeHistoryModalRef.current?.close(),
                lotId,
            }),
        [loadMergeHistory],
    );

    const handleSplitRevert = useCallback(
        (args) => revertSplit(args, { onDone: () => splitHistoryModalRef.current?.close() }),
        [revertSplit],
    );

    const handleMergeRevert = useCallback(
        (args) => revertMerge(args, { onDone: () => mergeHistoryModalRef.current?.close() }),
        [revertMerge],
    );

    // ── Aggregates ───────────────────────────────────────────────────────
    const machinePlatform = useMemo(() => {
        const map = new Map();
        serverMachines.forEach((m) => map.set(m.name, m.platform));
        return map;
    }, [serverMachines]);

    const rawColumns = useMemo(
        () => makeColumns(writesLocked, handleStatusClick, toggleMachineCollapsed, highlightedMatch, selectedLocation),
        [writesLocked, handleStatusClick, toggleMachineCollapsed, highlightedMatch, selectedLocation],
    );
    const columns = useMemo(
        () => (readOnly ? toReadOnlyColumns(rawColumns) : rawColumns),
        [readOnly, rawColumns],
    );

    // ── Column shrink-to-min resize + visibility toggle ───────────────────
    // Only the real data columns (DATA_COLUMNS) get width overrides / the
    // collapsed hint — the leading SelectColumn (checkbox) and dragHandle
    // (grip) columns are structural, not user data, and are left alone.
    const dataColumnKeys = useMemo(() => new Set(DATA_COLUMNS.map((c) => c.key)), []);

    // Double-click a header to pop that column back to its default width
    // (handy after shrinking/hiding it down to the MIN_COLUMN_WIDTH sliver).
    const handleHeaderDoubleClick = useCallback((columnKey) => {
        setColumnWidths((prev) => {
            if (!(columnKey in prev)) return prev;
            const next = { ...prev };
            delete next[columnKey];
            return next;
        });
    }, []);

    // Feed the grid our widths so it has no private copy to disagree with.
    const gridColumnWidths = useMemo(
        () =>
            new Map(
                Object.entries(columnWidths).map(([key, width]) => [
                    key,
                    { type: "resized", width },
                ]),
            ),
        [columnWidths],
    );

    // The grid reports drag-resizes here as a full Map.
    const handleColumnWidthsChange = useCallback(
        (next) => {
            setColumnWidths((prev) => {
                const out = { ...prev };
                let changed = false;
                next.forEach((entry, key) => {
                    if (!dataColumnKeys.has(key) || entry.type !== "resized") return;
                    const w = Math.max(MIN_COLUMN_WIDTH, entry.width);
                    if (out[key] !== w) { out[key] = w; changed = true; }
                });
                return changed ? out : prev;
            });
        },
        [dataColumnKeys],
    );

    // Toggle a column between its default width and the collapsed sliver.
    // Used by the "Columns" visibility modal below. "Hidden" and "shrunk to
    // the smallest resize size" are deliberately the same underlying state,
    // so a column hidden from the modal still shows the same thin hint the
    // manual-drag-to-shrink path leaves behind — nothing disappears outright.
    const toggleColumnVisibility = useCallback(
        (key) => {
            setColumnWidths((prev) => {
                const col = columns.find((c) => c.key === key);
                const currentWidth = prev[key] ?? col?.width ?? 120;
                const isHidden = currentWidth <= COLLAPSE_HINT_THRESHOLD;
                const next = { ...prev };
                if (isHidden) {
                    delete next[key];
                } else {
                    next[key] = MIN_COLUMN_WIDTH;
                }
                return next;
            });
        },
        [columns],
    );

    // Wraps `columns` with the width overrides + collapsed-hint styling
    // above. This is what actually gets passed to the main <DataGrid />.
    const decoratedColumns = useMemo(() => {
        return columns.map((col) => {
            if (!col.key || !dataColumnKeys.has(col.key)) return col; // leave checkbox/grip columns untouched
            const width = columnWidths[col.key];
            const isCollapsed = width !== undefined && width <= COLLAPSE_HINT_THRESHOLD;
            const OriginalHeader = col.renderHeaderCell;

            return {
                ...col,
                width: width ?? col.width,
                minWidth: MIN_COLUMN_WIDTH,
                maxWidth: isCollapsed ? MIN_COLUMN_WIDTH : col.maxWidth,
                resizable: col.resizable ?? true,
                headerCellClass: clsx(col.headerCellClass, isCollapsed && "bg-warning/20"),
                cellClass: (row) =>
                    clsx(
                        typeof col.cellClass === "function" ? col.cellClass(row) : col.cellClass,
                        isCollapsed && "!p-0 overflow-hidden bg-warning/5",
                    ),
                renderHeaderCell: (props) => (
                    <div
                        className="h-full w-full flex items-center overflow-hidden select-none"
                        onDoubleClick={() => handleHeaderDoubleClick(col.key)}
                        title={
                            isCollapsed
                                ? `${col.name ?? col.key} — collapsed, double-click to restore`
                                : undefined
                        }
                    >
                        {isCollapsed ? (
                            <span className="mx-auto w-1 h-3.5 rounded-full bg-warning" />
                        ) : OriginalHeader ? (
                            OriginalHeader(props)
                        ) : (
                            <span className="truncate px-1 text-xs">{props.column.name}</span>
                        )}
                    </div>
                ),
            };
        });
    }, [columns, columnWidths, dataColumnKeys, handleHeaderDoubleClick]);

    const rawBakeColumns = useMemo(
        () => makeBakeColumns(highlightedMatch, toggleOvenCollapsed),
        [highlightedMatch, toggleOvenCollapsed],
    );
    const bakeColumns = useMemo(
        () => (readOnly ? toReadOnlyColumns(rawBakeColumns) : rawBakeColumns),
        [readOnly, rawBakeColumns],
    );

    const machineTotalDoable = useMemo(() => {
        const result = {};
        dataRows.forEach((r) => {
            if (!r.machine || !hasTimeline(r.machine)) return;
            if (isBlockRow(r)) return;
            result[r.machine] =
                (result[r.machine] || 0) + (Number(r.doable) || 0);
        });
        return result;
    }, [dataRows]);

    const machineTotalQuantity = useMemo(() => {
        const result = {};
        dataRows.forEach((r) => {
            if (!r.machine || !hasTimeline(r.machine)) return;
            if (isBlockRow(r)) return;
            result[r.machine] = (result[r.machine] || 0) + (Number(r.qty) || 0);
        });
        return result;
    }, [dataRows]);

    const isOtherLoc = useCallback(
        (r) => !isBlockRow(r) && r.location != null && r.location !== selectedLocation,
        [selectedLocation],
    );

    const rowInActiveTabOwn = useCallback((r) => {          // your current rowInActiveTab body
        if (activePackage === RES_TAB) return isResRow(r);
        if (isResRow(r)) return false;
        if (activePackage === ALL_PACKAGES_TAB) return true;
        return (activePackageGroup ?? []).includes(r.package_name);
    }, [activePackage, activePackageGroup]);

    const rowInActiveTab = useCallback((r) => {
        if (r.machine !== null && r.machine !== MACHINE_MANUAL && isOtherLoc(r)) return false; // lives in the "other location" group
        return rowInActiveTabOwn(r);
    }, [isOtherLoc, rowInActiveTabOwn]);

    const otherLocationCounts = useMemo(() => {
        const result = {};
        dataRows.forEach((r) => {
            if (r.machine === null || isBlockRow(r) || isParked(r) || !isOtherLoc(r)) return;
            result[r.machine] = (result[r.machine] ?? 0) + 1;
        });
        return result;
    }, [dataRows, isParked, isOtherLoc]);

    // ── Migrated from LoadingPlanTable.jsx: otherPackageCounts ─────────────
    // How many rows sit on a machine but are hidden by the current package
    // tab (they belong to some OTHER package group). Unassigned ignores the
    // package filter entirely (see displayRows below), so it's never
    // counted here — same contract as LoadingPlanTable.jsx.
    const otherPackageCounts = useMemo(() => {
        const result = {};
        dataRows.forEach((r) => {
            if (r.machine === null) return;
            if (isBlockRow(r) || isParked(r) || isOtherLoc(r)) return;
            if (rowInActiveTab(r)) return;
            result[r.machine] = (result[r.machine] ?? 0) + 1;
        });
        return result;
    }, [dataRows, rowInActiveTab, isParked, isOtherLoc]);

    const machineSectionDoable = useMemo(() => {
        const result = {};
        dataRows.forEach((r) => {
            if (!r.machine || !hasTimeline(r.machine)) return;
            if (isBlockRow(r) || isParked(r)) return;
            if (!rowInActiveTab(r)) return;
            result[r.machine] = (result[r.machine] || 0) + (Number(r.doable) || 0);
        });
        return result;
    }, [dataRows, rowInActiveTab, isParked]);

    const bakeOvens = useMemo(() => {
        const set = new Set((bakeLots ?? []).map((r) => r.oven_num));
            return Array.from(set).sort((a, b) => {
                const an = Number(a), bn = Number(b);
                if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
                return String(a).localeCompare(String(b));
            });
    }, [bakeLots]);

    const bakeDisplayRows = useMemo(() => {
        return bakeOvens.flatMap((oven) => {
            const rowsForOven = (bakeLots ?? [])
                .filter((r) => r.oven_num === oven)
                .map((r) => ({ ...r, __type: "data" }));

            const isCollapsed = collapsedOvens.has(oven);

            const headerRow = {
                id: `bake-header-${oven}`,
                __type: "header",
                ovenLabel: oven,
                __rowCount: rowsForOven.length, // total count, shown even while collapsed
                __isCollapsed: isCollapsed,
                isLocked: true,
            };

            if (isCollapsed) return [headerRow];

            return [headerRow, ...rowsForOven];
        });
    }, [bakeOvens, bakeLots, collapsedOvens]);

    // stub handlers — wire these up once the real bulk actions are defined
    const handleBakeApprove = useCallback(() => {
    }, [selectedBakeRows]);

    const handleBakeReprocess = useCallback(() => {
    }, [selectedBakeRows]);

    const handleBakeExport = useCallback(() => {
    }, [selectedBakeRows]);

    const handleBakeDelete = useCallback(() => {
        setSelectedBakeRows(new Set());
    }, [selectedBakeRows]);

    // Standalone source of truth for which sections render.
    //
    //  - "Unassigned" package tab: a single synthetic section aggregating
    //    every machine === null row across ALL packages (bake is excluded
    //    automatically since bake rows never live in dataRows to begin
    //    with — they come from the separate `bakeLots` prop).
    //  - Every other tab: Unassigned + MANUAL are always shown (pinned
    //    first), regardless of whether they currently hold any rows — same
    //    contract as LoadingPlanTable.jsx. A real machine section only
    //    renders once it has at least one actual LOT on it for the active
    //    package — a machine holding nothing but block rows (setup/config/
    //    conversion, no lots) is hidden entirely on that tab, the same way
    //    an empty machine already was.
    const displayRows = useMemo(() => {
        const isAll = activePackage === ALL_PACKAGES_TAB;

        // Group headers (+ their lots) that belong under `machineKey`
        // (null = top-level groups, shown with the Unassigned section).
        const bucketSections = (machineKey, isVisible) =>
            (bucketsByMachine.get(machineKey) ?? []).flatMap((bucket) => {
                const key = `bucket:${bucket.id}`; // string, can't collide with machine names
                const rows = dataRows
                    .filter((r) => r.bucket_id === bucket.id && isVisible(r))
                    .sort((a, b) => (a.bucket_position ?? 0) - (b.bucket_position ?? 0));

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

                return header.__isCollapsed
                    ? [header]
                    : [header, ...rows.map((r) => ({ ...r, __type: "data" }))];
            });

        // ── "Unassigned" tab: every unplanned, non-parked lot across all packages ──
        if (activePackage === "Unassigned") {
            const rowsForMachine = dataRows.filter(
                (r) => r.machine === null && !isResRow(r) && !isParked(r) && !isOtherLoc(r)
            );
            const isCollapsed = collapsedMachines.has(null);

            const headerRow = {
                id: "header-unassigned-all",
                __type: "header",
                machine: null,
                machineLabel: "Unassigned",
                platform: undefined,
                __rowCount: rowsForMachine.length,
                __lotCount: rowsForMachine.filter((r) => !isBlockRow(r)).length,
                otherPackageCount: 0,
                __isCollapsed: isCollapsed,
                isLocked: true,
            };

            return [
                headerRow,
                ...(isCollapsed ? [] : rowsForMachine.map((r) => ({ ...r, __type: "data" }))),
                ...bucketSections(null, (r) => !isResRow(r)), // groups stay visible when collapsed
            ];
        }

        // ── Every other tab ──
        const visible = (r) => rowInActiveTab(r);

        const machineSections = machines.flatMap((m) => {
            const isUnassigned = m === null;
            const isManual = m === MACHINE_MANUAL;
            const canCollapse = !isUnassigned && !isManual;
            const showAll = canCollapse && expandedMachines.has(m);
            const showLoc = !canCollapse || expandedLocations.has(m);

            if (isManual && activePackage !== "MANUAL" && !isAll) return [];

            const machineRows = dataRows.filter(
                (r) => r.machine === m && !isParked(r) && !(isUnassigned && isOtherLoc(r)),
            );
            const hiddenKind = (r) => {
                if (isBlockRow(r)) return null;
                if (isOtherLoc(r)) return showLoc ? null : "location";
                return showAll || rowInActiveTabOwn(r) ? null : "package";
            };
            const matchingLots = machineRows.filter(
                (r) => !isBlockRow(r) && !isOtherLoc(r) && rowInActiveTabOwn(r),
            ).length;

            // Walk in dataRows order (the local order after a drag is the truth).
            // Consecutive hidden rows collapse into one display-only row.
            const shown = [];
            let run = [];
            let runKind = null;
            const flushRun = () => {
                if (!run.length) return;
                const first = run[0];
                const last = run[run.length - 1];
                shown.push({
                    id: `collapsed-${first.id}`,
                    __type: "collapsed",
                    __kind: runKind,                       // "package" | "location"
                    isLocked: true,
                    machine: m,
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

            machineRows.forEach((r) => {
                const kind = hiddenKind(r);
                if (!kind) {
                    flushRun();
                    shown.push({ ...r, __type: "data" });
                } else if (canCollapse) {
                    if (runKind && runKind !== kind) flushRun(); // package and location runs never merge
                    runKind = kind;
                    run.push(r);
                } // Unassigned / MANUAL: hidden rows are dropped, as before
            });
            flushRun();

            const dataShown = shown.filter((r) => r.__type === "data");
            const lotCount = dataShown.filter((r) => !isBlockRow(r)).length;

            const parked = isUnassigned ? [] : bucketSections(m, showAll ? () => true : visible);
            const parkedCount = parked.filter((r) => r.__type === "data").length;

            if (matchingLots === 0 && parkedCount === 0 && canCollapse) return [];

            const isCollapsed = collapsedMachines.has(m);

            const headerRow = {
                id: `header-${m ?? "unassigned"}`,
                __type: "header",
                machine: m,
                machineLocation: machinesByName[m]?.location,
                machineId: machinesByName[m]?.id,
                machineLabel: isUnassigned ? "Unassigned" : isManual ? "MANUAL" : m,
                platform: machinePlatform.get(m),
                __rowCount: dataShown.length,
                __lotCount: lotCount,
                otherPackageCount: isUnassigned ? 0 : (otherPackageCounts[m] ?? 0),
                __isCollapsed: isCollapsed,
                isLocked: true,
            };

            if (isCollapsed) return [headerRow];
            return [headerRow, ...shown, ...parked];
        });

        // Top-level groups (Anticipate, Upcoming, ...) go below every machine.
        return [...machineSections, ...bucketSections(null, visible)];
    }, [
        isOtherLoc,
        rowInActiveTabOwn,
        activePackage,
        machines,
        dataRows,
        rowInActiveTab,
        expandedMachines,
        isParked,
        machinesByName,
        machinePlatform,
        otherPackageCounts,
        collapsedMachines,
        bucketsByMachine,
        expandedLocations,
    ]);

    const collapsedRunsById = useMemo(
        () => new Map(displayRows.filter((r) => r.__type === "collapsed").map((r) => [r.id, r])),
        [displayRows],
    );

    const historyModalRef = useRef(null);
    const [historyEntryId, setHistoryEntryId] = useState(null);

    async function handleExport() {
      setIsExporting(true);
      try {
        const buffer = await exportLoadingPlanToExcel({
          dataRows,
          machines,
          packageGroups: packageGroups,
          columns: DATA_COLUMNS,
          isBlockRow,
          getMachineLabel: (m) => (m === null ? "Unassigned" : m === MACHINE_MANUAL ? "MANUAL" : m),
        });
        downloadExcelBuffer(buffer, `loading_plan_${new Date().toISOString().slice(0, 10)}.xlsx`);
      } finally {
        setIsExporting(false);
      }
    }
    // async function handleExport() {
    //     setIsExporting(true);
    //     try {
    //         const groups = buildExportGroups(dataRows, machines);
    //         const buffer = await exportLoadingPlanToExcel({ groups, columns: DATA_COLUMNS });
    //         downloadExcelBuffer(buffer, `loading_plan_${new Date().toISOString().slice(0, 10)}.xlsx`);
    //     } finally {
    //         setIsExporting(false);
    //     }
    // }


    const stickyMachine = useStickyGroupHeader(displayRows, gridRef);

    const stickyOven = useStickyGroupHeader(bakeDisplayRows, gridRef);

    // Deemo always renders a machine section once it has rows (see
    // displayRows above) — "idle" here just means a real machine from
    // serverMachines with zero rows currently assigned to it, so it never
    // got a header row in displayRows at all.
    const idleMachines = useMemo(() => {
        const rendered = new Set(
            displayRows
                .filter((r) => r.__type === "header")
                .map((r) => r.machine),
        );
        return machines.filter(
            (m) => m !== null && m !== MACHINE_MANUAL && !rendered.has(m),
        );
    }, [displayRows, machines]);

    const hiddenColumnKeys = useMemo(
        () => new Set(
            Object.entries(columnWidths)
                .filter(([, w]) => w <= COLLAPSE_HINT_THRESHOLD)
                .map(([k]) => k),
        ),
        [columnWidths],
    );

    const goToTab = useCallback((pkg) => {
        setActivePackage(pkg);
        clearSelection();
        clearBakeSelection();
    }, [clearSelection, clearBakeSelection]);

    const search = useTableSearch({
        activePackage, setActivePackage: goToTab,
        dataRows, bakeLots, displayRows, bakeDisplayRows,
        columns, bakeColumns, rowInActiveTab, isParked, bucketList,
        collapsedMachines, setCollapsedMachines,
        collapsedOvens, setCollapsedOvens,
        hiddenColumnKeys, setHighlightedMatch, gridRef,
    });

    const { openSearch, closeSearch, searchOpen } = search;
    
    useEffect(() => {
        const onKey = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
                if (document.querySelector("dialog[open]")) return;
                e.preventDefault();
                openSearch();
                return;
            }
            if (e.key === "Escape") {
                if (searchOpen) { closeSearch(); return; }
                clearSelection();
            }
            if (readOnly) return; // no undo/redo/select-all in read-only mode
            if (e.ctrlKey || e.metaKey) {
                const k = e.key.toLowerCase();
                if (k === "z" && !e.shiftKey) {
                    e.preventDefault();
                    handleUndo();
                } else if (k === "y" || (k === "z" && e.shiftKey)) {
                    e.preventDefault();
                    handleRedo();
                }
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [readOnly, openSearch, closeSearch, searchOpen, handleUndo, handleRedo, clearSelection]);

    const handleRowsChange = useCellEditPersistence({
        dataRows,
        displayRows,
        baseTimes,
        date,
        update,
        withUpdating,
        mutate,
        toast,
        setIsDirty,
        syncServerFields
    });

    const handleBulkDeleteNotice = useCallback(() => {
        const selected = dataRows.filter((r) => selectedRows.has(r.id));
        const parked = selected.filter((r) => isParked(r));
        const rest = selected.filter((r) => !isParked(r));

        if (parked.length) {
            unparkRows(parked); // same call the drag path uses (onUnpark)
        }
        if (rest.length) {
            const returned = rest.filter((r) => r.entry_id && !isBlockRow(r) && !r.is_rework && isOtherLoc(r));
            handleBulkDelete();
            if (returned.length) {
                const locs = [...new Set(returned.map((r) => r.location))].join("/");
                toast?.info?.(`${returned.length} lot(s) will return to ${locs} Unassigned. Not visible under ${selectedLocation}.`);
            }
        }
    }, [dataRows, selectedRows, isParked, unparkRows, isOtherLoc, handleBulkDelete, toast, selectedLocation]);

    
    const blockOtherLocPark = useCallback((rows) => {
        const bad = rows.filter(isOtherLoc);
        if (!bad.length) return false;
        toast?.error?.(`${bad[0].location} lots can't be put in a ${selectedLocation} group. Groups are per location.`);
        return true;
    }, [isOtherLoc, toast, selectedLocation]);

    const safeParkRows = useCallback((lots, ...rest) => (blockOtherLocPark(lots) ? undefined : parkRows(lots, ...rest)), [blockOtherLocPark, parkRows]);
    const safeBulkPark = useCallback((...a) => (blockOtherLocPark(dataRows.filter((r) => selectedRows.has(r.id))) ? undefined : handleBulkPark(...a)), [blockOtherLocPark, dataRows, selectedRows, handleBulkPark]);

    const {
        sensors,
        collisionDetection,
        hoveredRowId,
        draggedRow,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
        draggedCount,
        handleDragCancel,
    } = useDragReorder({
        selectedRows,
        displayRows,
        onUnassign: handleBulkDeleteNotice,
        store: useLoadingPlanStore,
        onUnpark: unparkRows,
        onPark: safeParkRows, 
        collapsedRunsById,
        dataRows,
        update,
        withUpdating,
        mutate,
        date,
        onReorder,
        onLotTransfer,
        toast,
        clearSelection,
        setIsDirty,
        syncServerFields,
        selectedLocation
    });

    const rowClass = useCallback(
        (row) => {
            const isData = row.__type === "data";
            const scm = isData && row.is_scm && !selectedRows.has(row.id) ? "bg-error/25" : "";

            const other = isData && isOtherLoc(row) ? "bg-secondary/10" : "";
            const rowDropId = `row-${row.id}`;
            if (!readOnly && hoveredRowId === rowDropId)
                return "bg-pink-500 relative drop-target-row";
            if (row.__headerKind === "bucket")
                return "text-xs border-t-2 border-info/50 flex machine-header-row";
            if (row.__type === "header")
                return "text-xs border-t-4 border-yellow-500 flex machine-header-row";
            if (isBlockRow(row) && !selectedRows.has(row.id))
                return "block-row-bg border-l-4 border-warning/60";
            if (row.is_rework && !selectedRows.has(row.id))
                return clsx("border-l-4 border-info/60", scm || other);
            console.log("LOG ~ Deemo.jsx:1555 ~ Deemo ~ scm:", scm); //
            return clsx(scm || other) || undefined;
        },
        [readOnly, hoveredRowId, selectedRows, isOtherLoc],
    );

    const [bucketModalMachine, setBucketModalMachine] = useState(null);
    const [bucketLabel, setBucketLabel] = useState("");
    const handleAddBucket = useCallback((machine) => {
        setBucketModalMachine(machine);
        setBucketLabel("");
        document.getElementById("add_bucket_modal")?.showModal();
    }, []);

    const [autoSortModalMachine, setAutoSortModalMachine] = useState(null);
    const handleAutoSort = useCallback((machine) => {
        setAutoSortModalMachine(machine);
        document.getElementById("auto_sort_modal")?.showModal();
    }, []);

    const tableInteractionValue = useMemo(
        () => ({
            serverMachines,
            machineCapacity,
            machineTotalDoable,
            machineTotalQuantity,
            otherPackageCounts,
            onAddRow: readOnly ? undefined : handleAddRow,
            onAddBlock: readOnly ? undefined : handleAddBlock,
            onAddBucket: readOnly ? undefined : handleAddBucket,
            onAutoSort: readOnly ? undefined : handleAutoSort,
            onRenameBucket: readOnly ? undefined : renameBucket,
            onDeleteBucket: readOnly ? undefined : deleteBucket,
            isUpdating: writesLocked,
            expandedMachines,
            onToggleExpandOthers: toggleExpandedMachine,
            machineSectionDoable,
            otherLocationCounts,
            expandedLocations,
            onToggleExpandLocations: toggleExpandedLocation,
        }),
        [
            serverMachines,
            readOnly,
            expandedMachines,
            toggleExpandedMachine,
            handleAddBucket,
            handleAutoSort,
            renameBucket,
            deleteBucket,
            machineCapacity,
            machineTotalDoable,
            machineTotalQuantity,
            otherPackageCounts,
            handleAddRow,
            handleAddBlock,
            writesLocked,
            machineSectionDoable,
            otherLocationCounts, 
            expandedLocations, 
            toggleExpandedLocation,
        ],
    );

    const {
        containerRef,
        buttonsRef,
        historyButtonRef,
        rowIdxByElement,
        hoveredRow,
        lastHoveredRow,
        handleButtonsPointerLeave,
        handleGridScroll,
    } = useRowHoverInsert(displayRows);

    const hoveredRowData = displayRows[hoveredRow?.rowIdx] ?? null;
    const isInsertRowButtonVisible = !readOnly && hoveredRowData && hoveredRowData?.machine !== null && hoveredRowData?.__type === "data" && !writesLocked;
    const isHistoryButtonVisible = hoveredRowData && hoveredRowData.__type === "data" && hoveredRowData.entry_id;

    const tableActionsValue = useMemo(
        () => ({
            handleStatusClick,
            handleShowHistory: readOnly ? () => {} : handleShowSplitHistory,
            handleShowMergeHistory: readOnly ? () => {} : handleShowMergeHistory,
            // handleCellClick,
            // selectedIds,
            // handleRowSelect,
            writesLocked,
            isUpdating: writesLocked,
            // anchorIdRef,
        }),
        [
            readOnly,
            handleStatusClick,
            handleShowSplitHistory,
            handleShowMergeHistory,
            // handleCellClick,
            // selectedIds,
            // handleRowSelect,
            writesLocked,
        ],
    );

    return (
        <div
            className="bg-base-100"
            style={{ padding: 24, minHeight: "90vh" }}
        >
            <SavingCursorBadge active={isUpdating} />
            
            <EntryHistoryModal
                ref={historyModalRef}
                entryId={historyEntryId}
                onClose={() => historyModalRef.current?.close()}
            />

            {!readOnly && (
                <PickupInsertModal
                    ref={pickupInsertModalRef}
                    // lotA={selectedRows[0]}
                    // lotB={selectedRows[1]}
                    // onConfirm={({ targetLotEntryId, sourceLotEntryId }) =>
                    //     onMergeRows({ targetLotEntryId, sourceLotEntryId })
                    // }
                    onClose={() => pickupInsertModalRef.current?.close()}
                />
            )}

            <div className="flex-none pt-4">
                <div className="flex flex-col">
                    {/* Row 1: date/status (left) — selection info, undo/redo, integrity (right) */}
                    <div className="flex flex-wrap items-end justify-between gap-2">
                        <div className="flex gap-2 items-center">
                            <DateNav
                                selected={selectedDate}
                                onChange={handleDateChange}
                                isNoFuture
                            />
                            {readOnly && (
                                <span className="badge badge-ghost badge-sm">Read-only</span>
                            )}
                            {status && status !== "ok" && (
                                <div className="flex text-sm py-0 px-2 alert alert-error alert-soft">
                                    <GoAlert size={16} />
                                    <div role="alert">
                                        {getStatusMessage(date, status)}
                                    </div>
                                    {!readOnly && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                router.get(route("import.index"))
                                            }
                                            className="btn p-0 btn-link"
                                        >
                                            Go to Import
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center">
                            {isUpdating ? (
                                <span className="flex items-center gap-1.5 text-xs text-info">
                                    <span className="loading loading-spinner loading-xs" />{" "}
                                    Saving…
                                </span>
                            ) : !readOnly && selectedRows.size > 0 ? (
                                <span className="flex items-center gap-1.5 text-xs text-info whitespace-nowrap">
                                    {selectedRows.size} row
                                    {selectedRows.size !== 1 ? "s" : ""}{" "}
                                    selected
                                    <button
                                        onClick={clearSelection}
                                        className="underline underline-offset-2"
                                    >
                                        Deselect all
                                    </button>
                                </span>
                            ) : null}

                            {!readOnly && (
                                <>
                                    <div className="w-px h-4 bg-base-300 mx-1" />

                                    <button
                                        onClick={handleUndo}
                                        disabled={!canUndo() || writesLocked}
                                        className={clsx(
                                            "btn btn-ghost px-2 py-1 text-xs rounded border border-base-300 text-base-content/60 disabled:opacity-30 hover:bg-base-200",
                                            interactiveCursorClasses(!canUndo() || writesLocked),
                                        )}
                                        title="Undo (Ctrl+Z)"
                                    >
                                        ↩ Undo
                                    </button>
                                    <button
                                        onClick={handleRedo}
                                        disabled={!canRedo() || writesLocked}
                                        className={clsx(
                                            "btn btn-ghost px-2 py-1 text-xs rounded border border-base-300 text-base-content/60 disabled:opacity-30 hover:bg-base-200",
                                            interactiveCursorClasses(!canRedo() || writesLocked),
                                        )}
                                        title="Redo (Ctrl+Y)"
                                    >
                                        ↪ Redo
                                    </button>
                                </>
                            )}

                            <div className="w-px h-4 bg-base-300 mx-1" />
                            
                            <div className="flex gap-2">
                                <Link href="/loading-plan/settings" className="btn btn-sm">
                                    <BsGear size={16} /> <span>Settings</span>
                                </Link>

                                <button className="btn btn-sm" onClick={handleExport} disabled={isExporting}>
                                    {isExporting ? "Exporting…" : "Export to Excel"}
                                </button>

                                <button
                                    className="btn btn-sm"
                                    onClick={() =>
                                        document
                                            .getElementById("column_visibility_modal")
                                            ?.showModal()
                                    }
                                    title="Show/hide columns"
                                >
                                    Columns
                                    {Object.values(columnWidths).some(
                                        (w) => w <= COLLAPSE_HINT_THRESHOLD,
                                    ) && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-warning ml-1" />
                                    )}
                                </button>

                                {!readOnly && (
                                    <button
                                        className="btn btn-sm"
                                        onClick={() => document.getElementById("scheduler_run_modal")?.showModal()}
                                        title="Run scheduler / view history"
                                    >
                                        Scheduler
                                        {schedulerHistory?.[0]?.status === "error" && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-error ml-1" />
                                        )}
                                    </button>
                                )}

                                {status && status !== "not_imported" && (
                                    <button
                                        className="btn btn-sm rounded-box btn-secondary"
                                        onClick={() =>
                                            document
                                                .getElementById(
                                                    DATA_INTEGRITY_MODAL_ID,
                                                )
                                                ?.showModal()
                                        }
                                    >
                                        Data Integrity
                                        <TabBadge
                                            count={
                                                partnameMismatches !== undefined &&
                                                unknownPackages !== undefined &&
                                                recipeMismatches !== undefined
                                                    ? partnameMismatches.length +
                                                    unknownPackages.length +
                                                    recipeMismatches.length
                                                    : undefined
                                            }
                                            tone="warning"
                                        />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Row 2: package tabs (left) — dissemination / production line / idle machines (right) */}
                    <div className="flex flex-wrap justify-between gap-2">
                        <ScrollableTabs
                            items={[
                                "Unassigned",
                                ALL_PACKAGES_TAB,
                                RES_TAB,
                                ...packageGroupNames,
                                { value: "Bake", label: "Bake", icon: <PiOvenDuotone size={20} /> },
                            ]}
                            active={activePackage}
                            onChange={(pkg) => goToTab(pkg)}
                            storageKey="loadingPlan:packageTabs:active"
                        />

                        <div className="flex items-end mb-1 gap-2">
                            <fieldset className="fieldset rounded-box pb-2 px-2">
                                <legend className="fieldset-legend text-[11px] px-1">
                                    Production Line
                                </legend>
                                <div className="join h-2 items-center">
                                    {["PL1", "PL6"].map((line) => (
                                        <button
                                            key={line}
                                            type="button"
                                            disabled={writesLocked}
                                            onClick={() => setLocation(line)}
                                            className={clsx(
                                                "btn btn-xs join-item",
                                                selectedLocation === line
                                                    ? "btn-primary"
                                                    : "btn-dash opacity-60",
                                                interactiveCursorClasses(
                                                    writesLocked,
                                                ),
                                            )}
                                        >
                                            {line}
                                        </button>
                                    ))}
                                </div>
                            </fieldset>

                            <button
                                className="btn btn-sm rounded-box btn-secondary"
                                onClick={() =>
                                    document
                                        .getElementById(DISSEMINATION_MODAL_ID)
                                        ?.showModal()
                                }
                            >
                                <span>{disseminationSummary?.summary?.saved}</span>
                                <span>
                                    {disseminationSummary?.unplaced?.length}
                                </span>
                            </button>

                            <button className="btn btn-sm z-50" onClick={() => search.openSearch()}>
                                <BsSearch size={16} />
                            </button>
                            
                            {!readOnly && (
                                <button
                                    className="btn btn-sm z-50"
                                    onClick={() => {
                                        pickupInsertModalRef.current?.showModal();
                                    }}
                                >
                                    Schedule Pickups
                                </button>
                            )}

                            {/* {idleMachines.length > 0 && (
                                <fieldset className="fieldset bg-base-100 border-base-300 rounded-box border py-1 px-2">
                                    <legend className="fieldset-legend text-[11px] px-1">
                                        Idle machines
                                    </legend>
                                    <label className="h-2 label gap-2 text-[11px] text-base-content/60 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="toggle toggle-xs"
                                            checked={showAllMachines}
                                            onChange={() =>
                                                setShowAllMachines((v) => !v)
                                            }
                                        />
                                        Show {idleMachines.length} idle machine
                                        {idleMachines.length !== 1 ? "s" : ""}
                                    </label>
                                </fieldset>
                            )} */}
                        </div>
                    </div>
                </div>
            </div>

            <TableActionsContext.Provider value={tableActionsValue}>
                <TableInteractionContext.Provider
                    value={tableInteractionValue}
                >
                    <div style={{ position: "relative" }}>
                        {search.searchOpen && (
                            <SearchBar
                                query={search.searchQuery}
                                onQueryChange={search.setSearchQuery}
                                matchCount={search.matchCount}
                                matchIndex={search.searchMatchIndex}
                                onNext={search.findNext}
                                elsewhere={search.elsewhere}
                                onGoElsewhere={search.goElsewhere}
                                onPrev={search.findPrev}
                                onClose={search.closeSearch}
                                inputRef={search.searchInputRef}
                            />
                        )}
                        {activePackage === "Bake" ? (
                            <div className="border-none" style={{ position: "relative" }}>
                                {staleInfo && !readOnly && (
                                    <div role="alert" className="alert alert-warning alert-soft my-2 flex justify-between">
                                        <span>Someone changed this plan after you loaded it. Your last change may have been reverted. Refresh to get the latest rows before editing.</span>
                                        <button className="btn btn-sm btn-warning" onClick={handleRefresh}>Refresh</button>
                                    </div>
                                )}

                                <DataGrid
                                    ref={gridRef}
                                    columns={bakeColumns}
                                    rows={bakeDisplayRows}
                                    rowKeyGetter={(row) => row.id}
                                    selectedRows={readOnly ? undefined : selectedBakeRows}
                                    onSelectedRowsChange={readOnly ? undefined : setSelectedBakeRows}
                                    rowClass={(row) =>
                                        row.__type === "header"
                                            ? "text-xs border-t-4 border-yellow-500 flex machine-header-row"
                                            : undefined
                                    }
                                    rowHeight={ROW_HEIGHT}
                                    headerRowHeight={HEADER_ROW_HEIGHT}
                                    defaultColumnOptions={{ resizable: true }}
                                    isRowSelectionDisabled={(row) => row.isLocked}
                                    onScroll={handleGridScroll}
                                    className="bg-base-100"
                                    style={{ blockSize: "70vh" }}
                                />

                                {stickyOven && (
                                    <div
                                        className="bg-base-200 shadow-[0_15px_15px_-10px_rgba(0,0,0,0.3)]"
                                        style={{
                                            position: "absolute",
                                            top: HEADER_ROW_HEIGHT,
                                            left: 0,
                                            right: 0,
                                            height: ROW_HEIGHT,
                                        }}
                                    >
                                        <div className="absolute left-0 right-0 pl-9 h-full w-full flex items-center">
                                            <OvenHeaderCell
                                                row={stickyOven}
                                                rowCount={stickyOven.__rowCount}
                                                onToggleCollapse={toggleOvenCollapsed}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <DndContext
                                collisionDetection={collisionDetection}
                                measuring={{
                                    droppable: { strategy: MeasuringStrategy.BeforeDragging },
                                }}
                                onDragOver={readOnly ? undefined : handleDragOver}
                                sensors={readOnly || staleInfo ? [] : sensors}
                                onDragStart={readOnly ? undefined : handleDragStart}
                                onDragEnd={readOnly ? undefined : handleDragEnd}
                                onDragCancel={readOnly ? undefined : handleDragCancel}
                            >
                            <div ref={containerRef} className="border-none" style={{ position: "relative" }}>
                                    <DataGrid
                                        ref={gridRef}
                                        columns={decoratedColumns}
                                        rows={displayRows}
                                        renderers={{
                                            renderRow: (key, props) => (
                                                <DroppableRow key={key} rowIdxByElement={rowIdxByElement} props={props}/>
                                            ),
                                        }}
                                        onRowsChange={readOnly ? undefined : handleRowsChange}
                                        onColumnWidthsChange={handleColumnWidthsChange}
                                        rowKeyGetter={(row) => row.id}
                                        selectedRows={readOnly ? undefined : selectedRows}
                                        onSelectedRowsChange={readOnly ? undefined : setSelectedRows}
                                        rowClass={(row) => rowClass(row)}
                                        rowHeight={ROW_HEIGHT}
                                        headerRowHeight={HEADER_ROW_HEIGHT}
                                        defaultColumnOptions={{ resizable: true }}
                                        isRowSelectionDisabled={(row) =>
                                            row.isLocked
                                        }
                                        onScroll={handleGridScroll}
                                        className="bg-base-100"
                                        style={{ blockSize: "70vh" }}
                                    />

                                    {hoveredRow && (
                                        <div onPointerLeave={handleButtonsPointerLeave}>
                                            <RowInsertButtons
                                                isHidden={!isInsertRowButtonVisible}
                                                anchorElement={hoveredRow.element}
                                                buttonsRef={buttonsRef}
                                                onInsertAbove={() => {
                                                    setPlacementOfNewEntry("above");
                                                    setSelectedRows(new Set([displayRows[hoveredRow.rowIdx].id]));
                                                    addEntryModalRef.current?.showModal()
                                                }}
                                                onInsertBelow={() => {
                                                    setPlacementOfNewEntry("below");
                                                    setSelectedRows(new Set([displayRows[hoveredRow.rowIdx].id]));
                                                    addEntryModalRef.current?.showModal()
                                                }}
                                            />

                                            <RowHistoryButton
                                                isHidden={!isHistoryButtonVisible}
                                                anchorElement={hoveredRow.element}
                                                buttonsRef={historyButtonRef}
                                                onViewHistory={() => {
                                                    const entry = displayRows[hoveredRow.rowIdx];
                                                    setHistoryEntryId(entry.entry_id);
                                                    historyModalRef.current?.showModal();
                                                }}
                                            />
                                        </div>
                                    )}

                                    {/* Sticky stand-in for whichever machine group's real header
                                        row has scrolled out of view. Also carries the Add
                                        Lot/Add Block buttons for that machine, since I don't
                                        have MachineHeaderBar's source to add them there
                                        directly — feel free to move these into that
                                        component and drop them from here. */}
                                
                                    {stickyMachine && (
                                        <div
                                            className="bg-base-200 shadow-[0_15px_15px_-10px_rgba(0,0,0,0.3)]"
                                            style={{
                                                position: "absolute",
                                                top: HEADER_ROW_HEIGHT,
                                                left: 0,
                                                right: 0,
                                                height: ROW_HEIGHT,
                                            }}
                                        >
                                            <div className="absolute left-0 right-0 pl-9 h-full w-full flex items-center justify-between">
                                                <div className="flex items-center h-full gap-2 min-w-0">
                                                    {stickyMachine.__headerKind === "bucket" ? (
                                                        <BucketHeaderBar row={stickyMachine} onToggleCollapse={toggleMachineCollapsed} />
                                                    ) : (
                                                        <MachineHeaderBar
                                                            row={{
                                                                machineLabel: stickyMachine?.machineLabel ?? null,
                                                                machine: stickyMachine.machine,
                                                                machineId: stickyMachine.machineId,
                                                                    // stickyMachine.machineLabel ??
                                                                    // stickyMachine.machine,
                                                                otherPackageCount:
                                                                    stickyMachine.otherPackageCount,
                                                                machineLocation: stickyMachine.machineLocation
                                                            }}
                                                            machineKey={stickyMachine.machine}
                                                            rowCount={stickyMachine.__rowCount}
                                                            lotCount={stickyMachine.__lotCount}
                                                            isCollapsed={stickyMachine.__isCollapsed}
                                                            onToggleCollapse={toggleMachineCollapsed}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                            </div>

                            <DragOverlay>
                                {!readOnly && draggedRow ? (
                                    <div className="bg-base-200 w-[300px] p-2 rounded shadow-lg text-sm font-semibold">
                                        {draggedRow.part_name || "Lot"} - {draggedRow.lot_id} - {draggedRow.package_name}
                                        {draggedCount > 1 && <div className="text-xs font-normal opacity-70">+{draggedCount - 1} more</div>}
                                    </div>
                                ) : null}
                            </DragOverlay>
                            </DndContext>
                        )}
                    </div>

                    {!readOnly && (
                        <BakeSelectionToolbar
                            selectedIds={selectedBakeRows}
                            onApprove={handleBakeApprove}
                            onReprocess={handleBakeReprocess}
                            onExport={handleBakeExport}
                            onDelete={handleBakeDelete}
                            onClearSelection={clearBakeSelection}
                        />
                    )}

                    {!readOnly && (
                        <SelectionToolbar
                            selectedIds={selectedRows}
                            buckets={bucketList} 
                            onMoveToBucket={safeBulkPark} 
                            onUngroup={handleBulkUnpark}
                            machinePlatform={machinePlatform}
                            allData={dataRows}
                            machines={machines}
                            disabled={writesLocked}
                            onTag={handleBulkTag}
                            onClearTag={handleBulkClearTag}
                            onStatusChange={handleBulkStatus}
                            onBulkFieldUpdate={handleBulkFieldUpdate}
                            onTransfer={handleBulkTransfer}
                            onSplitRow={splitRow}
                            onRework={handleRework}
                            onMergeRows={mergeRows}
                            onDelete={handleBulkDeleteNotice}
                            onClearSelection={clearSelection}
                            date={date}
                        />
                    )}

                    {!readOnly && (
                        <SplitHistoryModal
                            ref={splitHistoryModalRef}
                            loading={historyLoading}
                            history={splitHistoryData}
                            onRevert={handleSplitRevert}
                            onClose={() => splitHistoryModalRef.current?.close()}
                            isParent={currentLotRole.isParent}
                            isChild={currentLotRole.isChild}
                            currentLotId={currentLotIdForSplitMergeHistory}
                        />
                    )}

                    {!readOnly && (
                        <AddEntryModal
                            ref={addEntryModalRef}
                            placement={placementOfNewEntry}
                            anchorRow={lastHoveredRow}
                            // onClose={handleCloseAddEntry}
                            // machine={machine}
                            date={date}
                            packageGroups={packageGroups}
                            activePackage={activePackage}
                            handleAddRow={handleAddRow}
                            saveBlock={saveBlock}
                        />
                    )}

                    {!readOnly && (
                        <MergeHistoryModal
                            ref={mergeHistoryModalRef}
                            loading={historyLoading}
                            history={mergeHistoryData}
                            onRevert={handleMergeRevert}
                            onClose={() => mergeHistoryModalRef.current?.close()}
                            isTarget={currentLotRole.isParent}
                            isSource={currentLotRole.isChild}
                            currentLotId={currentLotIdForSplitMergeHistory}
                        />
                    )}

                    <DataIntegrityModal
                        partnameMismatches={partnameMismatches}
                        unknownPackages={unknownPackages}
                        recipeMismatches={recipeMismatches}
                    />

                    <DisseminationSummaryModal summary={disseminationSummary} />
                </TableInteractionContext.Provider>
            </TableActionsContext.Provider>

            {/* ── Single-row status dropdown (portal-style, fixed) ── */}
            {!readOnly && statusMenu && (
                <StatusMenu
                    anchor={statusMenu.anchor}
                    current={dataRows.find((r) => r.entry_id === statusMenu.entryId)?.status}
                    disabled={writesLocked}
                    onPick={handleStatusChange}
                    onClose={() => setStatusMenu(null)}
                />
            )}

            {!readOnly && (
                <dialog id="deemo_add_block_modal" className="modal">
                    <div className="modal-box bg-base-300">
                        <h3 className="font-bold text-lg mb-4">Add Time Block</h3>

                        <div className="join join-vertical w-full mb-3">
                            {Object.entries(BLOCK_PRESETS).map(([key, preset]) => (
                                <button
                                    key={key}
                                    type="button"
                                    className={clsx(
                                        "btn justify-between join-item",
                                        blockOption === key && "btn-primary",
                                    )}
                                    onClick={() => setBlockOption(key)}
                                    disabled={writesLocked}
                                >
                                    {preset.label}
                                    <span className="text-xs opacity-70 ml-1">
                                        {preset.duration / 60}hr
                                    </span>
                                </button>
                            ))}
                            <button
                                type="button"
                                className={clsx(
                                    "btn join-item",
                                    blockOption === "custom" && "btn-primary",
                                )}
                                onClick={() => setBlockOption("custom")}
                                disabled={writesLocked}
                            >
                                Custom
                            </button>
                        </div>

                        <div
                            className={`join w-full transition-opacity ${blockOption === "custom" ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                        >
                            <input
                                type="text"
                                placeholder="Label"
                                className="input w-2/3 join-item input-bordered"
                                value={customLabel}
                                onChange={(e) => setCustomLabel(e.target.value)}
                                tabIndex={blockOption === "custom" ? 0 : -1}
                            />
                            <input
                                type="number"
                                placeholder="Duration in minutes"
                                className="input join-item input-bordered w-1/3"
                                value={customDuration}
                                onChange={(e) => setCustomDuration(e.target.value)}
                                tabIndex={blockOption === "custom" ? 0 : -1}
                            />
                        </div>

                        <div className="modal-action">
                            <form method="dialog">
                                <button className="btn btn-ghost mr-2">
                                    Cancel
                                </button>
                            </form>
                            <button
                                className="btn btn-primary"
                                onClick={handleConfirmBlock}
                            >
                                Add Block
                            </button>
                        </div>
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button>close</button>
                    </form>
                </dialog>
            )}

            {!readOnly && (
                <dialog id="add_bucket_modal" className="modal">
                    <div className="modal-box bg-base-300">
                        <h3 className="font-bold text-lg mb-3">
                            Add group{bucketModalMachine ? ` under ${bucketModalMachine}` : ""}
                        </h3>
                        <div className="flex gap-2 mb-3">
                            {["Anticipate", "Upcoming"].map((p) => (
                                <button key={p} type="button" className="btn btn-sm" onClick={() => setBucketLabel(p)}>{p}</button>
                            ))}
                        </div>
                        <input className="input input-bordered w-full" placeholder="Group name" value={bucketLabel}
                            onChange={(e) => setBucketLabel(e.target.value)} />
                        <div className="modal-action">
                            <form method="dialog"><button className="btn btn-ghost">Cancel</button></form>
                            <button className="btn btn-primary" disabled={!bucketLabel.trim() || writesLocked}
                                onClick={async () => {
                                    await createBucket({ label: bucketLabel.trim(), machine: bucketModalMachine });
                                    document.getElementById("add_bucket_modal")?.close();
                                }}>Add</button>
                        </div>
                    </div>
                    <form method="dialog" className="modal-backdrop"><button>close</button></form>
                </dialog>
            )}

            {!readOnly && (
                <dialog id="auto_sort_modal" className="modal">
                    <div className="modal-box bg-base-300 max-w-lg">
                        <h3 className="font-bold text-lg mb-1">
                            Auto Sort{autoSortModalMachine ? ` ${autoSortModalMachine}` : ""}?
                        </h3>
                        <p className="text-sm opacity-70 mb-4">
                            Lots on this machine will be reordered automatically. Review the rules below before continuing.
                        </p>

                        <div className="space-y-3 text-sm">
                            <div>
                                <div className="font-semibold mb-1">1. Blocks are trusted as correct</div>
                                <p className="opacity-90">
                                    Blocks (setup / conversion / etc.) are assumed to already be in the right place and
                                    never move. The lots between two blocks are assumed to run back-to-back without
                                    needing any setup or conversion, so they are sorted only within that section and
                                    never cross a block.
                                </p>
                            </div>

                            <div>
                                <div className="font-semibold mb-1">2. RES lots go last</div>
                                <p className="opacity-90">
                                    Within each section, all non-RES lots come first.
                                    Lots with <span className="font-mono">CR3 = "RES"</span> are placed at the bottom of that section,
                                    even if they are expedite or exceed cycle time.
                                </p>
                            </div>

                            <div>
                                <div className="font-semibold mb-1">3. Priority inside non-RES and RES</div>
                                <p className="opacity-90 mb-1">Each side is ordered by the first rule a lot matches:</p>
                                <ol className="list-decimal list-inside space-y-0.5 opacity-90">
                                    <li>Manual expedite</li>
                                    <li>Cycle time exceed</li>
                                    <li>Cycle time exceed residual</li>
                                    <li>Entry lots</li>
                                    <li>All other lots</li>
                                </ol>
                                <p className="opacity-70 mt-1">
                                    A higher priority always stays above a lower one, regardless of CT.
                                </p>
                            </div>

                            <div>
                                <div className="font-semibold mb-1">4. Order within the same priority</div>
                                <ul className="list-disc list-inside space-y-0.5 opacity-90">
                                    <li>
                                        <span className="font-medium">Non-RES lots:</span> sorted by{" "}
                                        <span className="font-mono">CT</span>, highest to lowest.
                                    </li>
                                    <li>
                                        <span className="font-medium">RES lots:</span> sorted by{" "}
                                        <span className="font-mono">Lot_Entry_Time_Days</span>, highest to lowest.
                                        If equal, higher <span className="font-mono">CT</span> goes first.
                                    </li>
                                    <li>Lots with a missing value go to the bottom of their group.</li>
                                    <li>Remaining ties keep their current order.</li>
                                </ul>
                            </div>

                            <div>
                                <div className="font-semibold mb-1">5. After sorting</div>
                                <p className="opacity-90">
                                    Start and end times are recalculated from the first row that moved,
                                    including every row after it.
                                </p>
                            </div>
                        </div>

                        <div className="alert alert-warning mt-4 text-sm">
                            <div className="space-y-1">
                                <p>
                                    Auto Sort does not check setup or conversion needs. If a section contains lots that
                                    would require a setup between them, they are still sorted by the rules above, so
                                    place blocks first and make sure each section is truly setup-free.
                                </p>
                                <p>
                                    This replaces any manual drag-and-drop ordering on this machine.
                                    Rows that don't move are left untouched.
                                </p>
                            </div>
                        </div>

                        <div className="modal-action">
                            <form method="dialog">
                                <button className="btn btn-ghost" disabled={writesLocked}>Cancel</button>
                            </form>
                            <button
                                className="btn btn-primary"
                                disabled={writesLocked}
                                onClick={async () => {
                                    const ok = await handleAutoSortMachine({ machine: autoSortModalMachine });
                                    if (ok) document.getElementById("auto_sort_modal")?.close();
                                }}
                            >
                                {writesLocked && <span className="loading loading-spinner loading-sm" />}
                                Sort Now
                            </button>
                        </div>
                    </div>
                    <form method="dialog" className="modal-backdrop"><button>close</button></form>
                </dialog>
            )}

            {/* ── Scheduler run modal ──────────────────────────────────
                Triggers the scheduler run endpoint (POST) and lists recent
                runs from the deferred schedulerHistory prop. History entries
                are read-only; the only action here is "Run Scheduler". Not
                rendered at all in readOnly mode (its trigger button is also
                hidden above). */}
            {!readOnly && (
                <dialog id="scheduler_run_modal" className="modal">
                    <div className="modal-box bg-base-300 max-h-[80vh] flex flex-col">
                        <h3 className="font-bold text-lg mb-2">Scheduler</h3>

                        <button
                            className="btn btn-sm btn-primary mb-4 self-start"
                            disabled={isRunningScheduler}
                            onClick={() => {
                                setIsRunningScheduler(true);
                                router.post(
                                    "/loading-plan/run-scheduler",
                                    { date, location: selectedLocation },
                                    {
                                        preserveScroll: true,
                                        onFinish: () => setIsRunningScheduler(false),
                                    },
                                );
                            }}
                        >
                            {isRunningScheduler ? "Running…" : "Run Scheduler"}
                        </button>

                        <h4 className="font-semibold text-sm mb-2 text-base-content/70">
                            Recent runs
                        </h4>
                        <div className="flex flex-col gap-1 overflow-y-auto pr-1">
                            {schedulerHistory === undefined ? (
                                <span className="text-sm text-base-content/50">Loading…</span>
                            ) : schedulerHistory.length === 0 ? (
                                <span className="text-sm text-base-content/50">No runs yet.</span>
                            ) : (
                                schedulerHistory.map((run) => (
                                    <div
                                        key={run.id}
                                        className="flex items-center justify-between gap-3 py-1 text-sm border-b border-base-content/10 last:border-0"
                                    >
                                        <span className="flex items-center gap-1.5">
                                            <span
                                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                                    run.status === "ok"
                                                        ? "bg-success"
                                                        : run.status === "error"
                                                        ? "bg-error"
                                                        : "bg-warning"
                                                }`}
                                            />
                                            {run.user?.name ?? "System"}
                                        </span>
                                        <span className="text-base-content/60">
                                            {run.status === "ok"
                                                ? `${run.assigned_count}/${run.pickup_count} assigned`
                                                : run.status === "skipped"
                                                ? "nothing to schedule"
                                                : "failed"}
                                        </span>
                                        <span className="text-base-content/40 text-xs">
                                            at
                                            {new Date(run.created_at).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="modal-action">
                            <form method="dialog">
                                <button className="btn btn-ghost btn-sm">Close</button>
                            </form>
                        </div>
                    </div>
                    <form method="dialog" className="modal-backdrop">
                        <button>close</button>
                    </form>
                </dialog>
            )}

           {/* ── Column visibility modal ──────────────────────────────────
                Toggling a column "off" sets its width to MIN_COLUMN_WIDTH rather than
                removing it from the grid, so it stays visible as a thin colored hint.
                Kept in readOnly mode too — it's a local view preference, not a
                mutation of loading-plan data. */}
            {(() => null)()}
            <dialog id="column_visibility_modal" className="modal">
                {(() => {
                    const visibleCols = columns.filter((col) => dataColumnKeys.has(col.key));
                    const isColHidden = (key) => {
                        const w = columnWidths[key];
                        return w !== undefined && w <= COLLAPSE_HINT_THRESHOLD;
                    };
                    const hiddenCount = visibleCols.filter((col) => isColHidden(col.key)).length;

                    return (
                        <div className="modal-box bg-base-300 max-h-[80vh] flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-lg">Column Visibility</h3>
                                <span
                                    className={`badge badge-sm ${
                                        hiddenCount > 0 ? 'badge-warning' : 'badge-ghost'
                                    }`}
                                >
                                    {hiddenCount > 0
                                        ? `${hiddenCount} hidden`
                                        : 'All visible'}
                                </span>
                            </div>

                            <div className="flex flex-col overflow-y-auto pr-1">
                                {visibleCols.map((col) => {
                                    const isHidden = isColHidden(col.key);
                                    return (
                                        <label
                                            key={col.key}
                                            className={`flex items-center justify-between gap-1 py-2 px-3 rounded-md cursor-pointer border-l-4 transition-colors ${
                                                isHidden
                                                    ? 'bg-warning/10 border-warning hover:bg-warning/20'
                                                    : 'border-transparent hover:bg-base-200'
                                            }`}
                                        >
                                            <span className="flex items-center gap-2 min-w-0">
                                                <span
                                                    className={`text-sm truncate ${
                                                        isHidden
                                                            ? 'line-through opacity-50'
                                                            : ''
                                                    }`}
                                                >
                                                    {col.name ?? col.key}
                                                </span>
                                                {isHidden && (
                                                    <span className="badge badge-warning badge-xs gap-1 shrink-0">
                                                        <svg
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            className="w-3 h-3"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                            strokeWidth={2}
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                d="M3 3l18 18M10.58 10.58a2 2 0 002.84 2.84M9.88 5.09A9.77 9.77 0 0112 5c4.48 0 8.27 2.94 9.54 7a10.05 10.05 0 01-2.16 3.62M6.61 6.61A10.05 10.05 0 002.46 12c1.27 4.06 5.06 7 9.54 7a9.8 9.8 0 004.39-1.03"
                                                            />
                                                        </svg>
                                                        Hidden
                                                    </span>
                                                )}
                                            </span>
                                            <input
                                                type="checkbox"
                                                className={`toggle toggle-sm ${
                                                    isHidden ? '' : 'toggle-success'
                                                }`}
                                                checked={!isHidden}
                                                onChange={() => toggleColumnVisibility(col.key)}
                                            />
                                        </label>
                                    );
                                })}
                            </div>

                            <div className="modal-action">
                                <form method="dialog">
                                    <button className="btn btn-ghost btn-sm">Close</button>
                                </form>
                            </div>
                        </div>
                    );
                })()}
                <form method="dialog" className="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>
        </div>
    );
}