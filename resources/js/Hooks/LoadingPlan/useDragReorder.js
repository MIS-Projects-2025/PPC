
import { droppableMachineFromToken, isBlockRow } from "@/Lib/LoadingPlan/helpers";
import { applyAffectedTimings, findMachineNeighbors } from "@/Lib/LoadingPlan/loadingPlanSchedule";
import { PointerSensor, pointerWithin, useSensor, useSensors } from "@dnd-kit/core";
import { useCallback, useMemo, useRef, useState } from "react";

export function useDragReorder({
    dataRows,
    update,
    withUpdating,
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
    syncServerFields, // <- new
    store,
}) {
    const [activeId, setActiveId] = useState(null);
    const [hoveredRowId, setHoveredRowId] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    );

    const handleDragCancel = useCallback(() => {
        setActiveId(null);
        setHoveredRowId(null);
    }, []);

    const handleDragOver = useCallback((event) => {
        const overId = event.over ? event.over.id : null;
        setHoveredRowId((prev) => (prev !== overId ? overId : prev));
    }, []);

    const refusedRef = useRef(false);

    const kindOf = (r) => (r.bucket_id != null ? "group" : r.machine === null ? "unassigned" : "machine");

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

    const groupProblem = useCallback(
        (group) => {
            if (new Set(group.map(kindOf)).size > 1) {
                return "Select only unassigned, only planned, or only grouped rows.";
            }
            if (new Set(group.map((r) => r.scheduled_date ?? date)).size > 1) {
                return "Selected rows are from different dates.";
            }
            return null;
        },
        [date],
    );

    const handleDragStart = useCallback(
        (event) => {
            const group = groupFor(event.active.id);
            const problem = group.length > 1 ? groupProblem(group) : null;
            if (problem) {
                refusedRef.current = true; // overlay never shows; the drop is ignored
                toast?.error?.(problem);
                return;
            }
            refusedRef.current = false;
            setActiveId(event.active.id);
            if (group.length <= 1) clearSelection();
        },
        [groupFor, groupProblem, toast, clearSelection],
    );

    const draggedCount = useMemo(
        () => (activeId == null ? 0 : groupFor(activeId).length),
        [activeId, groupFor],
    );

    const handleGroupDrop = useCallback(
        (group, overId) => {
            const groupIds = new Set(group.map((r) => r.id));
            const lots = group.filter((r) => !isBlockRow(r));

            // ---- bucket header ----
            if (overId.startsWith("bucket-")) {
                if (lots.length !== group.length) {
                    toast?.error?.("Time blocks can't be put in a group.");
                    return;
                }
                const bucketId = Number(overId.slice("bucket-".length));
                const first = dataRows
                    .filter((r) => r.bucket_id === bucketId && !groupIds.has(r.id))
                    .sort((a, b) => a.bucket_position - b.bucket_position)[0];
                onPark?.(lots, bucketId, { nextLotId: first?.lot_id ?? null });
                return;
            }

            // ---- resolve what's under the cursor ----
            let target = null;
            let run = null;
            let toMachine;

            if (overId.startsWith("row-")) {
                const key = overId.slice("row-".length);
                run = collapsedRunsById?.get(key) ?? null;
                target = run
                    ? dataRows.find((r) => r.id === run.firstRowId)
                    : dataRows.find((r) => String(r.id) === key);
                if (!target || groupIds.has(target.id)) return;

                if (target.bucket_id != null) {
                    if (lots.length !== group.length) {
                        toast?.error?.("Time blocks can't be put in a group.");
                        return;
                    }
                    const sameBucket = group.every((r) => r.bucket_id === target.bucket_id);
                    const down = sameBucket && (group[0].bucket_position ?? 0) < (target.bucket_position ?? 0);
                    onPark?.(lots, target.bucket_id, down ? { prevLotId: target.lot_id } : { nextLotId: target.lot_id });
                    return;
                }
                toMachine = target.machine;
            } else if (overId.startsWith("machine-")) {
                toMachine = droppableMachineFromToken(overId);
            } else {
                return;
            }

            // ---- drop on Unassigned ----
            if (toMachine === null) {
                const kind = kindOf(group[0]);
                if (kind === "group") onUnpark?.(group);
                else if (kind === "machine") {
                    if (group.some((r) => r.rework_seq > 0)) {
                        toast?.error?.("Rework rows cannot be unassigned — delete the row instead.");
                        return;
                    }
                    onUnassign?.();
                }
                return;
            }

            // ---- drop on a machine: move as one contiguous block ----
            const prevSnapshot = dataRows;
            const hadBucket = group.some((r) => r.bucket_id != null);
            let movedRows = [];
            let beforeEntryId = null;
            let afterEntryId = null;

            clearSelection();

            update((prev) => {
                const order = new Map(group.map((r, i) => [r.id, i]));
                const next = prev.map((r) => ({ ...r }));
                const idxOf = (id) => next.findIndex((r) => String(r.id) === String(id));

                const isTransfer = group.some((r) => r.machine !== toMachine);
                const targetIdx = target ? idxOf(target.id) : -1;
                const down = !!target && !isTransfer && group.every((r) => idxOf(r.id) < targetIdx);

                const moved = next.filter((r) => order.has(r.id)).sort((a, b) => order.get(a.id) - order.get(b.id));
                const rest = next.filter((r) => !order.has(r.id));

                let insertAt;
                if (target) {
                    const anchorId = run ? (down ? run.lastRowId : run.firstRowId) : target.id;
                    insertAt = rest.findIndex((r) => String(r.id) === String(anchorId));
                    if (insertAt === -1) return prev;
                    if (down) insertAt += 1;
                } else {
                    insertAt = rest.length;
                    for (let i = rest.length - 1; i >= 0; i--) {
                        if (rest[i].machine === toMachine) { insertAt = i + 1; break; }
                    }
                }

                moved.forEach((r) => {
                    r.machine = toMachine;
                    r.bucket_id = null;
                    r.bucket_position = null;
                });
                rest.splice(insertAt, 0, ...moved);

                movedRows = moved;
                beforeEntryId = findMachineNeighbors(rest, moved[0]._dndId, toMachine).beforeEntryId;
                afterEntryId = findMachineNeighbors(rest, moved[moved.length - 1]._dndId, toMachine).afterEntryId;
                return rest;
            });

            if (movedRows.length === 0) return;
            setIsDirty(true);

            withUpdating(
                mutate(route("loading-plan.bulk-move"), {
                    body: {
                        items: movedRows.map((r) => (r.entry_id ? { entry_id: r.entry_id } : { lot_id: r.lot_id })),
                        target_machine: toMachine,
                        before_entry_id: beforeEntryId,
                        after_entry_id: afterEntryId,
                        scheduled_date: date,
                    },
                }),
            )
                .then(({ entries, affected_timings }) => {
                    const patches = movedRows
                        .map((r) => {
                            const m = entries?.find((e) => (r.entry_id ? e.entry_id === r.entry_id : e.lot_id === r.lot_id));
                            return m
                                ? {
                                    dndId: r._dndId,
                                    fields: {
                                        entry_id: m.entry_id,
                                        lock_version: m.lock_version,
                                        capacity_uph: m.capacity_uph,
                                        doable: m.doable,
                                        doable_status: m.doable_status,
                                        bucket_id: null,
                                        bucket_position: null,
                                    },
                                }
                                : null;
                        })
                        .filter(Boolean);
                    syncServerFields?.(patches);
                    applyAffectedTimings(update, affected_timings, date);
                    if (hadBucket) store.getState().reset(store.getState().present.rows);
                })
                .catch((err) => {
                    console.error("Failed to move the selected rows:", err);
                    update(() => prevSnapshot, true);
                    if (hadBucket) store.getState().reset(prevSnapshot);
                    toast?.error?.(err?.message ?? "Couldn't move the selected rows — reverted.");
                });
        },
        [dataRows, collapsedRunsById, onPark, onUnpark, onUnassign, update, withUpdating, mutate, date, toast, clearSelection, setIsDirty, syncServerFields, store],
    );

    const handleDragEnd = useCallback(
        (event) => {
            setActiveId(null);
            setHoveredRowId(null);
            if (refusedRef.current) { refusedRef.current = false; return; }
            const { active, over } = event;
            if (!over) return;

            const overId = String(over.id);

            console.log("LOG ~ useDragReorder.js:56 ~ useDragReorder ~ overId:", overId);
            
            const draggedRowId = active.id;

            if (String(draggedRowId) === overId.replace("row-", "")) return;

            const group = groupFor(draggedRowId);
            if (group.length > 1) {
                handleGroupDrop(group, overId);
                return;
            }

            const dragged = dataRows.find((r) => r.id === draggedRowId);

            let bucketDrop = null;
            if (overId.startsWith("bucket-")) {
                const bucketId = Number(overId.slice("bucket-".length));
                const first = dataRows
                    .filter((r) => r.bucket_id === bucketId)
                    .sort((a, b) => a.bucket_position - b.bucket_position)[0];
                bucketDrop = { bucketId, nextLotId: first?.lot_id ?? null };
            } else if (overId.startsWith("row-")) {
                const target = dataRows.find((r) => String(r.id) === overId.slice(4));
                if (target?.bucket_id != null) {
                    const sameBucket = dragged?.bucket_id === target.bucket_id;
                    const draggingDown =
                        sameBucket && (dragged.bucket_position ?? 0) < (target.bucket_position ?? 0);

                    bucketDrop = draggingDown
                        ? { bucketId: target.bucket_id, prevLotId: target.lot_id } // land after target
                        : { bucketId: target.bucket_id, nextLotId: target.lot_id }; // land in target's slot
                }
            }

            if (bucketDrop) {
                if (dragged && !isBlockRow(dragged)) onPark?.([dragged], bucketDrop.bucketId, bucketDrop);
                return;
            }

            // parked row dropped on Unassigned (header, or an unassigned row) = unpark
            const overRow = overId.startsWith("row-") ? dataRows.find((r) => String(r.id) === overId.slice(4)) : null;
            const toUnassigned = overId.startsWith("machine-")
                ? droppableMachineFromToken(overId) === null
                : overRow && overRow.machine === null && overRow.bucket_id == null;

            if (dragged?.bucket_id != null && toUnassigned) {
                onUnpark?.([dragged]);
                return;
            }

            if (dragged?.rework_seq > 0 && toUnassigned) {
                toast.error("Rework rows cannot be unassigned — delete the row instead.")
                return;
            }            

            let pending = null;

            update((prev) => {
                const next = prev.map((r) => ({ ...r }));
                const fromIndex = next.findIndex((r) => r.id === draggedRowId);
                if (fromIndex === -1) return prev;
                
                let leftBucket = false;
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
                    const targetKey = overId.slice("row-".length);
                    const run = collapsedRunsById?.get(targetKey);
                    const targetRowId = run ? run.firstRowId : targetKey;
                    const targetIndex = next.findIndex((r) => String(r.id) === String(targetRowId));

                    if (targetIndex === -1) return prev;

                    fromMachine = next[fromIndex].machine;
                    toMachine = next[targetIndex].machine;
                    isTransfer = fromMachine !== toMachine;
                    const draggingDown = fromIndex < targetIndex;

                    [moved] = next.splice(fromIndex, 1);
                    if (isTransfer) moved.machine = toMachine;

                    let insertAt;
                    if (run) {
                        // dragging down from above the run → below its last row; otherwise directly above its first
                        const below = draggingDown && !isTransfer;
                        insertAt = next.findIndex((r) => String(r.id) === String(below ? run.lastRowId : run.firstRowId));
                        if (insertAt === -1) insertAt = next.length;
                        else if (below) insertAt += 1;
                    } else {
                        insertAt = next.findIndex((r) => String(r.id) === targetKey);
                        if (insertAt === -1) insertAt = next.length;
                        else if (draggingDown) insertAt += 1;
                    }
                    next.splice(insertAt, 0, moved);
                } else {
                    return prev;
                }

                if (toMachine === null) {
                    moved.time_start = null;
                    moved.time_end = null;
                    moved.time_start_day_offset = 0;
                    moved.time_end_day_offset = 0;
                }

                if (moved.bucket_id != null) {
                    leftBucket = true;
                    moved.bucket_id = null;
                    moved.bucket_position = null;
                }

                onReorder?.(toMachine, next.filter((r) => r.machine === toMachine));
                if (isTransfer) {
                    onReorder?.(fromMachine, next.filter((r) => r.machine === fromMachine));
                    onLotTransfer?.(moved.lot_id, fromMachine, toMachine);
                }

                pending = { toMachine, isTransfer, moved, finalRows: next, leftBucket };
                return next;
            });

            setIsDirty(true);
            if (!pending) return;

            const { toMachine, isTransfer, moved, finalRows, leftBucket } = pending;
            const prevSnapshot = dataRows;

            if (toMachine === null && !isTransfer) return;
            const isBlock = isBlockRow(moved);
            if (isBlock && !moved.id) return;

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
                            entry_id: moved.entry_id,
                            lot_id: moved.entry_id ? undefined : moved.lot_id,
                            scheduled_date: moved.entry_id ? undefined : date,
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
                    applyAffectedTimings(update, entry.affected_timings, date);
                    if (leftBucket) store.getState().reset(store.getState().present.rows);
                })
                .catch((err) => {
                    // NOTE (carried over): still no rollback on failure here —
                    // preserved as-is per the original comment. Flag separately
                    // if you want this to restore the pre-drag snapshot too;
                    // it's the same missing-rollback pattern fixed elsewhere
                    // in this conversation (bulk transfer, status change, etc.)
                    // but this file's own comment suggested it might be
                    // intentional, so left untouched pending your call.
                    console.error("Failed to persist move/transfer:", err?.message);
                    if (leftBucket) store.getState().reset(prevSnapshot);
                    toast?.error?.(err?.message);
                });
        },
        [update, date, groupFor, handleGroupDrop, onReorder, collapsedRunsById, onLotTransfer, store, dataRows, withUpdating, mutate, toast, setIsDirty, syncServerFields],
    );


    const draggedRow = useMemo(
        () => dataRows.find((r) => r.id === activeId),
        [dataRows, activeId],
    );

    return {
        sensors,
        collisionDetection: pointerWithin,
        hoveredRowId,
        draggedRow,
        draggedCount,
        handleDragStart,
        handleDragOver,
        handleDragEnd,
        handleDragCancel,
    };
}