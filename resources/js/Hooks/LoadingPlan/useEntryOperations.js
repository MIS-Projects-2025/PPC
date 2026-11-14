import { packagesInGroup } from "@/Constants/loadingPlanPackageGroups.js";
import { NON_PACKAGE_TABS } from "@/Constants/LoadingPlan/tabs";
import { isBlockRow } from "@/Lib/LoadingPlan/helpers";
import { applyAffectedTimings } from "@/Lib/LoadingPlan/loadingPlanSchedule";
import { router } from "@inertiajs/react";
import { useCallback, useState } from "react";

/**
 * Single-entry write operations: status change (via the dropdown), add lot,
 * add block, and auto-sort of one machine.
 */
export function useEntryOperations({
    store,
    dataRows,
    update,
    syncServerFields,
    setIsDirty,
    readOnly,
    isF3,
    isLocked,
    beginWrite,
    withUpdating,
    mutate,
    toast,
    date,
    activePackage,
    packageGroups,
    closedSet = null,
}) {
    // ── status dropdown ──────────────────────────────────────────────────
    const [statusMenu, setStatusMenu] = useState(null); // { rowId, anchor }

    const openStatusMenu = useCallback(
        (e, rowId) => {
            e.stopPropagation();
            if (readOnly || isLocked()) return;
            setStatusMenu({ rowId, anchor: e.currentTarget });
        },
        [readOnly, isLocked],
    );

    const closeStatusMenu = useCallback(() => setStatusMenu(null), []);

    const handleStatusChange = useCallback(
        (newStatus) => {
            if (!beginWrite()) {
                setStatusMenu(null);
                return;
            }

            const row = dataRows.find((r) => r.id === statusMenu?.rowId);
            if (!row) return;

            const status = newStatus === "NONE" ? null : newStatus;
            const base = store.getState().present.rows;

            update((prev) => prev.map((r) => (r.id === row.id ? { ...r, status } : r)));
            setIsDirty(true);
            setStatusMenu(null);

            if (row.source === "f3" && closedSet?.has(String(status ?? "").trim().toUpperCase())) {
                toast?.info?.(`${row.lot_id} is marked ${status}. It won't carry over to the next shift day.`);
            }

            withUpdating(
                mutate(route("loading-plan.entries.update", { id: row.entry_id ?? 0 }), {
                    method: "PATCH",
                    body: {
                        entry_type: isBlockRow(row) ? "block" : "lot",
                        lot_id: row.lot_id,
                        scheduled_date: date,
                        fields: { status },
                        lock_version: row.lock_version ?? null,
                    },
                }),
            )
                .then((entry) => {
                    syncServerFields?.([
                        { dndId: row._dndId, fields: { entry_id: entry.id, lock_version: entry.lock_version } },
                    ]);
                })
                .catch((err) => {
                    console.error("Status update failed:", err);
                    store.getState().rollback(base);
                    toast?.error?.("Couldn't save status change — reverted.");
                });
        },
        [statusMenu, dataRows, store, update, setIsDirty, beginWrite, withUpdating, mutate, date, syncServerFields, toast, closedSet],
    );

    // ── add lot / add block ──────────────────────────────────────────────
    const appendCreatedRow = useCallback(
        (entry) => {
            const { affected_timings, ...row } = entry;
            update((prev) => [...prev, { ...row, _dndId: `entry-${row.entry_id}` }]);
            applyAffectedTimings(update, affected_timings, date);
            setIsDirty(true);
        },
        [update, date, setIsDirty],
    );

    const handleAddRow = useCallback(
        (machine, { partName, packageName, qty, beforeEntryId = null, afterEntryId = null } = {}) => {
            if (!beginWrite()) return Promise.reject(new Error("Still saving…"));
            if (readOnly) return Promise.reject(new Error("Read-only view"));
            if (isF3) return Promise.reject(new Error("F3 lots come from travelers"));

            const trimmedPart = (partName ?? "").trim();
            if (!trimmedPart) return Promise.reject(new Error("Part name is required"));

            const onRealTab = !NON_PACKAGE_TABS.includes(activePackage);
            const resolvedPackage =
                packageName || (onRealTab ? (packagesInGroup(activePackage, packageGroups)[0] ?? activePackage) : null);
            if (!resolvedPackage) return Promise.reject(new Error("Pick a package for the new lot"));

            return withUpdating(
                mutate(route("loading-plan.manual-lots.store"), {
                    body: {
                        machine,
                        scheduled_date: date,
                        fields: { part_name: trimmedPart, package_name: resolvedPackage, qty: qty ?? 0 },
                        before_entry_id: beforeEntryId,
                        after_entry_id: afterEntryId,
                    },
                }),
            )
                .then((entry) => {
                    appendCreatedRow(entry);
                    return entry;
                })
                .catch((err) => {
                    console.error("Failed to create manual lot:", err);
                    toast?.error?.("Couldn't create the new lot — please try again.");
                    throw err;
                });
        },
        [readOnly, isF3, activePackage, packageGroups, date, beginWrite, withUpdating, mutate, appendCreatedRow, toast],
    );

    const saveBlock = useCallback(
        (machine, label, duration, { beforeEntryId = null, afterEntryId = null } = {}) => {
            if (!beginWrite()) return Promise.reject(new Error("Still saving…"));
            if (readOnly) return Promise.reject(new Error("Read-only view"));

            return withUpdating(
                mutate(route("loading-plan.blocks.store"), {
                    body: {
                        machine,
                        scheduled_date: date,
                        label: label.trim() || "Time block",
                        duration,
                        before_entry_id: beforeEntryId,
                        after_entry_id: afterEntryId,
                    },
                }),
            )
                .then((entry) => {
                    appendCreatedRow(entry);
                    return entry;
                })
                .catch((err) => {
                    console.error("Failed to save block:", err);
                    toast?.error?.("Could not save the block — please try again.");
                    throw err;
                });
        },
        [readOnly, date, beginWrite, withUpdating, mutate, appendCreatedRow, toast],
    );

    // ── auto-sort ────────────────────────────────────────────────────────
    const runAutoSort = useCallback(
        async (machine) => {
            try {
                if (!beginWrite()) return false;

                const res = await mutate(route("loading-plan.auto-sort", { machine }), {
                    method: "POST",
                    body: { scheduled_date: date },
                });

                const sorted = res.entries ?? [];
                let mismatch = false;

                update((prev) => {
                    // the sorted rows reuse the slots those rows already occupy
                    const slots = [];
                    const existingById = new Map();
                    const sortedIds = new Set(sorted.map((s) => s.entry_id));
                    prev.forEach((r, i) => {
                        if (r.entry_id != null && sortedIds.has(r.entry_id)) {
                            slots.push(i);
                            existingById.set(r.entry_id, r);
                        }
                    });

                    if (slots.length !== sorted.length || sorted.some((s) => !existingById.has(s.entry_id))) {
                        mismatch = true;
                        return prev;
                    }

                    const next = [...prev];
                    sorted.forEach((s, i) => {
                        const existing = existingById.get(s.entry_id);
                        next[slots[i]] = {
                            ...existing,
                            ...s,
                            id: existing.id,
                            _dndId: existing._dndId,
                            lock_version: s.lock_version ?? existing.lock_version,
                        };
                    });
                    return next;
                }, true);

                if (mismatch) {
                    router.reload({ preserveScroll: true });
                    return true;
                }

                applyAffectedTimings(update, res.affected_timings, date);
                // not undoable: drop history so Ctrl+Z can't replay the old order to the server
                const s = store.getState();
                s.reset(s.present.rows);
                return true;
            } catch (err) {
                console.error("Auto sort failed:", err);
                toast?.error?.("Auto sort failed. Nothing was changed.");
                return false;
            }
        },
        [beginWrite, mutate, date, update, store, toast],
    );

    const handleAutoSortMachine = useCallback((machine) => withUpdating(runAutoSort(machine)), [withUpdating, runAutoSort]);

    return {
        statusMenu,
        openStatusMenu,
        closeStatusMenu,
        handleStatusChange,
        handleAddRow,
        saveBlock,
        handleAutoSortMachine,
    };
}