import { useMutation } from "@/Hooks/useMutation";
import { forwardRef, useEffect, useState } from "react";
import MachineSelectionGrid from "./MachineSelectionGrid";

const TransferModal = forwardRef(function TransferModal(
    { machines, machinePlatform, selectedMachines, transferLotIds, date, open, onSelect, onClose },
    ref,
) {
    const [pendingMachine, setPendingMachine] = useState(undefined);
    const [candidates, setCandidates] = useState(null); // null = not loaded yet

    const { mutate, isLoading, errorMessage } = useMutation();

    // Fetch compatibility/capacity preview whenever the set of lots being
    // transferred changes (i.e. right before the modal is shown).
    // Fetch compatibility/capacity preview only when the modal actually
    // opens — not on every selection edit while it's closed. Re-fetches
    // each time it opens (not just once) since capacity can have moved
    // since the last time it was open.
    useEffect(() => {
        if (!open) return;

        if (!transferLotIds || transferLotIds.length === 0) {
            setCandidates(null);
            return;
        }

        mutate("/loading-plan/transfer-candidates", {
            body: { lot_ids: transferLotIds, date },
            mutationKey: "transfer-candidates",
            cancelPrevious: true, // supersede a stale in-flight fetch if transferLotIds changes again before it resolves
        })
            .then((result) => {
                // index by machine (machine_num) for O(1) lookup in the grid
                const byMachine = {};
                result.forEach((row) => {
                    byMachine[row.machine] = row;
                });
                setCandidates(byMachine);
            })
            .catch((err) => {
                if (err.name === "AbortError") return; // superseded by a newer request, not a real failure
                console.error("transfer-candidates failed:", err);
            });
        // no cleanup/cancel call needed here — cancelPrevious handles supersession,
        // and useMutation's own unmount effect aborts any still-in-flight request
    }, [open]);

    const isDisabled = (m) =>
        selectedMachines.size === 1 && selectedMachines.has(m);

    const handleClose = () => {
        setPendingMachine(undefined);
        onClose?.();
    };

    const handleConfirm = () => {
        if (pendingMachine === undefined) return;
        onSelect(pendingMachine);
        setPendingMachine(undefined);
        ref.current?.close();
    };

    return (
        <dialog ref={ref} id="transfer_modal" className="modal">
            <div className="modal-box bg-base-300 w-11/12 max-w-3xl max-h-[80vh] flex flex-col">
                <h3 className="font-bold text-lg mb-3">Transfer to…</h3>

                {errorMessage && (
                    <div className="alert alert-error text-xs py-2 mb-2">
                        {errorMessage}
                    </div>
                )}

                <div className="overflow-y-auto flex-1">
                    <MachineSelectionGrid
                        machines={machines}
                        machinePlatform={machinePlatform}
                        selectedMachine={pendingMachine}
                        onSelect={setPendingMachine}
                        isDisabled={isDisabled}
                        transferCandidates={candidates}
                        transferLoading={isLoading}
                    />
                </div>

                <div className="modal-action">
                    <button className="btn btn-ghost cursor-pointer" onClick={handleClose}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        disabled={pendingMachine === undefined}
                        onClick={handleConfirm}
                        className="btn btn-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Confirm
                    </button>
                </div>
            </div>

            <form method="dialog" className="modal-backdrop">
                <button onClick={handleClose}>close</button>
            </form>
        </dialog>
    );
});

export default TransferModal;