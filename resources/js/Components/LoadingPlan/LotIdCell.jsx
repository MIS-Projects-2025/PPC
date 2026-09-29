import { TableActionsContext } from "@/Components/LoadingPlan/columns";
import React, { useContext } from "react";

export function LotIdCell({ lotId, splitInfo, mergeInfo, isPlannedYesterday }) {

    console.log("LOG ~ LotIdCell.jsx:7 ~ LotIdCell ~ splitInfo:", splitInfo);
    const { handleShowHistory = noop, handleShowMergeHistory = noop } =
        useContext(TableActionsContext);

    if (!splitInfo && !mergeInfo) {
        return (
            <span className="font-mono">
                {isPlannedYesterday && (
                    <span className="text-xs rounded-md bg-secondary/50 px-1 mr-1">
                        past
                    </span>
                )}
                {lotId}
            </span>
        );
    }

    return (
        <span className="flex items-center justify-between gap-1.5 min-w-0 width-full">
            <div className="font-mono truncate min-w-0">
                {isPlannedYesterday && (
                    <span className="text-xs rounded-md bg-secondary/50 px-1 mr-1">
                        past
                    </span>
                )}
                <span className="truncate">{lotId}</span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
                {splitInfo && (
                    <SplitBadge
                        lotId={lotId}
                        splitInfo={splitInfo}
                        handleShowHistory={handleShowHistory}
                    />
                )}
                {mergeInfo && (
                    <MergeBadge
                        lotId={lotId}
                        mergeInfo={mergeInfo}
                        handleShowMergeHistory={handleShowMergeHistory}
                    />
                )}
            </div>
        </span>
    );
}

function SplitBadge({ splitInfo, handleShowHistory }) {
    const { isParent, isChild, rootLotId } = splitInfo;

    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                handleShowHistory(rootLotId, isParent, isChild);
            }}
            title={
                isParent ? "This lot was split" : "This lot came from a split"
            }
            className="inline-flex items-center shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold text-base-content/50 hover:text-primary hover:bg-base-content/10 transition-colors"
        >
            SPLIT
        </button>
    );
}

function MergeBadge({ mergeInfo, handleShowMergeHistory }) {
    const { isTarget, isSource, mergeId, mergedInto, mergedFrom } = mergeInfo;

    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                handleShowMergeHistory(
                    mergedInto ?? mergedFrom,
                    isTarget,
                    isSource,
                );
            }}
            title={
                isTarget
                    ? "This lot absorbed another lot's quantity"
                    : `This lot was merged into ${mergedInto ?? "another lot"}`
            }
            className="inline-flex items-center shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold text-base-content/50 hover:text-secondary hover:bg-base-content/10 transition-colors"
        >
            MERGE
        </button>
    );
}