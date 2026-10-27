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

export function reconcileSplitRevert(rows, result) {
    return rows
        .filter((r) => r.lot_id !== result.deleted)
        .map((r) =>
            result.parent && r.lot_id === result.parent.lot_id
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
    // unrevert() recreates the child entry — same shape concerns as create,
    // plus it needs to re-stitch the parent's qty/doable fields like revert does.
    let next = rows.map((r) =>
        r.lot_id === result.parent.lot_id
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
    next = next.concat([
        {
            ...result.child,
            qty: result.childQty ?? result.child.qty,
            doable: result.childDoable,
            doable_status: result.childDoableStatus,
            capacity_uph: result.childCapacityUph,
            split_info: result.childSplitInfo,
            _dndId: `entry-${result.child.entry_id}`,
        },
    ]);
    return next;
}

export function reconcileMergeCreate(rows, result) {
    return rows.map((row) => {
        if (row.entry_id === result.target.entry_id) return { ...row, ...result.target };
        if (row.entry_id === result.source.entry_id) return { ...row, ...result.source };
        return row;
    });
}

export function reconcileMergeRevert(rows, result) {
    const { target, source } = result;

    return rows.map((row) => {
        if (target && row.lot_id === target.lot_id) {
            return { ...row, qty: target.qty, lock_version: target.lock_version, merge_info: null,
                doable: target.doable, doable_status: target.doable_status, capacity_uph: target.capacity_uph };
        }
        if (source && row.lot_id === source.lot_id) {
            return { ...row, qty: source.qty, lock_version: source.lock_version, merge_info: null,
                doable: source.doable, doable_status: source.doable_status, capacity_uph: source.capacity_uph };
        }
        return row;
    });
}

export function reconcileMergeUnrevert(rows, result) {
    const { target, source } = result;
    
    return rows.map((row) => {
        if (row.lot_id === target.lot_id) return { ...row, ...target };
        if (row.lot_id === source.lot_id) return { ...row, ...source };
        return row;
    });
}