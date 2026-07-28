import { forwardRef } from "react";
import { GoRepoForked } from "react-icons/go";

function formatDate(dateStr) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function formatDateTime(dateStr) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

const SplitHistoryModal = forwardRef(function SplitHistoryModal(
    { loading, history, onClose },
    ref,
) {
    return (
        <dialog ref={ref} id="split_history_modal" className="modal">
            <div className="modal-box bg-base-300 w-11/12 max-w-2xl max-h-[80vh] flex flex-col">
                <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                    <GoRepoForked size={16} className="text-base-content/50" />
                    Split History
                </h3>
                <p className="text-xs text-base-content/50 mb-4">
                    Every split event for this lot's family, across all dates.
                </p>

                <div className="overflow-y-auto flex-1">
                    {loading && (
                        <div className="flex justify-center py-10">
                            <span className="loading loading-spinner loading-md text-base-content/40" />
                        </div>
                    )}

                    {!loading && (!history || history.length === 0) && (
                        <div className="text-center text-xs text-base-content/40 py-10">
                            No split history found.
                        </div>
                    )}

                    {!loading && history && history.length > 0 && (
                        <div className="space-y-3">
                            {history.map((split) => (
                                <div
                                    key={split.splitId}
                                    className={`rounded-xl border p-3 ${
                                        split.revertedAt
                                            ? "border-base-content/10 bg-base-100/50 opacity-60"
                                            : "border-base-content/10 bg-base-100"
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="font-mono">
                                                {split.parentLotId}
                                            </span>
                                            <GoRepoForked
                                                size={12}
                                                className="text-base-content/30"
                                            />
                                            <span className="font-mono text-primary">
                                                {split.childLotId}
                                            </span>
                                        </div>
                                        {split.revertedAt && (
                                            <span className="badge badge-ghost badge-sm">
                                                Reverted
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-base-content/60">
                                        <div>
                                            <span className="text-base-content/40">
                                                Split on
                                            </span>{" "}
                                            {formatDate(split.scheduledDate)}
                                        </div>
                                        <div>
                                            <span className="text-base-content/40">
                                                Ratio
                                            </span>{" "}
                                            {split.percent}% (
                                            {split.childQty.toLocaleString()}{" "}
                                            units)
                                        </div>
                                        <div>
                                            <span className="text-base-content/40">
                                                By
                                            </span>{" "}
                                            {split.createdBy ?? "—"}
                                        </div>
                                        <div>
                                            <span className="text-base-content/40">
                                                At
                                            </span>{" "}
                                            {formatDateTime(split.createdAt)}
                                        </div>
                                    </div>

                                    {split.childAppearances?.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-base-content/10">
                                            <div className="text-[10px] font-semibold text-base-content/40 uppercase tracking-wide mb-1">
                                                {split.childLotId} appeared on
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {split.childAppearances.map(
                                                    (a, i) => (
                                                        <span
                                                            key={i}
                                                            className="badge badge-sm badge-ghost font-mono"
                                                        >
                                                            {formatDate(a.date)}{" "}
                                                            ·{" "}
                                                            {a.machine ??
                                                                "Unassigned"}
                                                        </span>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {split.revertedAt && (
                                        <div className="mt-2 pt-2 border-t border-base-content/10 text-xs text-base-content/40">
                                            Reverted{" "}
                                            {formatDateTime(split.revertedAt)}
                                            {split.revertedBy
                                                ? ` by ${split.revertedBy}`
                                                : ""}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="modal-action mt-4">
                    <form method="dialog">
                        <button className="btn" onClick={onClose}>
                            Close
                        </button>
                    </form>
                </div>
            </div>

            <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>
        </dialog>
    );
});

export default SplitHistoryModal;
