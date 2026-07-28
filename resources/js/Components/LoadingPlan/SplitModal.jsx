import { forwardRef, useEffect, useMemo, useState } from "react";
import { FaArrowRight } from "react-icons/fa6";
import MachineSelectionGrid from "./MachineSelectionGrid";

/** Splits "BC29999.2" into { root: "BC29999", suffix: 2 }.
 *  A lot with no decimal suffix is treated as suffix 1 (matches backend's
 *  "root itself counts as .1" convention in nextChildLotId). */
function parseLotId(lotId) {
    const match = /^(.*)\.(\d+)$/.exec(lotId ?? "");
    if (match) return { root: match[1], suffix: parseInt(match[2], 10) };
    return { root: lotId ?? "", suffix: 1 };
}

function nextAvailableSuffix(start, taken) {
    let n = start;
    while (taken.has(n)) n++;
    return n;
}

function suggestedSuffixes(fromSuffix, taken, count = 4) {
    const result = [];
    let candidate = fromSuffix;
    while (result.length < count) {
        if (!taken.has(candidate)) result.push(candidate);
        candidate++;
    }
    return result;
}

function clamp(n, min, max) {
    return Math.min(Math.max(n, min), max);
}

const SplitModal = forwardRef(function SplitModal(
    {
        parentLotId,
        totalQty = 10000,
        takenSuffixes = [],
        machines = [],
        machinePlatform = new Map(),
        onConfirm,
        onClose,
    },
    ref,
) {
    const { root, suffix: parentSuffix } = useMemo(
        () => parseLotId(parentLotId),
        [parentLotId],
    );

    const taken = useMemo(() => new Set(takenSuffixes), [takenSuffixes]);
    const defaultSuffix = useMemo(
        () => nextAvailableSuffix(parentSuffix + 1, taken),
        [parentSuffix, taken],
    );
    const suggestions = useMemo(
        () => suggestedSuffixes(parentSuffix + 1, taken, 4),
        [parentSuffix, taken],
    );

    const [childSuffix, setChildSuffix] = useState(defaultSuffix);
    // The currently selected target machine for this split — highlighted in
    // the shared MachineSelectionGrid below.
    const [targetMachine, setTargetMachine] = useState(null);

    useEffect(() => setChildSuffix(defaultSuffix), [defaultSuffix]);

    const [childQty, setChildQty] = useState(() => Math.round(totalQty / 2));
    const parentQty = totalQty - childQty;
    const percentage = (childQty / totalQty) * 100; // exact, unrounded — just for display

    const setFromChildQty = (qty) => {
        setChildQty(clamp(Math.round(qty), 1, totalQty - 1));
    };

    const setFromParentQty = (qty) => {
        const q = clamp(Math.round(qty), 1, totalQty - 1);
        setChildQty(totalQty - q);
    };

    const setFromPercentage = (pct) => {
        const clampedPct = clamp(pct, 1, 99);
        setChildQty(
            clamp(Math.round((totalQty * clampedPct) / 100), 1, totalQty - 1),
        );
    };

    const childLotId = `${root}.${childSuffix}`;
    const isChildIdTaken = taken.has(childSuffix);
    const isValidQty = childQty >= 1 && parentQty >= 1;
    const canConfirm = isValidQty && !isChildIdTaken && !!targetMachine;

    const handleConfirm = () => {
        if (!canConfirm) return;
        onConfirm({
            childLotId,
            childQty,
            parentQty,
            percentage,
            targetMachine,
        });
        ref.current?.close();
    };

    return (
        <dialog ref={ref} id="split_modal" className="modal">
            <div className="modal-box bg-base-300 w-11/12 max-w-2xl max-h-[85vh] flex flex-col">
                <h3 className="font-bold text-lg mb-1">Split Lot</h3>
                <p className="text-xs text-base-content/50 mb-5">
                    Splitting{" "}
                    <span className="font-mono text-base-content/80">
                        {parentLotId}
                    </span>{" "}
                    &middot; {totalQty.toLocaleString()} units total
                </p>

                <div className="overflow-y-auto flex-1 space-y-6 px-0.5">
                    {/* --- Parent / Child qty cards with arrow --- */}
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                        <div className="rounded-xl bg-base-100 border border-base-content/10 p-3">
                            <div className="text-[10px] font-semibold text-base-content/40 uppercase tracking-wide mb-1">
                                Parent stays
                            </div>
                            <div className="font-mono text-xs text-base-content/60 mb-2">
                                {parentLotId}
                            </div>
                            <input
                                type="number"
                                min={1}
                                max={totalQty - 1}
                                value={parentQty}
                                onChange={(e) =>
                                    setFromParentQty(Number(e.target.value))
                                }
                                className="input input-sm input-bordered w-full text-lg font-semibold text-center"
                            />
                        </div>

                        <FaArrowRight
                            size={22}
                            className="text-base-content/30 shrink-0"
                        />

                        <div className="rounded-xl bg-base-100 border border-primary/30 p-3">
                            <div className="text-[10px] font-semibold text-primary/70 uppercase tracking-wide mb-1">
                                Child receives
                            </div>
                            <div className="font-mono text-xs text-base-content/60 mb-2">
                                {childLotId}
                            </div>
                            <input
                                type="number"
                                min={1}
                                max={totalQty - 1}
                                value={childQty}
                                onChange={(e) =>
                                    setFromChildQty(Number(e.target.value))
                                }
                                className="input input-sm input-bordered input-primary w-full text-lg font-semibold text-center"
                            />
                        </div>
                    </div>

                    {!isValidQty && (
                        <p className="text-error text-xs -mt-3">
                            Both parent and child must receive at least 1 unit.
                        </p>
                    )}

                    {/* --- Percentage slider --- */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-semibold text-base-content/40 uppercase tracking-wide">
                                Split ratio
                            </span>
                            <div className="flex items-center gap-1">
                                <input
                                    type="number"
                                    min={1}
                                    max={99}
                                    step={0.1}
                                    value={Math.round(percentage * 10) / 10} // display rounded to 1 decimal
                                    onChange={(e) =>
                                        setFromPercentage(
                                            Number(e.target.value),
                                        )
                                    }
                                    className="input input-sm input-bordered w-14 text-center"
                                />
                                <span className="text-xs text-base-content/50">
                                    % to child
                                </span>
                            </div>
                        </div>

                        <div className="w-11/12 mx-auto relative pt-4">
                            <div
                                className="absolute -top-2 -translate-x-1/2 transition-all"
                                style={{ left: `${percentage}%` }}
                            >
                                <div className="badge badge-primary badge-sm font-mono">
                                    {percentage.toFixed(1)}%
                                </div>
                            </div>
                            <input
                                type="range"
                                min={1}
                                max={99}
                                value={percentage}
                                onChange={(e) =>
                                    setFromPercentage(Number(e.target.value))
                                }
                                className="range range-primary w-full cursor-pointer"
                            />
                            <div className="flex justify-between text-[10px] text-base-content/30 mt-1 px-0.5">
                                <span>1%</span>
                                <span>50%</span>
                                <span>99%</span>
                            </div>
                        </div>
                    </div>

                    {/* --- Child lot id --- */}
                    <div>
                        <div className="text-[10px] font-semibold text-base-content/40 uppercase tracking-wide mb-1.5">
                            Child lot ID
                        </div>
                        <div className="flex items-center gap-1.5 mb-2">
                            <span className="font-mono text-sm text-base-content/50 bg-base-100 border border-base-content/10 rounded-lg px-3 py-1.5">
                                {root}.
                            </span>
                            <input
                                type="number"
                                min={1}
                                value={childSuffix}
                                onChange={(e) =>
                                    setChildSuffix(
                                        clamp(
                                            Number(e.target.value) || 1,
                                            1,
                                            9999,
                                        ),
                                    )
                                }
                                className={`input input-sm input-bordered w-20 font-mono ${
                                    isChildIdTaken ? "input-error" : ""
                                }`}
                            />
                            {isChildIdTaken && (
                                <span className="text-error text-xs">
                                    already used
                                </span>
                            )}
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                            {suggestions.map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setChildSuffix(s)}
                                    className={`btn btn-xs font-mono cursor-pointer ${
                                        childSuffix === s
                                            ? "btn-primary"
                                            : "btn-ghost bg-base-content/5"
                                    }`}
                                >
                                    .{s}
                                    {s === defaultSuffix && (
                                        <span className="opacity-60 ml-1">
                                            suggested
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* --- Target machine --- */}
                    <div>
                        <div className="text-[10px] font-semibold text-base-content/40 uppercase tracking-wide mb-1.5">
                            Send child to
                        </div>
                        <MachineSelectionGrid
                            machines={machines}
                            machinePlatform={machinePlatform}
                            selectedMachine={targetMachine}
                            onSelect={setTargetMachine}
                            searchPlaceholder="Search machine…"
                        />
                    </div>
                </div>

                <div className="modal-action mt-4">
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
                        Split lot
                    </button>
                </div>
            </div>

            <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>
        </dialog>
    );
});

export default SplitModal;
