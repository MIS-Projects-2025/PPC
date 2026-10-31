import { memo } from "react";

export const PartNameCell = memo(function PartNameCell({ partName, isBosch }) {
    return (
        <div className="flex items-center gap-1 min-w-0">
            <span className="truncate" title={partName ?? ""}>
                {partName}
            </span>
            {isBosch && (
                <span className="badge badge-xs badge-info font-semibold shrink-0">
                    BOSCH
                </span>
            )}
        </div>
    );
});