import { memo, useContext } from "react";
import { TableActionsContext } from "./TableActionsContext";

export const normalizeLotId = (id) => (id == null ? "" : String(id).trim().toUpperCase());

const FlameIcon = () => (
    <svg
        className="bake-pill__flame"
        viewBox="0 0 24 24"
        width="12"
        height="12"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
    >
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
);

export const BakingBadge = memo(function BakingBadge({ oven }) {
    const title = oven != null && oven !== "" ? `Currently baking in oven ${oven}` : "Currently baking";
    return (
        <span className="bake-pill" title={title} role="status" aria-label={title}>
            <span className="bake-pill__clip" aria-hidden="true" />
            <FlameIcon />
            <span className="bake-pill__label">Baking</span>
        </span>
    );
});

/**
 * Wraps a status cell's content and appends the baking pill when the lot is
 * in an oven. Renders children untouched otherwise (no layout change).
 */
export function WithBakeIndicator({ row, children }) {
    const { bakingLots } = useContext(TableActionsContext) ?? {};
    if (!bakingLots || !row.lot_id || row.entry_type === "block" || row.block_label) return children;

    const key = normalizeLotId(row.lot_id);
    if (!bakingLots.has(key)) return children;

    return (
        <div className="flex items-center gap-1 w-full h-full">
            <div className="min-w-0 flex-1 h-full overflow-hidden">{children}</div>
            <BakingBadge oven={bakingLots.get(key)} />
        </div>
    );
}