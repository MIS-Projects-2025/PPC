import { isBlockRow } from "@/Lib/LoadingPlan/helpers";
import { recomputeMachine } from "@/Lib/LoadingPlan/loadingPlanSchedule";
import { useCallback } from "react";

export function useBulkOperations({
    dataRows,
    selectedRows,
    update,
    withUpdating,
    mutate,
    toast,
    setIsDirty,
    clearSelection,
    baseTimes,
    date,
    syncServerFields,
}) {
    const runFieldUpdate = useCallback(
        ({ filter, fields, applyLocal, conflictLabel, afterSuccess }) => {
            const targets = dataRows.filter(filter);
            if (targets.length === 0) return;

            const prevSnapshot = dataRows;

            update((prev) => prev.map((r) => (filter(r) ? applyLocal(r) : r)));
            setIsDirty(true);

            withUpdating(
                mutate(route("loading-plan.bulk-update"), {
                    body: {
                        updates: targets.map((r) => ({
                            entry_id: r.entry_id ?? null,
                            fields,
                            lock_version: r.lock_version ?? 0,
                        })),
                    },
                }),
            )
                .then(({ entries }) => {
                    const patches = targets
                        .map((r) => {
                            const match = entries?.find((e) => e.id === r.entry_id || e.lot_id === r.lot_id);
                            return match ? { dndId: r._dndId, fields: { entry_id: match.id, lock_version: match.lock_version } } : null;
                        })
                        .filter(Boolean);
                    syncServerFields?.(patches);
                    afterSuccess?.();
                })
                .catch((err) => {
                    console.error(`Bulk ${conflictLabel} update failed:`, err);
                    update(() => prevSnapshot, true);
                    if (err.status === 409) {
                        const conflicts = err.data?.conflicts ?? [];
                        toast?.error?.(
                            conflicts.length > 0
                                ? `${conflicts.length} row(s) were changed by someone else — the change was cancelled.`
                                : "Some rows were changed by someone else — the change was cancelled.",
                        );
                    } else {
                        toast?.error?.(`Couldn't update ${conflictLabel} — reverted.`);
                    }
                });
        },
        [dataRows, update, withUpdating, mutate, toast, setIsDirty, syncServerFields],
    );

    const handleBulkTag = useCallback(
        (tag) =>
            runFieldUpdate({
                filter: (r) => selectedRows.has(r.id) && !isBlockRow(r) && r.entry_id,
                fields: { tag },
                applyLocal: (r) => ({ ...r, tag }),
                conflictLabel: "tag",
            }),
        [runFieldUpdate, selectedRows],
    );

    const handleBulkClearTag = useCallback(() => handleBulkTag(null), [handleBulkTag]);

    const handleBulkStatus = useCallback(
        (newStatus) => {
            const normalizedStatus = newStatus === "NONE" ? null : newStatus;
            runFieldUpdate({
                filter: (r) => selectedRows.has(r.id) && !isBlockRow(r) && r.entry_id,
                fields: { status: normalizedStatus },
                applyLocal: (r) => ({ ...r, status: normalizedStatus }),
                conflictLabel: "status",
            });
        },
        [runFieldUpdate, selectedRows],
    );

    const handleBulkFieldUpdate = useCallback(
        (field, value) => {
            runFieldUpdate({
                filter: (r) => selectedRows.has(r.id) && !isBlockRow(r) && r.entry_id,
                fields: { [field]: value },
                applyLocal: (r) => ({ ...r, [field]: value }),
                conflictLabel: field,
                afterSuccess: clearSelection,
            });
        },
        [runFieldUpdate, selectedRows, clearSelection],
    );

    const handleBulkTransfer = useCallback(
        (targetMachine) => {
            const selected = dataRows.filter((r) => selectedRows.has(r.id));
            const lotIds = selected.filter((r) => !isBlockRow(r) && r.lot_id).map((r) => r.lot_id);
            const blockEntryIds = selected.filter((r) => isBlockRow(r) && r.entry_id).map((r) => r.entry_id);

            const prevSnapshot = dataRows;

            const affectedMachines = new Set();
            update((prev) => {
                const next = prev.map((r) => {
                    if (!selectedRows.has(r.id)) return { ...r };
                    console.log('transferring', r.id, 'from', r.machine, 'to', targetMachine);
                    affectedMachines.add(r.machine);
                    affectedMachines.add(targetMachine);
                    return { ...r, machine: targetMachine };
                });
                console.log('before recompute', next.filter(r => selectedRows.has(r.id)));
                if (baseTimes) affectedMachines.forEach((m) => recomputeMachine(next, m, baseTimes, date));
                console.log('after recompute', next.filter(r => selectedRows.has(r.id)));
                return next;
            });
            setIsDirty(true);
            clearSelection();

            if (lotIds.length === 0 && blockEntryIds.length === 0) return;

            withUpdating(
                mutate(route("loading-plan.bulk-transfer"), {
                    body: {
                        lot_ids: lotIds,
                        block_entry_ids: blockEntryIds,
                        target_machine: targetMachine,
                        scheduled_date: date,
                    },
                }),
            )
                .then((updatedEntries) => {
                    const patches = selected
                        .map((r) => {
                            const match = isBlockRow(r)
                                ? updatedEntries?.find((e) => e.entry_id === r.entry_id)
                                : updatedEntries?.find((e) => e.lot_id === r.lot_id);
                            return match ? { dndId: r._dndId, fields: { ...match } } : null;
                        })
                        .filter(Boolean);
                    syncServerFields?.(patches);
                })
                .catch((err) => {
                    console.error("Bulk transfer failed:", err);
                    update(() => {
                        const restored = prevSnapshot.map((r) => ({ ...r }));
                        if (baseTimes) affectedMachines.forEach((m) => recomputeMachine(restored, m, baseTimes, date));
                        return restored;
                    }, true);
                    toast?.error?.(err?.message ?? "Couldn't transfer the selected rows — reverted.");
                });
        },
        [selectedRows, update, dataRows, baseTimes, date, clearSelection, withUpdating, mutate, toast, setIsDirty, syncServerFields],
    );

    const handleBulkDelete = useCallback(() => {
        const targets = dataRows.filter((r) => selectedRows.has(r.id) && r.entry_id);
        const entryIds = targets.map((r) => r.entry_id);
        const prevSnapshot = dataRows;

        update((prev) => {
            const affectedMachines = new Set();
            const next = prev
                .map((r) => {
                    if (!selectedRows.has(r.id)) return r;
                    if (isBlockRow(r)) return r;
                    affectedMachines.add(r.machine);
                    return { ...r, machine: null, sequence_order: null };
                })
                .filter((r) => !(selectedRows.has(r.id) && isBlockRow(r)));

            if (baseTimes) affectedMachines.forEach((m) => recomputeMachine(next, m, baseTimes, date));
            return next;
        });

        setIsDirty(true);
        clearSelection();

        if (entryIds.length === 0) return;

        withUpdating(mutate(route("loading-plan.bulk-delete"), { body: { ids: entryIds, scheduled_date: date } }))
            .then(({ unassigned }) => {
                const patches = targets
                    .map((r) => {
                        const match = unassigned?.find((e) => e.id === r.entry_id);
                        return match ? { dndId: r._dndId, fields: { lock_version: match.lock_version } } : null;
                    })
                    .filter(Boolean);
                syncServerFields?.(patches);
            })
            .catch((err) => {
                console.error("Bulk delete failed:", err);
                update(() => prevSnapshot, true);
                toast?.error?.("Couldn't delete/unassign — reverted.");
            });
    }, [selectedRows, update, dataRows, baseTimes, date, clearSelection, withUpdating, mutate, toast, setIsDirty, syncServerFields]);

    return {
        handleBulkTag,
        handleBulkClearTag,
        handleBulkStatus,
        handleBulkFieldUpdate,
        handleBulkTransfer,
        handleBulkDelete,
    };
}