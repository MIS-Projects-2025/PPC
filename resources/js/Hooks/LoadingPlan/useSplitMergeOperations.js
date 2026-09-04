import { recomputeMachine } from "@/Lib/LoadingPlan/loadingPlanSchedule";
import { useCallback, useState } from "react";

/**
 * FIX (carried over): the original handleShowMergeHistory set
 * `historyLoading` back to `false` immediately after setting it `true`,
 * with a "stub: avoid a perma-spinner while stubbed" comment — but the
 * `return;` right after it was already commented out, so the fetch below
 * still ran anyway. Net effect was a loading-spinner flicker (true, then
 * immediately false, then false again in `finally`) rather than an actual
 * stub. Removed here; loadMergeHistory now behaves like loadSplitHistory
 * (loading stays true until the fetch settles).
 */
export function useSplitMergeOperations({ dataRows, update, withUpdating, mutate, baseTimes, date, toast, setIsDirty }) {
    const [splitHistoryData, setSplitHistoryData] = useState(null);
    const [mergeHistoryData, setMergeHistoryData] = useState(null);
    const [currentLotRole, setCurrentLotRole] = useState({ isParent: false, isChild: false });
    const [historyLoading, setHistoryLoading] = useState(false);

    const loadSplitHistory = useCallback(
        async (rootLotId, isParent, isChild, { onOpen, onError } = {}) => {
            onOpen?.();
            setHistoryLoading(true);
            setSplitHistoryData(null);
            setCurrentLotRole({ isParent, isChild });

            try {
                const res = await fetch(route("loading-plan.splits.history", rootLotId));
                setSplitHistoryData(await res.json());
            } catch (err) {
                console.error("Failed to load split history:", err);
                toast?.error?.("Couldn't load split history — please try again.");
                onError?.();
            } finally {
                setHistoryLoading(false);
            }
        },
        [toast],
    );

    const loadMergeHistory = useCallback(
        async (targetLotId, isParent, isChild, { onOpen, onError } = {}) => {
            onOpen?.();
            setHistoryLoading(true);
            setMergeHistoryData(null);
            setCurrentLotRole({ isParent, isChild });

            try {
                const res = await fetch(route("loading-plan.merges.history", { targetLotId }));
                setMergeHistoryData(await res.json());
            } catch (err) {
                console.error("Failed to load merge history:", err);
                toast?.error?.("Couldn't load merge history — please try again.");
                onError?.();
            } finally {
                setHistoryLoading(false);
            }
        },
        [toast],
    );

    const revertSplit = useCallback(
        ({ splitId, revertedBy, childLotId }, { onDone } = {}) => {
            const childRow = dataRows.find((r) => r.lot_id === childLotId);
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
                            .filter((r) => r.lot_id !== result.deleted)
                            .map((r) =>
                                result.parent && r.lot_id === result.parent.lot_id
                                    ? {
                                          ...r,
                                          qty: result.parentQty ?? r.qty,
                                          doable: result.parentDoable ?? r.doable,
                                          doable_status: result.parentDoableStatus ?? r.doable_status,
                                          capacity_uph: result.parentCapacityUph ?? r.capacity_uph,
                                          lock_version: result.parent.lock_version,
                                          split_info: result.parentSplitInfo,
                                      }
                                    : r,
                            );
                        if (baseTimes && affectedMachine) recomputeMachine(next, affectedMachine, baseTimes, date);
                        return next;
                    });
                    setIsDirty(true);
                })
                .catch((err) => {
                    console.error("Failed to revert split:", err);
                    toast?.error?.("Couldn't revert the split — please try again.");
                })
                .finally(() => onDone?.());
        },
        [dataRows, baseTimes, date, update, withUpdating, mutate, toast, setIsDirty],
    );

    const revertMerge = useCallback(
        ({ targetLotId, sourceLotId }, { onDone } = {}) => {
            const targetRow = dataRows.find((r) => r.lot_id === targetLotId);
            const sourceRow = dataRows.find((r) => r.lot_id === sourceLotId);
            if (!targetRow || !sourceRow) {
                toast?.error?.("Couldn't find the lots to revert — please refresh.");
                return;
            }
            const mergeId = targetRow.merge_info?.mergeId;
            if (!mergeId) {
                toast?.error?.(`Couldn't find merge record for lot ${targetLotId} — please refresh.`);
                return;
            }
            const affectedTarget = targetRow.machine;
            const affectedSource = sourceRow.machine;

            withUpdating(
                mutate(route("loading-plan.merges.destroy", mergeId), {
                    method: "delete",
                    body: { reverted_by: null },
                }),
            )
                .then((result) => {
                    const { target, source } = result;
                    update((prev) => {
                        const next = prev.map((row) => {
                            if (row.lot_id === target.lot_id) {
                                return {
                                    ...row,
                                    qty: target.qty,
                                    lock_version: target.lock_version,
                                    merge_info: null,
                                    doable: target.doable,
                                    doable_status: target.doable_status,
                                    capacity_uph: target.capacity_uph,
                                };
                            }
                            if (row.lot_id === source.lot_id) {
                                return {
                                    ...row,
                                    qty: source.qty,
                                    lock_version: source.lock_version,
                                    merge_info: null,
                                    doable: source.doable,
                                    doable_status: source.doable_status,
                                    capacity_uph: source.capacity_uph,
                                };
                            }
                            return row;
                        });
                        if (baseTimes) {
                            if (affectedTarget) recomputeMachine(next, affectedTarget, baseTimes, date);
                            if (affectedSource) recomputeMachine(next, affectedSource, baseTimes, date);
                        }
                        return next;
                    });
                    setIsDirty(true);
                })
                .catch((err) => {
                    console.error("Failed to revert merge:", err);
                    toast?.error?.(err?.message ?? "Couldn't revert the merge — please try again.");
                })
                .finally(() => onDone?.());
        },
        [dataRows, baseTimes, date, update, withUpdating, mutate, toast, setIsDirty],
    );

    const mergeRows = useCallback(
        ({ targetLotEntryId, sourceLotEntryId }) => {
            const targetRow = dataRows.find((r) => r.entry_id === targetLotEntryId);
            const sourceRow = dataRows.find((r) => r.entry_id === sourceLotEntryId);
            if (!targetRow || !sourceRow) {
                toast?.error?.("Couldn't find the lots to merge — please refresh.");
                return;
            }
            const affectedTarget = targetRow.machine;
            const affectedSource = sourceRow.machine;

            withUpdating(
                mutate(route("loading-plan.merges.store"), {
                    body: {
                        entry_id_a: targetRow.entry_id,
                        entry_id_b: sourceRow.entry_id,
                        scheduled_date: date,
                    },
                }),
            )
                .then((result) => {
                    const { target, source } = result;
                    update((prev) => {
                        const next = prev.map((row) => {
                            if (row.entry_id === target.entry_id) return { ...row, ...target };
                            if (row.entry_id === source.entry_id) return { ...row, ...source };
                            return row;
                        });
                        if (baseTimes) {
                            if (affectedTarget) recomputeMachine(next, affectedTarget, baseTimes, date);
                            if (affectedSource) recomputeMachine(next, affectedSource, baseTimes, date);
                        }
                        return next;
                    });
                    setIsDirty(true);
                })
                .catch((err) => {
                    console.error("Failed to merge lots:", err);
                    toast?.error?.(err?.message ?? "Couldn't merge the lots — please try again.");
                });
        },
        [dataRows, baseTimes, date, update, withUpdating, mutate, toast, setIsDirty],
    );

    const splitRow = useCallback(
        ({ parentEntryLotId, childLotId, childQty, targetMachine, beforeEntryId, afterEntryId }) => {
            const parentRow = dataRows.find((r) => r.entry_id === parentEntryLotId);
            if (!parentRow) {
                toast?.error?.("Couldn't find the lot to split — please refresh.");
                return;
            }
            const parentMachine = parentRow.machine;

            withUpdating(
                mutate(route("loading-plan.splits.store"), {
                    body: {
                        parent_entry_lot_id: parentEntryLotId,
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

                    console.log("LOG ~ useSplitMergeOperations.js:243 ~ useSplitMergeOperations ~ result:", result);
                    update((prev) => {
                        const next = prev.map((row) =>
                            row.entry_id === parentEntryLotId ? { ...row, ...parent } : row,
                        );
                        next.push({
                            ...child,
                            status: child.status ?? parentRow.status ?? "NONE",
                            _dndId: `entry-${child.entry_id}`,
                        });
                        if (baseTimes) {
                            if (parentMachine) recomputeMachine(next, parentMachine, baseTimes, date);
                            if (targetMachine !== parentMachine) recomputeMachine(next, targetMachine, baseTimes, date);
                        }
                        return next;
                    });
                    setIsDirty(true);
                })
                .catch((err) => {
                    console.error("Failed to split lot:", err);
                    toast?.error?.(err?.message ?? "Couldn't split the lot — please try again.");
                });
        },
        [dataRows, baseTimes, date, update, withUpdating, mutate, toast, setIsDirty],
    );

    return {
        splitHistoryData,
        mergeHistoryData,
        currentLotRole,
        historyLoading,
        loadSplitHistory,
        loadMergeHistory,
        revertSplit,
        revertMerge,
        mergeRows,
        splitRow,
    };
}
