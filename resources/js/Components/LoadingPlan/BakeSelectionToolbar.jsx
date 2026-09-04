export function BakeSelectionToolbar({
    selectedIds,
    onApprove,
    onReprocess,
    onExport,
    onDelete,
    onClearSelection,
}) {
    if (!selectedIds || selectedIds.size === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-base-200 border border-base-300 shadow-lg rounded-box px-4 py-2">
            <span className="text-xs text-base-content/70 whitespace-nowrap">
                {selectedIds.size} lot{selectedIds.size !== 1 ? "s" : ""} selected
            </span>
            <div className="w-px h-4 bg-base-300" />
            <div className="join">
                <button className="btn btn-xs join-item btn-success" onClick={onApprove}>
                    Approve
                </button>
                <button className="btn btn-xs join-item btn-warning" onClick={onReprocess}>
                    Reprocess
                </button>
                <button className="btn btn-xs join-item" onClick={onExport}>
                    Export
                </button>
                <button className="btn btn-xs join-item btn-error" onClick={onDelete}>
                    Delete
                </button>
            </div>
            <button className="btn btn-xs btn-ghost" onClick={onClearSelection}>
                Clear
            </button>
        </div>
    );
}
