import { TableInteractionContext } from "@/Components/LoadingPlan/MachineHeaderBar";
import { useDroppable } from "@dnd-kit/core";
import clsx from "clsx";
import { useContext } from "react";

export function BucketHeaderBar({ row, onToggleCollapse, isOver, innerRef }) {
    const { onRenameBucket, onDeleteBucket } = useContext(TableInteractionContext) ?? {};
    return (
        <div ref={innerRef} className={clsx(
            "w-full h-full flex items-center bg-info/10",
            row.nested && "pl-6",
            isOver && "outline-2 outline-dashed outline-[#7dd3fc] outline-offset-[-2px]",
        )}>
            <div className="sticky left-9 flex items-center gap-2 h-full">
                <button type="button" className="btn btn-ghost btn-2xs px-1"
                    onClick={(e) => { e.stopPropagation(); onToggleCollapse?.(row.collapseKey); }}>
                    {row.__isCollapsed ? "►" : "▼"}
                    <span className="text-[15px] font-semibold ml-1">{row.label}</span>
                </button>
                <span className="opacity-50 text-xs font-mono">{row.__rowCount} lots</span>
                {onRenameBucket && (
                    <>
                        <button type="button" className="btn btn-ghost btn-2xs" title="Rename group"
                            onClick={() => { const l = window.prompt("Rename group", row.label)?.trim(); if (l) onRenameBucket(row.bucketId, l); }}>✎</button>
                        <button type="button" className="btn btn-ghost btn-2xs" title="Delete group (lots go back to Unassigned)"
                            onClick={() => { if (window.confirm(`Delete "${row.label}"? Its lots return to Unassigned.`)) onDeleteBucket(row.bucketId); }}>🗑</button>
                    </>
                )}
            </div>
        </div>
    );
}

export function BucketHeaderCell({ row, onToggleCollapse }) {
    const { setNodeRef, isOver } = useDroppable({ id: `bucket-${row.bucketId}` });
    return (
        <div className="flex items-center w-full h-full">
            <BucketHeaderBar row={row} onToggleCollapse={onToggleCollapse} isOver={isOver} innerRef={setNodeRef} />
        </div>
    );
}