import { format } from "date-fns";
import { Tooltip } from "react-tooltip";

export default function LotRunTooltip({ id, latestRun }) {
    if (!latestRun) return null;

    const safeNum = (val) => {
        const n = Number(val);
        return val != null && val !== "" && !isNaN(n) && isFinite(n)
            ? n.toLocaleString()
            : "—";
    };

    const safeStr = (val) => (val != null && val !== "" ? val : "—");

    const totalRejected =
        (latestRun.reject_lead ?? 0) +
        (latestRun.reject_mark ?? 0) +
        (latestRun.reject_pvi ?? 0) +
        (latestRun.reject_other ?? 0);

    const rejectDetail = [
        latestRun.reject_lead != null && `lead ${latestRun.reject_lead}`,
        latestRun.reject_mark != null && `mark ${latestRun.reject_mark}`,
        latestRun.reject_pvi != null && `pvi ${latestRun.reject_pvi}`,
        latestRun.reject_other != null && `other ${latestRun.reject_other}`,
    ]
        .filter(Boolean)
        .join(" · ");

    const fmt = (iso) => {
        if (!iso) return "—";
        const d = new Date(iso);
        if (isNaN(d.getTime())) return "—";
        return format(d, "MMM d, yyyy · HH:mm");
    };

    return (
        <Tooltip
            id={id}
            clickable
            positionStrategy="fixed"
            place="top"
            className="!p-0 !bg-transparent !border-0 !shadow-none"
            style={{ zIndex: 9999 }}
        >
            <div className="w-72 bg-base-100 border border-base-300 rounded-xl p-3.5 shadow-md">
                {/* Header */}
                <div className="flex items-start justify-between mb-2.5">
                    <div>
                        <p className="font-mono font-semibold text-sm text-base-content">
                            {safeStr(latestRun.lot_no)}
                        </p>
                        <p className="text-[11px] text-base-content/50 mt-0.5">
                            {safeStr(latestRun.machine_id)} · Shift{" "}
                            {safeStr(latestRun.shift_id)}
                        </p>
                    </div>
                    {latestRun.is_valid != null && (
                        <span
                            className={`badge badge-xs gap-1 ${latestRun.is_valid ? "badge-success" : "badge-error"}`}
                        >
                            {latestRun.is_valid ? "✓ Valid" : "✗ Invalid"}
                        </span>
                    )}
                </div>

                <Divider label="Output" />
                <Row label="Lot qty" value={safeNum(latestRun.lot_qty)} />
                <Row
                    label="Total passed"
                    value={safeNum(latestRun.total_passed)}
                />
                <Row
                    label="Rejected"
                    value={
                        <span className="text-error">
                            {totalRejected}
                            {rejectDetail && (
                                <span className="text-[11px] font-normal text-base-content/50">
                                    {"  "}
                                    {rejectDetail}
                                </span>
                            )}
                        </span>
                    }
                />

                <Divider label="Time breakdown" />
                <Row
                    label="Lot duration"
                    value={safeStr(latestRun.lot_duration)}
                />
                <Row label="Prod time" value={safeStr(latestRun.prod_time)} />
                <Row
                    label="Repair time"
                    value={safeStr(latestRun.repair_time)}
                />
                <Row
                    label="Idle time"
                    value={
                        <span className="text-warning">
                            {safeStr(latestRun.idle_time)}
                        </span>
                    }
                />
                <Row
                    label="Assist time"
                    value={safeStr(latestRun.assist_time)}
                />
                <Row
                    label="Warning time"
                    value={safeStr(latestRun.warning_time)}
                />

                {/* Footer timestamps */}
                <div className="border-t border-base-300 mt-2.5 pt-2.5 flex flex-col gap-1">
                    <div className="flex justify-between text-[11px]">
                        <span className="text-base-content/40">Start</span>
                        <span className="font-mono text-base-content/60">
                            {fmt(latestRun.start_time)}
                        </span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                        <span className="text-base-content/40">End</span>
                        <span className="font-mono text-base-content/60">
                            {fmt(latestRun.end_time)}
                        </span>
                    </div>
                </div>
            </div>
        </Tooltip>
    );
}

function Divider({ label }) {
    return (
        <div className="flex items-center gap-2 my-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-base-content/40">
                {label}
            </span>
            <div className="flex-1 h-px bg-base-300" />
        </div>
    );
}

function Row({ label, value }) {
    return (
        <div className="flex justify-between items-baseline py-0.5">
            <span className="text-[12px] text-base-content/50">{label}</span>
            <span className="text-[12px] font-medium text-base-content">
                {value}
            </span>
        </div>
    );
}
