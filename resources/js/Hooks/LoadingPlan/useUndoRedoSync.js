import { recomputeMachine } from "@/Lib/LoadingPlan/loadingPlanSchedule";
import { syncDeemoToServer } from "@/Lib/LoadingPlan/sync";
import { useCallback, useEffect, useRef } from "react";

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
                step();

                const nextSnapshot = getPresent().map((r) => ({ ...r }));

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

                const nextIds = new Set(nextSnapshot.map((r) => r._dndId));
                const deletedEntryIds = prevSnapshot
                    .filter((r) => r.entry_id && !nextIds.has(r._dndId))
                    .map((r) => r.entry_id);

                await syncDeemoToServer(prevSnapshot, nextSnapshot, date, mutate, update, toast, deletedEntryIds);
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