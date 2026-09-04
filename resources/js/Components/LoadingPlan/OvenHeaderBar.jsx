export function OvenHeaderBar({ row, rowCount, isCollapsed, onToggleCollapse }) {
    const ovenLabel = row?.ovenLabel;

    return (
        <div className="w-full h-full border-opposite-100 font-semibold flex items-center box-border">
            <div className="sticky left-9 flex gap-2 h-full items-center">
                <div className="w-84 h-full font-extrabold whitespace-nowrap flex items-center gap-2">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleCollapse?.(ovenLabel);
                        }}
                        className="btn btn-ghost btn-2xs shrink-0 px-1"
                        title={isCollapsed ? "Expand section" : "Collapse section"}
                        aria-expanded={!isCollapsed}
                    >
                        <span>{isCollapsed ? "►" : "▼"}</span>
                        <span key={ovenLabel} className="text-[20px] font-mono animate-slide-down inline-block">
                            Oven {ovenLabel}
                        </span>
                    </button>
                </div>

                <div className="w-50">
                    <span className="opacity-50 font-extralight mr-2">Rows:</span>
                    <span key={`rows-${ovenLabel}`} className="animate-slide-down inline-block font-mono">
                        {rowCount?.toLocaleString() ?? 0}
                    </span>
                </div>
            </div>
        </div>
    );
}