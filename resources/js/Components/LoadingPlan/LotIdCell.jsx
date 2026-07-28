import React, { useContext } from "react";
import { GoRepoForked } from "react-icons/go";
import { TableActionsContext } from "./RowContent";

export function LotIdCell({ lotId, splitInfo }) {
    const { handleShowHistory = noop } = useContext(TableActionsContext);

    if (!splitInfo) {
        return <span>{lotId}</span>;
    }

    const { isParent, isChild, rootLotId } = splitInfo;

    return (
        <span className="flex items-center gap-1.5">
            <span>{lotId}</span>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    handleShowHistory(rootLotId);
                }}
                title={
                    isParent
                        ? "This lot was split"
                        : "This lot came from a split"
                }
                className={`inline-flex items-center justify-center shrink-0 rounded p-0.5 text-base-content/40 hover:text-primary hover:bg-base-content/10 transition-colors ${
                    isChild ? "rotate-180" : ""
                }`}
            >
                <GoRepoForked size={16} />
            </button>
        </span>
    );
}
