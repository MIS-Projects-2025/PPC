import { useMutation } from "@/Hooks/useMutation";
import { forwardRef, useEffect, useRef, useState } from "react";
import TransferMachinePicker from "./TransferMachinePicker";

const TransferModal = forwardRef(function TransferModal(
    {
        machines,
        nonMachines,
        machinePlatform,
        selectedMachines,
        transferLotIds,
        incomingRows, // NEW: the selected row objects (SelectionToolbar's `selectedRows`)
        laneRows, // NEW: every row in the plan (SelectionToolbar's `allData`)
        onJumpToMachine,
        date,
        open,
        onSelect,
        onClose,
    },
    ref,
) {
    const [pendingMachine, setPendingMachine] = useState(undefined);
    const [candidates, setCandidates] = useState(null); // null = not loaded yet

    const searchRef = useRef(null);
    const confirmRef = useRef(null);
    const [nudge, setNudge] = useState(false);

    const { mutate, isLoading, errorMessage } = useMutation();

    useEffect(() => {
        if (!open) return;
        setPendingMachine(undefined);
        const id = requestAnimationFrame(() => {
            searchRef.current?.focus();
            searchRef.current?.select();
        });
        return () => cancelAnimationFrame(id);
    }, [open]);

    // after a machine is picked: focus Confirm so Enter works, and bounce it
    useEffect(() => {
        if (pendingMachine === undefined) return;
        confirmRef.current?.focus();
        setNudge(true);
    }, [pendingMachine]);

    // Re-fetch the compatibility/capacity preview every time the modal opens
    // (capacity can have moved since last time).
    useEffect(() => {
        if (!open) return;

        if (!transferLotIds || transferLotIds.length === 0) {
            setCandidates(null);
            return;
        }

        mutate("/loading-plan/transfer-candidates", {
            body: { lot_ids: transferLotIds, date },
            mutationKey: "transfer-candidates",
            cancelPrevious: true,
        })
            .then((result) => {
                const byMachine = {};
                result.forEach((row) => {
                    byMachine[row.machine] = row;
                });
                setCandidates(byMachine);
            })
            .catch((err) => {
                if (err.name === "AbortError") return;
                console.error("transfer-candidates failed:", err);
            });
    }, [open]);

    const isDisabled = (m) => selectedMachines.size === 1 && selectedMachines.has(m);

    const handleClose = () => {
        setPendingMachine(undefined);
        onClose?.();
    };

    const confirm = () => {
        if (pendingMachine === undefined) return;
        onSelect(pendingMachine);
        setPendingMachine(undefined);
        ref.current?.close();
    }

    const handleConfirm = () => {
        confirm();
    };

    const handleConfirmThenJump = () => {
        confirm();
        onJumpToMachine?.(pendingMachine);
    };

    return (
        // onClose on the <dialog>: Esc closes it natively and would otherwise leave `open` stuck at true
        <dialog ref={ref} id="transfer_modal" className="modal" onClose={handleClose}>
            <div
                className="modal-box bg-base-300 w-11/12 max-w-6xl h-[85vh] max-h-[85vh] flex flex-col"
                onKeyDown={(e) => {
                    // Enter from the search box confirms too; buttons handle their own Enter
                    if (e.key === "Enter" && pendingMachine !== undefined && e.target.tagName === "INPUT") {
                        e.preventDefault();
                        handleConfirm();
                    }
                }}
            >
                <h3 className="font-bold text-lg mb-3">Transfer to…</h3>

                {errorMessage && <div className="alert alert-error text-xs py-2 mb-2">{errorMessage}</div>}

                {/* mounted only while open: the lane index is built on open, not on every selection change */}
                {open && (
                    <TransferMachinePicker
                        inputRef={searchRef}
                        machines={machines}
                        nonMachines={nonMachines}
                        machinePlatform={machinePlatform}
                        selectedMachine={pendingMachine}
                        onSelect={setPendingMachine}
                        isDisabled={isDisabled}
                        candidates={candidates}
                        loading={isLoading}
                        incomingRows={incomingRows}
                        laneRows={laneRows}
                    />
                )}

                <div className="modal-action">
                    <button className="btn btn-ghost cursor-pointer" onClick={handleClose}>
                        Cancel
                    </button>
                    <button
                        ref={confirmRef}
                        type="button"
                        disabled={pendingMachine === undefined}
                        onClick={handleConfirm}
                        onAnimationEnd={() => setNudge(false)}
                        className={`btn btn-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${nudge ? "animate-confirm-nudge" : ""}`}
                    >
                        Confirm <kbd className="kbd kbd-xs ml-1">Enter</kbd>
                    </button>
                    <button
                        type="button"
                        disabled={pendingMachine === undefined}
                        onClick={handleConfirmThenJump}
                        onAnimationEnd={() => setNudge(false)}
                        className={`btn btn-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${nudge ? "animate-confirm-nudge" : ""}`}
                    >
                        Confirm then Jump to Machine
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