import { isBlockRow } from "@/Lib/LoadingPlan/helpers";
import { applyAffectedTimings } from "@/Lib/LoadingPlan/loadingPlanSchedule";
import { useCallback } from "react";

export function useBulkOperations({
    dataRows,
    selectedRows,
    update,
    beginWrite,
    withUpdating,
    mutate,
    toast,
    setIsDirty,
    clearSelection,
    date,
    syncServerFields,
}) {
    const runFieldUpdate = useCallback(
        ({ filter, fields, applyLocal, conflictLabel, afterSuccess }) => {
            if (!beginWrite()) return;

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
                            const match = entries?.find((e) => e.id === r.entry_id);
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
        [dataRows, update, beginWrite, withUpdating, mutate, toast, setIsDirty, syncServerFields],
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
            if (!beginWrite()) return;

            const selected = dataRows.filter((r) => selectedRows.has(r.id));
            const lotEntryIds = selected.filter((r) => !isBlockRow(r) && r.entry_id).map((r) => r.entry_id);
            const unplannedLotIds = selected.filter((r) => !isBlockRow(r) && !r.entry_id && r.lot_id).map((r) => r.lot_id);
            const blockEntryIds = selected.filter((r) => isBlockRow(r) && r.entry_id).map((r) => r.entry_id);

            const prevSnapshot = dataRows;

            const affectedMachines = new Set();
            update((prev) => {
                const next = prev.map((r) => {
                    if (!selectedRows.has(r.id)) return { ...r };
                    affectedMachines.add(r.machine);
                    affectedMachines.add(targetMachine);
                    return { ...r, machine: targetMachine, bucket_id: null, bucket_position: null };
                });
                return next;
            });
            setIsDirty(true);
            clearSelection();

            if (lotEntryIds.length === 0 && unplannedLotIds.length === 0 && blockEntryIds.length === 0) return;

            withUpdating(
                mutate(route("loading-plan.bulk-transfer"), {
                    body: { lot_ids: unplannedLotIds, entry_ids: lotEntryIds, block_entry_ids: blockEntryIds, target_machine: targetMachine, scheduled_date: date },
                }),
            )
                .then(({ entries, affected_timings }) => {
                    const patches = selected
                        .map((r) => {
                            const match = r.entry_id
                                ? entries?.find((e) => e.entry_id === r.entry_id)
                                : entries?.find((e) => e.lot_id === r.lot_id);
                            return match ? { dndId: r._dndId, fields: { ...match } } : null;
                        })
                        .filter(Boolean);
                    syncServerFields?.(patches);
                    applyAffectedTimings(update, affected_timings, date);
                })
                .catch((err) => {
                    console.error("Bulk transfer failed:", err);
                    update(() => {
                        const restored = prevSnapshot.map((r) => ({ ...r }));
                        return restored;
                    }, true);
                    toast?.error?.(err?.message ?? "Couldn't transfer the selected rows — reverted.");
                });
        },
        [selectedRows, update, dataRows, date, clearSelection, beginWrite, withUpdating, mutate, toast, setIsDirty, syncServerFields],
    );

    const handleBulkDelete = useCallback(() => {
        if (!beginWrite()) return;  
        console.log("🚀 ~ useBulkOperations ~ selectedRows:", selectedRows)
        const targets = dataRows.filter((r) => {
            return selectedRows.has(r.id) && r.entry_id;
        });
        console.log("🚀 ~ useBulkOperations ~ targets:", targets)
        const entryIds = targets.map((r) => r.entry_id);
        const prevSnapshot = dataRows;

        const removable = (r) => isBlockRow(r) || r.is_rework;

        update((prev) => {
            const affectedMachines = new Set();
            const next = prev
                .map((r) => {
                    if (!selectedRows.has(r.id)) return r;
                    affectedMachines.add(r.machine);
                    if (removable(r)) return r;
                    return { ...r, machine: null, sequence_order: null };
                })
                .filter((r) => !(selectedRows.has(r.id) && removable(r)));

            return next;
        });

        setIsDirty(true);
        clearSelection();

        if (entryIds.length === 0) return;

        withUpdating(mutate(route("loading-plan.bulk-delete"), { body: { ids: entryIds, scheduled_date: date } }))
            .then(({ unassigned, affected_timings }) => {
                const patches = targets.map((r) => {
                    const m = unassigned?.find((e) => e.id === r.entry_id);
                    return m ? { dndId: r._dndId, fields: { lock_version: m.lock_version } } : null;
                }).filter(Boolean);
                syncServerFields?.(patches);
                applyAffectedTimings(update, affected_timings, date);
            })
            .catch((err) => {
                console.error("Bulk delete failed:", err);
                update(() => prevSnapshot, true);
                toast?.error?.("Couldn't delete/unassign — reverted.");
            });
    }, [selectedRows, update, dataRows, date, clearSelection, beginWrite, withUpdating, mutate, toast, setIsDirty, syncServerFields]);

    const handleRework = useCallback(
        (row) => {
            if (!beginWrite()) return false;

            if (!row || isBlockRow(row) || !row.entry_id || row.machine === null) return;

            withUpdating(
                mutate(route("loading-plan.entries.rework", { id: row.entry_id }), {
                    body: { machine: row.machine },
                }),
            )
                .then((entry) => {
                    const { affected_timings, ...row } = entry;
                    update((prev) => [...prev, { ...row, _dndId: `entry-${row.entry_id}` }]);
                    applyAffectedTimings(update, affected_timings, date);
                    setIsDirty(true);
                    return entry;
                })
                .catch((err) => {
                    console.error("Rework failed:", err);
                    toast?.error?.(err?.data?.message ?? "Couldn't create the rework row.");
                });
        },
        [beginWrite, withUpdating, mutate, update, date, setIsDirty, clearSelection, toast],
    );

    return {
        handleBulkTag,
        handleRework,
        handleBulkClearTag,
        handleBulkStatus,
        handleBulkFieldUpdate,
        handleBulkTransfer,
        handleBulkDelete,
    };
}