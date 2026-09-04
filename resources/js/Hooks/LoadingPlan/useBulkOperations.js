import { isBlockRow } from "@/Lib/LoadingPlan/helpers";
import { recomputeMachine } from "@/Lib/LoadingPlan/loadingPlanSchedule";
import { useCallback } from "react";

/**
 * Bulk-selection handlers wired to SelectionToolbar.
 *
 * FIX (carried over from the original): `selectedRows` is react-data-grid's
 * selection Set, keyed by whatever rowKeyGetter returns — which is
 * `row.id` (see rowKeyGetter on <DataGrid> in index.jsx), NOT
 * `row.entry_id`. Every handler here tests membership with
 * `selectedRows.has(r.id)`; `r.entry_id` is only pulled in once building
 * the outgoing API payload for rows that are already selected.
 *
 * handleBulkTag / handleBulkClearTag / handleBulkStatus / handleBulkFieldUpdate
 * all hit the same `loading-plan.bulk-update` endpoint with the same
 * optimistic-update -> persist -> reconcile-by-id-or-lot_id -> undo-on-error
 * shape, so they share `runFieldUpdate` below instead of each repeating it.
 * handleBulkTransfer / handleBulkDelete have different payload shapes and
 * their own machine-recompute + immediate-clearSelection behavior, so they
 * stay as their own functions.
 */
export function useBulkOperations({
    dataRows,
    selectedRows,
    update,
    withUpdating,
    mutate,
    undo,
    toast,
    setIsDirty,
    clearSelection,
    baseTimes,
    date,
}) {
    const runFieldUpdate = useCallback(
        ({ filter, fields, applyLocal, conflictLabel, afterSuccess }) => {
            const targets = dataRows.filter(filter);
            if (targets.length === 0) return;

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
                    update(
                        (prev) =>
                            prev.map((r) => {
                                const match = entries?.find(
                                    (e) => e.id === r.entry_id || e.lot_id === r.lot_id,
                                );
                                return match
                                    ? { ...r, entry_id: match.id, lock_version: match.lock_version }
                                    : r;
                            }),
                        true,
                    );
                    afterSuccess?.();
                })
                .catch((err) => {
                    console.error(`Bulk ${conflictLabel} update failed:`, err);
                    undo();
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
        [dataRows, update, withUpdating, mutate, undo, toast, setIsDirty],
    );

    const handleBulkTag = useCallback(
        (tag) =>
            runFieldUpdate({
                filter: (r) => selectedRows.has(r.id),
                fields: { tag },
                applyLocal: (r) => ({ ...r, tag }),
                conflictLabel: "tag",
            }),
        [runFieldUpdate, selectedRows],
    );

    // Same request shape as handleBulkTag — "clear" is just tag: null,
    // through the same bulk-update payload.
    const handleBulkClearTag = useCallback(() => handleBulkTag(null), [handleBulkTag]);

    const handleBulkStatus = useCallback(
        (newStatus) => {
            const normalizedStatus = newStatus === "NONE" ? null : newStatus;
            runFieldUpdate({
                filter: (r) => selectedRows.has(r.id) && !isBlockRow(r),
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
                filter: (r) => selectedRows.has(r.id) && r[field] !== value,
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

            const affectedMachines = new Set();
            update((prev) => {
                const next = prev.map((r) => {
                    if (!selectedRows.has(r.id)) return { ...r };
                    affectedMachines.add(r.machine);
                    affectedMachines.add(targetMachine);
                    return { ...r, machine: targetMachine };
                });
                if (baseTimes) affectedMachines.forEach((m) => recomputeMachine(next, m, baseTimes, date));
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
                    update(
                        (prev) =>
                            prev.map((r) => {
                                const match = updatedEntries?.find((e) =>
                                    isBlockRow(r) ? e.id === r.entry_id : e.lot_id === r.lot_id,
                                );
                                return match ? { ...r, ...match } : r;
                            }),
                        true,
                    );
                })
                .catch((err) => {
                    console.error("Bulk transfer failed:", err);
                    toast?.error?.(err?.message);
                });
        },
        [selectedRows, update, dataRows, baseTimes, date, clearSelection, withUpdating, mutate, toast, setIsDirty],
    );

    const handleBulkDelete = useCallback(() => {
        const targets = dataRows.filter((r) => selectedRows.has(r.id) && r.entry_id);
        const entryIds = targets.map((r) => r.entry_id);

        update((prev) => {
            const affectedMachines = new Set();
            const next = prev
                .map((r) => {
                    if (!selectedRows.has(r.id)) return r;
                    if (isBlockRow(r)) return r; // blocks get removed below
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
                update(
                    (prev) =>
                        prev.map((r) => {
                            const match = unassigned?.find((e) => e.id === r.entry_id);
                            return match ? { ...r, lock_version: match.lock_version } : r;
                        }),
                    true,
                );
            })
            .catch((err) => {
                console.error("Bulk delete failed:", err);
                undo();
                toast?.error?.("Couldn't delete/unassign — reverted.");
            });
    }, [selectedRows, update, dataRows, baseTimes, date, clearSelection, undo, withUpdating, mutate, toast, setIsDirty]);

    return {
        handleBulkTag,
        handleBulkClearTag,
        handleBulkStatus,
        handleBulkFieldUpdate,
        handleBulkTransfer,
        handleBulkDelete,
    };
}
