import { isBlockRow } from "./helpers";
import { applyAffectedTimings } from "./loadingPlanSchedule";

// Only identity/concurrency fields may be written into past/future snapshots.
const HISTORY_SAFE = ["entry_id", "lock_version"];
// Server-derived values that depend on the current arrangement: present only.
const PRESENT_ONLY = ["doable", "doable_status", "doable_overridden", "doable_recipe_source",
    "part_missing_from_list", "capacity_uph", "accu_time", "qty"];
const pick = (obj, keys) => Object.fromEntries(keys.filter((k) => k in obj).map((k) => [k, obj[k]]));

/**
 * Syncs additions and field/position edits only. Deletions are a
 * separate process that runs — and completes — before this is called,
 * so nextRows here is assumed to already reflect their absence.
 *
 * No typed ops. Backend gets full rows (create when entry_id is null,
 * update otherwise) plus a final ordered id list per machine, and does
 * whatever recompute/validation each row's data implies (split_info
 * conservation, doable, sequencing) on its own.
 */
export function syncDeemoToServer(
    prevRows, nextRows, date, mutate, update, toast,
    deletedEntryIds = [], syncServerFields, laneStarts = {},
    { revertOnError = true } = {},
) {
    const prevById = new Map(prevRows.map((r) => [r._dndId, r]));

    const added = nextRows.filter((r) => !prevById.has(r._dndId));
    const addedIds = new Set(added.map((r) => r._dndId));

    const changed = nextRows.filter((r) => {
        const p = prevById.get(r._dndId);
        if (!p) return false;
        return (
            p.machine !== r.machine ||
            p.status !== r.status ||
            p.remarks !== r.remarks ||
            p.tag !== r.tag ||
            p.accu_time !== r.accu_time ||
            !!p.is_manual_expedite !== !!r.is_manual_expedite ||
            !!p.is_scm !== !!r.is_scm
        );
    });

    const affected = [...added, ...changed];
    const order = buildOrderPerMachine(prevRows, nextRows, addedIds);

    if (affected.length === 0 && deletedEntryIds.length === 0 && Object.keys(order).length === 0
        && Object.keys(laneStarts).length === 0) {
        return Promise.resolve(true);
    }

    const rows = affected.map((r) => {
        const isResurrected = addedIds.has(r._dndId) && r.entry_id != null;
        return {
            dnd_id: r._dndId,
            entry_id: isResurrected ? null : (r.entry_id ?? null),
            machine: r.machine,
            entry_type: isBlockRow(r) ? "block" : "lot",
            lot_id: r.lot_id ?? null,
            // needed to recreate rework / manual rows faithfully
            rework_seq: r.rework_seq ?? 0,
            rework_of_entry_id: r.rework_of_entry_id ?? null,
            package_name: r.package_name ?? null,
            part_name: r.part_name ?? null,
            qty: r.qty ?? null,
            fields: {
                status: r.status,
                remarks: r.remarks,
                tag: r.tag,
                accu_time: r.accu_time,
                ...(isBlockRow(r)
                    ? { block_label: r.block_label }
                    : { is_manual_expedite: !!r.is_manual_expedite, is_scm: !!r.is_scm }),
            },
            lock_version: isResurrected ? null : (r.lock_version ?? null),
        };
    });

    return mutate(route("loading-plan.batch-sync"), {
        body: { rows, order, deleted: deletedEntryIds, lane_starts: laneStarts, scheduled_date: date },
    })
        .then(({ results, affected_timings }) => {
            const deletedSet = new Set(deletedEntryIds);
            update((prev) => prev.filter((row) => !row.entry_id || !deletedSet.has(row.entry_id)), true);

            const idPatches = [];
            const derived = new Map();
            affected.forEach((r, idx) => {
                const result = results[idx];
                if (!result) return;
                idPatches.push({ dndId: r._dndId, fields: pick(result, HISTORY_SAFE) });
                derived.set(r._dndId, pick(result, PRESENT_ONLY));
            });

            syncServerFields?.(idPatches); // history-wide: ids + lock_version only
            if (derived.size) {
                update((prev) => prev.map((row) =>
                    derived.has(row._dndId) ? { ...row, ...derived.get(row._dndId) } : row), true);
            }
            applyAffectedTimings(update, affected_timings, date);
        })
        .catch((err) => {
            console.error("Sync failed to persist:", err);
            const code = err?.data?.error;
            if (revertOnError) update(() => prevRows, true);

            if (code === "active_split_or_merge" || code === "stale_write" || code === "not_found") {
                toast?.error?.(err.data?.message ?? err.message);
            } else {
                toast?.error?.("That change couldn't be saved and was reverted.");
            }
            return false;
        });
}

function buildOrderPerMachine(prevRows, nextRows, addedIds) {
    const buildIdsByMachine = (rows) => {
        const byMachine = new Map();
        rows.forEach((r) => {
            if (r.machine === null) return;
            if (!byMachine.has(r.machine)) byMachine.set(r.machine, []);
            const isResurrected = addedIds.has(r._dndId) && r.entry_id != null;
            byMachine.get(r.machine).push(isResurrected ? r._dndId : (r.entry_id ?? r._dndId));
        });
        return byMachine;
    };

    const prevByMachine = buildIdsByMachine(prevRows);
    const nextByMachine = buildIdsByMachine(nextRows);

    const order = {};
    const allMachines = new Set([...prevByMachine.keys(), ...nextByMachine.keys()]);

    allMachines.forEach((m) => {
        const prevIds = prevByMachine.get(m) ?? [];
        const nextIds = nextByMachine.get(m) ?? [];
        const changed = prevIds.length !== nextIds.length || prevIds.some((id, i) => id !== nextIds[i]);
        if (changed) {
            order[m] = nextIds;
        }
    });

    return order;
}