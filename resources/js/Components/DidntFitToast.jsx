import clsx from "clsx";
import { useState } from "react";
import { toast } from "react-hot-toast";

const VISIBLE_MS = 6000;

function DidntFitToast({ t, recommendationId, labels }) {
    const [state, setState] = useState("idle"); // idle | sending | done

    const send = async () => {
        if (state !== "idle") return;
        setState("sending");

        try {
            const response = await fetch(
                route("lot-upstream.recommendation.didnt-fit", { id: recommendationId }),
                {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                        "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]')?.content,
                    },
                },
            );

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            setState("done");
            setTimeout(() => toast.dismiss(t.id), 1200);
        } catch {
            // Optional feedback: a failure is not worth the operator's attention.
            toast.dismiss(t.id);
        }
    };

    return (
        <div
            className={clsx(
                "z-9999 alert shadow-lg rounded-lg w-fit max-w-sm text-sm transition-all duration-300",
                t.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
            )}
        >
            <span className="flex-1">
                {state === "done"
                    ? "Logged. Thanks."
                    : `Recommended ${labels.join(", ")} was full?`}
            </span>
            {state !== "done" && (
                <button
                    type="button"
                    className="btn btn-sm"
                    disabled={state === "sending"}
                    onClick={send}
                >
                    Didn't fit
                </button>
            )}
        </div>
    );
}

export function showDidntFitToast({ recommendationId, labels = [] }) {
    if (!recommendationId || labels.length === 0) return;

    toast.custom(
        (t) => <DidntFitToast t={t} recommendationId={recommendationId} labels={labels} />,
        { duration: VISIBLE_MS, position: "top-left" },
    );
}

export default DidntFitToast;