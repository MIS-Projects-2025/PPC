import { create } from "zustand";

export const createUndoStore = (initialState, options = {}) => {
    const limit = options.limit ?? 100;
    const wrap = (rows, action = null) => ({ rows, action });

    return create((set, get) => ({
        past: [],
        present: wrap(initialState),
        future: [],

        // action param is new — only passed when pushing a compound-op entry
        update: (next, skipHistory = false, action = null) => {
            const { past, present } = get();
            const newRows = typeof next === "function" ? next(present.rows) : next;
            if (newRows === present.rows) return;

            if (skipHistory) {
                // overwrite rows in place; keep whatever action tag present already had
                set({ present: { rows: newRows, action: present.action } });
                return;
            }

            const updatedPast = [...past, present];
            const limitedPast = updatedPast.length > limit
                ? updatedPast.slice(updatedPast.length - limit)
                : updatedPast;

            set({ past: limitedPast, present: wrap(newRows, action), future: [] });
        },

        undo: () => {
            const { past, present, future } = get();
            if (past.length === 0) return;
            const previous = past[past.length - 1];
            set({ past: past.slice(0, -1), present: previous, future: [present, ...future] });
        },

        redo: () => {
            const { past, present, future } = get();
            if (future.length === 0) return;
            const next = future[0];
            set({ past: [...past, present], present: next, future: future.slice(1) });
        },

        syncServerFields: (patches) => {
            // patches: Array<{ dndId, fields }> — server-confirmed fields (lock_version,
            // entry_id, etc.) merged into every occurrence of that row across past,
            // present, and future, so a later undo/redo can't resurrect a stale
            // lock_version and trip the optimistic-lock check.
            if (!patches.length) return;
            const byDndId = new Map(patches.map((p) => [p.dndId, p.fields]));

            const applyPatches = (rows) =>
                rows.map((r) => {
                    const fields = byDndId.get(r._dndId);
                    return fields ? { ...r, ...fields } : r;
                });

            const { past, present, future } = get();
            set({
                past: past.map((snap) => ({ ...snap, rows: applyPatches(snap.rows) })),
                present: { ...present, rows: applyPatches(present.rows) },
                future: future.map((snap) => ({ ...snap, rows: applyPatches(snap.rows) })),
            });
        },

        canUndo: () => get().past.length > 0,
        canRedo: () => get().future.length > 0,

        // what undo() is about to reverse / what redo() is about to reapply
        pendingUndoAction: () => get().present.action,
        pendingRedoAction: () => get().future[0]?.action ?? null,

        reset: (state) => set({ past: [], present: wrap(state), future: [] }),
    }));
};