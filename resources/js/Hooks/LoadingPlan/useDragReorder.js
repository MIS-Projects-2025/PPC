import { droppableMachineFromToken, isBlockRow } from "@/Lib/LoadingPlan/helpers";
import { findMachineNeighbors, recomputeMachine } from "@/Lib/LoadingPlan/loadingPlanSchedule";
import { PointerSensor, pointerWithin, useSensor, useSensors } from "@dnd-kit/core";
import { useCallback, useMemo, useState } from "react";

export function useDragReorder({
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
    syncServerFields, // <- new
}) {
    const [activeId, setActiveId] = useState(null);
    const [hoveredRowId, setHoveredRowId] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    );

    const handleDragStart = useCallback(
        (event) => {
            setActiveId(event.active.id);
            clearSelection();
        },
        [clearSelection],
    );

    const handleDragCancel = useCallback(() => {
        setActiveId(null);
        setHoveredRowId(null);
    }, []);

    const handleDragOver = useCallback((event) => {
        const overId = event.over ? event.over.id : null;
        setHoveredRowId((prev) => (prev !== overId ? overId : prev));
    }, []);

    const handleDragEnd = useCallback(
        (event) => {
            setActiveId(null);
            setHoveredRowId(null);
            const { active, over } = event;
            if (!over) return;

            const overId = String(over.id);
            const draggedRowId = active.id;

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
                    if (isTransfer) recomputeMachine(next, fromMachine, baseTimes, date);
                }

                onReorder?.(toMachine, next.filter((r) => r.machine === toMachine));
                if (isTransfer) {
                    onReorder?.(fromMachine, next.filter((r) => r.machine === fromMachine));
                    onLotTransfer?.(moved.lot_id, fromMachine, toMachine);
                }

                pending = { toMachine, isTransfer, moved, finalRows: next };
                return next;
            });

            setIsDirty(true);
            if (!pending) return;

            const { toMachine, isTransfer, moved, finalRows } = pending;
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
                    // was update(..., true) — present-only. Now propagates
                    // lock_version (and the other server-computed fields)
                    // into every past/future snapshot holding this row, so
                    // a later undo doesn't resurrect a stale lock_version.
                    syncServerFields?.([
                        {
                            dndId: moved._dndId,
                            fields: {
                                time_start: entry.time_start,
                                time_end: entry.time_end,
                                sequence_order: entry.sequence_order,
                                lock_version: entry.lock_version,
                            },
                        },
                    ]);
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
                    toast?.error?.(err?.message);
                });
        },
        [update, baseTimes, date, onReorder, onLotTransfer, withUpdating, mutate, toast, setIsDirty, syncServerFields],
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
        handleDragStart,
        handleDragOver,
        handleDragEnd,
        handleDragCancel,
    };
}