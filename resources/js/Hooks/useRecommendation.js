import { LOT_UPSTREAM_MODES } from "@/Constants/lotUpstreamModes";
import { useLotStore } from "@/Store/useLotStore";
import { useEffect, useRef } from "react";

// Requirements: about one second, then fail open (no recommendation, never an error toast).
const REQUEST_TIMEOUT_MS = 1000;
// Fields arrive one scan at a time, and operators type box count digit by digit.
const DEBOUNCE_MS = 300;

const buildKey = (lotId, partname, dimensionId, boxCount) =>
    [String(lotId).trim(), String(partname).trim(), String(dimensionId), String(boxCount)].join("|");

const keyOfLot = (lot) =>
    buildKey(
        lot?.lot_id ?? "",
        lot?.partname ?? "",
        lot?.dimension_id ?? "",
        lot?.box_count ?? "",
    );

/**
 * Requests a placement recommendation for the lot being received. Advisory only:
 *  - never runs in edit or release mode, or when the page's kill switch is off;
 *  - cancels the previous request whenever the lot (or its box fields) change and ignores stale answers;
 *  - fills box count / dimension for a returned lot from its last cycle, only into empty fields.
 */
export default function useRecommendation({ rackPageId, enabled }) {
    const lotId = useLotStore((s) => s.pendingLotToBeAdded?.lot_id ?? "");
    const partname = useLotStore((s) => s.pendingLotToBeAdded?.partname ?? "");
    const dimensionId = useLotStore((s) => s.pendingLotToBeAdded?.dimension_id ?? "");
    const boxCount = useLotStore((s) => s.pendingLotToBeAdded?.box_count ?? "");
    const mode = useLotStore((s) => s.mode);
    const isEditMode = useLotStore((s) => s.isEditMode);

    // After a prefill the fields change, but the answer already accounts for them: skip that one re-request.
    const skipKey = useRef(null);

    const active = Boolean(enabled) && mode === LOT_UPSTREAM_MODES.RECEIVE && !isEditMode;

    useEffect(() => {
        const store = useLotStore.getState();
        const trimmedLot = String(lotId).trim();

        if (!active || !trimmedLot) {
            skipKey.current = null;
            store.clearRecommendation();
            return;
        }

        const key = buildKey(trimmedLot, partname, dimensionId, boxCount);

        if (skipKey.current === key) {
            skipKey.current = null;
            return;
        }
        skipKey.current = null;

        // A recommendation for a different lot or different boxes must never linger.
        store.clearRecommendation();

        const controller = new AbortController();
        let timedOut = false;
        let timeout = null;

        const apply = (data) => {
            const s = useLotStore.getState();

            if (data?.reason === "disabled") {
                s.setRecommendation({ status: "hidden", reason: "disabled" });
                return;
            }

            let prefilled = false;
            const prefill = data?.prefill;

            if (prefill) {
                const lot = s.pendingLotToBeAdded;

                if (!lot?.dimension_id && prefill.dimension_id) {
                    s.editPendingLot("dimension_id", String(prefill.dimension_id));
                    prefilled = true;
                }
                if (!lot?.box_count && prefill.box_count) {
                    s.editPendingLot("box_count", String(prefill.box_count));
                    prefilled = true;
                }
                if (prefilled) {
                    skipKey.current = keyOfLot(useLotStore.getState().pendingLotToBeAdded);
                }
            }

            const slots = Array.isArray(data?.slots) ? data.slots : [];

            s.setRecommendation({
                status: slots.length ? "ready" : "none",
                id: data?.id ?? null,
                slots,
                reason: slots.length ? null : (data?.reason ?? null),
                prefilled,
            });
        };

        const debounce = setTimeout(async () => {
            timeout = setTimeout(() => {
                timedOut = true;
                controller.abort();
            }, REQUEST_TIMEOUT_MS);

            console.log("trigger debounce recommendation");
            
            try {
                const response = await fetch(route("lot-upstream.recommend"), {
                    method: "POST",
                    signal: controller.signal,
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                        "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.content,
                    },
                    body: JSON.stringify({
                        lot_id: trimmedLot,
                        partname: String(partname).trim() || null,
                        box_count: Number(boxCount) || null,
                        dimension_id: Number(dimensionId) || null,
                        rack_page_id: rackPageId,
                    }),
                });

                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const data = await response.json();

                if (controller.signal.aborted) { 
                    console.log("ABORTED ---- BEFORE APPLY");
                    return;
                }; // the lot changed while we waited
                console.log("BEFORE APPLY");
                
                apply(data);
            } catch (error) {
                console.log("catch error on APPLY");
                // Aborted because the lot changed: not our answer any more. Anything else, including our
                // own timeout, fails open with the neutral line.
                if (controller.signal.aborted && !timedOut) return;

                useLotStore.getState().setRecommendation({ status: "none", reason: "error" });
            } finally {
                clearTimeout(timeout);
            }
        }, DEBOUNCE_MS);

        return () => {
            clearTimeout(debounce);
            clearTimeout(timeout);
            controller.abort();
        };
    }, [active, lotId, partname, dimensionId, boxCount, rackPageId]);
}