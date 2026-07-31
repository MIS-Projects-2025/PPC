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
import DateNav from "@/Components/DateNav";
import { TOTAL_MIN_WIDTH } from "@/Components/LoadingPlan/columns.jsx";
import DataIntegrityModal, {
    TabBadge,
} from "@/Components/LoadingPlan/DataIntegrityModal";
import GlobalTableHeader from "@/Components/LoadingPlan/GlobalTableHeader";
import interactiveCursorClasses from "@/Components/LoadingPlan/interactiveCursorClasses";
import MachineChip from "@/Components/LoadingPlan/MachineChip";
import MachineSection, {
    isBlockRow,
} from "@/Components/LoadingPlan/MachineSection";
import {
    GapInfoContext,
    PREFIX_EMPTY_DROPPABLE,
    ScrollParentContext,
    TableInteractionContext,
} from "@/Components/LoadingPlan/MachineSectionBody";
import MergeHistoryModal from "@/Components/LoadingPlan/MergeHistoryModal";
import PackageTabs from "@/Components/LoadingPlan/PackageTabs";
import {
    EDITABLE_COLUMNS,
    TableActionsContext,
} from "@/Components/LoadingPlan/RowContent";
import SelectionToolbar from "@/Components/LoadingPlan/SelectionToolbar";
import SplitHistoryModal from "@/Components/LoadingPlan/SplitHistoryModal";
import { StatusBadge } from "@/Components/LoadingPlan/StatusBadge.jsx";
import { initialData as _initialData } from "@/Constants/loadingPlanData.js";
import {
    groupOf,
    packagesInGroup,
    toReverseMap,
} from "@/Constants/loadingPlanPackageGroups.js";
import {
    applyTimeStartEdit,
    findMachineNeighbors,
    recomputeMachine,
} from "@/Constants/loadingPlanSchedule.js";
import { hasTimeline, MACHINE_MANUAL } from "@/Constants/machines.js";
import { getStatusMessage } from "@/Constants/wipStatus.js";
import { useMutation } from "@/Hooks/useMutation";
import { useToast } from "@/Hooks/useToast";
import { droppableTokenToMachine } from "@/Lib/dnd.js";
import { createUndoStore } from "@/Store/undoStore";
import toSnakeCase from "@/Utils/toSnakeCase";
import {
    closestCenter,
    DndContext,
    DragOverlay,
    PointerSensor,
    pointerWithin,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { router } from "@inertiajs/react";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoAlert } from "react-icons/go";
import { CellEditor } from "../Components/LoadingPlan/CellEditor";
import { DragGhostRow } from "../Components/LoadingPlan/DragGhostRow";

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

const useLoadingPlanStore = createUndoStore([]);

const PLATFORM_ORDER = ["G6L", "Vitrox", "HSI"];

/** After undo/redo swaps local state, diff the before/after snapshots
 *  into a list of backend operations and apply them as ONE atomic batch
 *  — either the whole undo persists, or none of it does. This replaces
 *  firing N independent calls per changed row, which could partially
 *  succeed/fail and leave local state and the DB disagreeing about which
 *  of the undo's changes actually landed. */
function syncUndoRedoToServer(prevRows, nextRows, date, mutate, update, toast) {
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
    console.log("🚀 ~ syncUndoRedoToServer ~ prevPositions:", prevPositions);
    const nextPositions = buildPositions(nextRows);
    console.log("🚀 ~ syncUndoRedoToServer ~ nextPositions:", nextPositions);

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
            positionChanged
        );
    });

    console.log("🚀 ~ syncUndoRedoToServer ~ changed:", changed);

    // console.log("🚀 ~ syncUndoRedoToServer ~ changed:", changed);
    // console.log("🚀 ~ syncUndoRedoToServer ~ added:", added);
    // console.log("🚀 ~ syncUndoRedoToServer ~ removed:", removed);

    const operations = [];
    // Track which _dndId each pushed operation corresponds to, so the
    // single response array (same order as operations) can be mapped
    // back onto local rows after the batch succeeds.
    const opOwners = [];

    // --- Undo of an add → delete it again ---
    removed.forEach((r) => {
        if (r.splitInfo?.isChild && r.splitInfo?.splitId) {
            operations.push({
                type: "revert_split",
                split_id: r.splitInfo.splitId,
            });
            opOwners.push({
                dndId: r._dndId,
                kind: "revert_split",
                snapshot: r,
            });
            return;
        }

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
        if (r.splitInfo?.isChild && r.splitInfo?.splitId) {
            operations.push({
                type: "unrevert_split",
                split_id: r.splitInfo.splitId,
            });
            opOwners.push({ dndId: r._dndId, kind: "unrevert_split" });
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

        if (Object.keys(fields).length > 0) {
            operations.push({
                type: "update_field",
                entry_type: isBlock ? "block" : "lot",
                lot_id: isBlock ? null : r.Lot_Id,
                entry_id: isBlock ? r.entryId : null,
                fields,
                // get the lock_version of the previousRows, which is the live data.
                // This is the one we are undoing/redoing into
                // lock_version of the nextRows would be wrong here.
                lock_version: p.lockVersion ?? null,
            });
            opOwners.push({ dndId: r._dndId, kind: "field", snapshot: p });
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
                        if (result.deleted) return null; // filtered below

                        return {
                            ...row,
                            entryId: result.id ?? row.entryId,
                            lockVersion: result.lock_version ?? row.lockVersion,
                            sequenceOrder:
                                result.sequence_order ?? row.sequenceOrder,
                            splitInfo: result.splitInfo ?? row.splitInfo,
                            Doable: result.doable ?? row.Doable,
                            doableStatus:
                                result.doableStatus ?? row.doableStatus,
                            doableRecipeSource:
                                result.doableRecipeSource ??
                                row.doableRecipeSource,
                            Capacity_UPH:
                                result.capacityUph ?? row.Capacity_UPH,
                        };
                    })
                    .filter(Boolean);

                // revert_split ops also carry a parent update alongside the
                // child's deletion — apply it in the same pass.
                results.forEach((result) => {
                    if (result?.parent) {
                        next = next.map((r) =>
                            r.Lot_Id === result.parent.lot_id
                                ? {
                                      ...r,
                                      Qty: result.parentQty ?? r.Qty,
                                      Doable: result.parentDoable ?? r.Doable,
                                      doableStatus:
                                          result.parentDoableStatus ??
                                          r.doableStatus,
                                      doableRecipeSource:
                                          result.doableRecipeSource ??
                                          r.doableStatus,
                                      Capacity_UPH:
                                          result.parentCapacityUph ??
                                          r.Capacity_UPH,
                                      lockVersion:
                                          result.parent.lock_version ??
                                          r.lockVersion,
                                      splitInfo:
                                          result.parentSplitInfo ?? r.splitInfo,
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
            // Atomic on the backend means NOTHING in this batch applied —
            // safe to revert the entire local diff back to prevRows in
            // one shot, rather than reverting row-by-row.
            update(() => prevRows);
            toast?.error?.("That undo couldn't be saved and was reverted.");
            // Optional: re-throw if you want handleUndo's try/finally to know it failed
            // throw err;
        });
}

// ---------------------------------------------------------------------------
// LoadingPlanTable — root component
// ---------------------------------------------------------------------------

export default function LoadingPlanTable({
    data: initialData,
    date,
    machines: serverMachines,
    partnameMismatches,
    unknownPackages,
    recipeMismatches,
    selectedLocation,
    packageGroupNames,
    packageGroups,
    status,
    baseTimes = {},
    onLotTransfer,
    onReorder,
}) {
    console.log("🚀 ~ LoadingPlanTable ~ packages:", packageGroupNames);
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

    const packageGroupReverseMap = useMemo(
        () => toReverseMap(packageGroups),
        [packageGroups],
    );

    const resolvedData = initialData ?? _initialData;
    const [selectedDate, setSelectedDate] = useState(new Date(date));
    const [isDirty, setIsDirty] = useState(false);
    const [inFlightCount, setInFlightCount] = useState(0);

    const [splitHistoryData, setSplitHistoryData] = useState(null);
    const [mergeHistoryData, setMergeHistoryData] = useState(null);
    const [currentLotRole, setCurrentLotRole] = useState({
        isParent: false,
        isChild: false,
    });

    const [historyLoading, setHistoryLoading] = useState(false);
    const splitHistoryModalRef = useRef(null);
    const mergeHistoryModalRef = useRef(null);

    const isUpdating = inFlightCount > 0;

    const withUpdating = useCallback((maybePromise) => {
        const promise = Promise.resolve(maybePromise);
        setInFlightCount((c) => c + 1);
        return promise.finally(() => setInFlightCount((c) => c - 1));
    }, []);

    const isDirtyRef = useRef(isDirty);
    useEffect(() => {
        isDirtyRef.current = isDirty;
    }, [isDirty]);

    const setLocation = (line) => {
        if (line === selectedLocation) return; // no-op, already selected
        router.get(
            route("loading-plan.index"),
            { date, location: line },
            { preserveScroll: true, replace: true },
        );
    };

    // const [activePackage, setActivePackage] = useState(() => packages[0] ?? "");
    const [activePackage, setActivePackage] = useState("LGA");

    // ── Selection state ──────────────────────────────────────────────────────
    const [selectedIds, setSelectedIds] = useState(() => new Set());
    const anchorIdRef = useRef(null);
    const scrollParentRef = useRef(null);

    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
        anchorIdRef.current = null;
    }, []);

    const handleDateChange = (newDate) => {
        setSelectedDate(newDate);
        router.get(
            route("loading-plan.index"),
            { date: newDate.toISOString().slice(0, 10) }, // 'YYYY-MM-DD'
            // { preserveState: true, preserveScroll: true },
        );
    };

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

            withUpdating(
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
                }),
            )
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
                    undo(); // whole batch is atomic — nothing applied, safe to fully revert
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

        withUpdating(
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
            }),
        )
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
                console.error("Bulk tag update failed:", err);
                undo(); // whole batch is atomic — nothing applied, safe to fully revert
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

            withUpdating(
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
                }),
            )
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
                    console.error("Bulk tag update failed:", err);
                    undo(); // whole batch is atomic — nothing applied, safe to fully revert
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
        const targets = data.filter(
            (r) => selectedIds.has(r._dndId) && r.entryId,
        );
        const entryIds = targets.map((r) => r.entryId);

        update((prev) => {
            const affectedMachines = new Set();
            const next = prev
                .map((r) => {
                    if (!selectedIds.has(r._dndId)) return r;
                    if (isBlockRow(r)) return r; // blocks get removed below
                    affectedMachines.add(r.machine);
                    return { ...r, machine: null, sequenceOrder: null };
                })
                .filter((r) => !(selectedIds.has(r._dndId) && isBlockRow(r)));

            affectedMachines.forEach((m) =>
                recomputeMachine(next, m, baseTimes),
            );
            return next;
        });

        setIsDirty(true);
        clearSelection();

        if (entryIds.length > 0) {
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
                                    (e) => e.id === r.entryId,
                                );
                                return match
                                    ? { ...r, lockVersion: match.lock_version }
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
    }, [selectedIds, update, baseTimes, clearSelection, data, date, undo]);

    const dataRef = useRef(data);
    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    const isSyncingRef = useRef(false);

    const handleUndo = useCallback(async () => {
        if (isSyncingRef.current) return;
        isSyncingRef.current = true;

        try {
            const prevSnapshot = dataRef.current;
            // console.log("🚀 ~ LoadingPlanTable ~ prevSnapshot:", prevSnapshot);
            undo();
            const nextSnapshot = useLoadingPlanStore.getState().present;
            // console.log("🚀 ~ LoadingPlanTable ~ nextSnapshot:", nextSnapshot);
            await syncUndoRedoToServer(
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
    }, [undo, date, mutate, update]);

    const handleRedo = useCallback(async () => {
        if (isSyncingRef.current) return;
        isSyncingRef.current = true;

        try {
            const prevSnapshot = dataRef.current;
            redo();
            const nextSnapshot = useLoadingPlanStore.getState().present;
            await syncUndoRedoToServer(
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
    }, [redo, date, mutate, update]);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") {
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

                    // TODO: all rows means all packages which is not the user wants, usually they want all rows in the current package or machine.
                    setSelectedIds(
                        new Set(dataRef.current.map((r) => r._dndId)),
                    );
                }
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [undo, redo, clearSelection]);

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
                _dndId: row.entryId ? `entry-${row.entryId}` : `wip-${row.id}`,
            };
        });

        // One continuous timeline per machine/MANUAL bucket, independent of
        // package/group. Unassigned (null) is skipped automatically inside
        // recomputeMachine (hasTimeline() returns false for it).
        const machineBuckets = new Set(seeded.map((r) => r.machine));
        machineBuckets.forEach((machine) => {
            recomputeMachine(seeded, machine, baseTimes);
        });
        console.log("🚀 ~ LoadingPlanTable ~ seeded:", seeded);
        console.log("🚀 ~ LoadingPlanTable ~ machineBuckets:", machineBuckets);

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

    const isSortable = sorting.length === 0 && !isUpdating;

    const handleStatusClick = useCallback((e, dndId) => {
        e.stopPropagation();
        if (isUpdating) return;
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

            withUpdating(
                mutate(
                    route("loading-plan.entries.update", {
                        id: row.entryId ?? 0,
                    }),
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
                ),
            )
                .then((entry) => {
                    console.log("🚀 entry:", entry);
                    console.log("🚀 dndId:", dndId);
                    update((prev) => {
                        const next = prev.map((r) =>
                            r._dndId === dndId
                                ? {
                                      ...r,
                                      entryId: entry.id,
                                      lockVersion: entry.lock_version,
                                  }
                                : r,
                        );
                        console.log(
                            "🚀 changed row:",
                            next.find((r) => r._dndId === dndId),
                        );
                        return next;
                    }, true);
                })
                .catch((err) => {
                    console.error("Status update failed:", err);
                    undo();
                    toast?.error?.("Couldn't save status change — reverted.");
                });
        },
        [statusMenu, update, data, date, undo],
    );

    // Standalone source of truth for which sections render: Unassigned and
    // Manual are always shown (pinned at the top, in that order), followed
    // by every real machine from the MACHINES config, in config order —
    // regardless of whether any lot currently sits in a given bucket. This
    // is what lets a user drag a lot onto a machine that has nothing on it
    // yet, and lets freshly-seeded (all-unassigned) data render correctly
    // before anything has been placed.
    const machinePlatform = useMemo(() => {
        const map = new Map();
        serverMachines.forEach((m) => map.set(m.name, m.platform));
        return map;
    }, [serverMachines]);

    const machines = useMemo(() => {
        return [null, MACHINE_MANUAL, ...serverMachines.map((m) => m.name)];
    }, [serverMachines]); // fixed: was `[]`, now correctly depends on serverMachines

    const groupedRows = useMemo(() => {
        const map = {};
        data.forEach((r) => {
            // Unassigned (machine === null) ignores the package filter
            // entirely — it's a holding pen, not tied to any tab's view.
            if (
                r.machine !== null &&
                !isBlockRow(r) &&
                groupOf(r.Package_Name, packageGroupReverseMap) !==
                    activePackage
            )
                return;
            const key = r.machine ?? "unassigned";
            if (!map[key]) map[key] = [];
            map[key].push(r);
        });
        return map;
    }, [data, activePackage]);
    console.log("🚀 ~ LoadingPlanTable ~ groupedRows:", groupedRows);

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
            const lastIndexOfGroup = {}; // group -> index of its last-seen lot, or undefined = "start of timeline"

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                if (isBlockRow(row)) continue; // anchor only on real lots
                const group = groupOf(row.Package_Name, packageGroupReverseMap);

                const startIdx = (lastIndexOfGroup[group] ?? -1) + 1;

                const segments = [];
                for (let j = startIdx; j < i; j++) {
                    const r = rows[j];
                    const minutes = Number(r.accuTime) || 0;
                    const last = segments[segments.length - 1];

                    if (isBlockRow(r)) {
                        // (blocks intentionally excluded, matching existing behavior)
                    } else {
                        const otherGroup = groupOf(
                            r.Package_Name,
                            packageGroupReverseMap,
                        );
                        const lotDetail = {
                            Lot_Id: r.Lot_Id,
                            timeStart: r.timeStart,
                            timeEnd: r.timeEnd,
                            timeStartDayOffset: r.timeStartDayOffset,
                            timeEndDayOffset: r.timeEndDayOffset,
                            minutes,
                        };

                        if (
                            last &&
                            last.kind === "package" &&
                            last.label === otherGroup
                        ) {
                            last.minutes += minutes;
                            last.lots.push(lotDetail);
                        } else {
                            segments.push({
                                kind: "package",
                                minutes,
                                label: otherGroup,
                                lots: [lotDetail],
                            });
                        }
                    }
                }

                if (segments.length > 0) {
                    // gap boundaries: end of the row just before the gap starts
                    // (startIdx - 1), and start of the anchor row (row/i) itself.
                    const boundaryBeforeRow = rows[startIdx - 1]; // may be undefined if gap starts at timeline start

                    const gapStart = boundaryBeforeRow
                        ? {
                              time: boundaryBeforeRow.timeEnd,
                              timeStartDayOffset:
                                  boundaryBeforeRow.timeEndDayOffset,
                          }
                        : null;

                    const gapEnd = {
                        time: row.timeStart,
                        timeEndDayOffset: row.timeStartDayOffset,
                    };

                    result[machine][row._dndId] = {
                        segments,
                        gapStart,
                        gapEnd,
                    };
                }

                lastIndexOfGroup[group] = i;
            }
        });

        return result;
    }, [data]);

    const otherPackageCounts = useMemo(() => {
        const map = {};
        data.forEach((r) => {
            if (r.machine === null) return; // Unassigned ignores the package filter
            if (
                groupOf(r.Package_Name, packageGroupReverseMap) ===
                activePackage
            )
                return;
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

            const persist = withUpdating(
                isTransfer
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
                      }),
            );

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
            if (isUpdating) return;
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
        [data, isUpdating],
    );

    const handleShowSplitHistory = useCallback(
        async (rootLotId, isParent, isChild) => {
            splitHistoryModalRef.current?.showModal();
            setHistoryLoading(true);
            setSplitHistoryData(null);
            setCurrentLotRole({ isParent, isChild });

            try {
                const res = await fetch(
                    route("loading-plan.splits.history", rootLotId),
                );
                const data = await res.json();
                setSplitHistoryData(data);
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
        [],
    );

    const handleShowMergeHistory = useCallback(
        async (targetLotId, isParent, isChild) => {
            console.log(
                "fjalksdjfklsajflk;djlfksjk;ldsjlkdjf;lsdjflsdjfljfdsj",
            );
            mergeHistoryModalRef.current?.showModal();
            setHistoryLoading(true);
            setMergeHistoryData(null);
            setCurrentLotRole({ isParent, isChild });

            try {
                const res = await fetch(
                    route("loading-plan.merges.history", { targetLotId }),
                );
                const data = await res.json();
                setMergeHistoryData(data);
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
        [],
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
            if (!row) return;

            if (field === "timeStart") {
                const { rows: withGap, error } = applyTimeStartEdit(
                    data,
                    dndId,
                    row.machine,
                    value,
                    baseTimes,
                );

                if (error) {
                    toast?.error?.(error);
                    setEditCell(null);
                    return;
                }

                recomputeMachine(withGap, row.machine, baseTimes);

                const prevSnapshot = data;
                update(() => withGap);
                setIsDirty(true);
                setEditCell(null);

                console.log("🚀 ~ LoadingPlanTable ~ data:", data);
                console.log("🚀 ~ LoadingPlanTable ~ withGap:", withGap);

                withUpdating(
                    syncUndoRedoToServer(
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

            // Backend field name for accuTime is snake_case (accu_time)
            const backendField = toSnakeCase(field);

            withUpdating(
                mutate(
                    route("loading-plan.entries.update", {
                        id: row.entryId ?? 0,
                    }),
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
                ),
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

    const handleMergeRevert = useCallback(
        ({ targetLotId, sourceLotId }) => {
            const targetRow = data.find((r) => r.Lot_Id === targetLotId);

            if (!targetRow) {
                toast?.error?.(
                    `Couldn't find target lot ${targetLotId} to revert — please refresh.`,
                );
                return;
            }

            const sourceRow = data.find((r) => r.Lot_Id === sourceLotId);

            if (!sourceRow) {
                toast?.error?.(
                    `Couldn't find source lot ${sourceLotId} to revert — please refresh.`,
                );
                return;
            }

            const mergeId = targetRow.mergeInfo?.mergeId;

            if (!mergeId) {
                toast?.error?.(
                    `Couldn't find merge record for lot ${targetLotId} — please refresh.`,
                );
                return;
            }

            const affectedMachineOfTargetRow = targetRow.machine;
            const affectedMachineOfSourceRow = sourceRow.machine;

            withUpdating(
                mutate(route("loading-plan.merges.destroy", mergeId), {
                    method: "delete",
                    body: { reverted_by: null }, // TODO: revert by emp id
                }),
            )
                .then((result) => {
                    const { target, source } = result;

                    update((prev) => {
                        const next = prev.map((row) => {
                            if (row.Lot_Id === target.lot_id) {
                                return {
                                    ...row,
                                    Qty: target.qty,
                                    lockVersion: target.lock_version,
                                    mergeInfo: null,
                                    Doable: target.doable,
                                    doableStatus: target.doableStatus,
                                    doableRecipeSource:
                                        target.doableRecipeSource,
                                    Capacity_UPH: target.capacityUph,
                                };
                            }
                            if (row.Lot_Id === source.lot_id) {
                                return {
                                    ...row,
                                    Qty: source.qty,
                                    lockVersion: source.lock_version,
                                    mergeInfo: null,
                                    Doable: source.doable,
                                    doableStatus: source.doableStatus,
                                    doableRecipeSource:
                                        source.doableRecipeSource,
                                    Capacity_UPH: source.capacityUph,
                                };
                            }
                            return row;
                        });

                        if (affectedMachineOfTargetRow) {
                            recomputeMachine(
                                next,
                                affectedMachineOfTargetRow,
                                baseTimes,
                            );
                        }
                        if (affectedMachineOfSourceRow) {
                            recomputeMachine(
                                next,
                                affectedMachineOfSourceRow,
                                baseTimes,
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
                .finally(() => {
                    mergeHistoryModalRef.current?.close();
                });
        },
        [data, baseTimes, update, date, recomputeMachine],
    );

    const handleSplitRevert = useCallback(
        ({ splitId, revertedBy, childLotId }) => {
            const childRow = data.find((r) => r.Lot_Id === childLotId);
            console.log("🚀 ~ LoadingPlanTable ~ childLotId:", childLotId);
            console.log("🚀 ~ LoadingPlanTable ~ data:", data);
            if (!childRow) {
                toast?.error?.("Couldn't find the split lot — please refresh.");
                return;
            }

            const affectedMachine = childRow.machine;

            withUpdating(
                mutate(route("loading-plan.splits.destroy", splitId), {
                    method: "delete",
                    body: { reverted_by: revertedBy },
                }),
            )
                .then((result) => {
                    update((prev) => {
                        const next = prev
                            .filter((r) => r.Lot_Id !== result.deleted)
                            .map((r) =>
                                result.parent &&
                                r.Lot_Id === result.parent.lot_id
                                    ? {
                                          ...r,
                                          Qty: result.parentQty ?? r.Qty,
                                          Doable:
                                              result.parentDoable ?? r.Doable,
                                          doableStatus:
                                              result.parentDoableStatus ??
                                              r.doableStatus,
                                          Capacity_UPH:
                                              result.parentCapacityUph ??
                                              r.Capacity_UPH,
                                          lockVersion:
                                              result.parent.lock_version,
                                          splitInfo: result.parentSplitInfo,
                                      }
                                    : r,
                            );

                        if (affectedMachine) {
                            recomputeMachine(next, affectedMachine, baseTimes);
                        }

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
                .finally(() => {
                    splitHistoryModalRef.current?.close();
                });
        },
        [data, baseTimes, update, date],
    );

    const handleMergeRows = useCallback(
        ({ targetLotId, sourceLotId }) => {
            const targetRow = data.find((r) => r.Lot_Id === targetLotId);

            if (!targetRow) {
                toast?.error?.(
                    `Couldn't find target lot ${targetLotId} to merge — please refresh.`,
                );
                return;
            }

            const sourceRow = data.find((r) => r.Lot_Id === sourceLotId);

            if (!sourceRow) {
                toast?.error?.(
                    `Couldn't find source lot ${sourceLotId} to merge — please refresh.`,
                );
                return;
            }

            const affectedMachineOfTargetRow = targetRow.machine;
            const affectedMachineOfSourceRow = sourceRow.machine;

            withUpdating(
                mutate(route("loading-plan.merges.store"), {
                    body: {
                        lot_id_a: targetRow.Lot_Id,
                        lot_id_b: sourceRow.Lot_Id,
                        scheduled_date: date,
                    },
                }),
            )
                .then((result) => {
                    const { target, source } = result;

                    update((prev) => {
                        const next = prev.map((row) => {
                            if (row.Lot_Id === target.lot_id) {
                                return {
                                    ...row,
                                    Qty: target.qty,
                                    lockVersion: target.lock_version,
                                    mergeInfo: target.mergeInfo,
                                    Doable: target.doable,
                                    doableStatus: target.doableStatus,
                                    doableRecipeSource:
                                        target.doableRecipeSource,
                                    Capacity_UPH: target.capacityUph,
                                };
                            }
                            if (row.Lot_Id === source.lot_id) {
                                return {
                                    ...row,
                                    Qty: source.qty,
                                    lockVersion: source.lock_version,
                                    mergeInfo: source.mergeInfo,
                                    Doable: source.doable,
                                    doableStatus: source.doableStatus,
                                    doableRecipeSource:
                                        source.doableRecipeSource,
                                    Capacity_UPH: source.capacityUph,
                                };
                            }
                            return row;
                        });

                        if (affectedMachineOfTargetRow) {
                            recomputeMachine(
                                next,
                                affectedMachineOfTargetRow,
                                baseTimes,
                            );
                        }
                        if (affectedMachineOfSourceRow) {
                            recomputeMachine(
                                next,
                                affectedMachineOfSourceRow,
                                baseTimes,
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
        [data, baseTimes, update, date, recomputeMachine],
    );

    const handleSplitRow = useCallback(
        ({
            parentLotId,
            childLotId,
            childQty,
            parentQty,
            targetMachine,
            beforeEntryId,
            afterEntryId,
        }) => {
            const parentRow = data.find((r) => r.Lot_Id === parentLotId);
            if (!parentRow) {
                toast?.error?.(
                    "Couldn't find the lot to split — please refresh.",
                );
                return;
            }

            const parentMachine = parentRow.machine;

            withUpdating(
                mutate(route("loading-plan.splits.store"), {
                    body: {
                        parent_lot_id: parentLotId,
                        scheduled_date: date,
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
                            row.Lot_Id === parentLotId
                                ? {
                                      ...row,
                                      Qty: parentQty,
                                      lockVersion: parent.lock_version,
                                      splitInfo: parent.splitInfo,
                                      Doable: parent.doable,
                                      doableStatus: parent.doableStatus,
                                      doableRecipeSource:
                                          parent.doableRecipeSource,
                                      Capacity_UPH: parent.capacityUph,
                                  }
                                : row,
                        );

                        next.push({
                            machine: targetMachine,
                            item: 0,
                            Part_Name: parentRow.Part_Name,
                            Lead_Count: child.Lead_Count,
                            Package_Name: parentRow.Package_Name,
                            Lot_Id: child.lot_id,
                            status: child.status ?? parentRow.status ?? "NONE",
                            Station: child.Station,
                            Qty: childQty,
                            Doable: child.doable,
                            doableStatus: child.doableStatus,
                            doableRecipeSource: child.doableRecipeSource,
                            Capacity_UPH: child.capacityUph,
                            accuTime: child.accu_time,
                            Lot_Type: child.Lot_Type,
                            Lot_Status: child.Lot_Status,
                            Focus_Group: child.Focus_Group,
                            Stage: child.Stage,
                            Lot_Entry_Time_Days: child.Lot_Entry_Time_Days,
                            CR3: child.CR3,
                            BE_OSL_Days: child.BE_OSL_Days,
                            Body_Size: child.Body_Size,
                            Ramp_Time: child.Ramp_Time,
                            Remarks: "",
                            Date_Loaded: null,
                            BE_Starttime: null,
                            Backend_Leadtime: null,
                            tag: null,
                            splitInfo: child.splitInfo,
                            entryId: child.id,
                            sequenceOrder: child.sequence_order,
                            lockVersion: child.lock_version,
                            _dndId: `entry-${child.id}`,
                        });

                        if (parentMachine) {
                            recomputeMachine(next, parentMachine, baseTimes);
                        }
                        if (targetMachine !== parentMachine) {
                            recomputeMachine(next, targetMachine, baseTimes);
                        }

                        return next;
                    });

                    setIsDirty(true);
                    addSeenPair(targetMachine, parentRow.Package_Name);
                    setJustAddedMachine(targetMachine);
                })
                .catch((err) => {
                    console.error("Failed to split lot:", err);
                    toast?.error?.(
                        err?.message ??
                            "Couldn't split the lot — please try again.",
                    );
                });
        },
        [data, baseTimes, update, addSeenPair, date, recomputeMachine],
    );

    const handleAddRow = useCallback(
        (machine) => {
            const partName = window.prompt(
                "Part name for this manual lot:",
                "",
            );
            if (partName === null) return; // cancelled

            const qtyStr = window.prompt("Quantity:", "0");
            if (qtyStr === null) return; // cancelled
            const qty = parseInt(qtyStr, 10) || 0;

            const groupPkgs = packagesInGroup(activePackage);
            const packageName = groupPkgs[0] ?? activePackage;

            withUpdating(
                mutate(route("loading-plan.manual-lots.store"), {
                    body: {
                        machine,
                        scheduled_date: date,
                        fields: {
                            Part_Name: partName.trim(),
                            Package_Name: packageName,
                            Qty: qty,
                        },
                        before_entry_id: null,
                        after_entry_id: null, // appends to end
                    },
                }),
            )
                .then((entry) => {
                    update((prev) => {
                        const next = [...prev];
                        next.push({
                            machine,
                            item: 0,
                            Part_Name: partName.trim(),
                            Lead_Count: null,
                            Package_Name: packageName,
                            Lot_Id: entry.lot_id,
                            status: entry.status ?? "NONE",
                            Station: "",
                            Qty: qty,
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
                            Date_Loaded: null,
                            BE_Starttime: null,
                            Backend_Leadtime: null,
                            tag: null,
                            entryId: entry.id,
                            sequenceOrder: entry.sequence_order,
                            lockVersion: entry.lock_version,
                            _dndId: `entry-${entry.id}`,
                        });
                        recomputeMachine(next, machine, baseTimes);
                        return next;
                    });
                    setIsDirty(true);
                    addSeenPair(machine, packageName);
                    setJustAddedMachine(machine);
                })
                .catch((err) => {
                    console.error("Failed to create manual lot:", err);
                    toast?.error?.(
                        "Couldn't create the new lot — please try again.",
                    );
                });
        },
        [activePackage, baseTimes, update, addSeenPair, date, recomputeMachine],
    );

    const [blockModalMachine, setBlockModalMachine] = useState(null);
    const [blockOption, setBlockOption] = useState("setup");
    const [customLabel, setCustomLabel] = useState("");
    const [customDuration, setCustomDuration] = useState("60");

    const BLOCK_PRESETS = {
        setup: { label: "Setup", duration: 120 },
        config: { label: "Config", duration: 240 },
        conversion: { label: "Conversion", duration: 360 },
    };

    const handleAddBlock = useCallback((machine) => {
        setBlockOption("setup");
        setCustomLabel("");
        setCustomDuration("60");
        setBlockModalMachine(machine);
        document.getElementById("add_block_modal").showModal();
    }, []);

    const saveBlock = useCallback(
        (machine, label, duration) => {
            withUpdating(
                mutate(route("loading-plan.blocks.store"), {
                    body: {
                        machine,
                        scheduled_date: date,
                        label: label.trim() || "Time block",
                        duration,
                        before_entry_id: null,
                        after_entry_id: null,
                    },
                }),
            )
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
                            _dndId: `entry-${entry.id}`,
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
        [baseTimes, update, date, recomputeMachine],
    );

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
        document.getElementById("add_block_modal").close();
    }, [
        blockOption,
        customLabel,
        customDuration,
        blockModalMachine,
        saveBlock,
    ]);

    useEffect(() => {
        if (justAddedMachine === null) return;
        const id = requestAnimationFrame(() => setJustAddedMachine(null));
        return () => cancelAnimationFrame(id);
    }, [justAddedMachine]);

    // ── Context value ────────────────────────────────────────────────────────
    const tableActionsValue = useMemo(
        () => ({
            handleStatusClick,
            handleShowHistory: handleShowSplitHistory,
            handleShowMergeHistory,
            handleCellClick,
            selectedIds,
            handleRowSelect,
            isUpdating,
            anchorIdRef,
        }),
        [
            handleStatusClick,
            handleShowSplitHistory,
            handleShowMergeHistory,
            handleCellClick,
            selectedIds,
            handleRowSelect,
            isUpdating,
        ],
    );

    const tableInteractionValue = useMemo(
        () => ({
            isSortable,
            scrollParentRef,
        }),
        [isSortable],
    );

    const { activeMachines, idleMachines } = useMemo(() => {
        const active = [];
        const idle = [];
        for (const machine of machines) {
            const rows = groupedRows[machine ?? "unassigned"] ?? [];
            const isPseudo = machine === null || machine === MACHINE_MANUAL;
            if (rows.length > 0 || isPseudo) {
                active.push(machine);
            } else {
                idle.push(machine);
            }
        }
        return { activeMachines: active, idleMachines: idle };
    }, [machines, groupedRows]);

    const idleMachinesByPlatform = useMemo(() => {
        const groups = new Map();
        for (const machine of idleMachines) {
            const platform = machinePlatform.get(machine) ?? "Other";
            if (!groups.has(platform)) groups.set(platform, []);
            groups.get(platform).push(machine);
        }
        // sort by PLATFORM_ORDER, unknown platforms (incl. "Other") fall to the end
        return [...groups.entries()].sort(
            ([a], [b]) =>
                (PLATFORM_ORDER.indexOf(a) === -1
                    ? 99
                    : PLATFORM_ORDER.indexOf(a)) -
                (PLATFORM_ORDER.indexOf(b) === -1
                    ? 99
                    : PLATFORM_ORDER.indexOf(b)),
        );
    }, [idleMachines, machinePlatform]);

    const [showAllMachines, setShowAllMachines] = useState(false);

    const collisionDetection = useCallback((args) => {
        const pointerCollisions = pointerWithin(args);
        return pointerCollisions.length > 0
            ? pointerCollisions
            : closestCenter(args);
    }, []);

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="relative h-full">
            <DataIntegrityModal
                partnameMismatches={partnameMismatches}
                unknownPackages={unknownPackages}
                recipeMismatches={recipeMismatches}
            />

            {/* <Deferred
                data="partnameMismatches"
                fallback={<p>Loading mismatches…</p>}
            >
                <pre>{JSON.stringify(partnameMismatches, null, 2)}</pre>
            </Deferred> */}
            {/* <div
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
                    </div> */}
            <TableActionsContext.Provider value={tableActionsValue}>
                <SplitHistoryModal
                    ref={splitHistoryModalRef}
                    loading={historyLoading}
                    history={splitHistoryData}
                    onRevert={handleSplitRevert}
                    onClose={() => splitHistoryModalRef.current?.close()}
                    isParent={currentLotRole.isParent}
                    isChild={currentLotRole.isChild}
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

                <div className="absolute inset-0 overflow-hidden flex flex-col">
                    {sorting.length > 0 && (
                        <div className="text-xs text-warning px-4 pb-2">
                            Sorted by {sorting[0].id} — clear sort to
                            drag/reorder lots.
                            <button
                                onClick={() => setSorting([])}
                                className="btn btn-sm btn-ghost underline ml-1"
                            >
                                Clear sort
                            </button>
                        </div>
                    )}

                    <div className="flex-none px-4 pt-4">
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
                                            <div role="alert" className="">
                                                {getStatusMessage(date, status)}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    router.get(
                                                        route("import.index"),
                                                    )
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
                                            <span className="loading loading-spinner loading-xs" />
                                            Saving…
                                        </span>
                                    ) : selectedIds.size > 0 ? (
                                        <span className="flex items-center gap-1.5 text-xs text-info whitespace-nowrap">
                                            {selectedIds.size} row
                                            {selectedIds.size !== 1
                                                ? "s"
                                                : ""}{" "}
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

                                    <button
                                        onClick={() => handleUndo()}
                                        disabled={!canUndo() || isUpdating}
                                        className={clsx(
                                            "btn btn-ghost px-2 py-1 text-xs rounded border border-base-300 text-base-content/60 disabled:opacity-30 hover:bg-base-200",
                                            interactiveCursorClasses(
                                                isUpdating,
                                            ),
                                        )}
                                        title="Undo (Ctrl+Z)"
                                    >
                                        ↩ Undo
                                    </button>
                                    <button
                                        onClick={() => handleRedo()}
                                        disabled={!canRedo() || isUpdating}
                                        className={clsx(
                                            "btn btn-ghost px-2 py-1 text-xs rounded border border-base-300 text-base-content/60 disabled:opacity-30 hover:bg-base-200",
                                            interactiveCursorClasses(
                                                isUpdating,
                                            ),
                                        )}
                                        title="Redo (Ctrl+Y)"
                                    >
                                        ↪ Redo
                                    </button>

                                    <div className="w-px h-4 bg-base-300 mx-1" />

                                    {status && status !== "not_imported" && (
                                        <button
                                            className="btn btn-sm rounded-box btn-secondary"
                                            onClick={() =>
                                                document
                                                    .getElementById(
                                                        "data_integrity_modal",
                                                    )
                                                    .showModal()
                                            }
                                        >
                                            Data Integrity
                                            <TabBadge
                                                count={
                                                    partnameMismatches !==
                                                        undefined &&
                                                    unknownPackages !==
                                                        undefined &&
                                                    recipeMismatches !==
                                                        undefined
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

                            {/* Row 2: package tabs (left) — production line / idle machines (right) */}
                            <div className="flex flex-wrap items-end justify-between gap-2">
                                <PackageTabs
                                    packages={packageGroupNames}
                                    active={activePackage}
                                    onChange={(pkg) => {
                                        setActivePackage(pkg);
                                        clearSelection();
                                    }}
                                />

                                <div className="flex items-center gap-3 mb-1">
                                    <fieldset className="fieldset rounded-box pb-3 px-2">
                                        <legend className="fieldset-legend text-[11px] px-1">
                                            Production Line
                                        </legend>
                                        <div className="join h-2 items-center">
                                            {["PL1", "PL6"].map((line) => (
                                                <button
                                                    key={line}
                                                    type="button"
                                                    disabled={isUpdating}
                                                    onClick={() =>
                                                        setLocation(line)
                                                    }
                                                    className={clsx(
                                                        "btn btn-xs join-item",
                                                        selectedLocation ===
                                                            line
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
                                                        setShowAllMachines(
                                                            (v) => !v,
                                                        )
                                                    }
                                                />
                                                Show {idleMachines.length} idle
                                                machine
                                                {idleMachines.length !== 1
                                                    ? "s"
                                                    : ""}
                                            </label>
                                        </fieldset>
                                    )}
                                </div>
                            </div>
                        </div>
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
                        <ScrollParentContext.Provider value={scrollParentRef}>
                            <DndContext
                                sensors={sensors}
                                autoScroll={{
                                    acceleration: 30,
                                    threshold: { x: 0.2, y: 0.2 },
                                    interval: 5,
                                }}
                                collisionDetection={collisionDetection}
                                onDragStart={handleDragStart}
                                onDragOver={handleDragOverFull}
                                onDragEnd={handleDragEnd}
                                onDragCancel={handleDragCancel}
                            >
                                {/* wide, horizontally-scrollable content: active sections + full idle sections when expanded */}
                                <div
                                    className="bg-base-100 border-l border-base-300 py-2 rounded-b-md"
                                    style={{ minWidth: TOTAL_MIN_WIDTH }}
                                >
                                    <div className="sticky top-0 z-20 w-full">
                                        <GlobalTableHeader
                                            sorting={sorting}
                                            onSortingChange={setSorting}
                                        />
                                    </div>
                                    <GapInfoContext.Provider value={gapInfo}>
                                        <TableInteractionContext.Provider
                                            value={tableInteractionValue}
                                        >
                                            {activeMachines.map((machine) => (
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
                                                    isUpdating={isUpdating}
                                                />
                                            ))}
                                        </TableInteractionContext.Provider>
                                    </GapInfoContext.Provider>
                                </div>
                                {/* end minWidth div */}

                                {idleMachines.length > 0 && showAllMachines && (
                                    <div className="sticky left-0 w-full px-1 mt-10">
                                        <div className="divider">
                                            IDLE MACHINES FOR THIS PACKAGE
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            {idleMachinesByPlatform.map(
                                                ([
                                                    platform,
                                                    machinesInGroup,
                                                ]) => (
                                                    <div key={platform}>
                                                        <div className="text-[10px] font-semibold text-base-content/40 uppercase tracking-wide mb-1 text-center">
                                                            {platform}
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-1.5">
                                                            {machinesInGroup.map(
                                                                (machine) => (
                                                                    <MachineChip
                                                                        key={
                                                                            machine
                                                                        }
                                                                        machine={
                                                                            machine
                                                                        }
                                                                    />
                                                                ),
                                                            )}
                                                        </div>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                )}

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
                        machinePlatform={machinePlatform}
                        allData={data}
                        machines={machines}
                        onTag={handleBulkTag}
                        disabled={isUpdating}
                        onClearTag={handleBulkClearTag}
                        onStatusChange={handleBulkStatus}
                        onTransfer={handleBulkTransfer}
                        onSplitRow={handleSplitRow}
                        onMergeRows={handleMergeRows}
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
                                    className={clsx(
                                        "btn btn-ghost w-full text-left px-0 text-sm flex items-center gap-2",
                                        interactiveCursorClasses(isUpdating, {
                                            hoverText: false,
                                        }),
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
                                groupOf(
                                    packageMenu.currentPackage,
                                    packageGroupReverseMap,
                                ),
                            ).map((pkg) => (
                                <button
                                    key={pkg}
                                    className={clsx(
                                        "btn btn-ghost w-full text-left px-3 py-1.5 text-sm",
                                        interactiveCursorClasses(isUpdating, {
                                            hoverText: false,
                                        }),
                                        !isUpdating && "hover:bg-base-200",
                                    )}
                                    onClick={() => handlePackageChange(pkg)}
                                    disabled={isUpdating}
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

                <dialog id="add_block_modal" className="modal">
                    <div className="modal-box bg-base-300">
                        <h3 className="font-bold text-lg mb-4">
                            Add Time Block
                        </h3>

                        <div className="join join-vertical w-full mb-3">
                            {Object.entries(BLOCK_PRESETS).map(
                                ([key, preset]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        className={clsx(
                                            "btn justify-between join-item",
                                            blockOption === key &&
                                                "btn-primary",
                                            interactiveCursorClasses(
                                                isUpdating,
                                            ),
                                        )}
                                        onClick={() => setBlockOption(key)}
                                        disabled={isUpdating}
                                    >
                                        {preset.label}
                                        <span className="text-xs opacity-70 ml-1">
                                            {preset.duration / 60}hr
                                        </span>
                                    </button>
                                ),
                            )}
                            <button
                                type="button"
                                className={clsx(
                                    "btn join-item",
                                    blockOption === "custom" && "btn-primary",
                                    interactiveCursorClasses(isUpdating),
                                )}
                                onClick={() => setBlockOption("custom")}
                                disabled={isUpdating}
                            >
                                Custom
                            </button>
                        </div>

                        <div
                            className={`join w-full transition-opacity ${
                                blockOption === "custom"
                                    ? "opacity-100"
                                    : "opacity-0 pointer-events-none"
                            }`}
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
                                onChange={(e) =>
                                    setCustomDuration(e.target.value)
                                }
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
            </TableActionsContext.Provider>
        </div>
    );
}
