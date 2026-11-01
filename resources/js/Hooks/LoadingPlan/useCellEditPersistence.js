import { isNonMachineKey } from "@/Hooks/LoadingPlan/useNonMachineOperations";
import { isBlockRow } from "@/Lib/LoadingPlan/helpers";
import { applyAffectedTimings, applyTimeStartEdit } from "@/Lib/LoadingPlan/loadingPlanSchedule";
import { syncDeemoToServer } from "@/Lib/LoadingPlan/sync";
import toSnakeCase from "@/Utils/toSnakeCase";
import dayjs from "dayjs";
import { useCallback } from "react";

/**
 * Returns the DataGrid `onRowsChange` handler. Dispatches to one of:
 *  - non-machine lane start edit
 *  - time_start edit (shifts the lane / inserts a gap, synced via batch-sync)
 *  - plain field edit (accu_time / remarks)
 */
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
    syncServerFields,
}) {
    const persistLaneStart = useCallback(
        (prevRow, value, dayOffset) => {
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
        },
        [date, withUpdating, mutate, update, toast],
    );

    const persistTimeStart = useCallback(
        (prevRow, value, dayOffset) => {
            // first row of a non-machine lane: its start IS the lane start
            if (isNonMachineKey(prevRow.machine)) {
                const lane = dataRows.filter((r) => r.machine === prevRow.machine);
                if (lane[0]?._dndId === prevRow._dndId) return persistLaneStart(prevRow, value, dayOffset);
            }

            if (!baseTimes) {
                toast?.error?.("Can't recompute the schedule — baseTimes wasn't provided to the grid.");
                return;
            }

            const { rows: withGap, error, laneStart } = applyTimeStartEdit(
                dataRows, prevRow._dndId, prevRow.machine, value, baseTimes, date, dayOffset,
            );
            if (error) {
                toast?.error?.(error);
                return;
            }

            update(() => withGap, !!laneStart);
            setIsDirty(true);

            withUpdating(
                syncDeemoToServer(
                    dataRows, withGap, date, mutate, update, toast, [], syncServerFields,
                    laneStart ? { [prevRow.machine]: laneStart } : {},
                ),
            );
        },
        [dataRows, baseTimes, date, update, setIsDirty, withUpdating, mutate, toast, syncServerFields, persistLaneStart],
    );

    const persistFieldEdit = useCallback(
        (prevRow, field, value) => {
            const backendField = toSnakeCase(field);
            const prevValue = prevRow[field];
            const patchRow = (patch) => (r) => (r.id === prevRow.id ? { ...r, ...patch } : r);

            update((prev) => prev.map(patchRow({ [field]: value })));
            setIsDirty(true);

            const revertField = () => update((prev) => prev.map(patchRow({ [field]: prevValue })), true);

            withUpdating(
                mutate(route("loading-plan.entries.update", { id: prevRow.entry_id ?? 0 }), {
                    method: "PATCH",
                    body: {
                        entry_type: isBlockRow(prevRow) ? "block" : "lot",
                        fields: { [backendField]: value },
                        lock_version: prevRow.lock_version ?? null,
                        ...(prevRow.entry_id ? {} : { lot_id: prevRow.lot_id, scheduled_date: date }),
                    },
                }),
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
                                    [field]: current?.[backendField] ?? prevValue,
                                    lock_version: current?.lock_version ?? prevRow.lock_version,
                                },
                            },
                        ]);
                        toast?.error?.("Someone else updated this lot — showing their latest value.");
                        return;
                    }

                    revertField();
                    if (err.status === 422) {
                        const firstError = Object.values(err.data?.errors ?? {})[0]?.[0];
                        toast?.error?.(firstError ?? "That value isn't valid.");
                    } else {
                        console.error("Failed to save field edit:", err);
                        toast?.error?.(err.data?.message ?? "Failed to save your change. Please try again.");
                    }
                });
        },
        [date, update, setIsDirty, withUpdating, mutate, toast, syncServerFields],
    );

    return useCallback(
        (updatedRows, { indexes, column }) => {
            const idx = indexes.find((i) => displayRows[i]?.__type === "data");
            if (idx === undefined) return;

            const changedRow = updatedRows[idx];
            const prevRow = dataRows.find((r) => r.id === changedRow.id);
            if (!prevRow) return;

            const field = column.key;
            const value = changedRow[field];
            const dayOffset = changedRow.time_start_day_offset ?? 0;
            const dayChanged = field === "time_start" && dayOffset !== (prevRow.time_start_day_offset ?? 0);

            if (value === prevRow[field] && !dayChanged) return;
            if (!beginWrite()) return;

            if (field === "time_start") {
                if (prevRow.machine === null) return; // unassigned rows have no timeline
                return persistTimeStart(prevRow, value, dayOffset);
            }
            return persistFieldEdit(prevRow, field, value);
        },
        [dataRows, displayRows, beginWrite, persistTimeStart, persistFieldEdit],
    );
}