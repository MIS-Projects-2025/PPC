import { forwardRef } from "react";
import { GoGitMerge } from "react-icons/go";

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

const MergeHistoryModal = forwardRef(function MergeHistoryModal(
    { loading, history, onClose, onRevert, currentLotId, isTarget, isSource },
    ref,
) {
    return (
        <dialog ref={ref} id="merge_history_modal" className="modal">
            <div className="modal-box bg-base-300 w-11/12 max-w-2xl max-h-[80vh] flex flex-col">
                <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                    <GoGitMerge size={16} className="text-base-content/50" />
                    Merge History
                </h3>
                <p className="text-xs text-base-content/50 mb-4">
                    Every merge event for this lot, across all dates.
                </p>

                <div className="overflow-y-auto flex-1">
                    {loading && (
                        <div className="flex justify-center py-10">
                            <span className="loading loading-spinner loading-md text-base-content/40" />
                        </div>
                    )}

                    {!loading && (!history || history.length === 0) && (
                        <div className="text-center text-xs text-base-content/40 py-10">
                            No merge history found.
                        </div>
                    )}

                    {!loading && history && history.length > 0 && (
                        <div className="space-y-3">
                            {history.map((merge) => {
                                const isCurrentTarget =
                                    currentLotId &&
                                    merge.targetLotId === currentLotId;
                                const isCurrentSource =
                                    currentLotId &&
                                    merge.sourceLotId === currentLotId;

                                return (
                                    <div
                                        key={merge.mergeId}
                                        className={`rounded-xl border p-3 ${
                                            merge.revertedAt
                                                ? "border-base-content/10 bg-base-100/50 opacity-60"
                                                : "border-base-content/10 bg-base-100"
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="font-mono text-secondary">
                                                    {merge.sourceLotId}
                                                </span>
                                                <GoGitMerge
                                                    size={12}
                                                    className="text-base-content/30"
                                                />
                                                <span className="font-mono">
                                                    {merge.targetLotId}
                                                </span>
                                            </div>

                                            {merge.revertedAt && (
                                                <span className="badge badge-ghost badge-sm">
                                                    Reverted
                                                </span>
                                            )}

                                            {!merge.revertedAt && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        onRevert({
                                                            mergeId:
                                                                merge.mergeId,
                                                            revertedBy: null, //TODO: whoever is logged in / performing this action
                                                            targetLotId:
                                                                merge.targetLotId,
                                                            sourceLotId:
                                                                merge.sourceLotId,
                                                        });
                                                    }}
                                                    className="btn btn-xs btn-error btn-outline mt-2"
                                                >
                                                    Revert this merge
                                                </button>
                                            )}
                                        </div>

                                        {(isTarget || isSource) && (
                                            <div className="mb-2">
                                                {isCurrentTarget && (
                                                    <span className="badge badge-sm badge-primary badge-outline font-mono">
                                                        This lot is TARGET,
                                                        absorbed{" "}
                                                        {merge.sourceLotId}
                                                    </span>
                                                )}
                                                {isCurrentSource && (
                                                    <span className="badge badge-sm badge-secondary badge-outline font-mono">
                                                        This lot is SOURCE,
                                                        merged into{" "}
                                                        {merge.targetLotId}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-base-content/60">
                                            <div>
                                                <span className="text-base-content/40">
                                                    Merged on
                                                </span>{" "}
                                                {formatDate(
                                                    merge.scheduledDate,
                                                )}
                                            </div>
                                            <div>
                                                <span className="text-base-content/40">
                                                    Qty transferred
                                                </span>{" "}
                                                {merge.transferredQty.toLocaleString()}{" "}
                                                units
                                            </div>
                                            <div>
                                                <span className="text-base-content/40">
                                                    By
                                                </span>{" "}
                                                {merge.createdBy ?? "—"}
                                            </div>
                                            <div>
                                                <span className="text-base-content/40">
                                                    At
                                                </span>{" "}
                                                {formatDateTime(
                                                    merge.createdAt,
                                                )}
                                            </div>
                                        </div>

                                        {merge.revertedAt && (
                                            <div className="mt-2 pt-2 border-t border-base-content/10 text-xs text-base-content/40">
                                                Reverted{" "}
                                                {formatDateTime(
                                                    merge.revertedAt,
                                                )}
                                                {merge.revertedBy
                                                    ? ` by ${merge.revertedBy}`
                                                    : ""}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
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

export default MergeHistoryModal;
