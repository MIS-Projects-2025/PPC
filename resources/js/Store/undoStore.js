import { create } from "zustand";

export const createUndoStore = (initialState, options = {}) => {
    const limit = options.limit ?? 100;

    return create((set, get) => ({
        past: [],
        present: initialState,
        future: [],

        update: (next, skipHistory = false) => {
            console.log(
                `[store update #${++window.__updateCounter || (window.__updateCounter = 1)}]`,
            );
            console.trace();
            const { past, present } = get();
            const newPresent =
                typeof next === "function" ? next(present) : next;

            if (newPresent === present) return;

            if (skipHistory) {
                set({ present: newPresent });
            } else {
                const updatedPast = [...past, present];

                const limitedPast =
                    updatedPast.length > limit
                        ? updatedPast.slice(updatedPast.length - limit)
                        : updatedPast;

                set({
                    past: limitedPast,
                    present: newPresent,
                    future: [],
                });
            }
        },

        undo: () => {
            const { past, present, future } = get();
            if (past.length === 0) return;

            const previous = past[past.length - 1];
            const newPast = past.slice(0, past.length - 1);

            set({
                past: newPast,
                present: previous,
                future: [present, ...future],
            });
        },

        redo: () => {
            const { past, present, future } = get();
            if (future.length === 0) return;

            const next = future[0];
            const newFuture = future.slice(1);

            set({
                past: [...past, present],
                present: next,
                future: newFuture,
            });
        },

        canUndo: () => get().past.length > 0,
        canRedo: () => get().future.length > 0,

        reset: (state) => set({ past: [], present: state, future: [] }),
    }));
};
