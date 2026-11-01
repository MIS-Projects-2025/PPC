import { applyAffectedTimings } from "@/Lib/LoadingPlan/loadingPlanSchedule";
import {
    callMerge,
    callRevertMerge,
    callRevertSplit,
    callSplit,
    reconcileMergeCreate,
    reconcileMergeRevert,
    reconcileSplitCreate,
    reconcileSplitRevert,
} from "@/Lib/LoadingPlan/splitMergeApi";
import { useCallback, useState } from "react";

const lockPatch = (entry) => entry && { dndId: `entry-${entry.entry_id}`, fields: { lock_version: entry.lock_version } };

export function useSplitMergeOperations({
    dataRows,
    update,
    beginWrite,
    withUpdating,
    mutate,
    date,
    toast,
    setIsDirty,
    syncServerFields,
}) {
    const [currentLotId, setCurrentLotId] = useState(null);
    const [currentLotRole, setCurrentLotRole] = useState({ isParent: false, isChild: false });
    const [splitHistoryData, setSplitHistoryData] = useState(null);
    const [mergeHistoryData, setMergeHistoryData] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(false);

    // ── history ──────────────────────────────────────────────────────────
    const loadHistory = useCallback(
        async ({ url, setData, label, isParent, isChild, lotId, onOpen, onError }) => {
            onOpen?.();
            setCurrentLotId(lotId ?? null);
            setHistoryLoading(true);
            setData(null);
            setCurrentLotRole({ isParent, isChild });
            try {
                const res = await fetch(url, { headers: { Accept: "application/json" } });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                setData(await res.json());
            } catch (err) {
                console.error(`Failed to load ${label} history:`, err);
                toast?.error?.(`Couldn't load ${label} history — please try again.`);
                onError?.();
            } finally {
                setHistoryLoading(false);
            }
        },
        [toast],
    );

    const loadSplitHistory = useCallback(
        (rootLotId, isParent, isChild, opts = {}) =>
            loadHistory({
                url: route("loading-plan.splits.history", rootLotId),
                setData: setSplitHistoryData,
                label: "split",
                isParent,
                isChild,
                ...opts,
            }),
        [loadHistory],
    );

    const loadMergeHistory = useCallback(
        (targetLotId, isParent, isChild, opts = {}) =>
            loadHistory({
                url: route("loading-plan.merges.history", { targetLotId }),
                setData: setMergeHistoryData,
                label: "merge",
                isParent,
                isChild,
                ...opts,
            }),
        [loadHistory],
    );

    // ── writes ───────────────────────────────────────────────────────────
    const runWrite = useCallback(
        (request, { onSuccess, failMessage, onDone }) =>
            withUpdating(request)
                .then(onSuccess)
                .catch((err) => {
                    console.error(failMessage, err);
                    toast?.error?.(err?.message ?? failMessage);
                })
                .finally(() => onDone?.()),
        [withUpdating, toast],
    );

    /** Common tail of every successful split/merge write. */
    const afterWrite = useCallback(
        (result, patches) => {
            applyAffectedTimings(update, result.affected_timings, date);
            syncServerFields?.(patches.filter(Boolean));
            setIsDirty(true);
        },
        [update, date, syncServerFields, setIsDirty],
    );

    const revertSplit = useCallback(
        ({ splitId, revertedBy, childLotId }, { onDone } = {}) => {
            if (!beginWrite()) return;

            const childRow = dataRows.find((r) => r.lot_id === childLotId && !r.is_rework && !r.is_leaked);
            if (!childRow) {
                toast?.error?.("Couldn't find the split lot — please refresh.");
                return;
            }

            runWrite(callRevertSplit(mutate, splitId, revertedBy), {
                failMessage: "Couldn't revert the split — please try again.",
                onDone,
                onSuccess: (result) => {
                    update(
                        (prev) => reconcileSplitRevert(prev, result, { childEntryId: childRow.entry_id }),
                        false,
                        { type: "split", splitId, resultingState: "reverted" },
                    );
                    // parent survives: its lock_version must reach past/future snapshots too
                    afterWrite(result, [lockPatch(result.parent)]);
                },
            });
        },
        [dataRows, beginWrite, toast, runWrite, mutate, update, afterWrite],
    );

    const revertMerge = useCallback(
        ({ mergeId: requestedMergeId, targetLotId, sourceLotId }, { onDone } = {}) => {
            if (!beginWrite()) return;

            const targetRow = dataRows.find((r) => r.lot_id === targetLotId);
            const sourceRow = dataRows.find((r) => r.lot_id === sourceLotId);
            if (!targetRow || !sourceRow) {
                toast?.error?.("Couldn't find the lots to revert — please refresh.");
                return;
            }

            const mergeId = requestedMergeId ?? targetRow.merge_info?.mergeId;
            if (!mergeId) {
                toast?.error?.(`Couldn't find merge record for lot ${targetLotId} — please refresh.`);
                return;
            }

            runWrite(callRevertMerge(mutate, mergeId), {
                failMessage: "Couldn't revert the merge — please try again.",
                onDone,
                onSuccess: (result) => {
                    update((prev) => reconcileMergeRevert(prev, result), false, {
                        type: "merge",
                        mergeId,
                        resultingState: "reverted",
                    });
                    afterWrite(result, [lockPatch(result.target), lockPatch(result.source)]);
                },
            });
        },
        [dataRows, beginWrite, toast, runWrite, mutate, update, afterWrite],
    );

    const mergeRows = useCallback(
        ({ targetLotEntryId, sourceLotEntryId }) => {
            if (!beginWrite()) return;

            const targetRow = dataRows.find((r) => r.entry_id === targetLotEntryId);
            const sourceRow = dataRows.find((r) => r.entry_id === sourceLotEntryId);
            if (!targetRow || !sourceRow) {
                toast?.error?.("Couldn't find the lots to merge — please refresh.");
                return;
            }

            runWrite(callMerge(mutate, { entryIdA: targetRow.entry_id, entryIdB: sourceRow.entry_id, date }), {
                failMessage: "Couldn't merge the lots — please try again.",
                onSuccess: (result) => {
                    update((prev) => reconcileMergeCreate(prev, result), false, {
                        type: "merge",
                        mergeId: result.merge.id,
                        resultingState: "active",
                    });
                    afterWrite(result, [lockPatch(result.target), lockPatch(result.source)]);
                },
            });
        },
        [dataRows, date, beginWrite, toast, runWrite, mutate, update, afterWrite],
    );

    const splitRow = useCallback(
        ({ parentEntryId, childLotId, childQty, targetMachine, beforeEntryId, afterEntryId }) => {
            if (!beginWrite()) return;

            if (!dataRows.some((r) => r.entry_id === parentEntryId)) {
                toast?.error?.("Couldn't find the lot to split — please refresh.");
                return;
            }

            runWrite(
                callSplit(mutate, { parentEntryId, childLotId, childQty, targetMachine, beforeEntryId, afterEntryId }),
                {
                    failMessage: "Couldn't split the lot — please try again.",
                    onSuccess: (result) => {
                        update((prev) => reconcileSplitCreate(prev, result, { parentEntryId }), false, {
                            type: "split",
                            splitId: result.split.id,
                            resultingState: "active",
                        });
                        // child is brand new: nothing stale to fix for it
                        afterWrite(result, [
                            { dndId: `entry-${parentEntryId}`, fields: { lock_version: result.parent.lock_version } },
                        ]);
                    },
                },
            );
        },
        [dataRows, beginWrite, toast, runWrite, mutate, update, afterWrite],
    );

    return {
        splitHistoryData,
        mergeHistoryData,
        currentLotRole,
        currentLotId,
        historyLoading,
        loadSplitHistory,
        loadMergeHistory,
        revertSplit,
        revertMerge,
        mergeRows,
        splitRow,
    };
}