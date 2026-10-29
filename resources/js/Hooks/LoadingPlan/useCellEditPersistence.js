import { isNonMachineKey } from "@/Hooks/LoadingPlan/useNonMachineOperations";
import { isBlockRow } from "@/Lib/LoadingPlan/helpers";
import { applyAffectedTimings, applyTimeStartEdit } from "@/Lib/LoadingPlan/loadingPlanSchedule";
import { syncDeemoToServer } from "@/Lib/LoadingPlan/sync";
import toSnakeCase from "@/Utils/toSnakeCase";
import dayjs from "dayjs";
import { useCallback } from "react";

export function useCellEditPersistence({
    dataRows,
    displayRows,
    baseTimes,
    date,
    update,
    beginWrite,
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
            const dayOffset = changedRow.time_start_day_offset ?? 0;
            const dayChanged = field === "time_start" && dayOffset !== (prevRow.time_start_day_offset ?? 0);
            if (value === prevRow[field] && !dayChanged) return;
            if (!beginWrite()) return;
            if (field === "time_start" && prevRow.machine === null) return;

            if (field === "time_start") {
                if (isNonMachineKey(prevRow.machine)) {
                    const lane = dataRows.filter((r) => r.machine === prevRow.machine);

                    // first row of a non-machine lane: its start IS the lane start
                    if (lane[0]?._dndId === prevRow._dndId) {
                        const [h, m] = String(value).split(":").map(Number);
                        if (!Number.isFinite(h) || !Number.isFinite(m)) {
                            toast?.error?.("That time isn't valid.");
                            return;
                        }
                        const timeStart = dayjs(date).add(dayOffset, "day").hour(h).minute(m).format("YYYY-MM-DD HH:mm:00");
                        const nonMachineId = Number(prevRow.machine.slice(3));

                        withUpdating(
                            mutate(route("loading-plan.non-machines.start", { nonMachine: nonMachineId }), {
                                method: "PATCH",
                                body: { time_start: timeStart, scheduled_date: date },
                            }),
                        )
                            .then(({ affected_timings }) => applyAffectedTimings(update, affected_timings, date))
                            .catch((err) => {
                                console.error("Failed to set non-machine start:", err);
                                toast?.error?.(err?.message ?? "Couldn't change the start time.");
                            });
                        return;
                    }
                }

                if (!baseTimes) {
                    toast?.error?.("Can't recompute the schedule — baseTimes wasn't provided to the grid.");
                    return;
                }
                const { rows: withGap, error, laneStart } = applyTimeStartEdit(dataRows, prevRow._dndId, prevRow.machine, value, baseTimes, date, dayOffset);

                if (error) {
                    toast?.error?.(error);
                    return;
                }

                const prevSnapshot = dataRows;
                update(() => withGap, !!laneStart);
                setIsDirty(true);

                withUpdating(syncDeemoToServer(
                    prevSnapshot, withGap, date, mutate, update, toast, [], syncServerFields,
                    laneStart ? { [prevRow.machine]: laneStart } : {},
                ));
                return;
            }

            update((prev) => prev.map((r) => (r.id !== changedRow.id ? r : { ...r, [field]: value })));
            setIsDirty(true);

            const backendField = toSnakeCase(field);
            const prevValue = prevRow[field];

            const revertField = () =>
                update((prev) => prev.map((r) => (r.id === changedRow.id ? { ...r, [field]: prevValue } : r)), true);

            withUpdating(
                mutate(
                    route("loading-plan.entries.update", { id: prevRow.entry_id ?? 0 }),
                    {
                        method: "PATCH",
                        body: {
                            entry_type: isBlockRow(prevRow) ? "block" : "lot",
                            fields: { [backendField]: value },
                            lock_version: prevRow.lock_version ?? null,
                            ...(prevRow.entry_id ? {} : { lot_id: prevRow.lot_id, scheduled_date: date }),
                        },
                    },
                ),
            )
                .then((entry) => {
                    syncServerFields?.([
                        { dndId: prevRow._dndId, fields: { entry_id: entry.id, lock_version: entry.lock_version } },
                    ]);
                    applyAffectedTimings(update, entry.affected_timings, date);
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
                            revertField();
                            const firstError = Object.values(err.data?.errors ?? {})[0]?.[0];
                            toast?.error?.(firstError ?? "That value isn't valid.");
                        } else {
                            revertField();
                            console.error("Failed to save field edit:", err);
                            toast?.error?.(err.data?.message ?? "Failed to save your change. Please try again.");
                        }
                });
        },
        [dataRows, displayRows, baseTimes, date, update, withUpdating, mutate, toast, setIsDirty, syncServerFields],
    );
}