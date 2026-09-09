import { StatusBadge } from "@/Components/LoadingPlan/StatusBadge.jsx";
import { TAGS } from "@/Components/LoadingPlan/Tag";
import { useEffect, useMemo, useRef, useState } from "react";
import { FaTrash } from "react-icons/fa";
import { GoGitMerge, GoRepoForked } from "react-icons/go";
import MergeModal from "./MergeModal";
import SplitModal from "./SplitModal";
import TransferModal from "./TransferModal";

export default function SelectionToolbar({
    selectedIds,
    machinePlatform,
    allData,
    machines,
    onTag,
    disabled,
    onClearTag,
    onStatusChange,
    onBulkFieldUpdate,
    onTransfer,
    onSplitRow,
    onMergeRows,
    onDelete,
    onClearSelection,
}) {
    // console.log("🚀 ~ SelectionToolbar ~ allData:", allData);
    // console.log("🚀 ~ SelectionToolbar ~ selectedIds:", selectedIds);
    // console.log(
    //     "🚀 ~ SelectionToolbar ~ selectedIds:",
    //     allData.filter((r) => selectedIds.has(r._dndId)),
    // );
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
        () => allData.find((r) => selectedIds.has(r.id)),
        [allData, selectedIds],
    );
    
    console.log("LOG ~ SelectionToolbar.jsx:64 ~ SelectionToolbar ~ selectedIds:", selectedIds);
    console.log("LOG ~ SelectionToolbar.jsx:68 ~ SelectionToolbar ~ selectedRow:", selectedRow);

    const selectedRows = useMemo(
        () => allData.filter((r) => selectedIds.has(r.id)),
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
                <div className="relative flex items-center gap-2 px-4 py-2 bg-base-100 text-base-content rounded-md shadow-lg border border-base-content/10 select-none">
                    <span className="text-xs font-semibold bg-info text-info-content px-2 py-0.5 rounded-full mr-1">
                        {count} selected
                    </span>

                    <div className="w-px h-5 bg-base-content/20" />

                    {/* Popover Trigger Button */}
                    <button
                        className="btn btn-sm text-xs font-medium"
                        popoverTarget="tag-expedite-popover"
                        style={{ anchorName: "--tag-expedite-anchor" }}
                        disabled={disabled}
                    >
                        Bulk Actions ▾
                    </button>

                    {/* Popover Dropdown Menu */}
                    <ul
                        className="dropdown menu w-64 rounded-box bg-base-100 p-2 shadow-lg border border-base-content/10 gap-1"
                        popover="auto"
                        id="tag-expedite-popover"
                        style={{
                            positionAnchor: "--tag-expedite-anchor",
                            positionArea: "top span-all",     // place above the anchor, aligned to its width
                            positionTryFallbacks: "flip-block", // flip to below if there's no room above
                            marginBottom: "8px",              // gap between menu and button
                        }}
                    >
                        {/* Category Label: Tags */}
                        <li className="menu-title text-[10px] uppercase font-semibold text-base-content/50 px-2 py-1">
                            Mark Tag
                        </li>

                        {/* Tag Items */}
                        {Object.entries(TAGS).map(([key, cfg]) => (
                            <li key={key}>
                                <button
                                    type="button"
                                    onClick={() => onTag(key)}
                                    className="flex items-center gap-2 text-xs font-medium py-1.5"
                                    disabled={disabled}
                                >
                                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                                    {cfg.label}
                                </button>
                            </li>
                        ))}

                        {/* Clear Tag Action */}
                        <li>
                            <button
                                type="button"
                                onClick={onClearTag}
                                className="flex items-center gap-2 text-xs font-medium py-1.5 text-base-content/60"
                                disabled={disabled}
                            >
                                <span className="w-2 h-2 rounded-full border border-base-content/30" />
                                Clear tag
                            </button>
                        </li>

                        {/* Divider */}
                        <div className="divider my-0.5" />

                        {/* Category Label: Expedite */}
                        <li className="menu-title text-[10px] uppercase font-semibold text-base-content/50 px-2 py-1">
                            Expedite Status
                        </li>

                        {/* Expedite Items — same row style as tags */}
                        <li>
                            <button
                                type="button"
                                onClick={() => onBulkFieldUpdate('is_manual_expedite', true)}
                                className="flex items-center gap-2 text-xs font-medium py-1.5"
                                disabled={disabled}
                            >
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                Expedite
                            </button>
                        </li>
                        <li>
                            <button
                                type="button"
                                onClick={() => onBulkFieldUpdate('is_manual_expedite', false)}
                                className="flex items-center gap-2 text-xs font-medium py-1.5 text-base-content/60"
                                disabled={disabled}
                            >
                                <span className="w-2 h-2 rounded-full border border-base-content/30" />
                                Remove expedite
                            </button>
                        </li>
                    </ul>

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
                onConfirm={({ targetLotEntryId, sourceLotEntryId }) =>
                    onMergeRows({ targetLotEntryId, sourceLotEntryId })
                }
                onClose={() => mergeModalRef.current?.close()}
            />

            <SplitModal
                ref={splitModalRef}
                machines={machines}
                machinePlatform={machinePlatform}
                selectedMachines={selectedMachines}
                parentLotId={selectedRow?.lot_id}
                totalQty={selectedRow?.qty}
                onConfirm={({
                    childLotId,
                    childQty,
                    parentQty,
                    targetMachine,
                }) =>
                    onSplitRow({
                        parentEntryLotId: selectedRow?.entry_id,
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
