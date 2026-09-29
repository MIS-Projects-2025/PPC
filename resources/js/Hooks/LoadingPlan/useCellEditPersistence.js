import { isBlockRow } from "@/Lib/LoadingPlan/helpers";
import { applyTimeStartEdit, recomputeMachine } from "@/Lib/LoadingPlan/loadingPlanSchedule";
import { syncDeemoToServer } from "@/Lib/LoadingPlan/sync";
import toSnakeCase from "@/Utils/toSnakeCase";
import { useCallback } from "react";

export function useCellEditPersistence({
    dataRows,
    displayRows,
    baseTimes,
    date,
    update,
    withUpdating,
    mutate,
    toast,
    setIsDirty,
    syncServerFields, // <- new param
}) {
    return useCallback(
        (updatedRows, { indexes, column }) => {
            const validChangedIndexes = indexes.filter((index) => displayRows[index]?.__type === "data");
            if (validChangedIndexes.length === 0) return;

            const sanitizedRows = updatedRows.map((row, idx) => {
                if (indexes.includes(idx) && row.__type !== "data") {
                    return displayRows[idx];
                }
                return row;
            });

            const firstChangedDataIdx = indexes.find((idx) => displayRows[idx]?.__type === "data");
            const changedRow = sanitizedRows[firstChangedDataIdx];
            const field = column.key;
            const prevRow = dataRows.find((r) => r.id === changedRow.id);
            if (!prevRow) return;

            const value = changedRow[field];
            if (value === prevRow[field]) return;

            if (field === "time_start") {
                if (!baseTimes) {
                    toast?.error?.("Can't recompute the schedule — baseTimes wasn't provided to the grid.");
                    return;
                }
                const { rows: withGap, error } = applyTimeStartEdit(
                    dataRows,
                    prevRow._dndId,
                    prevRow.machine,
                    value,
                    baseTimes,
                    date,
                );

                if (error) {
                    toast?.error?.(error);
                    return;
                }

                recomputeMachine(withGap, prevRow.machine, baseTimes, date);
                const prevSnapshot = dataRows;
                update(() => withGap);
                setIsDirty(true);

                withUpdating(syncDeemoToServer(prevSnapshot, withGap, date, mutate, update, toast, [], syncServerFields));
                return;
            }

            update((prev) => {
                const next = prev.map((r) => (r.id !== changedRow.id ? r : { ...r, [field]: value }));
                if (field === "accu_time" && baseTimes) {
                    recomputeMachine(next, prevRow.machine, baseTimes, date);
                }
                return next;
            });
            setIsDirty(true);

            const backendField = toSnakeCase(field);
            withUpdating(
                mutate(
                    route("loading-plan.entries.update", { id: prevRow.entry_id ?? 0 }),
                    {
                        method: "PATCH",
                        body: {
                            entry_type: isBlockRow(prevRow) ? "block" : "lot",
                            fields: { [backendField]: value },
                            lock_version: prevRow.lock_version ?? null,
                        },
                    },
                ),
            )
                .then((entry) => {
                    syncServerFields?.([
                        { dndId: prevRow._dndId, fields: { entry_id: entry.id, lock_version: entry.lock_version } },
                    ]);
                })
                .catch((err) => {
                    if (err.status === 409) {
                        const current = err.data?.current;
                        syncServerFields?.([
                            {
                                dndId: prevRow._dndId,
                                fields: {
                                    [field]: current?.[backendField] ?? prevRow[field],
                                    lock_version: current?.lock_version ?? prevRow.lock_version,
                                },
                            },
                        ]);
                        toast?.error?.("Someone else updated this lot — showing their latest value.");
                    } else if (err.status === 422) {
                        const firstError = Object.values(err.data?.errors ?? {})[0]?.[0];
                        toast?.error?.(firstError ?? "That value isn't valid.");
                    } else {
                        console.error("Failed to save field edit:", err);
                        toast?.error?.(err.data?.message ?? "Failed to save your change. Please try again.");
                    }
                });
        },
        [dataRows, displayRows, baseTimes, date, update, withUpdating, mutate, toast, setIsDirty, syncServerFields],
    );
}