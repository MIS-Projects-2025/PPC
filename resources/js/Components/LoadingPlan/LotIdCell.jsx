import React, { useContext } from "react";
import { GoGitMerge, GoRepoForked } from "react-icons/go";
import { TableActionsContext } from "./RowContent";

export function LotIdCell({ lotId, splitInfo, mergeInfo, isPlannedYesterday }) {
    console.log("🚀 ~ LotIdCell ~ isPlannedYesterday:", isPlannedYesterday);
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
        <span className="flex items-center justify-between gap-1.5">
            <div className="font-mono">
                {isPlannedYesterday && (
                    <span className="text-xs rounded-md bg-secondary/50 px-1 mr-1">
                        past
                    </span>
                )}
                {lotId}
            </div>

            <div>
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
            className="inline-flex items-center gap-0.5 shrink-0 rounded px-0.5 py-0.5 text-base-content/40 hover:text-primary hover:bg-base-content/10 transition-colors"
        >
            <GoRepoForked size={16} className={isChild ? "rotate-180" : ""} />
            <span className="text-[10px] font-semibold leading-none">
                {isParent ? "P" : "C"}
            </span>
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
            className="inline-flex items-center gap-0.5 shrink-0 rounded px-0.5 py-0.5 text-base-content/40 hover:text-secondary hover:bg-base-content/10 transition-colors"
        >
            <GoGitMerge size={16} className={isSource ? "rotate-180" : ""} />
            <span className="text-[10px] font-semibold leading-none">
                {isTarget ? "T" : "S"}
            </span>
        </button>
    );
}
