import { isBlockRow } from "@/Lib/LoadingPlan/helpers";
import { applyAffectedTimings } from "@/Lib/LoadingPlan/loadingPlanSchedule";
import { useCallback } from "react";

const GAP = 1000;

// Mirrors LoadingPlanEntryService::resolveBucketPositions so the optimistic order
// matches what the server returns.
function optimisticPositions(rows, bucketId, lotIds, prevLotId, nextLotId) {
    const others = rows
        .filter((r) => r.bucket_id === bucketId && !lotIds.includes(r.lot_id))
        .sort((a, b) => a.bucket_position - b.bucket_position);
    const pos = (id) => others.find((r) => r.lot_id === id)?.bucket_position ?? null;

    let prev = pos(prevLotId);
    let next = pos(nextLotId);
    if (prev === null && next === null) prev = others.length ? others[others.length - 1].bucket_position : null;
    if (prev !== null && next === null) next = others.find((r) => r.bucket_position > prev)?.bucket_position ?? null;
    else if (next !== null && prev === null) prev = [...others].reverse().find((r) => r.bucket_position < next)?.bucket_position ?? null;

    const n = lotIds.length;
    let start, step;
    if (prev !== null && next !== null) { start = prev; step = (next - prev) / (n + 1); }
    else if (prev !== null) { start = prev; step = GAP; }
    else if (next !== null) { start = next - (n + 1) * GAP; step = GAP; }
    else { start = 0; step = GAP; }

    return Object.fromEntries(lotIds.map((id, i) => [id, start + step * (i + 1)]));
}

export function useBucketOperations({
    store, dataRows, selectedRows, update, withUpdating, mutate, toast, date, selectedLocation, setIsDirty, clearSelection, setBucketList,
}) {
    const parkRows = useCallback(
        (rows, bucketId, { prevLotId = null, nextLotId = null } = {}) => {
            const lots = rows.filter((r) => !isBlockRow(r) && r.lot_id && !r.is_leaked);

            if (lots.length === 0) {
                toast?.error?.("Yesterday's carry-over lots can't be grouped.");
                return;
            }

            const lotIds = lots.map((r) => r.lot_id);
            const rowIds = new Set(lots.map((r) => r.id));

            const prevSnapshot = dataRows;
            const positions = optimisticPositions(dataRows, bucketId, lotIds, prevLotId, nextLotId);

            const next = dataRows.map((r) =>
                rowIds.has(r.id)
                    ? {
                        ...r,
                        machine: null, bucket_id: bucketId, bucket_position: positions[r.lot_id],
                        entry_id: null, lock_version: null, sequence_order: null,
                        time_start: null, time_end: null,
                        time_start_day_offset: 0,
                        time_end_day_offset: 0,
                        status: null, tag: null, remarks: "", is_manual_expedite: false,
                    }
                    : r,
            );

            // const next = dataRows.map((r) =>
            //     lotIds.includes(r.lot_id) && !isBlockRow(r)
            //         ? {
            //               ...r,
            //               machine: null, bucket_id: bucketId, bucket_position: positions[r.lot_id],
            //               entry_id: null, lock_version: null, sequence_order: null,
            //               time_start: null, time_end: null,
            //               status: null, tag: null, remarks: "", is_manual_expedite: false,
            //           }
            //         : r,
            // );

            store.getState().reset(next); // wipes undo history on purpose
            setIsDirty(true);
            clearSelection();

            withUpdating(
                mutate(route("loading-plan.buckets.park"), {
                    body: { bucket_id: bucketId, lot_ids: lotIds, scheduled_date: date, prev_lot_id: prevLotId, next_lot_id: nextLotId },
                }),
            )
                .then(({ items, affected_timings }) => {
                    const byLot = new Map(items.map((i) => [i.lot_id, i]));
                    update((prev) => prev.map((r) => (
                        rowIds.has(r.id)
                            ? { ...r, bucket_position: byLot.get(r.lot_id)?.bucket_position ?? r.bucket_position }
                            : r
                    )), true);
                    applyAffectedTimings(update, affected_timings, date);
                })
                .catch((err) => {
                    console.error("Park failed:", err);
                    store.getState().reset(prevSnapshot);
                    toast?.error?.(err?.message ?? "Couldn't move to group — reverted.");
                });
        },
        [store, dataRows, update, withUpdating, mutate, toast, date, setIsDirty, clearSelection],
    );

    const unparkRows = useCallback(
        (rows) => {
            const lots = rows.filter((r) => r.bucket_id != null && r.lot_id && !r.is_leaked);
            const rowIds = new Set(lots.map((r) => r.id));

            if (lots.length === 0) return;
            const lotIds = lots.map((r) => r.lot_id);
            const prevSnapshot = dataRows;

            store.getState().reset(
                dataRows.map((r) => (rowIds.has(r.id) ? { ...r, bucket_id: null, bucket_position: null } : r)),
            );
            setIsDirty(true);
            clearSelection();

            withUpdating(mutate(route("loading-plan.buckets.unpark"), { body: { lot_ids: lotIds, scheduled_date: date } }))
                .catch((err) => {
                    console.error("Unpark failed:", err);
                    store.getState().reset(prevSnapshot);
                    toast?.error?.("Couldn't remove from group — reverted.");
                });
        },
        [store, dataRows, withUpdating, mutate, toast, date, setIsDirty, clearSelection],
    );

    const handleBulkPark = useCallback(
        (bucketId) => parkRows(dataRows.filter((r) => selectedRows.has(r.id)), bucketId),
        [parkRows, dataRows, selectedRows],
    );
    const handleBulkUnpark = useCallback(
        () => unparkRows(dataRows.filter((r) => selectedRows.has(r.id))),
        [unparkRows, dataRows, selectedRows],
    );

    const createBucket = useCallback(
        async ({ label, machine = null }) => {
            const bucket = await withUpdating(
                mutate(route("loading-plan.buckets.store"), { body: { location: selectedLocation, label, machine } }),
            );
            setBucketList((prev) => [...prev, bucket]);
        },
        [withUpdating, mutate, selectedLocation, setBucketList],
    );

    const renameBucket = useCallback(
        async (id, label) => {
            const bucket = await withUpdating(mutate(route("loading-plan.buckets.update", { bucket: id }), { method: "PATCH", body: { label } }));
            setBucketList((prev) => prev.map((b) => (b.id === id ? bucket : b)));
        },
        [withUpdating, mutate, setBucketList],
    );

    const deleteBucket = useCallback(
        async (id) => {
            await withUpdating(mutate(route("loading-plan.buckets.destroy", { bucket: id }), { method: "DELETE" }));
            setBucketList((prev) => prev.filter((b) => b.id !== id));
            update((prev) => prev.map((r) => (r.bucket_id === id ? { ...r, bucket_id: null, bucket_position: null } : r)), true);
        },
        [withUpdating, mutate, setBucketList, update],
    );

    return { parkRows, unparkRows, handleBulkPark, handleBulkUnpark, createBucket, renameBucket, deleteBucket };
}