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

    // FIX (carried over): onDragCancel referenced this in the original but
    // it never existed — cancelling a drag (e.g. Escape mid-drag) would
    // throw a ReferenceError.
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
            // These are the grid's row `id` (see rowKeyGetter,
            // useDraggable/useDroppable ids), NOT the backend `entry_id`.
            // `entry_id` is only pulled in once we build the persist
            // payload further down.
            const draggedRowId = active.id;

            // FIX (carried over): this used to compare a number
            // (active.id) against a string (String(over.id)) and could
            // never actually match.
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
                                    ? { ...r, sequence_order: entry.sequence_order, lock_version: entry.lock_version }
                                    : r,
                            ),
                        true,
                    );
                })
                .catch((err) => {
                    // NOTE (carried over): the original didn't call undo()
                    // here on failure, only logged + toasted — so a failed
                    // move/transfer currently leaves the optimistic local
                    // state in place even though the server rejected it.
                    // Preserved as-is; flag if that was unintentional.
                    console.error("Failed to persist move/transfer:", err?.message);
                    toast?.error?.(err?.message);
                });
        },
        [update, baseTimes, date, onReorder, onLotTransfer, withUpdating, mutate, toast, setIsDirty],
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
