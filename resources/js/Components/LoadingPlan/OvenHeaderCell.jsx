import { OvenHeaderBar } from "./OvenHeaderBar";

export function OvenHeaderCell({ row, rowCount, onToggleCollapse }) {
    return (
        <div className="flex items-center gap-1 w-full h-full">
            <div className="flex-1 min-w-0 h-full">
                <OvenHeaderBar
                    row={row}
                    rowCount={rowCount}
                    isCollapsed={row.__isCollapsed}
                    onToggleCollapse={onToggleCollapse}
                />
            </div>
        </div>
    );
}