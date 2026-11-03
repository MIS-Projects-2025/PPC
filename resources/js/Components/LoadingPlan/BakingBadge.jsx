import { useNowSeconds } from "@/Hooks/LoadingPlan/useNowSeconds";
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

const pad = (n) => String(n).padStart(2, "0");
const fmt = (s) => `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;

function BakeCountdown({ endsAt }) {
    const nowSec = useNowSeconds();
    const left = Math.round(endsAt / 1000) - nowSec;

    return (
        <span className="tabular-nums">
            {left > 0 ? fmt(left) : "Done"}
        </span>
    );
}

export const BakingBadge = memo(function BakingBadge({ info }) {
    const oven = info?.oven;
    const title = oven != null && oven !== "" ? `Currently baking in oven ${oven}` : "Currently baking";

    return (
        <span className="bake-pill" title={title}>
            <span className="bake-pill__clip" aria-hidden="true" />
            <FlameIcon />
            {info?.endsAt != null ? (
                <BakeCountdown endsAt={info.endsAt} />
            ) : (
                <span className="bake-pill__label">Baking</span>
            )}
        </span>
    );
});

export function WithBakeIndicator({ row, children }) {
    const { bakingLots } = useContext(TableActionsContext) ?? {};
    if (!bakingLots || !row.lot_id || row.entry_type === "block" || row.block_label) return children;

    const info = bakingLots.get(normalizeLotId(row.lot_id));
    if (!info) return children;

    return (
        <div className="flex items-center gap-1 w-full h-full">
            <div className="min-w-0 flex-1 h-full overflow-hidden">{children}</div>
            <BakingBadge info={info} />
        </div>
    );
}