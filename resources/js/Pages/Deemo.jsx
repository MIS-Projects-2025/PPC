import DateNav from "@/Components/DateNav";
import AddEntryModal from "@/Components/LoadingPlan/AddEntriesModal";
import { BakeSelectionToolbar } from "@/Components/LoadingPlan/BakeSelectionToolbar";
import { DATA_COLUMNS, makeBakeColumns, makeColumns } from "@/Components/LoadingPlan/columns";
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
import { TableActionsContext } from "@/Components/LoadingPlan/RowContent";
import { SavingCursorBadge } from "@/Components/LoadingPlan/SavingCursorBadge";
import ScrollableTabs from "@/Components/LoadingPlan/ScrollableTabs";
import { SearchBar } from "@/Components/LoadingPlan/SearchBar";
import SelectionToolbar from "@/Components/LoadingPlan/SelectionToolbar";
import SplitHistoryModal from "@/Components/LoadingPlan/SplitHistoryModal";
import { StatusBadge } from "@/Components/LoadingPlan/StatusBadge.jsx";
import { packagesInGroup } from "@/Constants/loadingPlanPackageGroups.js";
import { MACHINE_MANUAL, hasTimeline } from "@/Constants/machines.js";
import { getStatusMessage } from "@/Constants/wipStatus.js";
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
import {
    recomputeMachine,
} from "@/Lib/LoadingPlan/loadingPlanSchedule.js";
import { createUndoStore } from "@/Store/undoStore";
import { usePersistedSet } from "@/Store/usePersistedSet";
import { DndContext, DragOverlay, MeasuringStrategy } from "@dnd-kit/core";
import { autoUpdate, offset, useFloating } from "@floating-ui/react";
import { Deferred, router } from "@inertiajs/react";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DataGrid } from "react-data-grid";
import "react-data-grid/lib/styles.css";
import { createPortal } from "react-dom";
import { BsSearch } from "react-icons/bs";
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
 *
 * FIX — id vs entry_id: `id` is the react-data-grid / dnd-kit row key
 * (see rowKeyGetter, useDraggable/useDroppable ids below). `entry_id` is
 * the backend primary key, only meaningful once a row has been persisted.
 * They are NOT the same value and a row can have an `id` with no
 * `entry_id` yet (see the `_dndId` seeding logic below). `selectedRows`
 * (react-data-grid's selection Set) is keyed by `id` because that's what
 * rowKeyGetter returns — every bulk handler must test membership with
 * `selectedRows.has(r.id)`, never `r.entry_id`. This file previously got
 * that backwards in all four bulk handlers, which meant bulk tag/status/
 * transfer/delete would silently match nothing. Fixed here.
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
 * -----------------------------------------------------------------------
 */

// Must match the actual row height / header height react-data-grid uses,
// since scroll math below (which group is "at top") depends on it.
const ROW_HEIGHT = 35;
const HEADER_ROW_HEIGHT = 35;

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
}) {
    const {
        present: dataRows,
        update,
        undo,
        redo,
    } = useLoadingPlanStore();
    
    console.log("LOG ~ Deemo.jsx:871 ~ Deemo ~ bakeLots:", bakeLots);
    console.log("LOG ~ Deemo.jsx:683 ~ Deemo ~ data:", data);

    const toast = useToast();
    const { mutate } = useMutation();

    const [highlightedMatch, setHighlightedMatch] = useState(null); // { rowId, columnKey }

    const [activePackage, setActivePackage] = useState("LGA");
    const [selectedRows, setSelectedRows] = useState(() => new Set());
    const [selectedBakeRows, setSelectedBakeRows] = useState(() => new Set());
    // console.log("🚀 ~ Deemo ~ selectedRows:", selectedRows)
    const [inFlightCount, setInFlightCount] = useState(0);
    const [, setIsDirty] = useState(false);
    const [statusMenu, setStatusMenu] = useState(null);

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

    const handleDateChange = (newDate) => {
        setSelectedDate(newDate);
        router.get(route("loading-plan.index"), {
            date: newDate.toISOString().slice(0, 10),
        });
    };

    const setLocation = (line) => {
        if (line === selectedLocation) return;
        router.get(
            route("loading-plan.index"),
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
            machine: row.machine ?? null,
            tag: row.tag ?? null,
            doable: row.doable ?? 0,
            remarks: row.remarks ?? "",
            // Compatibility shim — findMachineNeighbors/applyTimeStartEdit
            // key rows off `_dndId` in LoadingPlanTable.jsx; keep the same
            // convention here. See assumptions note at top of file.
            _dndId: row.entry_id
                ? `entry-${row.entry_id}`
                : `wip-${row.id ?? Math.random()}`,
        }));

        if (baseTimes) {
            const buckets = new Set(seeded.map((r) => r.machine));
            buckets.forEach((m) =>
                recomputeMachine(seeded, m, baseTimes, date),
            );
        }

        useLoadingPlanStore.getState().reset(seeded);
    }, [data]);

    const machines = useMemo(() => {
        return [null, MACHINE_MANUAL, ...serverMachines.map((m) => m.name)];
    }, [serverMachines]);

    const activePackageGroup = useMemo(
        () => packageGroups[activePackage] || null,
        [activePackage, packageGroups],
    );

    console.log("LOG ~ Deemo.jsx:1001 ~ Deemo ~ activePackageGroup:", activePackageGroup);

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

    const clearBakeSelection = useCallback(() => setSelectedBakeRows(new Set()), []);

    // ── Status dropdown (ported from LoadingPlanTable.jsx) ──────────────────
    const handleStatusClick = useCallback(
        (e, entryId) => {
            e.stopPropagation();
            if (isUpdating) return;
            const rect = e.currentTarget.getBoundingClientRect();
            setStatusMenu({ entryId, x: rect.left, y: rect.bottom + 4 });
        },
        [isUpdating],
    );

    const handleStatusChange = useCallback(
        (newStatus) => {
            const normalizedStatus = newStatus === "NONE" ? null : newStatus;
            const entryId = statusMenu.entryId;
            // entryId here IS a backend entry_id (see handleStatusClick /
            // the status column's onClick, which pass row.entry_id) — so
            // matching against r.entry_id is correct in this handler,
            // unlike the bulk handlers below.
            const row = dataRows.find((r) => r.entry_id === entryId);
            if (!row) return;

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
                    update(
                        (prev) =>
                            prev.map((r) =>
                                r.entry_id === entryId
                                    ? {
                                          ...r,
                                          entry_id: entry.id,
                                          lock_version: entry.lock_version,
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
        [statusMenu, update, dataRows, date, undo, withUpdating, mutate, toast],
    );

    const {
        handleBulkTag,
        handleBulkClearTag,
        handleBulkStatus,
        handleBulkFieldUpdate,
        handleBulkTransfer,
        handleBulkDelete,
    } = useBulkOperations({
        dataRows,
        selectedRows,
        update,
        withUpdating,
        mutate,
        undo,
        toast,
        setIsDirty,
        clearSelection,
        baseTimes,
        date,
    });

    const { handleUndo, handleRedo, dataRowsRef } = useUndoRedoSync({
        dataRows,
        undo,
        redo,
        getPresent: () => useLoadingPlanStore.getState().present,
        baseTimes,
        date,
        mutate,
        update,
        toast,
    });

    // ── Add lot / add block ──────────────────────────────────────────────
    const handleAddRow = useCallback(
        (machine, { partName, packageName, qty, beforeEntryId = null, afterEntryId = null } = {}) => {
            const trimmedPart = (partName ?? "").trim();
            if (!trimmedPart) return Promise.reject(new Error("Part name is required"));

            const groupPkgs = packagesInGroup(activePackage, packageGroups);
            const resolvedPackage = packageName || groupPkgs[0] || activePackage;

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
                    update((prev) => {
                        const withNew = [...prev, { ...entry, _dndId: `entry-${entry.entry_id}` }];
                        return baseTimes ? recomputeMachine(withNew, machine, baseTimes, date) : withNew;
                    });
                    setIsDirty(true);
                    return entry;
                })
                .catch((err) => {
                    console.error("Failed to create manual lot:", err);
                    toast?.error?.("Couldn't create the new lot — please try again.");
                    throw err;
                });
        },
        [activePackage, packageGroups, baseTimes, date, update, withUpdating, mutate, toast],
    );

    const handleAddBlock = useCallback((machine) => {
        setBlockOption("setup");
        setCustomLabel("");
        setCustomDuration("60");
        setBlockModalMachine(machine);
        document.getElementById("deemo_add_block_modal")?.showModal();
    }, []);

    const saveBlock = useCallback(
        (machine, label, duration, { beforeEntryId = null, afterEntryId = null } = {}) => {
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
                    update((prev) => {
                        const withNew = [...prev, { ...entry, _dndId: `entry-${entry.entry_id}` }];
                        return baseTimes ? recomputeMachine(withNew, machine, baseTimes, date) : withNew;
                    });
                    setIsDirty(true);
                    return entry;
                })
                .catch((err) => {
                    console.error("Failed to save block:", err);
                    toast?.error?.("Could not save the block — please try again.");
                    throw err;
                });
        },
        [baseTimes, date, update, withUpdating, mutate, toast],
    );

    // NOTE: no stub here — this handler never talks to the backend itself
    // (it just builds label/duration and delegates to saveBlock, which
    // has its own stub right before its mutate call). Blanket-returning
    // here would also stop the modal from closing.
    const handleConfirmBlock = useCallback(() => {
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
    } = useSplitMergeOperations({ dataRows, update, withUpdating, mutate, baseTimes, date, toast, setIsDirty });

    const handleShowSplitHistory = useCallback(
        (rootLotId, isParent, isChild) =>
            loadSplitHistory(rootLotId, isParent, isChild, {
                onOpen: () => splitHistoryModalRef.current?.showModal(),
                onError: () => splitHistoryModalRef.current?.close(),
            }),
        [loadSplitHistory],
    );

    const handleShowMergeHistory = useCallback(
        (targetLotId, isParent, isChild) =>
            loadMergeHistory(targetLotId, isParent, isChild, {
                onOpen: () => mergeHistoryModalRef.current?.showModal(),
                onError: () => mergeHistoryModalRef.current?.close(),
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

    const columns = useMemo(
        () => makeColumns(isUpdating, handleStatusClick, toggleMachineCollapsed, highlightedMatch),
        [isUpdating, handleStatusClick, toggleMachineCollapsed, highlightedMatch],
    );

    const bakeColumns = useMemo(() => makeBakeColumns(highlightedMatch, toggleOvenCollapsed), [highlightedMatch, toggleOvenCollapsed]);

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

    // ── Migrated from LoadingPlanTable.jsx: otherPackageCounts ─────────────
    // How many rows sit on a machine but are hidden by the current package
    // tab (they belong to some OTHER package group). Unassigned ignores the
    // package filter entirely (see displayRows below), so it's never
    // counted here — same contract as LoadingPlanTable.jsx.
    const otherPackageCounts = useMemo(() => {
        const activeList = activePackageGroup ?? [];
        const result = {};
        dataRows.forEach((r) => {
            if (r.machine === null) return; // Unassigned ignores the package filter
            if (activeList.includes(r.package_name)) return;
            result[r.machine] = (result[r.machine] ?? 0) + 1;
        });
        return result;
    }, [dataRows, activePackageGroup]);

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
        console.log("Approve bake lots (stub):", Array.from(selectedBakeRows));
    }, [selectedBakeRows]);

    const handleBakeReprocess = useCallback(() => {
        console.log("Reprocess bake lots (stub):", Array.from(selectedBakeRows));
    }, [selectedBakeRows]);

    const handleBakeExport = useCallback(() => {
        console.log("Export bake lots (stub):", Array.from(selectedBakeRows));
    }, [selectedBakeRows]);

    const handleBakeDelete = useCallback(() => {
        console.log("Delete bake lots (stub):", Array.from(selectedBakeRows));
        setSelectedBakeRows(new Set());
    }, [selectedBakeRows]);

    // Standalone source of truth for which sections render. Unassigned +
    // MANUAL are always shown (pinned first), regardless of whether they
    // currently hold any rows — same contract as LoadingPlanTable.jsx.
    // Real machines only render a section once they have rows, same as
    // before. Previously this flatMapped over `serverMachines` only, so
    // Unassigned/MANUAL rows never appeared anywhere in the grid.
    const displayRows = useMemo(() => {
        return machines.flatMap((m) => {
            const isUnassigned = m === null;
            const isManual = m === MACHINE_MANUAL;

            const rowsForMachine = dataRows.filter((r) => {
                if (r.machine !== m) return false;
                // if (isUnassigned) return true;
                if (isBlockRow(r)) return true;
                const activeList = activePackageGroup ?? [];
                return activeList.includes(r.package_name);
            });

            console.log("DI ~ Deemo.jsx:752 ~ Deemo ~ rowsForMachine:", rowsForMachine);

            if (rowsForMachine.length === 0 && !isUnassigned && !isManual) {
                return [];
            }

            const isCollapsed = collapsedMachines.has(m);

            const headerRow = {
                id: `header-${m ?? "unassigned"}`,
                __type: "header",
                machine: m,
                machineLabel: isUnassigned ? "Unassigned" : isManual ? "MANUAL" : m,
                platform: machinePlatform.get(m),
                __rowCount: rowsForMachine.length, // total count, shown even while collapsed
                otherPackageCount: isUnassigned ? 0 : (otherPackageCounts[m] ?? 0),
                __isCollapsed: isCollapsed,
                isLocked: true,
            };

            // Collapsed: emit just the header, hide the data rows under it.
            if (isCollapsed) return [headerRow];

            return [headerRow, ...rowsForMachine.map((r) => ({ ...r, id: r.id, __type: "data" }))];
        });
    }, [machines, dataRows, activePackageGroup, machinePlatform, otherPackageCounts, collapsedMachines]);

    // const [entryHistoryData, setEntryHistoryData] = useState([]);
    // const [entryHistoryLoading, setEntryHistoryLoading] = useState(false);
    // const entryHistoryModalRef = useRef(null);
    const historyModalRef = useRef(null);
    const [historyEntryId, setHistoryEntryId] = useState(null);

    // async function fetchEntryHistory(entryId) {
    //     setEntryHistoryLoading(true);
    //     entryHistoryModalRef.current?.showModal();
    //     try {
    //         const res = await fetch(route("loading-plan.entries.history", entryId));
    //         const data = await res.json();
    //         setEntryHistoryData(data.data); // .data if it's a Laravel paginator response
    //     } catch (err) {
    //         console.error("Failed to load entry history", err);
    //     } finally {
    //         setEntryHistoryLoading(false);
    //     }
    // }

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

    console.log("DI ~ Deemo.jsx:924 ~ Deemo ~ displayRows:", displayRows);

    const stickyMachine = useStickyGroupHeader(displayRows, gridRef);

    console.log("LOG ~ Deemo.jsx:783 ~ Deemo ~ stickyMachine:", stickyMachine);
    const stickyOven = useStickyGroupHeader(bakeDisplayRows, gridRef);

    console.log("LOG ~ Deemo.jsx:786 ~ Deemo ~ stickyOven:", stickyOven);

    // Separate effect, sole job: clear the highlight 1.5s after it's set.
    // Depends ONLY on highlightedMatch — untouched by columns/displayRows
    // recomputing, so nothing can cancel it early.
    useEffect(() => {
        if (!highlightedMatch) return;
        const t = setTimeout(() => setHighlightedMatch(null), 1500);
        return () => clearTimeout(t);
    }, [highlightedMatch]);

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

    const search = useTableSearch({
        activePackage,
        dataRows,
        bakeLots,
        activePackageGroup,
        displayRows,
        bakeDisplayRows,
        columns,
        bakeColumns,
        collapsedMachines,
        setCollapsedMachines,
        highlightedMatch,
        setHighlightedMatch,
        gridRef,
    });

    useEffect(() => {
        const onKey = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
                e.preventDefault();
                search.openSearch();
                return;
            }
            if (e.key === "Escape") {
                if (search.searchOpen) search.closeSearch();
                clearSelection();
            }
            if (e.ctrlKey || e.metaKey) {
                if (e.key === "z" && !e.shiftKey) {
                    e.preventDefault();
                    handleUndo();
                }
                if (e.key === "y" || (e.key === "z" && e.shiftKey)) {
                    e.preventDefault();
                    handleRedo();
                }
                if (e.key === "a") {
                    e.preventDefault();
                    setSelectedRows(
                        new Set(
                            dataRowsRef.current.filter((r) => r.entry_id).map((r) => r.entry_id),
                        ),
                    );
                }
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [search, handleUndo, handleRedo, clearSelection, dataRowsRef]);

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
    });

    const {
        sensors,
        collisionDetection,
        hoveredRowId,
        draggedRow,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
        handleDragCancel,
    } = useDragReorder({
        dataRows,
        update,
        withUpdating,
        mutate,
        baseTimes,
        date,
        onReorder,
        onLotTransfer,
        toast,
        clearSelection,
        setIsDirty,
    });

    const rowClass = useCallback(
        (row) => {
            const rowDropId = `row-${row.id}`;
            if (hoveredRowId === rowDropId)
                return "bg-pink-500 relative drop-target-row";
            if (row.__type === "header")
                return "text-xs border-t-4 border-yellow-500 flex machine-header-row";
            if (isBlockRow(row) && !selectedRows.has(row.id))
                return "block-row-bg border-l-4 border-warning/60";
            return undefined;
        },
        [hoveredRowId, selectedRows],
    );

    const tableInteractionValue = useMemo(
        () => ({
            machineCapacity,
            machineTotalDoable,
            machineTotalQuantity,
            otherPackageCounts,
            onAddRow: handleAddRow,
            onAddBlock: handleAddBlock,
            isUpdating,
        }),
        [
            machineCapacity,
            machineTotalDoable,
            machineTotalQuantity,
            otherPackageCounts,
            handleAddRow,
            handleAddBlock,
            isUpdating,
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
    const isInsertRowButtonVisible = hoveredRowData && hoveredRowData?.machine !== null && hoveredRowData?.__type === "data" && !isUpdating;

    console.log("LOG ~ Deemo.jsx:1056 ~ Deemo ~ hoveredRowData.__type:", hoveredRowData?.__type);

    console.log("LOG ~ Deemo.jsx:1056 ~ Deemo ~ hoveredRowData.machine:", hoveredRowData?.machine);

    console.log("LOG ~ Deemo.jsx:1056 ~ Deemo ~ isInsertRowButtonVisible:", isInsertRowButtonVisible);

    console.log("LOG ~ Deemo.jsx:1055 ~ Deemo ~ hoveredRowData:", hoveredRowData);

    // console.log("LOG hoveredRow ~ Deemo.jsx:954 ~ Deemo ~ hoveredRow:", hoveredRow);
    
    // console.log("LOG hoveredRow ~ Deemo.jsx:954 ~ Deemo ~ dataR:", dataRowsRef.current[hoveredRow?.rowIdx]);
    // console.log("LOG hoveredRow ~ Deemo.jsx:954 ~ Deemo ~dataRows:", dataRows);
    // console.log("LOG hoveredRow ~ Deemo.jsx:954 ~ Deemo ~displayRows:", displayRows);

    const tableActionsValue = useMemo(
        () => ({
            handleStatusClick,
            handleShowHistory: handleShowSplitHistory,
            handleShowMergeHistory,
            // handleCellClick,
            // selectedIds,
            // handleRowSelect,
            isUpdating,
            // anchorIdRef,
        }),
        [
            handleStatusClick,
            handleShowSplitHistory,
            handleShowMergeHistory,
            // handleCellClick,
            // selectedIds,
            // handleRowSelect,
            isUpdating,
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

            <PickupInsertModal
                ref={pickupInsertModalRef}
                // lotA={selectedRows[0]}
                // lotB={selectedRows[1]}
                // onConfirm={({ targetLotEntryId, sourceLotEntryId }) =>
                //     onMergeRows({ targetLotEntryId, sourceLotEntryId })
                // }
                onClose={() => pickupInsertModalRef.current?.close()}
            />

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
                            {status && status !== "ok" && (
                                <div className="flex text-sm py-0 px-2 alert alert-error alert-soft">
                                    <GoAlert size={16} />
                                    <div role="alert">
                                        {getStatusMessage(date, status)}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            router.get(route("import.index"))
                                        }
                                        className="btn p-0 btn-link"
                                    >
                                        Go to Import
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center">
                            {isUpdating ? (
                                <span className="flex items-center gap-1.5 text-xs text-info">
                                    <span className="loading loading-spinner loading-xs" />{" "}
                                    Saving…
                                </span>
                            ) : selectedRows.size > 0 ? (
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

                            <div className="w-px h-4 bg-base-300 mx-1" />

                            {/* <button
                                onClick={handleUndo}
                                disabled={!canUndo() || isUpdating}
                                className={clsx(
                                    "btn btn-ghost px-2 py-1 text-xs rounded border border-base-300 text-base-content/60 disabled:opacity-30 hover:bg-base-200",
                                    interactiveCursorClasses(isUpdating),
                                )}
                                title="Undo (Ctrl+Z)"
                            >
                                ↩ Undo
                            </button>
                            <button
                                onClick={handleRedo}
                                disabled={!canRedo() || isUpdating}
                                className={clsx(
                                    "btn btn-ghost px-2 py-1 text-xs rounded border border-base-300 text-base-content/60 disabled:opacity-30 hover:bg-base-200",
                                    interactiveCursorClasses(isUpdating),
                                )}
                                title="Redo (Ctrl+Y)"
                            >
                                ↪ Redo
                            </button> */}

                            <div className="w-px h-4 bg-base-300 mx-1" />
                            
                            <div className="flex gap-2">
                                <button className="btn btn-sm" onClick={handleExport} disabled={isExporting}>
                                    {isExporting ? "Exporting…" : "Export to Excel"}
                                </button>

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
                                ...packageGroupNames,
                                { value: "Bake", label: "Bake", icon: <PiOvenDuotone size={20} /> },
                            ]}
                            active={activePackage}
                            onChange={(pkg) => {
                                setActivePackage(pkg);
                                clearSelection();
                                clearBakeSelection();
                            }}
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
                                            disabled={isUpdating}
                                            onClick={() => setLocation(line)}
                                            className={clsx(
                                                "btn btn-xs join-item",
                                                selectedLocation === line
                                                    ? "btn-primary"
                                                    : "btn-dash opacity-60",
                                                interactiveCursorClasses(
                                                    isUpdating,
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
                            
                            <button
                                // className={`btn btn-ghost text-[11px] font-medium px-2.5 py-1 rounded-lg bg-base-content/10 text-base-content/80 hover:bg-base-content/20 flex items-center gap-1 ${
                                //     count !== 2 ? "cursor-not-allowed opacity-50" : ""
                                // }`}
                                // disabled={count !== 2}
                                className="btn btn-sm z-50"
                                onClick={() => {
                                    pickupInsertModalRef.current?.showModal();
                                }}
                            >
                                Schedule Pickups
                            </button>

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
                                onPrev={search.findPrev}
                                onClose={search.closeSearch}
                                inputRef={search.searchInputRef}
                            />
                        )}
                        {activePackage === "Bake" ? (
                            <div className="border-none" style={{ position: "relative" }}>
                                <DataGrid
                                    ref={gridRef}
                                    columns={bakeColumns}
                                    rows={bakeDisplayRows}
                                    rowKeyGetter={(row) => row.id}
                                    selectedRows={selectedBakeRows}
                                    onSelectedRowsChange={setSelectedBakeRows}
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
                                onDragOver={handleDragOver}
                                sensors={sensors}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                                onDragCancel={handleDragCancel}
                            >
                            <div ref={containerRef} className="border-none" style={{ position: "relative" }}>
                                    <DataGrid
                                        ref={gridRef}
                                        columns={columns}
                                        rows={displayRows}
                                        renderers={{
                                            renderRow: (key, props) => (
                                                <DroppableRow key={key} rowIdxByElement={rowIdxByElement} props={props}/>
                                            ),
                                        }}
                                        onRowsChange={handleRowsChange}
                                        rowKeyGetter={(row) => row.id}
                                        selectedRows={selectedRows}
                                        onSelectedRowsChange={setSelectedRows}
                                        rowClass={(row) => rowClass(row)}
                                        rowHeight={ROW_HEIGHT}
                                        headerRowHeight={HEADER_ROW_HEIGHT}
                                        defaultColumnOptions={{ resizable: true }}
                                        isRowSelectionDisabled={(row) =>
                                            row.isLocked || isBlockRow(row)
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
                                                    setSelectedRows(
                                                        new Set(
                                                            [displayRows[hoveredRow.rowIdx]],
                                                        ),
                                                    );
                                                    addEntryModalRef.current?.showModal()
                                                }}
                                                onInsertBelow={() => {
                                                    setPlacementOfNewEntry("below");
                                                    setSelectedRows(
                                                        new Set(
                                                            [displayRows[hoveredRow.rowIdx]],
                                                        ),
                                                    );
                                                    addEntryModalRef.current?.showModal()
                                                }}
                                            />

                                            <RowHistoryButton
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
                                                    <MachineHeaderBar
                                                        row={{
                                                            machineLabel: stickyMachine?.machineLabel ?? null,
                                                            machine: stickyMachine.machine,
                                                                // stickyMachine.machineLabel ??
                                                                // stickyMachine.machine,
                                                            otherPackageCount:
                                                                stickyMachine.otherPackageCount,
                                                        }}
                                                        machineKey={stickyMachine.machine}
                                                        rowCount={stickyMachine.__rowCount}
                                                        isCollapsed={stickyMachine.__isCollapsed}
                                                        onToggleCollapse={toggleMachineCollapsed}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                            </div>

                            <DragOverlay>
                                {draggedRow ? (
                                    <div className="bg-base-200 w-[300px] p-2 rounded shadow-lg text-sm font-semibold">
                                        {draggedRow.part_name || "Lot"} -{" "}
                                        {draggedRow.lot_id} - {draggedRow.package_name}
                                    </div>
                                ) : null}
                            </DragOverlay>
                            </DndContext>
                        )}
                    </div>

                    <BakeSelectionToolbar
                        selectedIds={selectedBakeRows}
                        onApprove={handleBakeApprove}
                        onReprocess={handleBakeReprocess}
                        onExport={handleBakeExport}
                        onDelete={handleBakeDelete}
                        onClearSelection={clearBakeSelection}
                    />

                    <SelectionToolbar
                        selectedIds={selectedRows}
                        machinePlatform={machinePlatform}
                        allData={dataRows}
                        machines={machines}
                        disabled={isUpdating}
                        onTag={handleBulkTag}
                        onClearTag={handleBulkClearTag}
                        onStatusChange={handleBulkStatus}
                        onBulkFieldUpdate={handleBulkFieldUpdate}
                        onTransfer={handleBulkTransfer}
                        onSplitRow={splitRow}
                        onMergeRows={mergeRows}
                        onDelete={handleBulkDelete}
                        onClearSelection={clearSelection}
                    />

                    <SplitHistoryModal
                        ref={splitHistoryModalRef}
                        loading={historyLoading}
                        history={splitHistoryData}
                        onRevert={handleSplitRevert}
                        onClose={() => splitHistoryModalRef.current?.close()}
                        isParent={currentLotRole.isParent}
                        isChild={currentLotRole.isChild}
                    />

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

                    <MergeHistoryModal
                        ref={mergeHistoryModalRef}
                        loading={historyLoading}
                        history={mergeHistoryData}
                        onRevert={handleMergeRevert}
                        onClose={() => mergeHistoryModalRef.current?.close()}
                        isTarget={currentLotRole.isParent}
                        isSource={currentLotRole.isChild}
                    />

                    <DataIntegrityModal
                        partnameMismatches={partnameMismatches}
                        unknownPackages={unknownPackages}
                        recipeMismatches={recipeMismatches}
                    />

                    <DisseminationSummaryModal summary={disseminationSummary} />
                </TableInteractionContext.Provider>
            </TableActionsContext.Provider>

            {/* ── Single-row status dropdown (portal-style, fixed) ── */}
            {statusMenu && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setStatusMenu(null)}
                    />
                    <div
                        className="fixed z-50 bg-base-100 border border-base-300 rounded-lg shadow-lg py-1 min-w-36"
                        style={{ top: statusMenu.y, left: statusMenu.x }}
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
                                className={clsx(
                                    "btn btn-ghost w-full text-left px-2 text-sm flex items-center gap-2",
                                    !isUpdating && "hover:bg-base-200",
                                )}
                                onClick={() => handleStatusChange(s)}
                                disabled={isUpdating}
                            >
                                <StatusBadge status={s} />
                            </button>
                        ))}
                    </div>
                </>
            )}

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
                                disabled={isUpdating}
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
                            disabled={isUpdating}
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
        </div>
    );
}
