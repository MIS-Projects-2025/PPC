// Thin API wrappers + reconcilers that fold a response into the row list.
// Response shapes differ between revert (flat parentQty/parentDoable/...) and
// create/unrevert (nested parent/child objects), see LotSplitService / LotMergeService.

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

// ── reconcilers ──────────────────────────────────────────────────────────

/** Parent row after a revert/unrevert (flat parentQty/parentDoable/... response). */
function withParentSnapshot(row, result) {
    return {
        ...row,
        qty: result.parentQty ?? row.qty,
        doable: result.parentDoable ?? row.doable,
        doable_status: result.parentDoableStatus ?? row.doable_status,
        capacity_uph: result.parentCapacityUph ?? row.capacity_uph,
        lock_version: result.parent.lock_version,
        split_info: result.parentSplitInfo,
    };
}

export function reconcileSplitCreate(rows, result, { parentEntryId }) {
    const parentStatus = rows.find((r) => r.entry_id === parentEntryId)?.status;
    const child = {
        ...result.child,
        status: result.child.status ?? parentStatus ?? "NONE",
        _dndId: `entry-${result.child.entry_id}`,
    };

    return rows
        .map((row) => (row.entry_id === parentEntryId ? { ...row, ...result.parent } : row))
        .concat([child]);
}

export function reconcileSplitRevert(rows, result, { childEntryId = null } = {}) {
    const parentId = result.parent ? (result.parent.entry_id ?? result.parent.id) : null;

    const isChild = (r) =>
        childEntryId != null
            ? r.entry_id === childEntryId
            : r.split_info?.isChild
                ? r.split_info.splitId === result.split?.id
                : r.lot_id === result.deleted && !r.is_rework && !r.is_leaked;

    return rows
        .filter((r) => !isChild(r))
        .map((r) => (parentId != null && r.entry_id === parentId ? withParentSnapshot(r, result) : r));
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

    let childFound = false;
    const next = rows.map((r) => {
        if (r.entry_id === parentId) return withParentSnapshot(r, result);
        // the restored snapshot already holds the child: replace, never append a second one
        if (r.entry_id === childId) {
            childFound = true;
            return { ...r, ...childRow };
        }
        return r;
    });

    return childFound ? next : next.concat([childRow]);
}

const sameEntry = (row, side) =>
    side && (side.entry_id != null ? row.entry_id === side.entry_id : row.lot_id === side.lot_id);

/** Merge create/unrevert: both sides are patched wholesale. */
function mergeSides(rows, { target, source }) {
    return rows.map((row) => {
        if (sameEntry(row, target)) return { ...row, ...target };
        if (sameEntry(row, source)) return { ...row, ...source };
        return row;
    });
}

export const reconcileMergeCreate = mergeSides;
export const reconcileMergeUnrevert = mergeSides;

export function reconcileMergeRevert(rows, { target, source }) {
    const apply = (row, s) => ({
        ...row,
        qty: s.qty,
        lock_version: s.lock_version,
        merge_info: s.merge_info ?? null, // target may still be part of another active merge
        doable: s.doable,
        doable_status: s.doable_status,
        capacity_uph: s.capacity_uph,
    });

    return rows.map((row) => {
        if (sameEntry(row, target)) return apply(row, target);
        if (sameEntry(row, source)) return apply(row, source);
        return row;
    });
}