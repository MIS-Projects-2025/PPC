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
export function syncDeemoToServer(prevRows, nextRows, date, mutate, update, toast, deletedEntryIds = []) {
    const prevById = new Map(prevRows.map((r) => [r._dndId, r]));

    const added = nextRows.filter((r) => !prevById.has(r._dndId));

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
    const order = buildOrderPerMachine(nextRows);

    if (affected.length === 0 && deletedEntryIds.length === 0 && Object.keys(order).length === 0) {
        return Promise.resolve();
    }

    const rows = affected.map((r) => ({
        dnd_id: r._dndId,
        entry_id: r.entry_id ?? null,
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
        lock_version: r.lock_version ?? null,
    }));

    return mutate(route("loading-plan.sync-rows"), {
        body: { rows, order, deleted: deletedEntryIds, scheduled_date: date },
    })
        .then(({ results }) => {
            update((prev) => {
                const deletedSet = new Set(deletedEntryIds);
                let next = prev.filter((row) => !row.entry_id || !deletedSet.has(row.entry_id));

                next = next.map((row) => {
                    const idx = affected.findIndex((r) => r._dndId === row._dndId);
                    if (idx === -1) return row;
                    const result = results[idx];
                    if (!result) return row;
                    return { ...row, ...result, id: row.id };
                });

                return next;
            }, true);
        })
        .catch((err) => {
            console.error("Sync failed to persist:", err);
            update(() => prevRows);
            toast?.error?.("That change couldn't be saved and was reverted.");
        });
}
function buildOrderPerMachine(rows) {
    const byMachine = new Map();
    rows.forEach((r) => {
        if (r.machine === null) return; // Unassigned has no persisted order
        if (!byMachine.has(r.machine)) byMachine.set(r.machine, []);
        // entry_id when the row already has one; dnd_id for rows the
        // backend is about to create in this same call — resolved
        // server-side before the resequence pass.
        byMachine.get(r.machine).push(r.entry_id ?? r._dndId);
    });
    return Object.fromEntries(byMachine);
}

// import { findMachineNeighbors } from "@/Lib/LoadingPlan/loadingPlanSchedule.js";
// import { isBlockRow } from "./helpers";

// /**
//  * Diff two dataRows snapshots (before/after an undo or redo) into a list
//  * of batch-apply operations and persist them atomically. Ported from
//  * LoadingPlanTable.jsx's syncToServer — keyed off `entry_id` instead of
//  * `_dndId`, since Deemo rows already use entry_id as their stable grid
//  * row id. Newly-created, not-yet-saved rows should carry a temporary
//  * entry_id (assigned by the server response as soon as the create call
//  * resolves) so they still have a stable, unique key to diff against.
//  *
//  * NOTE: this diffs on `entry_id`, unlike the rest of this module which
//  * diffs/keys on `id`. That's intentional here — undo/redo snapshots are
//  * only meaningfully comparable once a row is persisted (has an
//  * entry_id).
//  */
// export function syncDeemoToServer(prevRows, nextRows, date, mutate, update, toast) {
//     const prevById = new Map(prevRows.map((r) => [r._dndId, r]));
//     const nextById = new Map(nextRows.map((r) => [r._dndId, r]));

//     const removed = prevRows.filter((r) => !nextById.has(r._dndId));
//     const added = nextRows.filter((r) => !prevById.has(r._dndId));

//     const buildPositions = (rows) => {
//         const byMachine = new Map();
//         rows.forEach((r) => {
//             if (r.machine === null) return; // Unassigned has no persisted order
//             if (!byMachine.has(r.machine)) byMachine.set(r.machine, []);
//             byMachine.get(r.machine).push(r._dndId);
//         });
//         const positions = new Map();
//         byMachine.forEach((ids) => {
//             ids.forEach((id, idx) => positions.set(id, idx));
//         });
//         return positions;
//     };

//     const prevPositions = buildPositions(prevRows);
//     const nextPositions = buildPositions(nextRows);

//     const changed = nextRows.filter((r) => {
//         const p = prevById.get(r._dndId);
//         if (!p) return false;
//         const positionChanged =
//             prevPositions.get(r._dndId) !== nextPositions.get(r._dndId);
//         return (
//             p.machine !== r.machine ||
//             p.status !== r.status ||
//             p.remarks !== r.remarks ||
//             p.tag !== r.tag ||
//             p.accu_time !== r.accu_time ||
//             positionChanged
//         );
//     });

//     const operations = [];
//     const opOwners = [];

//     removed.forEach((r) => {
//         if (r.split_info?.isChild && r.split_info?.splitId) {
//             operations.push({
//                 type: "revert_split",
//                 split_id: r.split_info.splitId,
//             });
//             opOwners.push({
//                 entryId: r.entry_id,
//                 kind: "revert_split",
//                 snapshot: r,
//                 dndId: r._dndId,
//             });
//             return;
//         }
//         if (!r.entry_id) return;
//         operations.push({
//             type: "delete",
//             entry_id: r.entry_id,
//             machine: r.machine,
//         });
//         opOwners.push({
//             entryId: r.entry_id,
//             kind: "delete",
//             snapshot: r,
//             dndId: r._dndId,
//         });
//     });

//     added.forEach((r) => {
//         if (r.split_info?.isChild && r.split_info?.splitId) {
//             operations.push({
//                 type: "unrevert_split",
//                 split_id: r.split_info.splitId,
//             });
//             opOwners.push({
//                 entryId: r.entry_id,
//                 kind: "unrevert_split",
//                 dndId: r._dndId,
//             });
//             return;
//         }

//         const isBlock = isBlockRow(r);
//         const { beforeEntryId, afterEntryId } = findMachineNeighbors(
//             nextRows,
//             r._dndId,
//             r.machine,
//         );

//         if (isBlock) {
//             operations.push({
//                 type: "create_block",
//                 machine: r.machine,
//                 label: r.block_label,
//                 duration: r.accu_time,
//                 before_entry_id: beforeEntryId,
//                 after_entry_id: afterEntryId,
//             });
//         } else {
//             operations.push({
//                 type: "create_lot",
//                 lot_id: r.lot_id,
//                 fields: {
//                     status: r.status,
//                     remarks: r.remarks,
//                     tag: r.tag,
//                     accu_time: r.accu_time,
//                     doable: r.doable,
//                 },
//                 machine: r.machine,
//                 before_entry_id: beforeEntryId,
//                 after_entry_id: afterEntryId,
//             });
//         }
//         opOwners.push({
//             entryId: r.entry_id,
//             kind: "create",
//             dndId: r._dndId,
//         });
//     });

//     changed.forEach((r) => {
//         const p = prevById.get(r._dndId);
//         const isBlock = isBlockRow(r);
//         const machineChanged = p.machine !== r.machine;
//         const positionChanged =
//             prevPositions.get(r._dndId) !== nextPositions.get(r._dndId);

//         if (machineChanged || positionChanged) {
//             const { beforeEntryId, afterEntryId } = findMachineNeighbors(
//                 nextRows,
//                 r._dndId,
//                 r.machine,
//             );
//             operations.push({
//                 type: machineChanged ? "transfer" : "move",
//                 entry_type: isBlock ? "block" : "lot",
//                 lot_id: isBlock ? null : r.lot_id,
//                 entry_id: r.entry_id ?? null,
//                 target_machine: machineChanged ? r.machine : undefined,
//                 machine: r.machine,
//                 before_entry_id: beforeEntryId,
//                 after_entry_id: afterEntryId,
//             });
//             opOwners.push({
//                 entryId: r.entry_id,
//                 kind: "reposition",
//                 snapshot: p,
//                 dndId: r._dndId,
//             });
//         }

//         const fields = {};
//         if (p.status !== r.status) fields.status = r.status;
//         if (p.remarks !== r.remarks) fields.remarks = r.remarks;
//         if (p.tag !== r.tag) fields.tag = r.tag;
//         if (p.accu_time !== r.accu_time) fields.accu_time = r.accu_time;

//         if (Object.keys(fields).length > 0) {
//             operations.push({
//                 type: "update_field",
//                 entry_type: isBlock ? "block" : "lot",
//                 lot_id: isBlock ? null : r.lot_id,
//                 entry_id: r.entry_id,
//                 fields,
//                 lock_version: p.lock_version ?? null,
//             });
//             opOwners.push({
//                 entryId: r.entry_id,
//                 kind: "field",
//                 snapshot: p,
//                 dndId: r._dndId,
//             });
//         }
//     });

//     if (operations.length === 0) return Promise.resolve();

//     return mutate(route("loading-plan.batch-apply"), {
//         body: { operations, scheduled_date: date },
//     })
//         .then(({ results }) => {
//             update((prev) => {
//                 let next = prev
//                     .map((row) => {
//                         const ownerIdx = opOwners.findIndex(
//                             (o) => o.dndId === row._dndId,
//                         );
//                         if (ownerIdx === -1) return row;
//                         const result = results[ownerIdx];
//                         if (!result) return row;
//                         if (result.deleted) return null;

//                         return {
//                             ...row,
//                             ...result,
//                             id: row.id, // never let a server payload override frontend grid identity
//                         };
//                     })
//                     .filter(Boolean);

//                 results.forEach((result) => {
//                     if (result?.parent) {
//                         next = next.map((r) =>
//                             r.lot_id === result.parent.lot_id
//                                 ? {
//                                       ...r,
//                                       qty: result.parentQty ?? r.qty,
//                                       doable: result.parentDoable ?? r.doable,
//                                       doable_status:
//                                           result.parentDoableStatus ??
//                                           r.doable_status,
//                                       doable_recipe_source:
//                                           result.doable_recipe_source ??
//                                           r.doable_status,
//                                       capacity_uph:
//                                           result.parentCapacityUph ??
//                                           r.capacity_uph,
//                                       lock_version:
//                                           result.parent.lock_version ??
//                                           r.lock_version,
//                                       split_info:
//                                           result.parentSplitInfo ??
//                                           r.split_info,
//                                   }
//                                 : r,
//                         );
//                     }
//                 });

//                 return next;
//             }, true);
//         })
//         .catch((err) => {
//             console.error("Undo/redo batch failed to persist:", err);
//             update(() => prevRows);
//             toast?.error?.("That undo couldn't be saved and was reverted.");
//         });
// }
