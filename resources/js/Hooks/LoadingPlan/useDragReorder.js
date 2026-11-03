import { droppableMachineFromToken, isBlockRow } from "@/Lib/LoadingPlan/helpers";
import { applyAffectedTimings, findMachineNeighbors } from "@/Lib/LoadingPlan/loadingPlanSchedule";
import { PointerSensor, pointerWithin, useSensor, useSensors } from "@dnd-kit/core";
import { useCallback, useMemo, useRef, useState } from "react";

const MSG = {
    mixedKinds: "Select only unassigned, only planned, or only grouped rows.",
    mixedDates: "Selected rows are from different dates.",
    blockInGroup: "Time blocks can't be put in a group.",
    reworkUnassign: "Rework rows cannot be unassigned — delete the row instead.",
    blockUnassign: "Time blocks can't be unassigned. Delete the row instead.",
};

const kindOf = (r) => (r.bucket_id != null ? "group" : r.machine === null ? "unassigned" : "machine");
const byBucketPosition = (a, b) => a.bucket_position - b.bucket_position;

// ---------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------

/** What is under the cursor: a group header, a machine header/lane, or a row (maybe a collapsed run). */
function resolveDrop(overId, dataRows, collapsedRunsById) {
    if (overId.startsWith("bucket-")) {
        return { type: "bucket", bucketId: Number(overId.slice("bucket-".length)) };
    }
    if (overId.startsWith("machine-")) {
        return { type: "machine", machine: droppableMachineFromToken(overId) };
    }
    if (overId.startsWith("row-")) {
        const key = overId.slice("row-".length);
        const run = collapsedRunsById?.get(key) ?? null;
        const target = run
            ? dataRows.find((r) => r.id === run.firstRowId)
            : dataRows.find((r) => String(r.id) === key);
        return { type: "row", target, run };
    }
    return null;
}

/**
 * Moves `group` (display order) onto `toMachine`, next to `target` (or the end
 * of the lane when there is none). Returns null when the anchor can't be found.
 */
function placeRows(rows, group, { toMachine, target, run }) {
    const order = new Map(group.map((r, i) => [r.id, i]));
    const indexOf = (list, id) => list.findIndex((r) => String(r.id) === String(id));

    const isTransfer = group.some((r) => r.machine !== toMachine);
    const targetIdx = target ? indexOf(rows, target.id) : -1;
    const movingDown = !!target && !isTransfer && group.every((r) => indexOf(rows, r.id) < targetIdx);

    const moved = rows
        .filter((r) => order.has(r.id))
        .sort((a, b) => order.get(a.id) - order.get(b.id))
        .map((r) => ({ ...r }));
    const rest = rows.filter((r) => !order.has(r.id));

    let insertAt;
    if (target) {
        const anchorId = run ? (movingDown ? run.lastRowId : run.firstRowId) : target.id;
        insertAt = indexOf(rest, anchorId);
        if (insertAt === -1) return null;
        if (movingDown) insertAt += 1;
    } else {
        insertAt = rest.length;
        for (let i = rest.length - 1; i >= 0; i--) {
            if (rest[i].machine === toMachine) {
                insertAt = i + 1;
                break;
            }
        }
    }

    for (const r of moved) {
        r.machine = toMachine;
        r.bucket_id = null;
        r.bucket_position = null;
        if (toMachine === null) {
            r.time_start = null;
            r.time_end = null;
            r.time_start_day_offset = 0;
            r.time_end_day_offset = 0;
        }
    }

    rest.splice(insertAt, 0, ...moved);
    return { rows: rest, moved, isTransfer };
}

function groupProblem(group, date) {
    if (new Set(group.map(kindOf)).size > 1) return MSG.mixedKinds;
    if (new Set(group.map((r) => r.scheduled_date ?? date)).size > 1) return MSG.mixedDates;
    return null;
}

// ---------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------
export function useDragReorder({
    dataRows,
    update,
    withUpdating,
    beginWrite,
    mutate,
    date,
    onReorder,
    onPark,
    onUnpark,
    collapsedRunsById,
    onLotTransfer,
    selectedRows,
    displayRows,
    onUnassign,
    toast,
    clearSelection,
    setIsDirty,
    syncServerFields,
    selectedLocation,
    store,
}) {
    const [activeId, setActiveId] = useState(null);
    const refusedRef = useRef(false); // drag was refused at start: ignore its drop

    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

    // the dragged row plus, if it's selected, every other visible selected row, in display order
    const groupFor = useCallback(
        (id) => {
            if (selectedRows?.has(id) && selectedRows.size > 1) {
                return displayRows.filter((r) => r.__type === "data" && selectedRows.has(r.id));
            }
            return dataRows.filter((r) => r.id === id);
        },
        [selectedRows, displayRows, dataRows],
    );

    const draggedCount = useMemo(() => (activeId == null ? 0 : groupFor(activeId).length), [activeId, groupFor]);
    const draggedRow = useMemo(() => dataRows.find((r) => r.id === activeId), [dataRows, activeId]);

    const handleDragStart = useCallback(
        (event) => {
            if (!beginWrite()) {
                refusedRef.current = true;
                return;
            }

            const group = groupFor(event.active.id);
            const problem = group.length > 1 ? groupProblem(group, date) : null;
            if (problem) {
                refusedRef.current = true; // overlay never shows; the drop is ignored
                toast?.error?.(problem);
                return;
            }

            refusedRef.current = false;
            setActiveId(event.active.id);
            if (group.length <= 1) clearSelection();
        },
        [groupFor, date, toast, beginWrite, clearSelection],
    );

    const handleDragCancel = useCallback(() => setActiveId(null), []);

    // ── history / rollback helpers ───────────────────────────────────────
    const dropUndoHistory = useCallback(() => {
        const s = store.getState();
        s.reset(s.present.rows);
    }, [store]);

    const revertLocal = useCallback(
        (snapshot, resetHistory) => {
            const s = store.getState();
            if (resetHistory) s.reset(snapshot);
            else s.rollback(snapshot);
        },
        [store],
    );

    // ── drop targets ─────────────────────────────────────────────────────
    const dropOnBucket = useCallback(
        (group, drop) => {
            const lots = group.filter((r) => !isBlockRow(r));
            if (lots.length !== group.length) {
                toast?.error?.(MSG.blockInGroup);
                return;
            }

            if (drop.type === "bucket") {
                const groupIds = new Set(group.map((r) => r.id));
                const first = dataRows
                    .filter((r) => r.bucket_id === drop.bucketId && !groupIds.has(r.id))
                    .sort(byBucketPosition)[0];
                onPark?.(lots, drop.bucketId, { nextLotId: first?.lot_id ?? null });
                return;
            }

            const { target } = drop;
            const sameBucket = group.every((r) => r.bucket_id === target.bucket_id);
            const down = sameBucket && (group[0].bucket_position ?? 0) < (target.bucket_position ?? 0);
            onPark?.(lots, target.bucket_id, down ? { prevLotId: target.lot_id } : { nextLotId: target.lot_id });
        },
        [dataRows, onPark, toast],
    );

    const persistGroupMove = useCallback(
        ({ base, moved, toMachine, beforeEntryId, afterEntryId, hadBucket }) =>
            withUpdating(
                mutate(route("loading-plan.bulk-move"), {
                    body: {
                        items: moved.map((r) =>
                            r.entry_id
                                ? { entry_id: r.entry_id, lock_version: r.lock_version ?? null }
                                : { lot_id: r.lot_id },
                        ),
                        target_machine: toMachine,
                        before_entry_id: beforeEntryId,
                        after_entry_id: afterEntryId,
                        scheduled_date: date,
                    },
                }),
            )
                .then(({ entries, affected_timings }) => {
                    // ids/lock_version go into every snapshot; arrangement-dependent values only into the present
                    const history = [];
                    const derived = new Map();
                    moved.forEach((r) => {
                        const m = entries?.find((e) => (r.entry_id ? e.entry_id === r.entry_id : e.lot_id === r.lot_id));
                        if (!m) return;
                        history.push({ dndId: r._dndId, fields: { entry_id: m.entry_id, lock_version: m.lock_version } });
                        derived.set(r._dndId, {
                            capacity_uph: m.capacity_uph,
                            doable: m.doable,
                            doable_status: m.doable_status,
                        });
                    });
                    syncServerFields?.(history);
                    if (derived.size) {
                        update((prev) => prev.map((r) => (derived.has(r._dndId) ? { ...r, ...derived.get(r._dndId) } : r)), true);
                    }
                    applyAffectedTimings(update, affected_timings, date);
                    if (hadBucket) dropUndoHistory();
                })
                .catch((err) => {
                    console.error("Failed to move the selected rows:", err);
                    revertLocal(base, hadBucket);
                    toast?.error?.(err?.message ?? "Couldn't move the selected rows — reverted.");
                }),
        [withUpdating, mutate, date, syncServerFields, update, dropUndoHistory, revertLocal, toast],
    );

    const persistSingleMove = useCallback(
        ({ base, row, moved, isTransfer, toMachine, beforeEntryId, afterEntryId, hadBucket }) => {
            const common = {
                entry_type: isBlockRow(row) ? "block" : "lot",
                entry_id: moved.entry_id,
                before_entry_id: beforeEntryId,
                after_entry_id: afterEntryId,
                lock_version: moved.lock_version ?? null,
            };

            const request = isTransfer
                ? mutate(route("loading-plan.transfer"), {
                    body: {
                        ...common,
                        lot_id: moved.entry_id ? undefined : moved.lot_id,
                        scheduled_date: moved.entry_id ? undefined : date,
                        target_machine: toMachine,
                    },
                })
                : mutate(route("loading-plan.move"), { body: { ...common, machine: toMachine } });

            return withUpdating(request)
                .then((entry) => {
                    syncServerFields?.([
                        {
                            dndId: moved._dndId,
                            fields: {
                                entry_id: entry.entry_id ?? entry.id,
                                lock_version: entry.lock_version,
                                bucket_id: null,
                                bucket_position: null,
                            },
                        },
                    ]);

                    // arrangement-dependent values: present only, never into undo/redo snapshots.
                    // Guarded with `in`: the unassign response is a raw model without these keys.
                    // not yet tested if introduced bugs NOV 4
                    const derived = {};
                    for (const k of ["capacity_uph", "doable", "doable_status"]) {
                        if (k in entry) derived[k] = entry[k];
                    }
                    if (Object.keys(derived).length) {
                        update((prev) => prev.map((r) => (r._dndId === moved._dndId ? { ...r, ...derived } : r)), true);
                    }

                    applyAffectedTimings(update, entry.affected_timings, date);

                    if (toMachine === null && moved.location && moved.location !== selectedLocation) {
                        toast?.info?.(`lot(s) returned to Unassigned. all rows other than in ${selectedLocation} will not be visible anymore.`);
                    }
                    if (hadBucket) dropUndoHistory();
                })
                .catch((err) => {
                    console.error("Failed to persist move/transfer:", err);
                    revertLocal(base, hadBucket);
                    toast?.error?.(err?.message ?? "Couldn't move the row — reverted.");
                });
        },
        [mutate, withUpdating, date, syncServerFields, update, selectedLocation, dropUndoHistory, revertLocal, toast],
    );

    /** Drop onto a machine lane / a row of a machine (or onto Unassigned, toMachine === null). */
    const moveToMachine = useCallback(
        (group, drop, toMachine) => {
            const base = store.getState().present.rows;
            const placed = placeRows(base, group, {
                toMachine,
                target: drop.target ?? null,
                run: drop.run ?? null,
            });
            if (!placed) return;

            const { rows, moved, isTransfer } = placed;
            const isGroup = group.length > 1;
            const hadBucket = group.some((r) => r.bucket_id != null);
            const beforeEntryId = findMachineNeighbors(rows, moved[0]._dndId, toMachine).beforeEntryId;
            const afterEntryId = findMachineNeighbors(rows, moved[moved.length - 1]._dndId, toMachine).afterEntryId;

            if (isGroup) clearSelection();
            update(() => rows);
            setIsDirty(true);

            if (!isGroup) {
                const fromMachine = group[0].machine;
                onReorder?.(toMachine, rows.filter((r) => r.machine === toMachine));
                if (isTransfer) {
                    onReorder?.(fromMachine, rows.filter((r) => r.machine === fromMachine));
                    onLotTransfer?.(moved[0].lot_id, fromMachine, toMachine);
                }
            }

            const args = { base, moved, toMachine, beforeEntryId, afterEntryId, hadBucket };
            return isGroup
                ? persistGroupMove(args)
                : persistSingleMove({ ...args, row: group[0], moved: moved[0], isTransfer });
        },
        [store, clearSelection, update, setIsDirty, onReorder, onLotTransfer, persistGroupMove, persistSingleMove],
    );

    const dropOnUnassigned = useCallback(
        (group, drop) => {
            if (group.length > 1) {
                const kind = kindOf(group[0]);
                if (kind === "group") onUnpark?.(group);
                else if (kind === "machine") {
                    if (group.some((r) => r.rework_seq > 0)) {
                        toast?.error?.(MSG.reworkUnassign);
                        return;
                    }
                    onUnassign?.();
                }
                return;
            }

            const [row] = group;
            if (row.bucket_id != null) return onUnpark?.([row]);
            if (row.rework_seq > 0) return toast?.error?.(MSG.reworkUnassign);
            if (isBlockRow(row)) return toast?.error?.(MSG.blockUnassign);
            if (row.machine === null) return; // already unassigned
            return moveToMachine(group, drop, null);
        },
        [onUnpark, onUnassign, moveToMachine, toast],
    );

    const handleDragEnd = useCallback(
        (event) => {
            setActiveId(null);
            if (refusedRef.current) {
                refusedRef.current = false;
                return;
            }

            const { active, over } = event;
            if (!over || !beginWrite()) return;

            const overId = String(over.id);
            if (String(active.id) === overId.replace("row-", "")) return; // dropped on itself

            const group = groupFor(active.id);
            if (group.length === 0) return;

            const drop = resolveDrop(overId, dataRows, collapsedRunsById);
            if (!drop) return;
            if (drop.type === "row" && (!drop.target || group.some((r) => r.id === drop.target.id))) return;

            const overBucket = drop.type === "bucket" || (drop.type === "row" && drop.target.bucket_id != null);
            if (overBucket) return dropOnBucket(group, drop);

            const toMachine = drop.type === "machine" ? drop.machine : drop.target.machine;
            if (toMachine === null) return dropOnUnassigned(group, drop);

            return moveToMachine(group, drop, toMachine);
        },
        [beginWrite, groupFor, dataRows, collapsedRunsById, dropOnBucket, dropOnUnassigned, moveToMachine],
    );

    return {
        sensors,
        collisionDetection: pointerWithin,
        draggedRow,
        draggedCount,
        handleDragStart,
        handleDragEnd,
        handleDragCancel,
    };
}