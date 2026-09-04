import { recomputeMachine } from "@/Lib/LoadingPlan/loadingPlanSchedule";
import { syncDeemoToServer } from "@/Lib/LoadingPlan/sync";
import { useCallback, useEffect, useRef } from "react";

/**
 * `getPresent` should be a stable function returning the undo store's
 * current `present` snapshot (e.g. `() => useDeemoStore.getState().present`)
 * — passed as a getter rather than a value so this hook always reads the
 * state *after* `undo`/`redo` has already mutated the store.
 */
export function useUndoRedoSync({ dataRows, undo, redo, getPresent, baseTimes, date, mutate, update, toast }) {
    const dataRowsRef = useRef(dataRows);
    useEffect(() => {
        dataRowsRef.current = dataRows;
    }, [dataRows]);

    const isSyncingRef = useRef(false);

    const applyHistoryStep = useCallback(
        async (step) => {
            if (isSyncingRef.current) return;
            isSyncingRef.current = true;
            try {
                const prevSnapshot = dataRowsRef.current;
                step(); // mutates the undo store in place (undo() or redo())

                const nextSnapshot = getPresent().map((r) => ({ ...r }));

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

                await syncDeemoToServer(prevSnapshot, nextSnapshot, date, mutate, update, toast);
            } finally {
                isSyncingRef.current = false;
            }
        },
        [getPresent, baseTimes, date, update, mutate, toast],
    );

    const handleUndo = useCallback(() => applyHistoryStep(undo), [applyHistoryStep, undo]);
    const handleRedo = useCallback(() => applyHistoryStep(redo), [applyHistoryStep, redo]);

    return { handleUndo, handleRedo, dataRowsRef };
}
