import { openDoableEditModal } from "@/Components/LoadingPlan/DoableEditModal";
import { MISSING_PARTS_MODAL_ID } from "@/Components/LoadingPlan/MissingPartsModal";
import { isBlockRow } from "@/Lib/LoadingPlan/helpers";
import { applyAffectedTimings } from "@/Lib/LoadingPlan/loadingPlanSchedule";
import { closeModal, showModal } from "@/Lib/LoadingPlan/modal";
import { useCallback, useMemo, useState } from "react";

// Server-derived doable fields: identity-ish ones go to every history snapshot,
// arrangement-dependent ones only to the present.
const HISTORY_FIELDS = [
    "entry_id", "lock_version",
    "doable", "doable_status", "doable_overridden",
    "doable_recipe_source", "part_missing_from_list",
];
const PRESENT_FIELDS = ["capacity_uph", "accu_time"];
const pickKeys = (o, keys) => Object.fromEntries(keys.map((k) => [k, o[k]]));

const doablePatch = (e) => ({
    dndId: `entry-${e.entry_id}`,
    history: pickKeys(e, HISTORY_FIELDS),
    present: pickKeys(e, PRESENT_FIELDS),
});

/** Doable override, recipe edits, and the "missing part records" flow. */
export function useDoableOperations({
    store,
    dataRows,
    date,
    readOnly,
    isLocked,
    beginWrite,
    withUpdating,
    mutate,
    update,
    syncServerFields,
    setIsDirty,
    toast,
}) {
    const [doableEditId, setDoableEditId] = useState(null);
    const [missingParts, setMissingParts] = useState(null);

    const doableEditRow = useMemo(() => dataRows.find((r) => r.id === doableEditId) ?? null, [dataRows, doableEditId]);

    const doableSameCount = useMemo(
        () =>
            doableEditRow
                ? dataRows.filter(
                    (r) =>
                        !isBlockRow(r) &&
                        r.part_name === doableEditRow.part_name &&
                        (r.scheduled_date ?? date) === date,
                ).length
                : 0,
        [dataRows, doableEditRow, date],
    );

    const onEditDoable = useCallback(
        (row) => {
            if (readOnly || isLocked() || isBlockRow(row)) return;
            if (document.getElementById("doable_edit_modal")?.open) return;
            setDoableEditId(row.id);
            openDoableEditModal();
        },
        [readOnly, isLocked],
    );

    const reportError = useCallback(
        (err, fallback) => {
            if (err?.status === 409) toast?.error?.("Someone else changed this lot. Refresh and try again.");
            else toast?.error?.(err?.data?.message ?? err?.message ?? fallback);
        },
        [toast],
    );

    const applyDoablePatches = useCallback(
        (patches) => {
            syncServerFields?.(patches.map(({ dndId, history }) => ({ dndId, fields: history })));
            const presentById = new Map(patches.map((p) => [p.dndId, p.present]));
            update((prev) => prev.map((r) => (presentById.has(r._dndId) ? { ...r, ...presentById.get(r._dndId) } : r)), true);
        },
        [syncServerFields, update],
    );

    /** Fold a bulk recalculation response (entries + affected_timings) into the rows. */
    const applyRecalc = useCallback(
        ({ entries, affected_timings }) => {
            const rows = store.getState().present.rows;
            const dndIdFor = (e) => rows.find((r) => r.entry_id === e.entry_id)?._dndId ?? `entry-${e.entry_id}`;

            applyDoablePatches((entries ?? []).map((e) => ({ ...doablePatch(e), dndId: dndIdFor(e) })));
            applyAffectedTimings(update, affected_timings, date);
            setIsDirty(true);
        },
        [store, applyDoablePatches, update, date, setIsDirty],
    );

    const handleSaveOverride = useCallback(
        (doable) => {
            if (!beginWrite()) return Promise.reject(new Error("Still saving…"));
            const row = doableEditRow;
            if (!row) return Promise.reject(new Error("Row no longer exists"));

            return withUpdating(
                mutate(route("loading-plan.entries.doable", { id: row.entry_id ?? 0 }), {
                    method: "PATCH",
                    body: {
                        doable,
                        lock_version: row.lock_version ?? null,
                        ...(row.entry_id ? {} : { lot_id: row.lot_id, scheduled_date: date }),
                    },
                }),
            )
                .then((entry) => {
                    applyDoablePatches([{ ...doablePatch(entry), dndId: row._dndId }]);
                    applyAffectedTimings(update, entry.affected_timings, date);
                    setIsDirty(true);
                })
                .catch((err) => {
                    reportError(err, "Couldn't save doable.");
                    throw err;
                });
        },
        [doableEditRow, date, beginWrite, withUpdating, mutate, applyDoablePatches, update, setIsDirty, reportError],
    );

    const handleSaveRecipe = useCallback(
        (partName, recipe, { source = "wip", lotId = null } = {}) => {
            if (!beginWrite()) return Promise.reject(new Error("Still saving…"));

            return withUpdating(
                mutate(route("loading-plan.part-recipe.update"), {
                    method: "PATCH",
                    body: {
                        part_name: partName,
                        recipe,
                        scheduled_date: date,
                        source,
                        ...(source === "f3" ? { lot_id: lotId } : {}),
                    },
                }),
            )
                .then(applyRecalc)
                .catch((err) => {
                    reportError(err, "Couldn't save recipe.");
                    throw err;
                });
        },
        [beginWrite, withUpdating, mutate, date, applyRecalc, reportError],
    );

    // ── missing part records ─────────────────────────────────────────────
    const openMissingParts = useCallback(
        async (partName = null) => {
            try {
                const res = await fetch(
                    route("loading-plan.missing-parts", { date, ...(partName ? { part_name: partName } : {}) }),
                    { headers: { Accept: "application/json" } },
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const rows = await res.json();
                if (!Array.isArray(rows) || rows.length === 0) {
                    toast?.info?.("No part records need filling in.");
                    return;
                }
                setMissingParts(rows);
                showModal(MISSING_PARTS_MODAL_ID);
            } catch (err) {
                console.error("missing-parts failed:", err);
                toast?.error?.("Couldn't load the part records.");
            }
        },
        [date, toast],
    );

    const handleMissingPartsSaved = useCallback(
        async (rows) => {
            closeModal(MISSING_PARTS_MODAL_ID);
            setMissingParts(null);

            const names = rows.map((r) => r.devicename).filter(Boolean);
            if (names.length === 0) return;

            if (!beginWrite()) {
                toast?.info?.("Part records saved. Refresh to recalculate doable.", { id: "parts-saved-no-recalc" });
                return;
            }

            await withUpdating(
                mutate(route("loading-plan.parts.recalculate"), { body: { part_names: names, scheduled_date: date } }),
            )
                .then(applyRecalc)
                .catch((err) => reportError(err, "Saved, but couldn't recalculate doable. Refresh to see it."));
        },
        [beginWrite, withUpdating, toast, mutate, date, applyRecalc, reportError],
    );

    return {
        doableEditRow,
        doableSameCount,
        onEditDoable,
        handleSaveOverride,
        handleSaveRecipe,
        missingParts,
        openMissingParts,
        handleMissingPartsSaved,
    };
}