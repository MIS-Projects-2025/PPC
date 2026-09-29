import { isBlockRow } from "./helpers";

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
export function syncDeemoToServer(prevRows, nextRows, date, mutate, update, toast, deletedEntryIds = [], syncServerFields) {
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
            p.accu_time !== r.accu_time
        );
    });

    const affected = [...added, ...changed];
    const order = buildOrderPerMachine(prevRows, nextRows, addedIds);

    if (affected.length === 0 && deletedEntryIds.length === 0 && Object.keys(order).length === 0) {
        return Promise.resolve();
    }

    const rows = affected.map((r) => {
        // Added (no prior _dndId) but already carrying an entry_id means
        // undo just resurrected a row whose backend row was hard-deleted.
        // Force it through the create path instead of updating an id that
        // no longer exists.
        const isResurrected = addedIds.has(r._dndId) && r.entry_id != null;

        return {
            dnd_id: r._dndId,
            entry_id: isResurrected ? null : (r.entry_id ?? null),
            machine: r.machine,
            entry_type: isBlockRow(r) ? "block" : "lot",
            lot_id: r.lot_id ?? null,
            fields: {
                status: r.status,
                remarks: r.remarks,
                tag: r.tag,
                accu_time: r.accu_time,
                ...(isBlockRow(r) ? { block_label: r.block_label } : {}),
            },
            lock_version: isResurrected ? null : (r.lock_version ?? null),
        };
    });

    return mutate(route("loading-plan.batch-sync"), {
        body: { rows, order, deleted: deletedEntryIds, scheduled_date: date },
    })
        .then(({ results }) => {
            // structural removal (deletions) still only concerns `present` —
            // a deleted row shouldn't be resurrected by an unrelated undo either,
            // but that's a separate, pre-existing concern from this bug
            const deletedSet = new Set(deletedEntryIds);
            update((prev) => prev.filter((row) => !row.entry_id || !deletedSet.has(row.entry_id)), true);

            // server-confirmed field patch — now propagates everywhere, not just present
            const patches = affected
                .map((r, idx) => {
                    const result = results[idx];
                    return result ? { dndId: r._dndId, fields: { ...result, id: r._dndId ? undefined : result.id } } : null;
                })
                .filter(Boolean);

            syncServerFields?.(patches);
        })
        .catch((err) => {
            // console.log("LOG ~ sync.js:83 ~ syncDeemoToServer ~ err:", err);
            if (err.response?.data?.error === 'active_split_or_merge') {
                toast?.error?.(err?.message);
            }

            if (err.response?.data?.error === 'stale_write') {
                toast?.error?.(err?.message);
            }

            console.error("Sync failed to persist:", err);
            update(() => prevRows);
            toast?.error?.("That change couldn't be saved and was reverted.");
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