import { isBlockRow } from "@/Lib/LoadingPlan/helpers";
import { applyTimeStartEdit, recomputeMachine } from "@/Lib/LoadingPlan/loadingPlanSchedule";
import { syncDeemoToServer } from "@/Lib/LoadingPlan/sync";
import toSnakeCase from "@/Utils/toSnakeCase";
import { useCallback } from "react";

export function useCellEditPersistence({ dataRows, displayRows, baseTimes, date, update, withUpdating, mutate, toast, setIsDirty }) {
    return useCallback(
        (updatedRows, { indexes, column }) => {
            // Filter out edits attempted on non-data rows (header rows are
            // part of the same virtualized row list react-data-grid sees).
            const validChangedIndexes = indexes.filter((index) => displayRows[index]?.__type === "data");
            if (validChangedIndexes.length === 0) return;

            const sanitizedRows = updatedRows.map((row, idx) => {
                if (indexes.includes(idx) && row.__type !== "data") {
                    return displayRows[idx]; // Revert back to previous state
                }
                return row;
            });

            const firstChangedDataIdx = indexes.find((idx) => displayRows[idx]?.__type === "data");
            const changedRow = sanitizedRows[firstChangedDataIdx];
            const field = column.key;
            // FIX (carried over): match on `id` (the grid's row key — see
            // rowKeyGetter on <DataGrid>), not `entry_id`. A row can exist
            // in the grid with an `id` before it has a real backend
            // `entry_id`.
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

                withUpdating(syncDeemoToServer(prevSnapshot, withGap, date, mutate, update, toast));
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
                    update(
                        (prev) =>
                            prev.map((r) =>
                                r.id === changedRow.id
                                    ? { ...r, entry_id: entry.id, lock_version: entry.lock_version }
                                    : r,
                            ),
                        true,
                    );
                })
                .catch((err) => {
                    if (err.status === 409) {
                        const current = err.data?.current;
                        update(
                            (prev) =>
                                prev.map((r) =>
                                    r.id === changedRow.id
                                        ? {
                                              ...r,
                                              [field]: current?.[backendField] ?? r[field],
                                              lock_version: current?.lock_version ?? r.lock_version,
                                          }
                                        : r,
                                ),
                            true,
                        );
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
        [dataRows, displayRows, baseTimes, date, update, withUpdating, mutate, toast, setIsDirty],
    );
}
