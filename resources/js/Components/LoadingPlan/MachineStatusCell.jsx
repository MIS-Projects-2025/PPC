import clsx from "clsx";
import { useContext } from "react";
import { normalizeLotId } from "./BakingBadge";
import HoverCell from "./HoverCell";
import { TableActionsContext } from "./TableActionsContext";

const STATES = {
    ended:   { label: "ENDED",   cls: "bg-success/50 border-success" },
    started: { label: "STARTED", cls: "bg-info/50 border-info" },
    invalid: { label: "INVALID", cls: "bg-error/50 border-error" },
    unknown: { label: "LOGGED",  cls: "bg-warning/50 border-warning" },
};

const BASE = "flex items-center gap-1.5 w-full h-full px-1.5 text-[12px] whitespace-nowrap border-l-8";
const MUTED = "text-base-content/40 bg-base-content/5 border-base-content/10";

export function MachineStatusCell({ row }) {
    const { machineStatus } = useContext(TableActionsContext);

    if (machineStatus === undefined) return <span className={clsx(BASE, MUTED)}>…</span>;
    if (!machineStatus.available) {
        return <span className={clsx(BASE, MUTED)} title="Machine status source is unavailable">—</span>;
    }

    const lookup = (id) => (id ? machineStatus.byLot.get(normalizeLotId(id)) : undefined);
    const info = lookup(row.lot_id) ?? lookup(row.split_info?.rootLotId);

    if (!info) {
        return (
            <span className={clsx(BASE, MUTED, "italic")} title="No lot_runs or lot_reports record for this lot">
                No data
            </span>
        );
    }

    const s = STATES[info.state] ?? STATES.unknown;
    const cell = (
        <span className={clsx(BASE, s.cls, "font-bold")}>
            {s.label}
            {info.machine && <span className="font-normal opacity-80 truncate">{info.machine}</span>}
        </span>
    );

    return (
        <HoverCell trigger={cell}>
            <div className="text-xs font-mono space-y-1 min-w-[210px] text-left">
                <div className="font-bold text-primary pb-0.5 border-b border-neutral-content/15">{row.lot_id}</div>
                {info.details.map(([k, v]) => (
                    <div key={k} className="flex text-base-100 justify-between items-center gap-3">
                        <span className="opacity-70">{k}:</span>
                        <span className="font-semibold">{v}</span>
                    </div>
                ))}
                {info.also && (
                    <div className="pt-1 border-t border-neutral-content/15 text-base-100 opacity-70">{info.also}</div>
                )}
            </div>
        </HoverCell>
    );
}