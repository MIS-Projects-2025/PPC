import { forwardRef, useState } from "react";
import MachineSelectionGrid from "./MachineSelectionGrid";

const TransferModal = forwardRef(function TransferModal(
    { machines, machinePlatform, selectedMachines, onSelect, onClose },
    ref,
) {
    const [pendingMachine, setPendingMachine] = useState(undefined);

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

                <div className="overflow-y-auto flex-1">
                    <MachineSelectionGrid
                        machines={machines}
                        machinePlatform={machinePlatform}
                        selectedMachine={pendingMachine}
                        onSelect={setPendingMachine}
                        isDisabled={isDisabled}
                    />
                </div>

                <div className="modal-action">
                    <button
                        className="btn btn-ghost cursor-pointer"
                        onClick={handleClose}
                    >
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
