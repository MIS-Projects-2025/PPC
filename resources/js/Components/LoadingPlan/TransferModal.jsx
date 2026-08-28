import { forwardRef, useContext, useState } from "react";
import { TableInteractionContext } from "./MachineSectionBody";
import MachineSelectionGrid from "./MachineSelectionGrid";

const TransferModal = forwardRef(function TransferModal(
    { machines, machinePlatform, selectedMachines, onSelect, onClose },
    ref,
) {
    const {
        machineCapacity
    } = useContext(TableInteractionContext);

    // it needs new param, the lots to be transferred
    // so that we can calculate the potential total doable if user decides to transfer them into the machines.
    // we need to show a bar-looking where the current total cap of the machine and the added one are different.
    // we need to sort the machine such that the machine that is still open-cap despite previewing that the added doable
    // and the current total cap does not exceed the machine capacity yet,
    // at the bottom of the list are those who will exceed it's capacity if the new doable is added to them.
    
    // 

    console.log("LOG ~ TransferModal.jsx:13 ~ TransferModal ~ machineCapacity:", machineCapacity);

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
