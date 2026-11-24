import { isBlockRow } from "@/Lib/LoadingPlan/helpers";
import { applyAffectedTimings } from "@/Lib/LoadingPlan/loadingPlanSchedule";
import { useCallback } from "react";

/**
 * Fill handle (drag the small square of the selected cell) for the Status and Doable columns.
 *
 * react-data-grid calls `onFill` once per target row while dragging, then `onRowsChange` once with
 * every changed row. Deemo routes those calls here when `column.key` is in FILL_COLUMNS.
 *
 *  - status: one bulk-update request (same endpoint as the toolbar's "Set status")
 *  - doable: one doable-override request per row, run one after another under the write lock
 *            (the value is capped to each row's own qty, the server rejects a doable above qty)
 */
export const FILL_COLUMNS = new Set(["status", "doable"]);

// Same split as useDoableOperations: ids/lock_version/doable go to every history snapshot,
// arrangement-dependent values only to the present one.
const HISTORY_FIELDS = [
    "entry_id", "lock_version",
    "doable", "doable_status", "doable_overridden",
    "doable_recipe_source", "part_missing_from_list",
];
const PRESENT_FIELDS = ["capacity_uph", "accu_time"];
const pick = (o, keys) => Object.fromEntries(keys.filter((k) => k in o).map((k) => [k, o[k]]));

/** Data rows only: no headers, collapsed runs, time blocks or grouped rows. */
export const isFillableRow = (row) =>
    row?.__type === "data" && !isBlockRow(row) && !(row.machine === null && row.bucket_id != null);

const normStatus = (s) => (s == null || s === "NONE" ? null : s);

const clampDoable = (value, qty) => {
    const v = Math.max(0, Math.round(Number(value) || 0));
    return Math.min(v, Math.max(0, Number(qty) || 0));
};

export function useCellFillPersistence({
    dataRows,
    date,
    store,
    update,
    beginWrite,
    withUpdating,
    mutate,
    toast,
    setIsDirty,
    syncServerFields,
}) {
    // Pure: returns the target row with the dragged value, or the same object when nothing changes.
    const onFill = useCallback(({ columnKey, sourceRow, targetRow }) => {
        if (!isFillableRow(sourceRow) || !isFillableRow(targetRow)) return targetRow;

        if (columnKey === "status") {
            const next = normStatus(sourceRow.status);
            return normStatus(targetRow.status) === next ? targetRow : { ...targetRow, status: next };
        }

        if (columnKey === "doable") {
            // nothing to copy from a lot that has no recipe and no override
            if (sourceRow.doable_status === "no_recipe" && !sourceRow.doable_overridden) return targetRow;
            const next = clampDoable(sourceRow.doable, targetRow.qty);
            return Number(targetRow.doable) === next ? targetRow : { ...targetRow, doable: next };
        }

        return targetRow;
    }, []);

    const persistStatus = useCallback(
        (targets) => {
            const base = store.getState().present.rows;
            const value = normStatus(targets[0].value);
            const ids = new Set(targets.map((t) => t.prev.id));

            update((prev) => prev.map((r) => (ids.has(r.id) ? { ...r, status: value } : r)));

            withUpdating(
                mutate(route("loading-plan.bulk-update"), {
                    body: {
                        scheduled_date: date,
                        updates: targets.map(({ prev }) =>
                            prev.entry_id
                                ? { entry_id: prev.entry_id, fields: { status: value }, lock_version: prev.lock_version ?? null }
                                : { lot_id: prev.lot_id, fields: { status: value } },
                        ),
                    },
                }),
            )
                .then(({ entries }) => {
                    const patches = targets
                        .map(({ prev }) => {
                            const m = entries?.find((e) =>
                                prev.entry_id ? e.id === prev.entry_id : e.lot_id === prev.lot_id && !e.rework_seq,
                            );
                            return m ? { dndId: prev._dndId, fields: { entry_id: m.id, lock_version: m.lock_version } } : null;
                        })
                        .filter(Boolean);
                    syncServerFields?.(patches);
                })
                .catch((err) => {
                    console.error("Fill status failed:", err);
                    store.getState().rollback(base);
                    toast?.error?.(
                        err?.status === 409
                            ? "Some rows were changed by someone else — the fill was cancelled."
                            : (err?.data?.message ?? "Couldn't fill the status — reverted."),
                    );
                });
        },
        [store, update, withUpdating, mutate, date, syncServerFields, toast],
    );

    const persistDoable = useCallback(
        (targets) => {
            const wanted = new Map(targets.map((t) => [t.prev._dndId, t.value]));
            // present only: a doable change is not an undo step (same as the Override modal)
            update((prev) => prev.map((r) => (wanted.has(r._dndId) ? { ...r, doable: wanted.get(r._dndId) } : r)), true);

            const run = async () => {
                for (let i = 0; i < targets.length; i++) {
                    const { prev, value } = targets[i];
                    try {
                        const entry = await mutate(route("loading-plan.entries.doable", { id: prev.entry_id ?? 0 }), {
                            method: "PATCH",
                            body: {
                                doable: value,
                                lock_version: prev.lock_version ?? null,
                                ...(prev.entry_id ? {} : { lot_id: prev.lot_id, scheduled_date: date }),
                            },
                        });

                        syncServerFields?.([{ dndId: prev._dndId, fields: pick(entry, HISTORY_FIELDS) }]);
                        update(
                            (rows) => rows.map((r) => (r._dndId === prev._dndId ? { ...r, ...pick(entry, PRESENT_FIELDS) } : r)),
                            true,
                        );
                        applyAffectedTimings(update, entry.affected_timings, date);
                    } catch (err) {
                        console.error("Fill doable failed:", err);
                        // stop here and put back every row that was not saved
                        const unsaved = new Map(targets.slice(i).map((t) => [t.prev._dndId, t.prev.doable]));
                        update(
                            (rows) => rows.map((r) => (unsaved.has(r._dndId) ? { ...r, doable: unsaved.get(r._dndId) } : r)),
                            true,
                        );
                        toast?.error?.(
                            err?.status === 409
                                ? "Someone else changed a lot — the fill stopped. Refresh and try again."
                                : (err?.data?.message ?? "Couldn't fill the doable — the remaining rows were reverted."),
                        );
                        return;
                    }
                }
            };

            withUpdating(run());
        },
        [update, withUpdating, mutate, date, syncServerFields, toast],
    );

    // `onRowsChange` for a fill: updatedRows[i] already holds the dragged value for every i in `indexes`.
    const handleFillChange = useCallback(
        (updatedRows, { indexes, column }) => {
            const byId = new Map(dataRows.map((r) => [r.id, r]));
            const seen = new Set();

            const targets = indexes
                .map((i) => updatedRows[i])
                .filter((next) => isFillableRow(next) && byId.has(next.id) && !seen.has(next.id) && seen.add(next.id))
                .map((next) => ({ prev: byId.get(next.id), value: next[column.key] }));

            if (targets.length === 0 || !beginWrite()) return;
            setIsDirty(true);

            return column.key === "status" ? persistStatus(targets) : persistDoable(targets);
        },
        [dataRows, beginWrite, setIsDirty, persistStatus, persistDoable],
    );

    return { onFill, handleFillChange };
}
