import { useId, useRef } from "react";

function StatusBadge({ overCapacity }) {
    return overCapacity ? (
        <span className="badge badge-warning gap-1">Needs review</span>
    ) : (
        <span className="badge badge-success gap-1">Saved</span>
    );
}

function FlagBadge({ flag }) {
    if (!flag) return null;
    const colorByFlag = {
        over_capacity: "badge-warning",
        manual_review: "badge-warning",
        dedicated_conflict: "badge-error",
    };
    const cls = colorByFlag[flag] ?? "badge-neutral";
    return (
        <span className={`badge badge-outline ${cls}`}>
            {flag.replace(/_/g, " ")}
        </span>
    );
}

export const DISSEMINATION_MODAL_ID = `dissemination-modal-${crypto.randomUUID()}`;

export default function DisseminationSummaryModal({
    summary,
    triggerLabel = "View Dissemination Summary",
}) {
    const modalId = useId();
    const dialogRef = useRef(null);

    if (!summary) return null;

    const {
        date,
        auto_dissemination_saved: saved,
        auto_dissemination_error: error,
        machines = [],
        unplaced = [],
        summary: totals = { total_lots: 0, saved: 0 },
    } = summary;

    return (
        <dialog id={DISSEMINATION_MODAL_ID} className="modal" ref={dialogRef}>
            <div className="modal-box max-w-4xl">
                <form method="dialog">
                    <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
                        ✕
                    </button>
                </form>

                <h3 className="font-bold text-lg">
                    Dissemination Summary{date ? ` — ${date}` : ""}
                </h3>

                {!saved && (
                    <div className="alert alert-error mt-4">
                        <span>
                            Auto-dissemination failed to save.
                            {error
                                ? ` ${error}`
                                : " Results below were computed but not persisted."}
                        </span>
                    </div>
                )}

                <div className="stats shadow mt-4 w-full">
                    <div className="stat">
                        <div className="stat-title">Total Lots</div>
                        <div className="stat-value text-2xl">
                            {totals.total_lots}
                        </div>
                    </div>
                    <div className="stat">
                        <div className="stat-title">Saved</div>
                        <div className="stat-value text-2xl">
                            {totals.saved}
                        </div>
                    </div>
                    <div className="stat">
                        <div className="stat-title">Unplaced</div>
                        <div className="stat-value text-2xl">
                            {unplaced.length}
                        </div>
                    </div>
                </div>

                <div className="divider">Machines</div>

                {machines.length === 0 ? (
                    <p className="text-sm opacity-70">
                        No machine assignments to show.
                    </p>
                ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                        {machines.map((m) => (
                            <div
                                key={m.machine_id}
                                className="border border-base-300 rounded-box p-3"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-semibold">
                                        {m.machine_code}
                                    </span>
                                    <span className="text-sm opacity-70">
                                        {m.remaining_capacity} /{" "}
                                        {m.starting_capacity} open
                                    </span>
                                </div>

                                {m.lots.length === 0 ? (
                                    <p className="text-xs opacity-60">
                                        No lots assigned.
                                    </p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="table table-sm">
                                            <thead>
                                                <tr>
                                                    <th>Lot</th>
                                                    <th>Qty</th>
                                                    <th>Status</th>
                                                    <th>Flag</th>
                                                    <th>Reason</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {m.lots.map((lot) => (
                                                    <tr key={lot.lot_id}>
                                                        <td>{lot.lot_id}</td>
                                                        <td>
                                                            {lot.qty ?? "—"}
                                                        </td>
                                                        <td>
                                                            <StatusBadge
                                                                overCapacity={
                                                                    !!lot.flag
                                                                }
                                                            />
                                                        </td>
                                                        <td>
                                                            <FlagBadge
                                                                flag={lot.flag}
                                                            />
                                                        </td>
                                                        <td className="text-xs opacity-70">
                                                            {lot.reason}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <div className="divider">Unplaced Lots</div>

                {unplaced.length === 0 ? (
                    <p className="text-sm opacity-70">All lots were placed.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table table-sm">
                            <thead>
                                <tr>
                                    <th>Lot</th>
                                    <th>Qty</th>
                                    <th>Reason</th>
                                </tr>
                            </thead>
                            <tbody>
                                {unplaced.map((u) => (
                                    <tr key={u.lot_id}>
                                        <td>{u.lot_id}</td>
                                        <td>{u.qty ?? "—"}</td>
                                        <td className="text-xs opacity-70">
                                            {u.message}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="modal-action">
                    <form method="dialog">
                        <button className="btn">Close</button>
                    </form>
                </div>
            </div>

            <form method="dialog" className="modal-backdrop">
                <button>close</button>
            </form>
        </dialog>
    );
}
