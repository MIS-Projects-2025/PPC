import { StatusBadge } from "@/Components/LoadingPlan/StatusBadge.jsx";
import { TAGS } from "@/Components/LoadingPlan/Tag";
import { isBlockRow } from "@/Lib/LoadingPlan/helpers";
import { useEffect, useMemo, useRef, useState } from "react";
import { FaTrash } from "react-icons/fa";
import { GoGitMerge, GoRepoForked } from "react-icons/go";
import MergeModal from "./MergeModal";
import SplitModal from "./SplitModal";
import TransferModal from "./TransferModal";
import { useToast } from "@/Hooks/useToast";

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
    onRework,
    onDelete,
    onClearSelection,
    buckets, 
    onMoveToBucket, 
    onUngroup,
    date,
}) {
    const toast = useToast();
    const count = selectedIds.size;
    const [transferOpen, setTransferOpen] = useState(false);
    const [statusOpen, setStatusOpen] = useState(false);

    const transferModalRef = useRef(null);
    const splitModalRef = useRef(null);
    const mergeModalRef = useRef(null);

    const guard = (reason, fn) => (e) => {
        if (reason) {
            e.preventDefault();
            toast.info(reason, { id: "toolbar-blocked" });
            return;
        }
        fn?.(e);
    };

    const blockedCls = (reason) => (reason ? "opacity-50 cursor-not-allowed" : "");

    const busy = disabled ? "Another action is still in progress." : null;

    const selectedMachines = useMemo(() => {
        const s = new Set();
        allData.forEach((r) => {
            if (selectedIds.has(r.id)) s.add(r.machine);
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
    console.log("🚀 ~ SelectionToolbar ~ selectedRow:", selectedRow)
    
    const selectedRows = useMemo(
        () => allData.filter((r) => selectedIds.has(r.id)),
        [allData, selectedIds],
    );

    const canDelete = selectedRows.every(
        (r) => r.machine !== null || Number.isInteger(r.bucket_id),
    );

    const reworkedLotIds = useMemo(
        () => new Set(allData.filter((r) => r.is_rework).map((r) => r.lot_id)),
        [allData],
    );

    const canGroup =
        selectedRows.length > 0 &&
        selectedRows.every((r) => !isBlockRow(r) && r.lot_id && !r.is_leaked && !r.is_rework && !reworkedLotIds.has(r.lot_id));

    const hasReworkSelected = selectedRows.some((r) => r.is_rework);

    const canRework =
        count === 1 && selectedRow && !isBlockRow(selectedRow) && selectedRow.entry_id &&
        selectedRow.machine !== null && !selectedRow.is_leaked;
    console.log("🚀 ~ SelectionToolbar ~ canRework:", canRework)

    const isSelectedRowsUnassigned = useMemo(
        () => selectedRows.some((r) => r.machine === null),
        [selectedRows],
    );

    const reasons = {
        group: busy
            || ((buckets ?? []).length === 0 ? "No groups exist yet. Create one first." : null)
            || (!canGroup ? "Only regular lots can be grouped. Leaked, rework and block rows are excluded." : null),
        bulk: busy
            || (isSelectedRowsUnassigned ? "Unassigned rows can't be edited in bulk. Place them on a machine first." : null),
        split: busy
            || (count !== 1 ? "Select exactly 1 lot to split." : null)
            || (isSelectedRowsUnassigned ? "Unassigned lots can't be split." : null)
            || (hasReworkSelected ? "Rework lots can't be split." : null),
        merge: busy
            || (count !== 2 ? "Select exactly 2 lots to merge." : null)
            || (isSelectedRowsUnassigned ? "Unassigned lots can't be merged." : null)
            || (hasReworkSelected ? "Rework lots can't be merged." : null),
        rework: busy
            || (count !== 1 ? "Select exactly 1 lot to rework." : null)
            || (!canRework ? "Only placed, non-leaked lots can be reworked." : null),
        delete: busy
            || (!canDelete ? "Unassigned rows cannot be deleted." : null),
    };

    console.log("🚀 ~ SelectionToolbar ~ isSelectedRowsUnassigned:", isSelectedRowsUnassigned)

    const transferLotIds = useMemo(
        () => [...new Set(selectedRows.map((r) => r.lot_id).filter(Boolean))],
        [selectedRows],
    );

    console.log("🚀 ~ SelectionToolbar ~ count:", count)
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

                    <button
                        className={`btn btn-sm text-xs font-medium ${blockedCls(reasons.group)}`}
                        popoverTarget="bucket-popover"
                        style={{ anchorName: "--bucket-anchor" }}
                        aria-disabled={!!reasons.group}
                        onClick={guard(reasons.group)}
                    >
                        Move to group ▾
                    </button>

                    <ul className="dropdown menu w-56 rounded-box bg-base-100 p-2 shadow-lg border border-base-content/10"
                        popover="auto" id="bucket-popover"
                        style={{ positionAnchor: "--bucket-anchor", positionArea: "top span-all", positionTryFallbacks: "flip-block", marginBottom: "8px" }}>
                        {(buckets ?? []).map((b) => (
                            <li key={b.id}>
                                <button type="button" className="text-xs"
                                    onClick={() => { onMoveToBucket(b.id); document.getElementById("bucket-popover")?.hidePopover?.(); }}>
                                    {b.machine ? `${b.machine} · ` : ""}{b.label}
                                </button>
                            </li>
                        ))}
                        <div className="divider my-0.5" />
                        <li>
                            <button type="button" className="text-xs" disabled={!selectedRows.some((r) => r.bucket_id != null)}
                                onClick={() => { onUngroup(); document.getElementById("bucket-popover")?.hidePopover?.(); }}>
                                Remove from group
                            </button>
                        </li>
                    </ul>

                    {/* Popover Trigger Button */}
                    <button
                        className={`btn btn-sm text-xs font-medium ${blockedCls(reasons.bulk)}`}
                        popoverTarget="tag-expedite-popover"
                        style={{ anchorName: "--tag-expedite-anchor" }}
                        aria-disabled={!!reasons.bulk}
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
                        {/* <li className="menu-title text-[10px] uppercase font-semibold text-base-content/50 px-2 py-1">
                            Mark Tag
                        </li> */}

                        {/* Tag Items */}
                        {/* {Object.entries(TAGS).map(([key, cfg]) => (
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
                        ))} */}

                        {/* Clear Tag Action */}
                        {/* <li>
                            <button
                                type="button"
                                onClick={onClearTag}
                                className="flex items-center gap-2 text-xs font-medium py-1.5 text-base-content/60"
                                disabled={disabled}
                            >
                                <span className="w-2 h-2 rounded-full border border-base-content/30" />
                                Clear tag
                            </button>
                        </li> */}

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

                    <div className="tooltip" data-tip={reasons.split ?? "Split lot"}>
                        <button
                            className={`btn btn-ghost text-[11px] font-medium px-2.5 py-1 rounded-lg bg-base-content/10 text-base-content/80 hover:bg-base-content/20 flex items-center gap-1 ${blockedCls(reasons.split)}`}
                            aria-disabled={!!reasons.split}
                            onClick={guard(reasons.split, () => splitModalRef.current?.showModal())}
                        >
                            <GoRepoForked size={16} /> split
                        </button>
                    </div>

                    <div
                        className="tooltip"
                        data-tip={reasons.merge ?? "Merge lots"}
                    >
                        <button
                            className={`btn btn-ghost text-[11px] font-medium px-2.5 py-1 rounded-lg bg-base-content/10 text-base-content/80 hover:bg-base-content/20 flex items-center gap-1  ${blockedCls(reasons.merge)}`}
                            aria-disabled={!!reasons.merge}
                            onClick={guard(reasons.merge, () => mergeModalRef.current?.showModal())}
                        >
                            <GoGitMerge size={16} /> merge
                        </button>
                    </div>

                    <div 
                        className="tooltip"
                        data-tip={reasons.rework ?? "Duplicate this lot as a rework"}
                    >
                        <button
                            className={`btn btn-ghost text-[11px] font-medium px-2.5 py-1 rounded-lg bg-base-content/10 text-base-content/80 hover:bg-base-content/20 ${blockedCls(reasons.rework)}`}
                            aria-disabled={!!reasons.rework}
                            onClick={() => onRework(selectedRow)}
                        >
                            Rework
                        </button>
                    </div>

                    {/* Bulk status */}
                    <div className="relative">
                        <button
                            onClick={guard(reasons.group, () => {
                                transferModalRef.current?.close();
                                setStatusOpen((v) => !v);
                                setTransferOpen(false);
                            })}
                            className={`btn btn-ghost text-[11px] font-medium px-2.5 py-1 rounded-lg bg-base-content/10 text-base-content/80 hover:bg-base-content/20 flex items-center gap-1 ${blockedCls(reasons.bulk)}`}
                            disabled={disabled || isSelectedRowsUnassigned}
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

                    <div className="tooltip" data-tip={reasons.delete ?? "Delete selected"}>
                        <button
                            onClick={guard(reasons.delete, onDelete)}
                            aria-disabled={!!reasons.delete}
                            className={`btn btn-ghost text-[11px] font-medium px-2.5 py-1 rounded-lg bg-error/20 text-error hover:bg-error/30 ${blockedCls(reasons.delete)}`}
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
                transferLotIds={transferLotIds}
                date={date}
                open={transferOpen}
                onClose={() => {
                    transferModalRef.current?.close();
                    setTransferOpen(false);
                }}
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
                        parentEntryId: selectedRow?.entry_id,
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
