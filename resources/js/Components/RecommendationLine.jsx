import { useLotStore } from "@/Store/useLotStore";
import clsx from "clsx";
import { useState } from "react";

// Operators only ever see these when they open the detail. Keep the wording neutral.
const REASON_TEXT = {
    unknown_dimension: "Box size is not set. Pick a size to get a recommendation.",
    unknown_box_count: "Box count is not set. Enter it to get a recommendation.",
    tub_or_untracked: "No slot on this rack page can be recommended.",
    no_fit: "No slot has room for this lot.",
    already_staged: "This lot is already staged.",
    error: "The recommendation was not available.",
};

/**
 * "Recommended: A02 (4 boxes), A03 (2 boxes)" under the lot fields, or a neutral
 * "No recommendation, choose a slot". Reserves its height while loading so the form below
 * does not jump. Renders nothing when the feature is off, in edit mode, or before a lot is scanned.
 */
export default function RecommendationLine({ enabled }) {
    const recommendation = useLotStore((s) => s.recommendation);
    const lotId = useLotStore((s) => s.pendingLotToBeAdded?.lot_id ?? "");
    const [showWhy, setShowWhy] = useState(false);

    if (!enabled || !String(lotId).trim() || recommendation.status === "hidden") {
        return null;
    }

    const { status, slots, reason, prefilled } = recommendation;

    return (
        <div className="min-h-9 py-1 text-[12px]" aria-live="polite">
            {prefilled && (
                <div className="text-[10px] opacity-60 mb-0.5">
                    Box count and size were filled from the last stocking. Check them.
                </div>
            )}

            {status === "ready" && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="font-bold">Recommended:</span>
                    {slots.map((slot, i) => (
                        <span
                            key={slot.slot_id}
                            className="inline-flex items-center gap-1 rounded border border-info/60 bg-info/10 px-1.5 py-0.5 font-mono"
                            title={
                                slot.unverified
                                    ? "Free only if the lots presumed released are really gone"
                                    : undefined
                            }
                        >
                            {slots.length > 1 && <span className="font-black text-info">{i + 1}</span>}
                            <span className="font-bold">{slot.label}</span>
                            <span className="opacity-70">
                                ({slot.boxes} {slot.boxes === 1 ? "box" : "boxes"})
                            </span>
                            {slot.unverified && (
                                <span className="text-[9px] italic opacity-70">unverified</span>
                            )}
                        </span>
                    ))}
                </div>
            )}

            {status === "none" && (
                <div className="opacity-70">
                    No recommendation, choose a slot{" "}
                    {reason && (
                        <button
                            type="button"
                            data-no-scanner
                            className="underline text-[10px] opacity-70 hover:opacity-100"
                            onClick={(e) => {
                                setShowWhy((v) => !v);
                                e.currentTarget.blur();
                            }}
                        >
                            {showWhy ? "hide" : "why?"}
                        </button>
                    )}
                    {showWhy && reason && (
                        <div className={clsx("text-[10px] mt-0.5")}>{REASON_TEXT[reason] ?? REASON_TEXT.error}</div>
                    )}
                </div>
            )}
        </div>
    );
}