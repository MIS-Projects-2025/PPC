import { StatusBadge } from "@/Components/LoadingPlan/StatusBadge.jsx";
import { TAGS } from "@/Components/LoadingPlan/Tag";
import { MACHINE_MANUAL } from "@/Constants/machines.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FaTrash } from "react-icons/fa";
import { GoGitMerge, GoRepoForked } from "react-icons/go";
import MergeModal from "./MergeModal";
import SplitModal from "./SplitModal";
import TransferModal from "./TransferModal";

/** Display label for a machine bucket — Unassigned/Manual get real words
 *  instead of null/"MANUAL" literal. */
function machineLabel(machine) {
    if (machine === null) return "Unassigned";
    if (machine === MACHINE_MANUAL) return "Manual";
    return machine;
}

export default function SelectionToolbar({
    selectedIds,
    machinePlatform,
    allData,
    machines,
    onTag,
    disabled,
    onClearTag,
    onStatusChange,
    onTransfer,
    onSplitRow,
    onMergeRows,
    onDelete,
    onClearSelection,
}) {
    console.log("🚀 ~ SelectionToolbar ~ allData:", allData);
    console.log("🚀 ~ SelectionToolbar ~ selectedIds:", selectedIds);
    console.log(
        "🚀 ~ SelectionToolbar ~ selectedIds:",
        allData.filter((r) => selectedIds.has(r._dndId)),
    );
    const count = selectedIds.size;
    const [transferOpen, setTransferOpen] = useState(false);
    const [statusOpen, setStatusOpen] = useState(false);

    const transferModalRef = useRef(null);
    const splitModalRef = useRef(null);
    const mergeModalRef = useRef(null);

    const selectedMachines = useMemo(() => {
        const s = new Set();
        allData.forEach((r) => {
            if (selectedIds.has(r._dndId)) s.add(r.machine);
        });
        return s;
    }, [selectedIds, allData]);

    useEffect(() => {
        if (count === 0) {
            setTransferOpen(false);
            setStatusOpen(false);
        }
    }, [count]);

    const selectedRow = useMemo(
        () => allData.find((r) => selectedIds.has(r._dndId)),
        [allData, selectedIds],
    );

    const selectedRows = useMemo(
        () => allData.filter((r) => selectedIds.has(r._dndId)),
        [allData, selectedIds],
    );

    if (count === 0) {
        return null;
    }

    return (
        <div className="sticky bottom-0 z-99">
            {statusOpen && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setStatusOpen(false)}
                />
            )}

            <div className="flex-none flex items-center justify-center px-4 py-2 border-t border-base-300 bg-base-200">
                <div className="relative flex items-center gap-2 px-4 py-2 bg-base-100 text-base-content rounded-2xl shadow-lg border border-base-content/10 select-none">
                    <span className="text-xs font-semibold bg-info text-info-content px-2 py-0.5 rounded-full mr-1">
                        {count} selected
                    </span>

                    <div className="w-px h-5 bg-base-content/20" />

                    <span className="text-[11px] text-base-content/50 ml-1">
                        Mark:
                    </span>
                    {Object.entries(TAGS).map(([key, cfg]) => (
                        <button
                            key={key}
                            onClick={() => onTag(key)}
                            className={`btn btn-ghost flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg ${cfg.toolbar}`}
                            title={`Mark as ${cfg.label}`}
                            disabled={disabled}
                        >
                            <span
                                className={`w-2 h-2 rounded-full ${cfg.dot}`}
                            />
                            {cfg.label}
                        </button>
                    ))}
                    <button
                        onClick={onClearTag}
                        className="btn btn-ghost text-[11px] font-medium px-2.5 py-1 rounded-lg bg-base-content/10 text-base-content/60 hover:bg-base-content/20"
                        disabled={disabled}
                    >
                        Clear tag
                    </button>

                    <div className="w-px h-5 bg-base-content/20" />

                    <div
                        className="tooltip"
                        data-tip={
                            count > 1
                                ? "This action is for one selection only"
                                : count === 0
                                  ? "Select a lot to split"
                                  : "Split lot"
                        }
                    >
                        <button
                            className={`btn btn-ghost text-[11px] font-medium px-2.5 py-1 rounded-lg bg-base-content/10 text-base-content/80 hover:bg-base-content/20 flex items-center gap-1 ${
                                count > 1 ? "cursor-not-allowed opacity-50" : ""
                            }`}
                            disabled={count !== 1}
                            onClick={() => {
                                splitModalRef.current?.showModal();
                            }}
                        >
                            <GoRepoForked size={16} /> split
                        </button>
                    </div>

                    <div
                        className="tooltip"
                        data-tip={
                            count !== 2
                                ? "Select exactly 2 lots to merge"
                                : "Merge lots"
                        }
                    >
                        <button
                            className={`btn btn-ghost text-[11px] font-medium px-2.5 py-1 rounded-lg bg-base-content/10 text-base-content/80 hover:bg-base-content/20 flex items-center gap-1 ${
                                count !== 2
                                    ? "cursor-not-allowed opacity-50"
                                    : ""
                            }`}
                            disabled={count !== 2}
                            onClick={() => {
                                mergeModalRef.current?.showModal();
                            }}
                        >
                            <GoGitMerge size={16} /> merge
                        </button>
                    </div>

                    {/* Bulk status */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                transferModalRef.current?.close();
                                setStatusOpen((v) => !v);
                                setTransferOpen(false);
                            }}
                            className="btn btn-ghost text-[11px] font-medium px-2.5 py-1 rounded-lg bg-base-content/10 text-base-content/80 hover:bg-base-content/20 flex items-center gap-1"
                            disabled={disabled}
                        >
                            Set status
                            <svg
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                            >
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>
                        {statusOpen && (
                            <div className="absolute bottom-full mb-1 left-0 bg-base-100 border border-base-300 rounded-lg shadow-lg py-1 min-w-36 z-50">
                                {[
                                    "DONE",
                                    "RUNNING",
                                    "FOR PROCESS",
                                    "FVI",
                                    "BOXING",
                                    "LWAIT",
                                    "NONE",
                                ].map((s) => (
                                    <button
                                        key={s}
                                        className="btn btn-ghost w-full text-left px-3 py-1.5 text-sm hover:bg-base-200 flex items-center gap-2"
                                        onClick={() => {
                                            onStatusChange(s);
                                            setStatusOpen(false);
                                        }}
                                        disabled={disabled}
                                    >
                                        <StatusBadge status={s} />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="w-px h-5 bg-base-content/20" />

                    {/* Transfer */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                setTransferOpen(true);
                                transferModalRef.current?.showModal();
                                setStatusOpen(false);
                            }}
                            disabled={disabled}
                            className="btn btn-ghost text-[11px] font-medium px-2.5 py-1 rounded-lg bg-base-content/10 text-base-content/80 hover:bg-base-content/20 flex items-center gap-1"
                        >
                            Transfer to…
                            <svg
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                            >
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>
                    </div>

                    <div className="w-px h-5 bg-base-content/20" />

                    <div className="tooltip" data-tip="delete selected">
                        <button
                            onClick={onDelete}
                            className="btn btn-ghost text-[11px] font-medium px-2.5 py-1 rounded-lg bg-error/20 text-error hover:bg-error/30"
                            disabled={disabled}
                        >
                            <FaTrash />
                        </button>
                    </div>

                    <button
                        onClick={onClearSelection}
                        className="btn btn-ghost ml-1"
                        title="Clear selection (Esc)"
                        disabled={disabled}
                    >
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                        >
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            </div>

            <TransferModal
                ref={transferModalRef}
                machines={machines}
                machinePlatform={machinePlatform}
                selectedMachines={selectedMachines}
                onClose={() => setTransferOpen(false)}
                onSelect={onTransfer}
            />

            <MergeModal
                ref={mergeModalRef}
                lotA={selectedRows[0]}
                lotB={selectedRows[1]}
                onConfirm={({ targetLotId, sourceLotId }) =>
                    onMergeRows({ targetLotId, sourceLotId })
                }
                onClose={() => mergeModalRef.current?.close()}
            />

            <SplitModal
                ref={splitModalRef}
                machines={machines}
                machinePlatform={machinePlatform}
                selectedMachines={selectedMachines}
                parentLotId={selectedRow?.Lot_Id}
                totalQty={selectedRow?.Qty}
                onConfirm={({
                    childLotId,
                    childQty,
                    parentQty,
                    targetMachine,
                }) =>
                    onSplitRow({
                        parentLotId: selectedRow?.Lot_Id,
                        childLotId,
                        childQty,
                        parentQty,
                        targetMachine,
                        beforeEntryId: null,
                        afterEntryId: null, // appends to end of target machine, matches handleAddRow's convention
                    })
                }
                onClose={() => splitModalRef.current?.close()}
            />
        </div>
    );
}
