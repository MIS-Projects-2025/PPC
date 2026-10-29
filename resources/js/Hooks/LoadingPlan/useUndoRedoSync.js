import { applyAffectedTimings } from "@/Lib/LoadingPlan/loadingPlanSchedule";
import {
    callRevertMerge, callRevertSplit, callUnrevertMerge, callUnrevertSplit,
    reconcileMergeRevert, reconcileMergeUnrevert,
    reconcileSplitRevert, reconcileSplitUnrevert,
} from "@/Lib/LoadingPlan/splitMergeApi";
import { syncDeemoToServer } from "@/Lib/LoadingPlan/sync";
import { useCallback, useEffect, useRef } from "react";

// revert returns enriched rows (entry_id); unrevert returns raw models for `parent` (id)
const entryIdOf = (e) => e?.entry_id ?? e?.id;

export function useUndoRedoSync({ store, withUpdating, isLocked, dataRows, date, mutate, update, toast }) {
    const dataRowsRef = useRef(dataRows);
    useEffect(() => { dataRowsRef.current = dataRows; }, [dataRows]);

    const isSyncingRef = useRef(false);

    const applyRowStep = useCallback(async (direction) => {
        const s = store.getState();
        const before = s.snapshot();          // full history, restored atomically on failure
        const prevRows = s.present.rows;      // read from the store, not a render-lagged ref
        direction === "undo" ? s.undo() : s.redo();

        const nextRows = store.getState().present.rows.map((r) => ({ ...r }));
        const nextIds = new Set(nextRows.map((r) => r._dndId));
        const deletedEntryIds = prevRows
            .filter((r) => r.entry_id && !nextIds.has(r._dndId))
            .map((r) => r.entry_id);

        const ok = await syncDeemoToServer(
            prevRows, nextRows, date, mutate, update, toast, deletedEntryIds,
            store.getState().syncServerFields, {}, { revertOnError: false },
        );
        if (ok === false) store.getState().restore(before);
    }, [store, date, update, mutate, toast]);

    const applyCompoundStep = useCallback(async (action, direction) => {
        const isSplit = action.type === "split";
        const id = isSplit ? action.splitId : action.mergeId;
        const targetState = direction === "undo"
            ? (action.resultingState === "active" ? "reverted" : "active")
            : action.resultingState;

        let result, reconcile;
        try {
            if (isSplit) {
                [result, reconcile] = targetState === "reverted"
                    ? [await callRevertSplit(mutate, id, null), reconcileSplitRevert]
                    : [await callUnrevertSplit(mutate, id, null), reconcileSplitUnrevert];
            } else {
                [result, reconcile] = targetState === "reverted"
                    ? [await callRevertMerge(mutate, id), reconcileMergeRevert]
                    : [await callUnrevertMerge(mutate, id, null), reconcileMergeUnrevert];
            }
        } catch (err) {
            console.error(`${action.type} ${targetState} failed:`, err);
            toast?.error?.(err?.data?.message ?? `Couldn't ${direction} that ${action.type}.`);
            return;
        }

        const s = store.getState();
        direction === "undo" ? s.undo() : s.redo();

        const rows = store.getState().present.rows;
        const dndOf = (entryId) => rows.find((r) => r.entry_id === entryId)?._dndId ?? `entry-${entryId}`;
        const patches = [];

        if (isSplit) {
            if (result.parent) {
                patches.push({ dndId: dndOf(entryIdOf(result.parent)), fields: { lock_version: result.parent.lock_version } });
            }
            // unrevert recreates the child under a NEW entry_id; every snapshot still holds the old one
            if (targetState === "active" && result.child) {
                const c = result.child;
                rows
                    .filter((r) => r.lot_id === c.lot_id && !r.is_rework && r.entry_id !== c.entry_id
                        && (r.scheduled_date ?? date) === (c.scheduled_date ?? date))
                    .forEach((r) => patches.push({
                        dndId: r._dndId,
                        fields: { entry_id: c.entry_id, id: `entry-${c.entry_id}`, _dndId: `entry-${c.entry_id}`, lock_version: c.lock_version },
                    }));
            }
        } else {
            [result.target, result.source].filter(Boolean).forEach((e) =>
                patches.push({ dndId: dndOf(e.entry_id), fields: { lock_version: e.lock_version } }));
        }

        s.syncServerFields(patches);                    // all snapshots: ids + lock_version only
        update((prev) => reconcile(prev, result), true);
        applyAffectedTimings(update, result.affected_timings, date);
    }, [store, date, mutate, update, toast]);

    const applyHistoryStep = useCallback(async (direction) => {
        if (isSyncingRef.current || isLocked()) return;

        const s = store.getState();
        if (direction === "undo" ? !s.canUndo() : !s.canRedo()) return;

        isSyncingRef.current = true;
        try {
            const action = direction === "undo" ? s.pendingUndoAction() : s.pendingRedoAction();
            if (action?.type === "split" || action?.type === "merge") {
                await withUpdating(applyCompoundStep(action, direction));
            } else {
                await withUpdating(applyRowStep(direction));
            }
        } finally {
            isSyncingRef.current = false;
        }
    }, [store, isLocked, withUpdating, applyRowStep, applyCompoundStep]);

    return {
        handleUndo: useCallback(() => applyHistoryStep("undo"), [applyHistoryStep]),
        handleRedo: useCallback(() => applyHistoryStep("redo"), [applyHistoryStep]),
        dataRowsRef,
    };
}