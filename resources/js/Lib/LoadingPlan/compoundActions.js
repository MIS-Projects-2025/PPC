// compoundActions.js
export function mergeCompoundResponse(rows, response, type) {
    let next = rows;

    if (type === "split") {
        const { parent, child, deleted } = response;
        if (deleted) next = next.filter((r) => r.lot_id !== deleted); // revert() deleted the child
        else if (child) next = upsertByLotId(next, child);
        if (parent) next = upsertByLotId(next, parent);
    }

    if (type === "merge") {
        const { target, source } = response;
        if (target) next = upsertByLotId(next, target);
        if (source) next = upsertByLotId(next, source);
    }

    return next;
}

function upsertByLotId(rows, entry) {
    const idx = rows.findIndex((r) => r.lot_id === entry.lot_id);
    const normalized = { ...entry, entry_id: entry.id ?? entry.entry_id };
    if (idx === -1) return [...rows, normalized];
    const copy = rows.slice();
    copy[idx] = { ...rows[idx], ...normalized }; // keeps _dndId, drops nothing you rely on
    return copy;
}