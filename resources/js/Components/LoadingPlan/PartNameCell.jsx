import { badgeClass } from "@/Lib/LoadingPlan/badgeStyle";
import { memo } from "react";

export const PartNameCell = memo(function PartNameCell({ partName, badges }) {
    if (!badges?.length) return <span className="truncate">{partName}</span>;

    return (
        <div className="flex items-center gap-1 min-w-0" title={`${partName} · ${badges.join(", ")}`}>
            <span className="truncate min-w-0">{partName}</span>
            {badges.map((b) => (
                <span key={b} className={`badge badge-xs badge-soft shrink-0 ${badgeClass(b)}`}>
                    {b}
                </span>
            ))}
        </div>
    );
});

export default PartNameCell;