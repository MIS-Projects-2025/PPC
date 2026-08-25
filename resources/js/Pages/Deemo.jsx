import { MachineHeaderBar } from "@/Components/LoadingPlan/MachineHeaderBar";
import { TableInteractionContext } from "@/Components/LoadingPlan/MachineSectionBody";
import MergeHistoryModal from "@/Components/LoadingPlan/MergeHistoryModal";
import PackageTabs from "@/Components/LoadingPlan/PackageTabs";
import PickupInsertModal from "@/Components/LoadingPlan/PickupInsertModal";
import { TableActionsContext } from "@/Components/LoadingPlan/RowContent";
import SelectionToolbar from "@/Components/LoadingPlan/SelectionToolbar";
import SplitHistoryModal from "@/Components/LoadingPlan/SplitHistoryModal";
import { StatusBadge } from "@/Components/LoadingPlan/StatusBadge.jsx";
import { packagesInGroup } from "@/Constants/loadingPlanPackageGroups.js";
import {
    applyTimeStartEdit,
    findMachineNeighbors,
    recomputeMachine,
} from "@/Constants/loadingPlanSchedule.js";
import { MACHINE_MANUAL, hasTimeline } from "@/Constants/machines.js";
import { useMutation } from "@/Hooks/useMutation";
import { useToast } from "@/Hooks/useToast";
import { createUndoStore } from "@/Store/undoStore";
import toSnakeCase from "@/Utils/toSnakeCase";
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    pointerWithin,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DataGrid, Row, SelectColumn } from "react-data-grid";
import "react-data-grid/lib/styles.css";

import DateNav from "@/Components/DateNav";
import DataIntegrityModal, {
    DATA_INTEGRITY_MODAL_ID,
    TabBadge,
} from "@/Components/LoadingPlan/DataIntegrityModal";
import DisseminationSummaryModal, {
    DISSEMINATION_MODAL_ID,
} from "@/Components/LoadingPlan/DisseminationSummary";
import HoverCell from "@/Components/LoadingPlan/HoverCell";
import interactiveCursorClasses from "@/Components/LoadingPlan/interactiveCursorClasses";
import { getStatusMessage } from "@/Constants/wipStatus.js";
import { Deferred, router } from "@inertiajs/react";
import { GoAlert } from "react-icons/go";

import AddEntryModal from "@/Components/LoadingPlan/AddEntriesModal";
import { LotIdCell } from "@/Components/LoadingPlan/LotIdCell";
import { usePersistedSet } from "@/Store/usePersistedSet";
import { autoUpdate, offset, useFloating } from "@floating-ui/react";
import { createPortal } from "react-dom";

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

const useDeemoStore = createUndoStore([]);

// Must match the actual row height / header height react-data-grid uses,
// since scroll math below (which group is "at top") depends on it.
const ROW_HEIGHT = 35;
const HEADER_ROW_HEIGHT = 35;

const EDITABLE_COLUMNS = {
    accu_time: "integer",
    remarks: "string",
    time_start: "time",
};

export function CellEditor({ row, column, onRowChange, onClose }) {
    const field = column.key;
    const type = EDITABLE_COLUMNS[field];
    const initialValue = String(row[field] ?? "");
    const valueRef = useRef(initialValue);
    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
    }, []);

    const commit = useCallback(() => {
        const next = valueRef.current;
        if (next === initialValue) {
            onClose(false);
            return;
        }
        onRowChange({ ...row, [field]: coerceValue(next, type) }, true);
    }, [row, field, type, initialValue, onRowChange, onClose]);

    const inputType = getInputType(type);

    return (
        <input
            ref={inputRef}
            type={inputType}
            defaultValue={initialValue}
            className="w-full h-full border border-info ring-2 ring-info/30 rounded px-2 text-sm outline-none bg-base-100 text-base-content"
            onChange={(e) => {
                valueRef.current = e.target.value;
            }}
            onBlur={commit}
            onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") onClose(false);
            }}
        />
    );
}

const coerceValue = (value, type) => {
    switch (type) {
        case "integer": {
            const n = parseInt(value, 10);
            return Number.isNaN(n) ? 0 : n;
        }
        case "decimal": {
            const n = parseFloat(value);
            return Number.isNaN(n) ? 0 : n;
        }
        default:
            return value;
    }
};

const getInputType = (type) => {
    switch (type) {
        case "integer":
        case "decimal":
            return "number";
        case "time":
            return "time";
        case "date":
            return "date";
        default:
            return "text";
    }
};

// Real header cell rendered inside the grid -- this is the actual drop
// target (id keyed off machine name, matching row.machine on data rows).
// For Unassigned/MANUAL, row.machine is null/"MANUAL" -- droppableMachineFromToken()
// below undoes the string coercion when reading the id back on drop.
function MachineHeaderCell({ row, rowCount, onToggleCollapse }) {
    const { setNodeRef, isOver } = useDroppable({
        id: `machine-${row.machine}`,
    });

    return (
        <div ref={setNodeRef} className="flex items-center gap-1 w-full h-full">
            <div className="flex-1 min-w-0 h-full">
                <MachineHeaderBar 
                    row={row} 
                    rowCount={rowCount} 
                    isOver={isOver}
                    innerRef={setNodeRef}
                    isCollapsed={row.__isCollapsed}
                    onToggleCollapse={onToggleCollapse}
                />
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------
// Column definitions
// Field keys line up 1:1 with createPlannedLot()'s return array
// (part_name, lot_id, qty, package_name, lead_count, status,
// sequence_order, time_start, time_end, doable, doable_status) so
// mapping backend entries -> grid rows needs no renaming.
// ---------------------------------------------------------------------

const DATA_COLUMNS = [
    { key: "id", editable: false, name: "id" },
    { key: "entry_id", editable: false, name: "Entry ID" },
    { key: "part_name", editable: false, name: "Part Name" },
    { key: "lead_count", editable: false, name: "Lead Count" },
    { key: "package_name", editable: false, name: "Package Name" },
    { key: "lot_id", editable: false, name: "Lot ID", width: 160 },
    { key: "status", editable: false, name: "Status" },
    { key: "qty", editable: false, name: "Qty" },
    { key: "doable", editable: false, name: "Doable" },
    { key: "capacity_uph", editable: false, name: "Capacity Uph" },
    { key: "accu_time", editable: true, name: "Accu Time" },
    { key: "time_start", editable: true, name: "Start", width: 130 },
    { key: "time_end", editable: false, name: "End", width: 130 },
    { key: "lot_type", editable: false, name: "Lot Type" },
    { key: "lot_status", editable: false, name: "Lot Status" },
    {
        key: "lot_entry_time_days_in",
        editable: false,
        name: "Lot Entry Time Days In",
    },
    { key: "cr3", editable: false, name: "Cr3" },
    { key: "be_osl_days", editable: false, name: "Be Osl Days" },
    { key: "ct", editable: false, name: "Ct" },
    { key: "osl", editable: false, name: "Osl" },
    { key: "body_size", editable: false, name: "Body Size" },
    { key: "ramp_time", editable: false, name: "Ramp Time" },
    { key: "sequence_order", editable: false, name: "Seq" },
    { key: "doable_status", editable: false, name: "Doable Status" },
    { key: "remarks", editable: true, name: "Remarks" },
];

// dragHandle + all data columns; used for the header row's colSpan so it
// spans the whole grid width regardless of how many columns are defined.
const NUM_COLUMNS = DATA_COLUMNS.length + 1;

function RowDropTargetCell({ rowId }) {
    const { attributes, listeners, setNodeRef } = useDraggable({ id: rowId });
    // console.log("🚀 ~ RowDropTargetCell ~ rowId:", rowId)

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className="absolute inset-0 ..."
        >
            <button className="btn btn-ghost rounded-none w-full h-full cursor-grab">
                ⠿
            </button>
        </div>
    );
}

function RowInsertButtons({ anchorElement, onInsertAbove, onInsertBelow, buttonsRef }) {
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

    return createPortal(
        <div className="join join-vertical" ref={buttonsRef} style={{ display: "contents" }}>
            <button
                ref={above.refs.setFloating}
                style={{ ...above.floatingStyles, zIndex: 9999 }}
                className="btn btn-xs join-item insert-row-btn"
                onClick={onInsertAbove}
            >
                ↓+
            </button>
            <button
                ref={below.refs.setFloating}
                style={{ ...below.floatingStyles, zIndex: 9999 }}
                className="btn btn-xs join-item insert-row-btn"
                onClick={onInsertBelow}
            >
                ↑+
            </button>
        </div>,
        document.body
    );
}

function DroppableRow({ rowIdxByElement, props }) {
    const { row, rowIdx } = props;

    if (row.__type === "header") {
        return <Row {...props} />;
    }

    const { setNodeRef, isOver } = useDroppable({
        id: `row-${row.id}`,
    });

    const setRefs = (el) => {
        setNodeRef(el);
        if (el) rowIdxByElement.set(el, rowIdx);
    };

    return (
        <Row
            ref={setRefs}
            {...props}
            className={isOver ? "bg-sky-500/10" : undefined}
        />
    );
}

export const isBlockRow = (row) => row?.is_block === true;

// Range 1: Part Name (index 2) to Qty (index 7)
const PARTNAME_TO_QTY_KEYS = new Set([
  "part_name", 
  "lead_count", 
  "package_name", 
  "lot_id", 
  "status", 
  "qty"
]);

// Range 2: Part Name to Bake_Time_Temp (Bake Time/Temp equivalent in your dataset)
const PARTNAME_TO_BAKE_KEYS = new Set([
  "part_name", "lead_count", "package_name", "lot_id", 
  "status", "qty", "doable", "capacity_uph", "accu_time", 
  "time_start", "time_end", "lot_type", "lot_status", 
  "lot_entry_time_days_in", "cr3", "be_osl_days", "ct", 
  "osl", "body_size", "ramp_time"
]);

function makeColumns(hoveredRowId, isUpdating, onStatusClick, onToggleCollapse) {
    return [
        SelectColumn,
        {
            key: "dragHandle",
            name: "",
            width: 20,
            resizable: false,
            colSpan(args) {
                if (args.type === "ROW" && args.row.__type === "header") {
                    return NUM_COLUMNS;
                }
                return undefined;
            },
            renderCell({ row }) {
                if (row.__type === "header") {
                    return (
                        <MachineHeaderCell
                            row={row}
                            rowCount={row.__rowCount}
                            onToggleCollapse={onToggleCollapse}
                        />
                    );
                }
                return <RowDropTargetCell rowId={row.id} />;
            },
        },
        ...DATA_COLUMNS.map((col) => {
            // Helper function to resolve dynamic cell class per row and column
            const getDynamicCellClass = (row) => {
                // console.log("LOG ~ Deemo.jsx:438 ~ getDynamicCellClass ~ row:", row);
                if (row.__type === "header") return "";

                const classes = [];

                // Rule 8 & 12: Color range from Part Name to Qty
                if (PARTNAME_TO_QTY_KEYS.has(col.key)) {
                    if (row.cycle_time_exceed) {
                        classes.push("bg-yellow-highlight");
                    }
                    if (row.cycle_time_exceed_residual) {
                        classes.push("bg-amber-highlight");
                    }
                }

                // Rule 11: Color range from Part Name to Bake Time/Temp (Red Font)
                if (PARTNAME_TO_BAKE_KEYS.has(col.key) && row.is_bake_highlight) {
                    classes.push("text-red-highlight");
                }

                if (col.key === "cr3" && row.cr3 === "RES") {
                    classes.push("bg-red-res")
                }

                return classes.join(" ");
            };

            if (col.key === "status") {
                return {
                    ...col,
                    cellClass: (row) => getDynamicCellClass(row),
                    renderCell({ row }) {
                        if (row.__type === "header") return null;
                        return (
                            <button
                                type="button"
                                className="btn btn-ghost btn-xs px-1"
                                onClick={(e) =>
                                    onStatusClick?.(e, row.entry_id)
                                }
                                disabled={isUpdating}
                            >
                                <StatusBadge status={row.status} />
                            </button>
                        );
                    },
                };
            }

            if (col.key === "lot_id") {
                return {
                    ...col,
                    cellClass: (row) => getDynamicCellClass(row),
                    renderCell({ row }) {
                        if (row.__type === "header") return null;
                        return (
                            <LotIdCell
                                lotId={row.lot_id}
                                splitInfo={row.split_info}
                                mergeInfo={row.merge_info}
                                isPlannedYesterday={row.is_leaked}
                            />
                        );
                    },
                };
            }

            return {
                ...col,
                frozen: col.frozen ?? false,
                width: col.width,
                cellClass: (row) => getDynamicCellClass(row),
                renderCell({ row }) {
                    if (row.__type === "header") return null;

                    if (isBlockRow(row)) {
                        if (col.key === "part_name") {
                            return (
                                <span className="font-semibold flex items-center gap-1.5 truncate">
                                    ▨ {row.block_label}
                                </span>
                            );
                        }
                        if (col.key === "lot_id") {
                            return (
                                <span className="font-semibold flex items-center gap-1.5 truncate">
                                    {row.block_label} ▨
                                </span>
                            );
                        }
                        
                        if (["accu_time", "time_start", "time_end"].includes(col.key)) {
                            return row[col.key];
                        }

                        return null; // blank every other cell for a block row
                    }

                    return row[col.key];
                },
                ...(EDITABLE_COLUMNS[col.key] && {
                    renderEditCell: CellEditor,
                    editable: (row) =>
                        !isUpdating &&
                        row.__type !== "header" &&
                        !(isBlockRow(row) && col.key !== "accu_time"),
                }),
            };
        }),
    ];
}

// "machine-null" / "machine-MANUAL" / "machine-<name>" -> null / "MANUAL" / "<name>".
// Needed because dnd-kit ids are strings, so `machine-${row.machine}` coerces
// null to the literal text "null" on the way in.
function droppableMachineFromToken(overId) {
    const raw = overId.replace("machine-", "");
    if (raw === "null" || raw === "undefined") return null;
    return raw;
}

/**
 * Diff two dataRows snapshots (before/after an undo or redo) into a list
 * of batch-apply operations and persist them atomically. Ported from
 * LoadingPlanTable.jsx's syncToServer — keyed off `entry_id` instead of
 * `_dndId`, since Deemo rows already use entry_id as their stable grid
 * row id. Newly-created, not-yet-saved rows should carry a temporary
 * entry_id (assigned by the server response as soon as the create call
 * resolves) so they still have a stable, unique key to diff against.
 *
 * NOTE: this diffs on `entry_id`, unlike the rest of this file which
 * diffs/keys on `id`. That's intentional here — undo/redo snapshots are
 * only meaningfully comparable once a row is persisted (has an
 * entry_id); this function isn't touched by the id/entry_id fix below.
 */
function syncDeemoToServer(prevRows, nextRows, date, mutate, update, toast) {
    const prevById = new Map(prevRows.map((r) => [r._dndId, r]));
    const nextById = new Map(nextRows.map((r) => [r._dndId, r]));

    const removed = prevRows.filter((r) => !nextById.has(r._dndId));
    const added = nextRows.filter((r) => !prevById.has(r._dndId));

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
            p.remarks !== r.remarks ||
            p.tag !== r.tag ||
            p.accu_time !== r.accu_time ||
            positionChanged
        );
    });

    const operations = [];
    const opOwners = [];

    removed.forEach((r) => {
        if (r.split_info?.isChild && r.split_info?.splitId) {
            operations.push({
                type: "revert_split",
                split_id: r.split_info.splitId,
            });
            opOwners.push({
                entryId: r.entry_id,
                kind: "revert_split",
                snapshot: r,
                dndId: r._dndId,
            });
            return;
        }
        if (!r.entry_id) return;
        operations.push({
            type: "delete",
            entry_id: r.entry_id,
            machine: r.machine,
        });
        opOwners.push({ 
            entryId: r.entry_id, 
            kind: "delete", 
            snapshot: r,
            dndId: r._dndId,
        });
    });

    added.forEach((r) => {
        if (r.split_info?.isChild && r.split_info?.splitId) {
            operations.push({
                type: "unrevert_split",
                split_id: r.split_info.splitId,
            });
            opOwners.push({ 
                entryId: r.entry_id, 
                kind: "unrevert_split",
                dndId: r._dndId,
            });
            return;
        }

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
                label: r.block_label,
                duration: r.accu_time,
                before_entry_id: beforeEntryId,
                after_entry_id: afterEntryId,
            });
        } else {
            operations.push({
                type: "create_lot",
                lot_id: r.lot_id,
                fields: {
                    status: r.status,
                    remarks: r.remarks,
                    tag: r.tag,
                    accu_time: r.accu_time,
                    doable: r.doable,
                },
                machine: r.machine,
                before_entry_id: beforeEntryId,
                after_entry_id: afterEntryId,
            });
        }
        opOwners.push({ 
            entryId: r.entry_id, 
            kind: "create",
            dndId: r._dndId,
        });
    });

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
                lot_id: isBlock ? null : r.lot_id,
                entry_id: r.entry_id ?? null,
                target_machine: machineChanged ? r.machine : undefined,
                machine: r.machine,
                before_entry_id: beforeEntryId,
                after_entry_id: afterEntryId,
            });
            opOwners.push({
                entryId: r.entry_id,
                kind: "reposition",
                snapshot: p,
                dndId: r._dndId,
            });
        }

        const fields = {};
        if (p.status !== r.status) fields.status = r.status;
        if (p.remarks !== r.remarks) fields.remarks = r.remarks;
        if (p.tag !== r.tag) fields.tag = r.tag;
        if (p.accu_time !== r.accu_time) fields.accu_time = r.accu_time;

        if (Object.keys(fields).length > 0) {
            operations.push({
                type: "update_field",
                entry_type: isBlock ? "block" : "lot",
                lot_id: isBlock ? null : r.lot_id,
                entry_id: isBlock ? r.entry_id : null,
                fields,
                lock_version: p.lock_version ?? null,
            });
            opOwners.push({ 
                entryId: r.entry_id, 
                kind: "field", 
                snapshot: p,
                dndId: r._dndId,
            });
        }
    });

    if (operations.length === 0) return Promise.resolve();

    return mutate(route("loading-plan.batch-apply"), {
        body: { operations, scheduled_date: date },
    })
        .then(({ results }) => {
            update((prev) => {
                let next = prev
                    .map((row) => {
                        const ownerIdx = opOwners.findIndex(
                            (o) => o.dndId === row._dndId,
                        );
                        if (ownerIdx === -1) return row;
                        const result = results[ownerIdx];
                        if (!result) return row;
                        if (result.deleted) return null;

                        return {
                            ...row,
                            ...result,
                            id: row.id, // never let a server payload override frontend grid identity
                        };
                    })
                    .filter(Boolean);

                results.forEach((result) => {
                    if (result?.parent) {
                        next = next.map((r) =>
                            r.lot_id === result.parent.lot_id
                                ? {
                                      ...r,
                                      qty: result.parentQty ?? r.qty,
                                      doable: result.parentDoable ?? r.doable,
                                      doable_status:
                                          result.parentDoableStatus ??
                                          r.doable_status,
                                      doable_recipe_source:
                                          result.doable_recipe_source ??
                                          r.doable_status,
                                      capacity_uph:
                                          result.parentCapacityUph ??
                                          r.capacity_uph,
                                      lock_version:
                                          result.parent.lock_version ??
                                          r.lock_version,
                                      split_info:
                                          result.parentSplitInfo ??
                                          r.split_info,
                                  }
                                : r,
                        );
                    }
                });

                return next;
            }, true);
        })
        .catch((err) => {
            console.error("Undo/redo batch failed to persist:", err);
            update(() => prevRows);
            toast?.error?.("That undo couldn't be saved and was reverted.");
        });
}

// ---------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------

export default function Deemo({
    data,
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
    // console.log("LOG ~ Deemo.jsx:683 ~ Deemo ~ data:", data);
    // console.log(
    // "LOG ~ Deemo.jsx:666 ~ Deemo ~ serverMachines:",
    // serverMachines,
    // );
    const {
        present: dataRows,
        update,
        undo,
        redo,
        canUndo,
        canRedo,
    } = useDeemoStore();

    const toast = useToast();
    const { mutate } = useMutation();

    const [activePackage, setActivePackage] = useState("LGA");
    const [activeId, setActiveId] = useState(null);
    const [hoveredRowId, setHoveredRowId] = useState(null);
    const [selectedRows, setSelectedRows] = useState(() => new Set());
    // console.log("🚀 ~ Deemo ~ selectedRows:", selectedRows)
    const [inFlightCount, setInFlightCount] = useState(0);
    const [, setIsDirty] = useState(false);
    const [statusMenu, setStatusMenu] = useState(null);

    const [collapsedMachines, setCollapsedMachines] = usePersistedSet('collapsedMachines');
    // split/merge history
    const [splitHistoryData, setSplitHistoryData] = useState(null);
    const [mergeHistoryData, setMergeHistoryData] = useState(null);
    const [currentLotRole, setCurrentLotRole] = useState({
        isParent: false,
        isChild: false,
    });
    const [historyLoading, setHistoryLoading] = useState(false);

    const addEntryModalRef = useRef(null);
    const splitHistoryModalRef = useRef(null);
    const mergeHistoryModalRef = useRef(null);
    const pickupInsertModalRef = useRef(null);

    const [lastHoveredRow, setLastHoveredRow] = useState(null);

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

    /** @type {WeakMap<HTMLElement, number>} */
    const rowIdxByElement = useRef(new WeakMap()).current;
    const containerRef = useRef(null);
    const buttonsRef = useRef(null); // Ref to hold the portaled buttons container
    const hoveredRowRef = useRef(null);
    const [hoveredRow, setHoveredRow] = useState(null);
    const [placementOfNewEntry, setPlacementOfNewEntry] = useState(null);

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

        useDeemoStore.getState().reset(seeded);
    }, [data]);

    const machines = useMemo(() => {
        return [null, MACHINE_MANUAL, ...serverMachines.map((m) => m.name)];
    }, [serverMachines]);

    const activePackageGroup = useMemo(
        () => packageGroups[activePackage] || null,
        [activePackage, packageGroups],
    );

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

    const gridRef = useRef(null);
    const [stickyMachine, setStickyMachine] = useState(null);

    const clearSelection = useCallback(() => {
        setSelectedRows(new Set());
    }, []);

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

    // ── Bulk operations (wired to SelectionToolbar) ─────────────────────────
    // FIX: `selectedRows` is react-data-grid's selection Set, keyed by
    // whatever rowKeyGetter returns — which is `row.id` (see rowKeyGetter
    // on <DataGrid> below), NOT `row.entry_id`. Every handler here must
    // test membership with `selectedRows.has(r.id)`. `r.entry_id` is only
    // used for the outgoing API payloads once a row is actually selected.
    const handleBulkTag = useCallback(
        (tag) => {
            const targets = dataRows.filter((r) => selectedRows.has(r.id));
            update((prev) =>
                prev.map((r) => (selectedRows.has(r.id) ? { ...r, tag } : r)),
            );
            setIsDirty(true);

            // return; // stub: skip persisting until backend wired up

            withUpdating(
                mutate(route("loading-plan.bulk-update"), {
                    body: {
                        updates: targets.map((r) => ({
                            entry_id: r.entry_id ?? null,
                            fields: { tag },
                            lock_version: r.lock_version ?? 0,
                        })),
                    },
                }),
            )
                .then(({ entries }) => {
                    update(
                        (prev) =>
                            prev.map((r) => {
                                const match = entries?.find(
                                    (e) =>
                                        e.id === r.entry_id ||
                                        e.lot_id === r.lot_id,
                                );
                                return match
                                    ? {
                                          ...r,
                                          entry_id: match.id,
                                          lock_version: match.lock_version,
                                      }
                                    : r;
                            }),
                        true,
                    );
                })
                .catch((err) => {
                    console.error("Bulk tag update failed:", err);
                    undo();
                    if (err.status === 409) {
                        const conflicts = err.data?.conflicts ?? [];
                        toast?.error?.(
                            conflicts.length > 0
                                ? `${conflicts.length} row(s) were changed by someone else — the tag change was cancelled.`
                                : "Some rows were changed by someone else — the tag change was cancelled.",
                        );
                    } else {
                        toast?.error?.("Couldn't apply tag — reverted.");
                    }
                });
        },
        [
            selectedRows,
            update,
            dataRows,
            date,
            undo,
            withUpdating,
            mutate,
            toast,
        ],
    );

    // LoadingPlanTable.jsx had a near-identical, separate handleBulkClearTag
    // — collapsed here since "clear" is just tag: null through the same
    // bulk-update payload shape.
    const handleBulkClearTag = useCallback(
        () => handleBulkTag(null),
        [handleBulkTag],
    );

    const handleBulkStatus = useCallback(
        (newStatus) => {
            const normalizedStatus = newStatus === "NONE" ? null : newStatus;
            const targets = dataRows.filter(
                (r) => selectedRows.has(r.id) && !isBlockRow(r),
            );

            update((prev) =>
                prev.map((r) =>
                    selectedRows.has(r.id) && !isBlockRow(r)
                        ? { ...r, status: normalizedStatus }
                        : r,
                ),
            );
            setIsDirty(true);

            // return; // stub: skip persisting until backend wired up

            withUpdating(
                mutate(route("loading-plan.bulk-update"), {
                    body: {
                        updates: targets.map((r) => ({
                            entry_id: r.entry_id ?? null,
                            fields: { status: normalizedStatus },
                            lock_version: r.lock_version ?? 0,
                        })),
                    },
                }),
            )
                .then(({ entries }) => {
                    update(
                        (prev) =>
                            prev.map((r) => {
                                const match = entries?.find(
                                    (e) => e.lot_id === r.lot_id,
                                );
                                return match
                                    ? {
                                          ...r,
                                          entry_id: match.id,
                                          lock_version: match.lock_version,
                                      }
                                    : r;
                            }),
                        true,
                    );
                })
                .catch((err) => {
                    console.error("Bulk status update failed:", err);
                    undo();
                    toast?.error?.("Couldn't apply status — reverted.");
                });
        },
        [
            selectedRows,
            update,
            dataRows,
            date,
            undo,
            withUpdating,
            mutate,
            toast,
        ],
    );

    const handleBulkTransfer = useCallback(
        (targetMachine) => {
            const selected = dataRows.filter((r) => selectedRows.has(r.id));
            const lotIds = selected
                .filter((r) => !isBlockRow(r) && r.lot_id)
                .map((r) => r.lot_id);
            const blockEntryIds = selected
                .filter((r) => isBlockRow(r) && r.entry_id)
                .map((r) => r.entry_id);

            const affectedMachines = new Set();
            update((prev) => {
                const next = prev.map((r) => {
                    if (!selectedRows.has(r.id)) return { ...r };
                    affectedMachines.add(r.machine);
                    affectedMachines.add(targetMachine);
                    return { ...r, machine: targetMachine };
                });
                if (baseTimes)
                    affectedMachines.forEach((m) =>
                        recomputeMachine(next, m, baseTimes, date),
                    );
                return next;
            });
            setIsDirty(true);
            clearSelection();

            if (lotIds.length > 0 || blockEntryIds.length > 0) {
                // return; // stub: skip persisting until backend wired up

                withUpdating(
                    mutate(route("loading-plan.bulk-transfer"), {
                        body: {
                            lot_ids: lotIds,
                            block_entry_ids: blockEntryIds,
                            target_machine: targetMachine,
                            scheduled_date: date,
                        },
                    }),
                )
                    .then((updatedEntries) => {
                        update(
                            (prev) =>
                                prev.map((r) => {
                                    const match = updatedEntries?.find((e) =>
                                        isBlockRow(r)
                                            ? e.id === r.entry_id
                                            : e.lot_id === r.lot_id,
                                    );
                                    return match ? { ...r, ...match } : r;
                                }),
                            true,
                        );
                    })
                    .catch((err) => {
                        console.error("Bulk transfer failed:", err);
                        toast?.error?.(err?.message);
                    });
            }
        },
        [
            selectedRows,
            update,
            dataRows,
            baseTimes,
            date,
            clearSelection,
            withUpdating,
            mutate,
            toast,
        ],
    );

    const handleBulkDelete = useCallback(() => {
        const targets = dataRows.filter(
            (r) => selectedRows.has(r.id) && r.entry_id,
        );
        const entryIds = targets.map((r) => r.entry_id);

        update((prev) => {
            const affectedMachines = new Set();
            const next = prev
                .map((r) => {
                    if (!selectedRows.has(r.id)) return r;
                    if (isBlockRow(r)) return r; // blocks get removed below
                    affectedMachines.add(r.machine);
                    return { ...r, machine: null, sequence_order: null };
                })
                .filter((r) => !(selectedRows.has(r.id) && isBlockRow(r)));

            if (baseTimes)
                affectedMachines.forEach((m) =>
                    recomputeMachine(next, m, baseTimes, date),
                );
            return next;
        });

        setIsDirty(true);
        clearSelection();

        if (entryIds.length > 0) {
            // return; // stub: skip persisting until backend wired up

            withUpdating(
                mutate(route("loading-plan.bulk-delete"), {
                    body: { ids: entryIds, scheduled_date: date },
                }),
            )
                .then(({ unassigned }) => {
                    update(
                        (prev) =>
                            prev.map((r) => {
                                const match = unassigned?.find(
                                    (e) => e.id === r.entry_id,
                                );
                                return match
                                    ? { ...r, lock_version: match.lock_version }
                                    : r;
                            }),
                        true,
                    );
                })
                .catch((err) => {
                    console.error("Bulk delete failed:", err);
                    undo();
                    toast?.error?.("Couldn't delete/unassign — reverted.");
                });
        }
    }, [
        selectedRows,
        update,
        dataRows,
        baseTimes,
        date,
        clearSelection,
        undo,
        withUpdating,
        mutate,
        toast,
    ]);

    // ── Undo / redo ──────────────────────────────────────────────────────
    const dataRowsRef = useRef(dataRows);
    useEffect(() => {
        dataRowsRef.current = dataRows;
    }, [dataRows]);
    const isSyncingRef = useRef(false);

    const handleUndo = useCallback(async () => {
        if (isSyncingRef.current) return;
        isSyncingRef.current = true;
        try {
            const prevSnapshot = dataRowsRef.current;
            undo();

            let nextSnapshot = useDeemoStore.getState().present.map((r) => ({ ...r }));

            if (baseTimes) {
                const affectedMachines = new Set([
                    ...prevSnapshot.map((r) => r.machine),
                    ...nextSnapshot.map((r) => r.machine),
                ]);
                affectedMachines.forEach((m) => {
                    if (m !== null) recomputeMachine(nextSnapshot, m, baseTimes, date);
                });
                update(() => nextSnapshot, true); // silent — no new undo/redo step
            }

            await syncDeemoToServer(
                prevSnapshot,
                nextSnapshot,
                date,
                mutate,
                update,
                toast,
            );
        } finally {
            isSyncingRef.current = false;
        }
    }, [undo, date, mutate, update, toast, baseTimes]);

    const handleRedo = useCallback(async () => {
        if (isSyncingRef.current) return;
        isSyncingRef.current = true;
        try {
            const prevSnapshot = dataRowsRef.current;
            redo();

            let nextSnapshot = useDeemoStore.getState().present.map((r) => ({ ...r }));

            if (baseTimes) {
                const affectedMachines = new Set([
                    ...prevSnapshot.map((r) => r.machine),
                    ...nextSnapshot.map((r) => r.machine),
                ]);
                affectedMachines.forEach((m) => {
                    if (m !== null) recomputeMachine(nextSnapshot, m, baseTimes, date);
                });
                update(() => nextSnapshot, true);
            }

            await syncDeemoToServer(
                prevSnapshot,
                nextSnapshot,
                date,
                mutate,
                update,
                toast,
            );
        } finally {
            isSyncingRef.current = false;
        }
    }, [redo, date, mutate, update, toast, baseTimes]);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") clearSelection();
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
                            dataRowsRef.current
                                .filter((r) => r.entry_id)
                                .map((r) => r.entry_id),
                        ),
                    );
                }
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [handleUndo, handleRedo, clearSelection]);

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

    // ── Split / merge (ported from LoadingPlanTable.jsx) ────────────────────
    const handleShowSplitHistory = useCallback(
        async (rootLotId, isParent, isChild) => {
            console.log("HAHHAAHAHAH")
            splitHistoryModalRef.current?.showModal();
            setHistoryLoading(true);
            setSplitHistoryData(null);
            setCurrentLotRole({ isParent, isChild });

            try {
                const res = await fetch(
                    route("loading-plan.splits.history", rootLotId),
                );
                setSplitHistoryData(await res.json());
            } catch (err) {
                console.error("Failed to load split history:", err);
                toast?.error?.(
                    "Couldn't load split history — please try again.",
                );
                splitHistoryModalRef.current?.close();
            } finally {
                setHistoryLoading(false);
            }
        },
        [toast],
    );

    const handleShowMergeHistory = useCallback(
        async (targetLotId, isParent, isChild) => {
            mergeHistoryModalRef.current?.showModal();
            setHistoryLoading(true);
            setMergeHistoryData(null);
            setCurrentLotRole({ isParent, isChild });

            setHistoryLoading(false); // stub: avoid a perma-spinner while stubbed
            // return; // stub: skip fetching until backend wired up

            try {
                const res = await fetch(
                    route("loading-plan.merges.history", { targetLotId }),
                );
                setMergeHistoryData(await res.json());
            } catch (err) {
                console.error("Failed to load merge history:", err);
                toast?.error?.(
                    "Couldn't load merge history — please try again.",
                );
                mergeHistoryModalRef.current?.close();
            } finally {
                setHistoryLoading(false);
            }
        },
        [toast],
    );

    const handleSplitRevert = useCallback(
        ({ splitId, revertedBy, childLotId }) => {
            const childRow = dataRows.find((r) => r.lot_id === childLotId);
            if (!childRow) {
                toast?.error?.("Couldn't find the split lot — please refresh.");
                return;
            }
            const affectedMachine = childRow.machine;

            // return; // stub: skip persisting until backend wired up

            withUpdating(
                mutate(route("loading-plan.splits.destroy", splitId), {
                    method: "delete",
                    body: { reverted_by: revertedBy },
                }),
            )
                .then((result) => {
                    update((prev) => {
                        const next = prev
                            .filter((r) => r.lot_id !== result.deleted)
                            .map((r) =>
                                result.parent &&
                                r.lot_id === result.parent.lot_id
                                    ? {
                                          ...r,
                                          qty: result.parentQty ?? r.qty,
                                          doable:
                                              result.parentDoable ?? r.doable,
                                          doable_status:
                                              result.parentDoableStatus ??
                                              r.doable_status,
                                          capacity_uph:
                                              result.parentCapacityUph ??
                                              r.capacity_uph,
                                          lock_version:
                                              result.parent.lock_version,
                                          split_info: result.parentSplitInfo,
                                      }
                                    : r,
                            );
                        if (baseTimes && affectedMachine)
                            recomputeMachine(
                                next,
                                affectedMachine,
                                baseTimes,
                                date,
                            );
                        return next;
                    });
                    setIsDirty(true);
                })
                .catch((err) => {
                    console.error("Failed to revert split:", err);
                    toast?.error?.(
                        "Couldn't revert the split — please try again.",
                    );
                })
                .finally(() => splitHistoryModalRef.current?.close());
        },
        [dataRows, baseTimes, date, update, withUpdating, mutate, toast],
    );

    const handleMergeRevert = useCallback(
        ({ targetLotId, sourceLotId }) => {
            const targetRow = dataRows.find((r) => r.lot_id === targetLotId);
            const sourceRow = dataRows.find((r) => r.lot_id === sourceLotId);
            if (!targetRow || !sourceRow) {
                toast?.error?.(
                    "Couldn't find the lots to revert — please refresh.",
                );
                return;
            }
            const mergeId = targetRow.merge_info?.mergeId;
            if (!mergeId) {
                toast?.error?.(
                    `Couldn't find merge record for lot ${targetLotId} — please refresh.`,
                );
                return;
            }
            const affectedTarget = targetRow.machine;
            const affectedSource = sourceRow.machine;

            // return; // stub: skip persisting until backend wired up

            withUpdating(
                mutate(route("loading-plan.merges.destroy", mergeId), {
                    method: "delete",
                    body: { reverted_by: null },
                }),
            )
                .then((result) => {
                    const { target, source } = result;
                    update((prev) => {
                        const next = prev.map((row) => {
                            if (row.lot_id === target.lot_id) {
                                return {
                                    ...row,
                                    qty: target.qty,
                                    lock_version: target.lock_version,
                                    merge_info: null,
                                    doable: target.doable,
                                    doable_status: target.doable_status,
                                    capacity_uph: target.capacity_uph,
                                };
                            }
                            if (row.lot_id === source.lot_id) {
                                return {
                                    ...row,
                                    qty: source.qty,
                                    lock_version: source.lock_version,
                                    merge_info: null,
                                    doable: source.doable,
                                    doable_status: source.doable_status,
                                    capacity_uph: source.capacity_uph,
                                };
                            }
                            return row;
                        });
                        if (baseTimes) {
                            if (affectedTarget)
                                recomputeMachine(
                                    next,
                                    affectedTarget,
                                    baseTimes,
                                    date,
                                );
                            if (affectedSource)
                                recomputeMachine(
                                    next,
                                    affectedSource,
                                    baseTimes,
                                    date,
                                );
                        }
                        return next;
                    });
                    setIsDirty(true);
                })
                .catch((err) => {
                    console.error("Failed to revert merge:", err);
                    toast?.error?.(
                        err?.message ??
                            "Couldn't revert the merge — please try again.",
                    );
                })
                .finally(() => mergeHistoryModalRef.current?.close());
        },
        [dataRows, baseTimes, date, update, withUpdating, mutate, toast],
    );

    const handleMergeRows = useCallback(
        ({ targetLotEntryId, sourceLotEntryId }) => {
            const targetRow = dataRows.find(
                (r) => r.entry_id === targetLotEntryId,
            );
            const sourceRow = dataRows.find(
                (r) => r.entry_id === sourceLotEntryId,
            );
            if (!targetRow || !sourceRow) {
                toast?.error?.(
                    "Couldn't find the lots to merge — please refresh.",
                );
                return;
            }
            const affectedTarget = targetRow.machine;
            const affectedSource = sourceRow.machine;

            // return; // stub: skip persisting until backend wired up

            withUpdating(
                mutate(route("loading-plan.merges.store"), {
                    body: {
                        entry_id_a: targetRow.entry_id,
                        entry_id_b: sourceRow.entry_id,
                        scheduled_date: date,
                    },
                }),
            )
                .then((result) => {
                    const { target, source } = result;
                    update((prev) => {
                        const next = prev.map((row) => {
                            if (row.entry_id === target.entry_id)
                                return { ...row, ...target };
                            if (row.entry_id === source.entry_id)
                                return { ...row, ...source };
                            return row;
                        });
                        if (baseTimes) {
                            if (affectedTarget)
                                recomputeMachine(
                                    next,
                                    affectedTarget,
                                    baseTimes,
                                    date,
                                );
                            if (affectedSource)
                                recomputeMachine(
                                    next,
                                    affectedSource,
                                    baseTimes,
                                    date,
                                );
                        }
                        return next;
                    });
                    setIsDirty(true);
                })
                .catch((err) => {
                    console.error("Failed to merge lots:", err);
                    toast?.error?.(
                        err?.message ??
                            "Couldn't merge the lots — please try again.",
                    );
                });
        },
        [dataRows, baseTimes, date, update, withUpdating, mutate, toast],
    );

    const handleSplitRow = useCallback(
        ({
            parentEntryLotId,
            childLotId,
            childQty,
            targetMachine,
            beforeEntryId,
            afterEntryId,
        }) => {
            const parentRow = dataRows.find(
                (r) => r.entry_id === parentEntryLotId,
            );
            if (!parentRow) {
                toast?.error?.(
                    "Couldn't find the lot to split — please refresh.",
                );
                return;
            }
            const parentMachine = parentRow.machine;

            // return; // stub: skip persisting until backend wired up

            withUpdating(
                mutate(route("loading-plan.splits.store"), {
                    body: {
                        parent_entry_lot_id: parentEntryLotId,
                        child_qty: childQty,
                        target_machine: targetMachine,
                        before_entry_id: beforeEntryId ?? null,
                        after_entry_id: afterEntryId ?? null,
                        child_lot_id: childLotId,
                    },
                }),
            )
                .then((result) => {
                    const { parent, child } = result;
                    update((prev) => {
                        const next = prev.map((row) =>
                            row.entry_id === parentEntryLotId
                                ? { ...row, ...parent }
                                : row,
                        );
                        next.push({
                            ...child,
                            status: child.status ?? parentRow.status ?? "NONE",
                            _dndId: `entry-${child.entry_id}`,
                        });
                        if (baseTimes) {
                            if (parentMachine)
                                recomputeMachine(
                                    next,
                                    parentMachine,
                                    baseTimes,
                                    date,
                                );
                            if (targetMachine !== parentMachine)
                                recomputeMachine(
                                    next,
                                    targetMachine,
                                    baseTimes,
                                    date,
                                );
                        }
                        return next;
                    });
                    setIsDirty(true);
                })
                .catch((err) => {
                    console.error("Failed to split lot:", err);
                    toast?.error?.(
                        err?.message ??
                            "Couldn't split the lot — please try again.",
                    );
                });
        },
        [dataRows, baseTimes, date, update, withUpdating, mutate, toast],
    );

    // ── Aggregates ───────────────────────────────────────────────────────
    const machinePlatform = useMemo(() => {
        const map = new Map();
        serverMachines.forEach((m) => map.set(m.name, m.platform));
        return map;
    }, [serverMachines]);

    const columns = useMemo(
        () => makeColumns(hoveredRowId, isUpdating, handleStatusClick, toggleMachineCollapsed),
        [hoveredRowId, isUpdating, handleStatusClick, toggleMachineCollapsed],
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
                if (isUnassigned) return true;
                if (isBlockRow(r)) return true;
                const activeList = activePackageGroup ?? [];
                return activeList.includes(r.package_name);
            });

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

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        function handlePointerOver(e) {
            const rowEl = e.target.closest(".rdg-row");
            if (!rowEl || rowEl === hoveredRowRef.current) return;
            const rowIdx = rowIdxByElement.get(rowEl);
            if (rowIdx === undefined) return;

            if (displayRows[rowIdx]) {
                setLastHoveredRow(displayRows[rowIdx]);
            }

            hoveredRowRef.current = rowEl;

            // console.log("LOG ~ Deemo.jsx:844 ~ handlePointerOver ~ rowIdx:", rowIdx);
            // console.log("LOG ~ Deemo.jsx:845 ~ handlePointerOver ~ element:", rowEl);
            setHoveredRow({ rowIdx, element: rowEl });


        }

        function handlePointerLeave(e) {
            // Check if cursor moved into the floating buttons or the container
            const movedTo = e.relatedTarget;
            if (
                buttonsRef.current?.contains(movedTo) ||
                container?.contains(movedTo)
            ) {
                return; // Stop here! Don't clear hover if we're hovering the buttons.
            }

            hoveredRowRef.current = null;
            setHoveredRow(null);
        }

        container.addEventListener("pointerover", handlePointerOver);
        container.addEventListener("pointerleave", handlePointerLeave);
        return () => {
            container.removeEventListener("pointerover", handlePointerOver);
            container.removeEventListener("pointerleave", handlePointerLeave);
        };
    }, [rowIdxByElement, displayRows]);

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

    const groupHeaderOffsets = useMemo(() => {
        return displayRows.reduce((acc, row, index) => {
            if (row.__type === "header") {
                acc.push({
                    rowIndex: index,
                    machine: row.machine,
                    machineLabel: row.machineLabel,
                    platform: row.platform,
                    rowCount: row.__rowCount,
                    isCollapsed: row.__isCollapsed,
                    otherPackageCount: row.otherPackageCount,
                });
            }
            return acc;
        }, []);
    }, [displayRows]);

    useEffect(() => {
        const el = gridRef.current?.element;
        if (!el || groupHeaderOffsets.length === 0) return;

        const handleScroll = () => {
            const rowAtTop = el.scrollTop / ROW_HEIGHT;
            let current = groupHeaderOffsets[0];
            for (const group of groupHeaderOffsets) {
                if (group.rowIndex <= rowAtTop) {
                    current = group;
                } else {
                    break;
                }
            }
            setStickyMachine(current);
        };

        handleScroll();
        el.addEventListener("scroll", handleScroll);
        return () => el.removeEventListener("scroll", handleScroll);
    }, [groupHeaderOffsets]);

    // ── Cell edits now persist (previously only touched local state) ───────
    const handleRowsChange = useCallback(
        (updatedRows, { indexes, column }) => {
            // Filter out edits attempted on non-data rows
            console.log("LOG ~ Deemo.jsx:2057 ~ Deemo ~ dataRows:", displayRows);
            const validChangedIndexes = indexes.filter(
                (index) => {
                    return displayRows[index]?.__type === "data";
                }
            );

            console.log("LOG ~ Deemo.jsx:2060 ~ Deemo ~ validChangedIndexes:", validChangedIndexes);

            // If no actual data rows were mutated, ignore the update entirely
            if (validChangedIndexes.length === 0) return;
           
            const sanitizedRows = updatedRows.map((row, idx) => {
                if (indexes.includes(idx) && row.__type !== "data") {
                    return displayRows[idx]; // Revert back to previous state
                }
                return row;
            });

            console.log("LOG ~ Deemo.jsx:2072 ~ Deemo ~ sanitizedRows:", sanitizedRows);
            
            console.log("LOG ~ Deemo.jsx:2056 ~ Deemo ~ column:", column);
            console.log("LOG ~ Deemo.jsx:2056 ~ Deemo ~ indexes:", indexes);
            console.log("LOG ~ Deemo.jsx:2056 ~ Deemo ~ updatedRows:", updatedRows);

            const firstChangedDataIdx = indexes.find(idx => displayRows[idx]?.__type === "data");
            const changedRow = sanitizedRows[firstChangedDataIdx];
            const field = column.key;
            // FIX: match on `id` (the grid's row key — see rowKeyGetter
            // below), not `entry_id`. A row can exist in the grid with an
            // `id` before it has a real backend `entry_id`.
            const prevRow = dataRows.find((r) => r.id === changedRow.id);

            console.log("LOG ~ Deemo.jsx:2089 ~ Deemo ~ dataRows:", dataRows);
            if (!prevRow) return;
            const value = changedRow[field];
            if (value === prevRow[field]) return;

            if (field === "time_start") {
                if (!baseTimes) {
                    toast?.error?.(
                        "Can't recompute the schedule — baseTimes wasn't provided to Deemo.",
                    );
                    return;
                }
                const { rows: withGap, error } = applyTimeStartEdit(
                    dataRows,
                    prevRow._dndId,
                    prevRow.machine,
                    value,
                    baseTimes,
                    date,
                );

                console.log("LOG ~ Deemo.jsx:2110 ~ Deemo ~ withGap:", withGap);
                
                if (error) {
                    toast?.error?.(error);
                    return;
                }

                recomputeMachine(withGap, prevRow.machine, baseTimes, date);
                const prevSnapshot = dataRows;
                update(() => withGap);
                setIsDirty(true);

                // return; // stub: skip persisting until backend wired up

                withUpdating(
                    syncDeemoToServer(
                        prevSnapshot,
                        withGap,
                        date,
                        mutate,
                        update,
                        toast,
                    ),
                );

                return;
            }

            update((prev) => {
                const next = prev.map((r) =>
                    r.id !== changedRow.id ? r : { ...r, [field]: value },
                );
                if (field === "accu_time" && baseTimes) {
                    recomputeMachine(next, prevRow.machine, baseTimes, date);
                }
                return next;
            });
            setIsDirty(true);

            // return; // stub: skip persisting until backend wired up

            const backendField = toSnakeCase(field);
            withUpdating(
                mutate(
                    route("loading-plan.entries.update", {
                        id: prevRow.entry_id ?? 0,
                    }),
                    {
                        method: "PATCH",
                        body: {
                            entry_type: isBlockRow(prevRow) ? "block" : "lot",
                            fields: { [backendField]: value },
                            lock_version: prevRow.lock_version ?? null,
                        },
                    },
                ),
            )
                .then((entry) => {
                    update(
                        (prev) =>
                            prev.map((r) =>
                                r.id === changedRow.id
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
                    if (err.status === 409) {
                        const current = err.data?.current;
                        update(
                            (prev) =>
                                prev.map((r) =>
                                    r.id === changedRow.id
                                        ? {
                                              ...r,
                                              [field]:
                                                  current?.[backendField] ??
                                                  r[field],
                                              lock_version:
                                                  current?.lock_version ??
                                                  r.lock_version,
                                          }
                                        : r,
                                ),
                            true,
                        );
                        toast?.error?.(
                            "Someone else updated this lot — showing their latest value.",
                        );
                    } else if (err.status === 422) {
                        const firstError = Object.values(
                            err.data?.errors ?? {},
                        )[0]?.[0];
                        toast?.error?.(firstError ?? "That value isn't valid.");
                    } else {
                        console.error("Failed to save field edit:", err);
                        toast?.error?.(
                            err.data?.message ??
                                "Failed to save your change. Please try again.",
                        );
                    }
                });
        },
        [dataRows, baseTimes, date, update, withUpdating, mutate, toast],
    );

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 4 },
        }),
    );

    const handleDragStart = useCallback(
        (event) => {
            setActiveId(event.active.id);
            clearSelection();
        },
        [clearSelection],
    );

    // FIX: onDragCancel referenced this but it never existed — cancelling
    // a drag (e.g. Escape mid-drag) would throw a ReferenceError.
    const handleDragCancel = useCallback(() => {
        setActiveId(null);
        setHoveredRowId(null);
    }, []);

    const handleDragEnd = useCallback(
        (event) => {
            setActiveId(null);
            const { active, over } = event;
            if (!over) return;

            const overId = String(over.id);
            // FIX: these are the grid's row `id` (see rowKeyGetter,
            // useDraggable/useDroppable ids above), NOT the backend
            // `entry_id` — renamed from draggedEntryId/targetEntryId,
            // which were misleadingly named even though they already
            // compared correctly against `r.id` below. Keeping this
            // distinction explicit matters: `entry_id` is only pulled in
            // once we build the persist payload further down.
            const draggedRowId = active.id;

            // FIX: this used to compare a number (active.id) against a
            // string (String(over.id)) and could never actually match.
            if (String(draggedRowId) === overId.replace("row-", "")) return;

            let pending = null;

            update((prev) => {
                const next = prev.map((r) => ({ ...r }));
                const fromIndex = next.findIndex((r) => r.id === draggedRowId);
                if (fromIndex === -1) return prev;

                let moved, fromMachine, toMachine, isTransfer;

                if (overId.startsWith("machine-")) {
                    const targetMachine = droppableMachineFromToken(overId);
                    [moved] = next.splice(fromIndex, 1);
                    fromMachine = moved.machine;
                    toMachine = targetMachine;
                    isTransfer = fromMachine !== toMachine;
                    moved.machine = toMachine;

                    let insertAt = next.length;
                    for (let i = next.length - 1; i >= 0; i--) {
                        if (next[i].machine === toMachine) {
                            insertAt = i + 1;
                            break;
                        }
                    }
                    next.splice(insertAt, 0, moved);
                } else if (overId.startsWith("row-")) {
                    const targetRowId = overId.slice("row-".length);
                    const targetIndex = next.findIndex((r) => String(r.id) === targetRowId);

                    if (targetIndex === -1) return prev;

                    fromMachine = next[fromIndex].machine;
                    toMachine = next[targetIndex].machine;
                    isTransfer = fromMachine !== toMachine;
                    const draggingDown = fromIndex < targetIndex;

                    [moved] = next.splice(fromIndex, 1);
                    if (isTransfer) moved.machine = toMachine;

                    let insertAt = next.findIndex((r) => r.id === targetRowId);
                    if (insertAt === -1) insertAt = next.length;
                    else if (draggingDown) insertAt += 1;
                    next.splice(insertAt, 0, moved);
                } else {
                    return prev;
                }

                if (baseTimes) {
                    recomputeMachine(next, toMachine, baseTimes, date);
                    if (isTransfer)
                        recomputeMachine(next, fromMachine, baseTimes, date);
                }

                onReorder?.(
                    toMachine,
                    next.filter((r) => r.machine === toMachine),
                );
                if (isTransfer) {
                    onReorder?.(
                        fromMachine,
                        next.filter((r) => r.machine === fromMachine),
                    );
                    onLotTransfer?.(moved.lot_id, fromMachine, toMachine);
                }

                pending = { toMachine, isTransfer, moved, finalRows: next };
                return next;
            });

            setIsDirty(true);
            if (!pending) return;

            const { toMachine, isTransfer, moved, finalRows } = pending;
            // Unassigned has no persisted order — nothing to save for a
            // pure Unassigned-to-Unassigned reorder.
            if (toMachine === null && !isTransfer) return;
            const isBlock = isBlockRow(moved);
            if (isBlock && !moved.id) return;

            const { beforeEntryId, afterEntryId } = findMachineNeighbors(
                finalRows,
                moved._dndId,
                toMachine,
            );

            // return; // stub: skip persisting until backend wired up

            const persist = withUpdating(
                isTransfer
                    ? mutate(route("loading-plan.transfer"), {
                          body: {
                              entry_type: isBlock ? "block" : "lot",
                              entry_id: moved.entry_id,
                              target_machine: toMachine,
                              before_entry_id: beforeEntryId,
                              after_entry_id: afterEntryId,
                          },
                      })
                    : mutate(route("loading-plan.move"), {
                          body: {
                              entry_type: isBlock ? "block" : "lot",
                              entry_id: moved.entry_id,
                              before_entry_id: beforeEntryId,
                              after_entry_id: afterEntryId,
                              machine: toMachine,
                          },
                      }),
            );

            persist
                .then((entry) => {
                    update(
                        (prev) =>
                            prev.map((r) =>
                                r.id === moved.id
                                    ? {
                                          ...r,
                                          sequence_order: entry.sequence_order,
                                          lock_version: entry.lock_version,
                                      }
                                    : r,
                            ),
                        true,
                    );
                })
                .catch((err) => {
                    console.error(
                        "Failed to persist move/transfer:",
                        err?.message,
                    );
                    toast?.error?.(err?.message);
                });
        },
        [
            update,
            baseTimes,
            date,
            onReorder,
            onLotTransfer,
            withUpdating,
            mutate,
            toast,
        ],
    );

    const draggedRow = useMemo(
        () => dataRows.find((r) => r.id === activeId),
        [dataRows, activeId],
    );

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

    function handleButtonsPointerLeave(e) {
        const movedTo = e.relatedTarget;
        if (containerRef.current?.contains(movedTo)) return;

        hoveredRowRef.current = null;
        setHoveredRow(null);
    }



    return (
        <div
            className="bg-base-100"
            style={{ padding: 24, minHeight: "90vh" }}
        >
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

                    {/* Row 2: package tabs (left) — dissemination / production line / idle machines (right) */}
                    <div className="flex flex-wrap items-end gap-2">
                        <PackageTabs
                            packages={packageGroupNames}
                            active={activePackage}
                            onChange={(pkg) => {
                                setActivePackage(pkg);
                                clearSelection();
                            }}
                        />

                        <button
                            className="ml-auto btn btn-sm mb-1 rounded-box btn-secondary"
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

                        <div className="flex items-end gap-3 mb-1">
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
                                // className={`btn btn-ghost text-[11px] font-medium px-2.5 py-1 rounded-lg bg-base-content/10 text-base-content/80 hover:bg-base-content/20 flex items-center gap-1 ${
                                //     count !== 2 ? "cursor-not-allowed opacity-50" : ""
                                // }`}
                                // disabled={count !== 2}
                                className="btn btn-md z-50"
                                onClick={() => {
                                    pickupInsertModalRef.current?.showModal();
                                }}
                            >
                                Schedule Pickups
                            </button>

                            {idleMachines.length > 0 && (
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
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* <p style={{ color: "#9aa1ac", marginBottom: 16, fontSize: 13 }}>
                Drag the ⠿ handle on any row onto a different machine's header
                bar to move that lot to that machine.
            </p> */}

            {/* <PackageTabs
                packages={packageGroupNames}
                active={activePackage}
                onChange={(pkg) => {
                    setActivePackage(pkg);
                    clearSelection();
                }}
            /> */}

            <TableActionsContext.Provider value={tableActionsValue}>
                <DndContext
                    collisionDetection={pointerWithin}
                    onDragOver={(event) => {
                        const overId = event.over ? event.over.id : null;
                        setHoveredRowId((prev) =>
                            prev !== overId ? overId : prev,
                        );
                    }}
                    sensors={sensors}
                    onDragStart={handleDragStart}
                    onDragEnd={(event) => {
                        handleDragEnd(event);
                        setHoveredRowId(null);
                    }}
                    onDragCancel={(event) => {
                        handleDragCancel(event);
                        setHoveredRowId(null);
                    }}
                >
                    <div ref={containerRef} className="border-none" style={{ position: "relative" }}>
                        <TableInteractionContext.Provider
                            value={tableInteractionValue}
                        >
                            <DataGrid
                                ref={gridRef}
                                columns={columns}
                                rows={displayRows}
                                // renderers={{ renderRow: makeRowRenderer(rowIdxByElement) }}
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
                                    row.isLocked === true
                                }
                                onScroll={() => {
                                    // virtualization can unmount the hovered row mid-scroll —
                                    // bail out if the anchor got ripped out of the DOM
                                    if (
                                        hoveredRowRef.current &&
                                        !hoveredRowRef.current.isConnected
                                    ) {
                                        hoveredRowRef.current = null;
                                        setHoveredRow(null);
                                    }
                                }}
                                className="bg-base-100"
                                style={{ blockSize: "70vh" }}
                            />

                            {hoveredRow && (
                                <div onPointerLeave={handleButtonsPointerLeave}>
                                    <RowInsertButtons
                                        anchorElement={hoveredRow.element}
                                        buttonsRef={buttonsRef}
                                        onInsertAbove={() => {
                                            setPlacementOfNewEntry("above");
                                            setSelectedRows(
                                                new Set(
                                                    [dataRowsRef.current[hoveredRow.rowIdx]],
                                                ),
                                            );
                                            addEntryModalRef.current?.showModal()
                                        }}
                                        onInsertBelow={() => {
                                            setPlacementOfNewEntry("below");
                                            setSelectedRows(
                                                new Set(
                                                    [dataRowsRef.current[hoveredRow.rowIdx]],
                                                ),
                                            );
                                            addEntryModalRef.current?.showModal()
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
                                                    machine:
                                                        stickyMachine.machineLabel ??
                                                        stickyMachine.machine,
                                                    otherPackageCount:
                                                        stickyMachine.otherPackageCount,
                                                }}
                                                machineKey={stickyMachine.machine}
                                                rowCount={stickyMachine.rowCount}
                                                isCollapsed={stickyMachine.isCollapsed}
                                                onToggleCollapse={toggleMachineCollapsed}
                                            />
                                        </div>
                                        <div className="flex gap-1 pr-2">
                                            <button
                                                className="btn btn-2xs"
                                                onClick={() =>
                                                    handleAddRow(stickyMachine.machine)
                                                }
                                                disabled={isUpdating}
                                            >
                                                + Lot
                                            </button>
                                            <button
                                                className="btn btn-2xs"
                                                onClick={() =>
                                                    handleAddBlock(stickyMachine.machine)
                                                }
                                                disabled={isUpdating}
                                            >
                                                + Block
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </TableInteractionContext.Provider>
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

                <SelectionToolbar
                    selectedIds={selectedRows}
                    machinePlatform={machinePlatform}
                    allData={dataRows}
                    machines={machines}
                    disabled={isUpdating}
                    onTag={handleBulkTag}
                    onClearTag={handleBulkClearTag}
                    onStatusChange={handleBulkStatus}
                    onTransfer={handleBulkTransfer}
                    onSplitRow={handleSplitRow}
                    onMergeRows={handleMergeRows}
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
                    // loading={historyLoading}
                    // onRevert={handleSplitRevert}
                    // onClose={() => splitHistoryModalRef.current?.close()}
                    // isParent={currentLotRole.isParent}
                    // isChild={currentLotRole.isChild}
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
