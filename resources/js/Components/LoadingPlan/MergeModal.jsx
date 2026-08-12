import { forwardRef, useMemo } from "react";
import { FaArrowRight } from "react-icons/fa6";
import { GoGitMerge } from "react-icons/go";

/** Larger qty is target/absorber, smaller is source/absorbed — mirrors the
 *  backend's merge() logic (equal qty → lotA wins arbitrarily). */
function resolveTargetSource(lotA, lotB) {
    if (!lotA || !lotB) return { target: null, source: null };
    return (lotA.Qty ?? 0) >= (lotB.Qty ?? 0)
        ? { target: lotA, source: lotB }
        : { target: lotB, source: lotA };
}

const MergeModal = forwardRef(function MergeModal(
    { lotA, lotB, onConfirm, onClose },
    ref,
) {
    const { target, source } = useMemo(
        () => resolveTargetSource(lotA, lotB),
        [lotA, lotB],
    );

    const canConfirm = !!target && !!source;
    const targetQty = target?.Qty ?? 0;
    const sourceQty = source?.Qty ?? 0;
    const mergedQty = targetQty + sourceQty;

    const handleConfirm = () => {
        if (!canConfirm) return;
        onConfirm({
            targetLotId: target.Lot_Id,
            sourceLotId: source.Lot_Id,
        });
        ref.current?.close();
    };

    return (
        <dialog ref={ref} id="merge_modal" className="modal">
            <div className="modal-box bg-base-300 w-11/12 max-w-lg">
                <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                    <GoGitMerge size={18} /> Merge Lots
                </h3>
                <p className="text-xs text-base-content/50 mb-5">
                    The lot with the larger quantity absorbs the smaller one.
                </p>

                {canConfirm ? (
                    <div className="space-y-3">
                        {/* Source — shrinks to 0 */}
                        <div className="rounded-xl bg-base-100 border border-base-content/10 p-3">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-[10px] font-semibold text-base-content/40 uppercase tracking-wide">
                                    Source &middot; absorbed
                                </div>
                                <div className="font-mono text-sm text-base-content/80">
                                    {source.Lot_Id}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 text-center">
                                    <div className="text-[10px] text-base-content/40 uppercase tracking-wide mb-0.5">
                                        Before
                                    </div>
                                    <div className="text-lg font-semibold">
                                        {sourceQty.toLocaleString()}
                                    </div>
                                </div>
                                <FaArrowRight className="text-base-content/30 shrink-0" />
                                <div className="flex-1 text-center">
                                    <div className="text-[10px] text-base-content/40 uppercase tracking-wide mb-0.5">
                                        After
                                    </div>
                                    <div className="text-lg font-semibold text-error">
                                        0
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Target — grows to merged total */}
                        <div className="rounded-xl bg-base-100 border border-primary/30 p-3">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-[10px] font-semibold text-primary/70 uppercase tracking-wide">
                                    Target &middot; result
                                </div>
                                <div className="font-mono text-sm text-base-content/80">
                                    {target.Lot_Id}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 text-center">
                                    <div className="text-[10px] text-base-content/40 uppercase tracking-wide mb-0.5">
                                        Before
                                    </div>
                                    <div className="text-lg font-semibold">
                                        {targetQty.toLocaleString()}
                                    </div>
                                </div>
                                <FaArrowRight className="text-primary/50 shrink-0" />
                                <div className="flex-1 text-center">
                                    <div className="text-[10px] text-base-content/40 uppercase tracking-wide mb-0.5">
                                        After
                                    </div>
                                    <div className="text-lg font-semibold text-primary">
                                        {mergedQty.toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <p className="text-error text-xs">
                        Select exactly two lots to merge.
                    </p>
                )}

                <div className="modal-action mt-6">
                    <button
                        className="btn btn-ghost cursor-pointer"
                        onClick={onClose}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={!canConfirm}
                        onClick={handleConfirm}
                        className="btn btn-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Merge lots
                    </button>
                </div>
            </div>

            <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>
        </dialog>
    );
});

export default MergeModal;
