import { mergeCompoundResponse } from "@/Lib/LoadingPlan/compoundActions";
import { recomputeMachine } from "@/Lib/LoadingPlan/loadingPlanSchedule";
import {
    callRevertMerge,
    callRevertSplit,
    callUnrevertMerge,
    callUnrevertSplit,
    reconcileMergeRevert, reconcileMergeUnrevert,
    reconcileSplitRevert, reconcileSplitUnrevert,
} from "@/Lib/LoadingPlan/splitMergeApi";
import { syncDeemoToServer } from "@/Lib/LoadingPlan/sync";
import { useCallback, useEffect, useRef } from "react";

export function useUndoRedoSync({ store, dataRows, baseTimes, date, mutate, update, toast }) {
    const dataRowsRef = useRef(dataRows);
    useEffect(() => { dataRowsRef.current = dataRows; }, [dataRows]);

    const isSyncingRef = useRef(false);

    const applyRowStep = useCallback(async (stepFn) => {
        const prevSnapshot = dataRowsRef.current;
        stepFn(); // store's undo() or redo()

        const nextSnapshot = store.getState().present.rows.map((r) => ({ ...r }));

        if (baseTimes) {
            const affectedMachines = new Set([...prevSnapshot.map(r => r.machine), ...nextSnapshot.map(r => r.machine)]);
            affectedMachines.forEach((m) => { if (m !== null) recomputeMachine(nextSnapshot, m, baseTimes, date); });
            update(() => nextSnapshot, true);
        }

        const nextIds = new Set(nextSnapshot.map((r) => r._dndId));
        const deletedEntryIds = prevSnapshot.filter((r) => r.entry_id && !nextIds.has(r._dndId)).map((r) => r.entry_id);

        await syncDeemoToServer(prevSnapshot, nextSnapshot, date, mutate, update, toast, deletedEntryIds, store.getState().syncServerFields);
    }, [store, baseTimes, date, update, mutate, toast]);

    const applyCompoundStep = useCallback(async (action, direction) => {
        const isSplit = action.type === "split";
        const id = isSplit ? action.splitId : action.mergeId;

        const targetState = direction === "undo"
            ? (action.resultingState === "active" ? "reverted" : "active")
            : action.resultingState;

        try {
            let result, reconcile;
            if (isSplit) {
                [result, reconcile] = targetState === "reverted"
                    ? [await callRevertSplit(mutate, id, null), reconcileSplitRevert]
                    : [await callUnrevertSplit(mutate, id, null), reconcileSplitUnrevert];
            } else {
                [result, reconcile] = targetState === "reverted"
                    ? [await callRevertMerge(mutate, id), reconcileMergeRevert]
                    : [await callUnrevertMerge(mutate, id, null), reconcileMergeUnrevert];
            }

            direction === "undo" ? store.getState().undo() : store.getState().redo();
            update((prev) => reconcile(prev, result), true);
        } catch (err) {
            console.error(`${action.type} ${targetState} failed:`, err);
            toast?.error?.(`Couldn't ${direction} that ${action.type}.`);
        }
    }, [store, mutate, update, toast]);

    const applyHistoryStep = useCallback(async (direction) => {
        if (isSyncingRef.current) return;
        isSyncingRef.current = true;
        try {
            const { pendingUndoAction, pendingRedoAction, undo, redo } = store.getState();
            const action = direction === "undo" ? pendingUndoAction() : pendingRedoAction();

            if (action?.type === "split" || action?.type === "merge") {
                await applyCompoundStep(action, direction);
            } else {
                await applyRowStep(direction === "undo" ? undo : redo);
            }
        } finally {
            isSyncingRef.current = false;
        }
    }, [store, applyRowStep, applyCompoundStep]);

    return {
        handleUndo: useCallback(() => applyHistoryStep("undo"), [applyHistoryStep]),
        handleRedo: useCallback(() => applyHistoryStep("redo"), [applyHistoryStep]),
        dataRowsRef,
    };
}