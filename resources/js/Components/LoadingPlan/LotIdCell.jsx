import { TableActionsContext } from "@/Components/LoadingPlan/columns";
import React, { useContext } from "react";

const noop = () => {};

export function LotIdCell({
    lotId,
    isPickup,
    splitInfo,
    mergeInfo,
    isPlannedYesterday,
    isRework,
    reworkSeq,
    otherLocation,
}) {
    const {
        handleShowHistory = noop,
        handleShowMergeHistory = noop,
    } = useContext(TableActionsContext);

    const badges = (
        <>
            {splitInfo && (
                <SplitBadge
                    splitInfo={splitInfo}
                    lotId={lotId}
                    handleShowHistory={handleShowHistory}
                />
            )}
            {mergeInfo && (
                <MergeBadge
                    mergeInfo={mergeInfo}
                    lotId={lotId}
                    handleShowMergeHistory={handleShowMergeHistory}
                />
            )}
        </>
    );

    const otherLocationBadge = otherLocation && (
        <span
            className="badge badge-secondary badge-xs font-mono uppercase mr-1"
            title={`Belongs to ${otherLocation}`}
        >
            {otherLocation}
        </span>
    );

    if (!splitInfo && !mergeInfo) {
        return (
            <span className="font-mono">
                {otherLocationBadge}
                <LotLabel
                    lotId={lotId}
                    isPickup={isPickup}
                    isPlannedYesterday={isPlannedYesterday}
                    isRework={isRework}
                    reworkSeq={reworkSeq}
                />
            </span>
        );
    }

    return (
        <span className="flex items-center justify-between gap-1.5 min-w-0 w-full">
            <div className="font-mono truncate min-w-0">
                {otherLocationBadge}
                <LotLabel
                    lotId={lotId}
                    isPickup={isPickup}
                    isPlannedYesterday={isPlannedYesterday}
                    isRework={isRework}
                    reworkSeq={reworkSeq}
                />
            </div>

            <div className="flex items-center gap-1 shrink-0">
                {badges}
            </div>
        </span>
    );
}

function LotLabel({
    lotId,
    isPickup,
    isPlannedYesterday,
    isRework,
    reworkSeq,
}) {
    return (
        <>
            {isPlannedYesterday && (
                <span className="text-xs rounded-md bg-secondary/50 px-1 mr-1">
                    past
                </span>
            )}

            {isPickup && (
                <span className="text-xs rounded-md bg-accent/50 px-1 mr-1">
                    PICKUP
                </span>
            )}

            <span className="truncate">{lotId}</span>

            {isRework && (
                <span className="badge badge-warning rounded-sm ml-1">
                    REWORK{reworkSeq > 0 ? ` ${reworkSeq}` : ""}
                </span>
            )}
        </>
    );
}

function SplitBadge({ splitInfo, lotId, handleShowHistory }) {
    const { isParent, isChild, rootLotId } = splitInfo;

    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                handleShowHistory(rootLotId, isParent, isChild, lotId);
            }}
            title={
                isParent
                    ? "This lot was split"
                    : "This lot came from a split"
            }
            className="inline-flex items-center shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold text-base-content/50 hover:text-primary hover:bg-base-content/10 transition-colors"
        >
            SPLIT
        </button>
    );
}

function MergeBadge({ mergeInfo, lotId, handleShowMergeHistory }) {
    const { isTarget, isSource, mergedInto, mergedFrom } = mergeInfo;
    const relatedLotId = mergedInto ?? mergedFrom;

    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                handleShowMergeHistory(
                    relatedLotId,
                    isTarget,
                    isSource,
                    lotId
                );
            }}
            title={
                isTarget
                    ? "This lot absorbed another lot's quantity"
                    : `This lot was merged into ${relatedLotId ?? "another lot"}`
            }
            className="inline-flex items-center shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold text-base-content/50 hover:text-secondary hover:bg-base-content/10 transition-colors"
        >
            MERGE
        </button>
    );
}
