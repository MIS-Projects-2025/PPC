import { useDialogOpen } from "@/Hooks/LoadingPlan/useDialogOpen";
import { DATA_COLUMNS } from "@/Lib/LoadingPlan/columnConfig";
import clsx from "clsx";
import { memo, useRef } from "react";

export const COLUMN_VISIBILITY_MODAL_ID = "column_visibility_modal";

const EyeOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 3l18 18M10.58 10.58a2 2 0 002.84 2.84M9.88 5.09A9.77 9.77 0 0112 5c4.48 0 8.27 2.94 9.54 7a10.05 10.05 0 01-2.16 3.62M6.61 6.61A10.05 10.05 0 002.46 12c1.27 4.06 5.06 7 9.54 7a9.8 9.8 0 004.39-1.03"
        />
    </svg>
);

function ColumnVisibilityBody({ isColumnHidden, onToggle, onShowAll }) {
    const hiddenCount = DATA_COLUMNS.filter((col) => isColumnHidden(col.key)).length;

    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Column Visibility</h3>
                <div className="flex items-center gap-2">
                    <span className={clsx("badge badge-sm", hiddenCount > 0 ? "badge-warning" : "badge-ghost")}>
                        {hiddenCount > 0 ? `${hiddenCount} hidden` : "All visible"}
                    </span>
                    {hiddenCount > 0 && (
                        <button type="button" className="btn btn-warning btn-xs" onClick={onShowAll}>
                            Show all
                        </button>
                    )}
                </div>
            </div>

            <div className="flex flex-col overflow-y-auto pr-1">
                {DATA_COLUMNS.map((col) => {
                    const hidden = isColumnHidden(col.key);
                    return (
                        <label
                            key={col.key}
                            className={clsx(
                                "flex items-center justify-between gap-1 py-2 px-3 rounded-md cursor-pointer border-l-4 transition-colors",
                                hidden ? "bg-warning/10 border-warning hover:bg-warning/20" : "border-transparent hover:bg-base-200",
                            )}
                        >
                            <span className="flex items-center gap-2 min-w-0">
                                <span className={clsx("text-sm truncate", hidden && "line-through opacity-50")}>
                                    {col.name ?? col.key}
                                </span>
                                {hidden && (
                                    <span className="badge badge-warning badge-xs gap-1 shrink-0">
                                        <EyeOffIcon />
                                        Hidden
                                    </span>
                                )}
                            </span>
                            <input
                                type="checkbox"
                                className={clsx("toggle toggle-sm", !hidden && "toggle-success")}
                                checked={!hidden}
                                onChange={() => onToggle(col.key)}
                            />
                        </label>
                    );
                })}
            </div>
        </>
    );
}

/**
 * "Hiding" a column shrinks it to a thin sliver instead of removing it.
 * Kept in read-only mode too: it's a local view preference.
 * The body is only mounted while the dialog is open (it used to render 55 rows on every page render).
 */
function ColumnVisibilityModal({ isColumnHidden, onToggle, onShowAll }) {
    const ref = useRef(null);
    const open = useDialogOpen(ref);

    return (
        <dialog ref={ref} id={COLUMN_VISIBILITY_MODAL_ID} className="modal">
            <div className="modal-box bg-base-300 max-h-[80vh] flex flex-col">
                {open && <ColumnVisibilityBody isColumnHidden={isColumnHidden} onToggle={onToggle} onShowAll={onShowAll} />}

                <div className="modal-action">
                    <form method="dialog"><button className="btn btn-ghost btn-sm">Close</button></form>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop"><button>close</button></form>
        </dialog>
    );
}

export default memo(ColumnVisibilityModal);