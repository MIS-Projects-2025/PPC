import { router } from "@inertiajs/react";
import clsx from "clsx";
import { useState } from "react";

export const SCHEDULER_MODAL_ID = "scheduler_run_modal";

const STATUS_DOT = { ok: "bg-success", error: "bg-error" };

function runSummary(run) {
    if (run.status === "ok") return `${run.assigned_count}/${run.pickup_count} assigned`;
    if (run.status === "skipped") return "nothing to schedule";
    return "failed";
}

/** Runs the scheduler and lists recent runs (`history` is a Deferred prop: undefined while loading). */
export default function SchedulerModal({ date, location, history, beginWrite, holdLock }) {
    const [isRunning, setIsRunning] = useState(false);

    const run = () => {
        if (!beginWrite()) return;
        const release = holdLock();
        setIsRunning(true);

        router.post(
            "/loading-plan/run-scheduler",
            { date, location },
            {
                preserveScroll: true,
                onFinish: () => {
                    release();
                    setIsRunning(false);
                },
            },
        );
    };

    return (
        <dialog id={SCHEDULER_MODAL_ID} className="modal">
            <div className="modal-box bg-base-300 max-h-[80vh] flex flex-col">
                <h3 className="font-bold text-lg mb-2">Scheduler</h3>

                <button className="btn btn-sm btn-primary mb-4 self-start" disabled={isRunning} onClick={run}>
                    {isRunning ? "Running…" : "Run Scheduler"}
                </button>

                <h4 className="font-semibold text-sm mb-2 text-base-content/70">Recent runs</h4>
                <div className="flex flex-col gap-1 overflow-y-auto pr-1">
                    {history === undefined ? (
                        <span className="text-sm text-base-content/50">Loading…</span>
                    ) : history.length === 0 ? (
                        <span className="text-sm text-base-content/50">No runs yet.</span>
                    ) : (
                        history.map((r) => (
                            <div
                                key={r.id}
                                className="flex items-center justify-between gap-3 py-1 text-sm border-b border-base-content/10 last:border-0"
                            >
                                <span className="flex items-center gap-1.5">
                                    <span className={clsx("w-1.5 h-1.5 rounded-full shrink-0", STATUS_DOT[r.status] ?? "bg-warning")} />
                                    {r.user?.name ?? "System"}
                                </span>
                                <span className="text-base-content/60">{runSummary(r)}</span>
                                <span className="text-base-content/40 text-xs">
                                    at {new Date(r.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                            </div>
                        ))
                    )}
                </div>

                <div className="modal-action">
                    <form method="dialog"><button className="btn btn-ghost btn-sm">Close</button></form>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop"><button>close</button></form>
        </dialog>
    );
}