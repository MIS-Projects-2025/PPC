import { LOT_UPSTREAM_MODES } from "@/Constants/lotUpstreamModes";
import { toQty } from "@/Hooks/useLotActions";
import { useLotStore } from "@/Store/useLotStore";
import { useEffect } from "react";

const MIN_LOT_ID_LENGTH = 4; // same floor as the scanner's MIN_SCAN_LENGTH
const DEBOUNCE_MS = 400; // every request writes a recommendation log row, so don't fire per keystroke

/**
 * Once lot_id is filled (scan or manual entry) it asks the server for the
 * read-only source match and the group recommendation in one call.
 *
 * Keyed on lot_id only. Part name and qty are compared against the source live in SourceMatchPanel,
 * so typing them does not trigger another request. Fail-open: any problem just clears the panel.
 */
export default function useLotMatch({ rackPageId }) {
    const lotId = useLotStore((s) => s.pendingLotToBeAdded?.lot_id?.trim() ?? "");
    const mode = useLotStore((s) => s.mode);
    const isEditMode = useLotStore((s) => s.isEditMode);
    const refreshKey = useLotStore((s) => s.matchRefreshKey);

    useEffect(() => {
        const s = useLotStore.getState();

        // Whatever the previous lot left behind (its joined slot list, its recommendation) must not leak into this lot.
        if (s.recommendation.joins) s.clearSlotPendingLot();
        s.clearRecommendation();

        if (mode === LOT_UPSTREAM_MODES.RELEASE || lotId.length < MIN_LOT_ID_LENGTH) {
            s.clearMatch();
            s.clearRecommendation();
            return undefined;
        }

        const controller = new AbortController();

        const timer = setTimeout(async () => {
            const store = useLotStore.getState();
            const form = store.pendingLotToBeAdded ?? {};
            const editing = store.isEditMode;

            store.setMatchLoading();

            try {
                const res = await fetch(route("lot-upstream.match"), {
                    method: "POST",
                    signal: controller.signal,
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.content,
                    },
                    body: JSON.stringify({
                        lot_id: lotId,
                        partname: form.partname?.trim() || null,
                        qty: toQty(form.qty),
                        rack_page_id: rackPageId,
                        recommend: !editing, // editing a staged lot needs the match panel, not a new recommendation
                    }),
                });

                if (!res.ok) throw new Error(`match failed (${res.status})`);

                const data = await res.json();

                // A newer request (or a cleared form) already took over: drop this answer.
                if (controller.signal.aborted) return;

                const live = useLotStore.getState();

                live.setMatch(data.match ?? null, data.warnings ?? []);

                const rec = data.recommendation;
                if (!rec) {
                    live.clearRecommendation();
                    return;
                }

                // A box set that is already in the rack: the lot goes to the same slots. Not a recommendation,
                // so the status stays "hidden" (no grid highlight) and the slots are applied directly.
                const joins = !!rec.joins && !live.isEditMode;

                live.setRecommendation({
                    status: joins || rec.reason === "disabled" ? "hidden" : rec.slots?.length ? "ready" : "none",
                    id: rec.id ?? null,
                    slots: rec.slots ?? [],
                    reason: rec.reason ?? null,
                    joins,
                    plan: rec.plan ?? [],
                });

                if (joins) {
                    live.setSlotPendingLot(
                        (rec.slots ?? []).map((x) => live.slots?.[x.slot_id]).filter(Boolean),
                    );
                }
            } catch (error) {
                if (error?.name === "AbortError") return;
                console.error(error);
                const live = useLotStore.getState();
                live.clearMatch();
                live.clearRecommendation();
            }
        }, DEBOUNCE_MS);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [lotId, mode, isEditMode, refreshKey, rackPageId]);
}