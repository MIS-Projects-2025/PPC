// Lib/LoadingPlan/splitMergeApi.js

export function callSplit(mutate, { parentEntryId, childLotId, childQty, targetMachine, beforeEntryId, afterEntryId }) {
    return mutate(route("loading-plan.splits.store"), {
        body: {
            parent_entry_id: parentEntryId,
            child_qty: childQty,
            target_machine: targetMachine,
            before_entry_id: beforeEntryId ?? null,
            after_entry_id: afterEntryId ?? null,
            child_lot_id: childLotId,
        },
    });
}

export function callRevertSplit(mutate, splitId, revertedBy) {
    return mutate(route("loading-plan.splits.destroy", splitId), {
        method: "delete",
        body: { reverted_by: revertedBy },
    });
}

export function callUnrevertSplit(mutate, splitId, unrevertedBy) {
    return mutate(route("loading-plan.splits.unrevert", splitId), {
        method: "post",
        body: { unreverted_by: unrevertedBy },
    });
}

export function callMerge(mutate, { entryIdA, entryIdB, date }) {
    return mutate(route("loading-plan.merges.store"), {
        body: { entry_id_a: entryIdA, entry_id_b: entryIdB, scheduled_date: date },
    });
}

export function callRevertMerge(mutate, mergeId) {
    return mutate(route("loading-plan.merges.destroy", mergeId), {
        method: "delete",
        body: { reverted_by: null },
    });
}

export function callUnrevertMerge(mutate, mergeId, unrevertedBy) {
    return mutate(route("loading-plan.merges.unrevert", mergeId), {
        method: "post",
        body: { unreverted_by: unrevertedBy },
    });
}

// --- reconciliation: fold a response into the row list ---
// These match the exact response shapes from LotSplitService / LotMergeService,
// which differ between revert (flat parentQty/parentDoable/...) and
// create/unrevert (nested parent/child objects with qty already inside).

export function reconcileSplitCreate(rows, result, { parentEntryId }) {
    return rows
        .map((row) => (row.entry_id === parentEntryId ? { ...row, ...result.parent } : row))
        .concat([{ ...result.child, _dndId: `entry-${result.child.entry_id}` }]);
}

export function reconcileSplitRevert(rows, result, { childEntryId = null } = {}) {
    const parentId = result.parent ? (result.parent.entry_id ?? result.parent.id) : null;
    const isChild = (r) =>
        childEntryId != null ? r.entry_id === childEntryId
        : r.split_info?.isChild ? r.split_info.splitId === result.split?.id
        : r.lot_id === result.deleted && !r.is_rework && !r.is_leaked;

    return rows.filter((r) => !isChild(r))
        .map((r) =>
            parentId != null && r.entry_id === parentId
            ? {
                    ...r,
                    qty: result.parentQty ?? r.qty,
                    doable: result.parentDoable ?? r.doable,
                    doable_status: result.parentDoableStatus ?? r.doable_status,
                    capacity_uph: result.parentCapacityUph ?? r.capacity_uph,
                    lock_version: result.parent.lock_version,
                    split_info: result.parentSplitInfo,
                }
            : r,
        );
}

export function reconcileSplitUnrevert(rows, result) {
    const parentId = result.parent.entry_id ?? result.parent.id;
    const childId = result.child.entry_id;
    const childRow = {
        ...result.child,
        qty: result.childQty ?? result.child.qty,
        doable: result.childDoable,
        doable_status: result.childDoableStatus,
        capacity_uph: result.childCapacityUph,
        split_info: result.childSplitInfo,
        _dndId: `entry-${childId}`,
    };

    let found = false;
    const next = rows.map((r) => {
        if (r.entry_id === parentId) {
            return {
                ...r,
                qty: result.parentQty ?? r.qty,
                doable: result.parentDoable ?? r.doable,
                doable_status: result.parentDoableStatus ?? r.doable_status,
                capacity_uph: result.parentCapacityUph ?? r.capacity_uph,
                lock_version: result.parent.lock_version,
                split_info: result.parentSplitInfo,
            };
        }
        // the restored snapshot already holds the child: replace, never append a second one
        if (r.entry_id === childId) { found = true; return { ...r, ...childRow }; }
        return r;
    });
    return found ? next : next.concat([childRow]);
}

export function reconcileMergeCreate(rows, result) {
    return rows.map((row) => {
        if (row.entry_id === result.target.entry_id) return { ...row, ...result.target };
        if (row.entry_id === result.source.entry_id) return { ...row, ...result.source };
        return row;
    });
}

const sameEntry = (row, side) =>
    side && (side.entry_id != null ? row.entry_id === side.entry_id : row.lot_id === side.lot_id);

export function reconcileMergeRevert(rows, result) {
    const { target, source } = result;
    const apply = (row, s) => ({
        ...row, qty: s.qty, lock_version: s.lock_version,
        merge_info: s.merge_info ?? null,   // target may still be part of another active merge
        doable: s.doable, doable_status: s.doable_status, capacity_uph: s.capacity_uph,
    });
    return rows.map((row) => {
        if (sameEntry(row, target)) return apply(row, target);
        if (sameEntry(row, source)) return apply(row, source);
        return row;
    });
}

export function reconcileMergeUnrevert(rows, result) {
    const { target, source } = result;
    return rows.map((row) => {
        if (sameEntry(row, target)) return { ...row, ...target };
        if (sameEntry(row, source)) return { ...row, ...source };
        return row;
    });
}