import { useCallback, useEffect, useState } from "react";

/** Non-machine placements use the key "nm:<id>" wherever a machine name is used. */
export const isNonMachineKey = (m) => typeof m === "string" && m.startsWith("nm:");

export function useNonMachineOperations({
    store,
    serverNonMachines,
    update,
    beginWrite,
    withUpdating,
    mutate,
    toast,
    date,
    selectedLocation,
    setIsDirty,
}) {
    // includes empty ones (they are never rendered in the grid, only in the
    // manage modal and the transfer list)
    const [nonMachineList, setNonMachineList] = useState(serverNonMachines ?? []);
    useEffect(() => setNonMachineList(serverNonMachines ?? []), [serverNonMachines]);

    const createNonMachine = useCallback(
        async (name) => {
            if (!beginWrite()) return;

            try {
                const created = await withUpdating(
                    mutate(route("loading-plan.non-machines.store"), {
                        body: { name, location: selectedLocation, scheduled_date: date },
                    }),
                );
                setNonMachineList((prev) => [...prev, created]);
                return created;
            } catch (err) {
                console.error("Failed to create non-machine:", err);
                toast?.error?.(err?.message ?? "Couldn't create the non-machine.");
                return null;
            }
        },
        [beginWrite, withUpdating, mutate, selectedLocation, date, toast],
    );

    const renameNonMachine = useCallback(
        async (id, name) => {
            if (!beginWrite()) return;

            const oldName = nonMachineList.find((n) => n.id === id)?.name;
            setNonMachineList((prev) => prev.map((n) => (n.id === id ? { ...n, name } : n)));
            try {
                await withUpdating(
                    mutate(route("loading-plan.non-machines.update", { nonMachine: id }), {
                        method: "PATCH",
                        body: { name },
                    }),
                );
            } catch (err) {
                console.error("Failed to rename non-machine:", err);
                setNonMachineList((prev) => prev.map((n) => (n.id === id ? { ...n, name: oldName } : n)));
                toast?.error?.("Couldn't rename it, reverted.");
            }
        },
        [nonMachineList, beginWrite, withUpdating, mutate, toast],
    );

    // Lots go back to Unassigned, blocks (and rework rows) are deleted.
    const deleteNonMachine = useCallback(
        async (id) => {
            if (!beginWrite()) return;
            
            const key = `nm:${id}`;
            try {
                const res = await withUpdating(
                    mutate(route("loading-plan.non-machines.destroy", { nonMachine: id }), {
                        method: "delete",
                    }),
                );
                const removed = new Set(res.deleted_entry_ids ?? []);
                const lockById = new Map((res.unassigned ?? []).map((u) => [u.id, u.lock_version]));

                update(
                    (prev) =>
                        prev
                            .filter((r) => !(r.machine === key && removed.has(r.entry_id)))
                            .map((r) =>
                                r.machine === key
                                    ? {
                                          ...r,
                                          machine: null,
                                          sequence_order: null,
                                          time_start: null,
                                          time_end: null,
                                          time_start_at: null,
                                          time_end_at: null,
                                          time_start_day_offset: 0,
                                          time_end_day_offset: 0,
                                          lock_version: lockById.get(r.entry_id) ?? r.lock_version,
                                      }
                                    : r,
                            ),
                    true,
                );
                setNonMachineList((prev) => prev.filter((n) => n.id !== id));
                // not undoable: drop history so Ctrl+Z can't replay rows into a deleted place
                store.getState().reset(store.getState().present.rows);
                setIsDirty(true);
            } catch (err) {
                console.error("Failed to delete non-machine:", err);
                toast?.error?.(err?.message ?? "Couldn't delete the non-machine.");
            }
        },
        [beginWrite, withUpdating, mutate, update, store, setIsDirty, toast],
    );

    return { nonMachineList, createNonMachine, renameNonMachine, deleteNonMachine };
}