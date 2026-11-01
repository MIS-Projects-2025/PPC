import { timeFieldsFromDatetimes } from "@/Lib/LoadingPlan/loadingPlanSchedule";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_DAYS = 7;

/**
 * "Earlier pickups" flow for the Unassigned tab (F1/F2 only):
 * load candidates from ppc_pickupdb, pick some, pull them into the selected date.
 */
export function usePickupPool({
    store,
    date,
    selectedLocation,
    readOnly,
    isF3,
    beginWrite,
    withUpdating,
    mutate,
    setIsDirty,
    toast,
}) {
    const enabled = !readOnly && !isF3;

    const [days, setDays] = useState(DEFAULT_DAYS);
    const [candidates, setCandidates] = useState(null); // null = not loaded yet
    const [loading, setLoading] = useState(false);
    const [loadFailed, setLoadFailed] = useState(false);
    const [pulling, setPulling] = useState(false);
    const [selected, setSelected] = useState(() => new Set());

    // only the newest load may write state (the user can change `days` mid-flight)
    const requestRef = useRef(0);

    const reset = useCallback(() => {
        requestRef.current += 1; // drop any in-flight load
        setCandidates(null);
        setSelected(new Set());
        setLoading(false);
        setLoadFailed(false);
    }, []);

    // candidates are per (date, location): never show a stale list
    useEffect(() => {
        reset();
    }, [date, selectedLocation, reset]);

    const load = useCallback(
        async (nextDays = days) => {
            if (!enabled) return;

            const requestId = ++requestRef.current;
            setLoading(true);
            setLoadFailed(false);

            try {
                const res = await fetch(
                    route("loading-plan.pickups.available", { date, location: selectedLocation, days: nextDays }),
                    { headers: { Accept: "application/json" } },
                );
                if (!res.ok) throw new Error(`HTTP ${res.status}`);

                const rows = await res.json();
                if (requestId !== requestRef.current) return; // superseded

                setCandidates(rows);
                // keep what the user already ticked, but only if it is still on offer
                setSelected((prev) => {
                    const offered = new Set(rows.map((r) => r.id_pickup));
                    return new Set([...prev].filter((id) => offered.has(id)));
                });
            } catch (err) {
                if (requestId !== requestRef.current) return;
                console.error("Failed to load earlier pickups:", err);
                setLoadFailed(true);
                toast?.error?.("Couldn't load earlier pickups.");
            } finally {
                if (requestId === requestRef.current) setLoading(false);
            }
        },
        [enabled, days, date, selectedLocation, toast],
    );

    const changeDays = useCallback(
        (nextDays) => {
            setDays(nextDays);
            return load(nextDays);
        },
        [load],
    );

    // ── selection ────────────────────────────────────────────────────────
    const toggle = useCallback((id) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const allSelected = useMemo(
        () => !!candidates?.length && candidates.every((c) => selected.has(c.id_pickup)),
        [candidates, selected],
    );

    const toggleAll = useCallback(() => {
        setSelected(allSelected ? new Set() : new Set((candidates ?? []).map((c) => c.id_pickup)));
    }, [allSelected, candidates]);

    // ── pull ─────────────────────────────────────────────────────────────
    /** Resolves { added, skipped } so the modal can close; rejects (modal stays open) on failure. */
    const pull = useCallback(
        async (ids = [...selected]) => {
            if (!enabled) throw new Error("Not available here");
            if (ids.length === 0) throw new Error("Nothing selected");
            if (!beginWrite()) throw new Error("Still saving…");

            setPulling(true);
            try {
                const res = await withUpdating(
                    mutate(route("loading-plan.pickups.pull"), {
                        body: { date, location: selectedLocation, pickup_ids: ids },
                    }),
                );

                const s = store.getState();
                const have = new Set(s.present.rows.map((r) => r.entry_id));
                const added = (res.entries ?? [])
                    .filter((e) => !have.has(e.entry_id))
                    .map((e) => ({
                        ...e,
                        ...timeFieldsFromDatetimes(e.time_start_at, e.time_end_at, date),
                        machine: e.machine ?? null,
                        tag: e.tag ?? null,
                        doable: e.doable ?? 0,
                        remarks: e.remarks ?? "",
                        _dndId: `entry-${e.entry_id}`,
                    }));

                // not undoable on purpose (same as parking): an old snapshot must not replay without these rows
                s.reset([...s.present.rows, ...added]);
                setIsDirty(true);

                const skipped = res.skipped ?? 0;
                if (skipped > 0) {
                    toast?.info?.(
                        `${added.length} added. ${skipped} skipped (already placed, already added, or no longer eligible).`,
                    );
                } else {
                    toast?.success?.(`${added.length} pickup(s) added to Unassigned.`);
                }

                // refresh the offer list; failures here are already toasted by load()
                load();

                return { added: added.length, skipped };
            } catch (err) {
                if (err?.data?.error === "finalized") {
                    toast?.error?.(err.message ?? "This date is finalized.");
                } else if (err?.status !== 409 && err?.status !== 404) {
                    // 409/404 are handled globally by the write lock ("plan changed, refresh")
                    console.error("Failed to pull pickups:", err);
                    toast?.error?.(err?.data?.message ?? err?.message ?? "Couldn't add the pickups.");
                }
                throw err;
            } finally {
                setPulling(false);
            }
        },
        [enabled, selected, beginWrite, withUpdating, mutate, date, selectedLocation, store, setIsDirty, toast, load],
    );

    return {
        enabled,
        days,
        candidates,
        loading,
        loadFailed,
        pulling,
        selected,
        allSelected,
        load,
        changeDays,
        reset,
        toggle,
        toggleAll,
        pull,
    };
}