import { forwardRef, useImperativeHandle, useRef, useState } from "react";

export const AUTO_SORT_MODAL_ID = "auto_sort_modal";

/**
 * Confirmation for auto-sorting one machine. Open with ref.current.open(machine).
 * `onConfirm(machine)` must resolve to true on success (the modal then closes).
 */
const AutoSortModal = forwardRef(function AutoSortModal({ disabled, onConfirm }, ref) {
    const dialogRef = useRef(null);
    const [machine, setMachine] = useState(null);

    useImperativeHandle(ref, () => ({
        open(m) {
            setMachine(m);
            dialogRef.current?.showModal();
        },
    }));

    const handleConfirm = async () => {
        const ok = await onConfirm(machine);
        if (ok) dialogRef.current?.close();
    };

    return (
        <dialog ref={dialogRef} id={AUTO_SORT_MODAL_ID} className="modal">
            <div className="modal-box bg-base-300 max-w-lg">
                <h3 className="font-bold text-lg mb-1">Auto Sort{machine ? ` ${machine}` : ""}?</h3>
                <p className="text-sm opacity-70 mb-4">
                    Lots on this machine will be reordered automatically. Review the rules below before continuing.
                </p>

                <div className="space-y-3 text-sm">
                    <div>
                        <div className="font-semibold mb-1">Running lots go first</div>
                        <p className="opacity-90">
                            Lots running at <span className="font-mono">GTREEL_T</span> (status RUN) stay at the top of their section, even above RES lots.
                        </p>
                    </div>

                    <div>
                        <div className="font-semibold mb-1">1. Blocks are trusted as correct</div>
                        <p className="opacity-90">
                            Blocks (setup / conversion / etc.) are assumed to already be in the right place and never move.
                            The lots between two blocks are assumed to run back-to-back without needing any setup or
                            conversion, so they are sorted only within that section and never cross a block.
                        </p>
                    </div>

                    <div>
                        <div className="font-semibold mb-1">2. RES lots go last</div>
                        <p className="opacity-90">
                            Within each section, all non-RES lots come first. Lots with <span className="font-mono">CR3 = "RES"</span> are
                            placed at the bottom of that section, even if they are expedite or exceed cycle time.
                        </p>
                    </div>

                    <div>
                        <div className="font-semibold mb-1">3. Priority inside non-RES and RES</div>
                        <p className="opacity-90 mb-1">Each side is ordered by the first rule a lot matches:</p>
                        <ol className="list-decimal list-inside space-y-0.5 opacity-90">
                            <li>Manual expedite</li>
                            <li>Cycle time exceed</li>
                            <li>Cycle time exceed residual</li>
                            <li>Entry lots</li>
                            <li>All other lots</li>
                        </ol>
                        <p className="opacity-70 mt-1">A higher priority always stays above a lower one, regardless of CT.</p>
                    </div>

                    <div>
                        <div className="font-semibold mb-1">4. Order within the same priority</div>
                        <ul className="list-disc list-inside space-y-0.5 opacity-90">
                            <li>
                                <span className="font-medium">Non-RES lots:</span> sorted by <span className="font-mono">CT</span>, highest to lowest.
                            </li>
                            <li>
                                <span className="font-medium">RES lots:</span> sorted by <span className="font-mono">Lot_Entry_Time_Days</span>, highest
                                to lowest. If equal, higher <span className="font-mono">CT</span> goes first.
                            </li>
                            <li>Lots with a missing value go to the bottom of their group.</li>
                            <li>Remaining ties keep their current order.</li>
                        </ul>
                    </div>

                    <div>
                        <div className="font-semibold mb-1">5. After sorting</div>
                        <p className="opacity-90">
                            Start and end times are recalculated from the first row that moved, including every row after it.
                        </p>
                    </div>
                </div>

                <div className="alert alert-warning mt-4 text-sm">
                    <div className="space-y-1">
                        <p>
                            Auto Sort does not check setup or conversion needs. If a section contains lots that would require a
                            setup between them, they are still sorted by the rules above, so place blocks first and make sure
                            each section is truly setup-free.
                        </p>
                        <p>
                            This replaces any manual drag-and-drop ordering on this machine. Rows that don't move are left untouched.
                        </p>
                    </div>
                </div>

                <div className="modal-action">
                    <form method="dialog">
                        <button className="btn btn-ghost" disabled={disabled}>Cancel</button>
                    </form>
                    <button className="btn btn-primary" disabled={disabled} onClick={handleConfirm}>
                        {disabled && <span className="loading loading-spinner loading-sm" />}
                        Sort Now
                    </button>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop"><button>close</button></form>
        </dialog>
    );
});

export default AutoSortModal;