export default function LotEndpoint({ lotId, machine, machineNow, approx = false, className = "" }) {
    const moved = machineNow && machineNow !== machine;
    return (
        <div className="flex flex-col">
            <span className={`font-mono text-sm ${className}`}>{lotId}</span>
            <span className="text-[10px] text-base-content/50">
                {machine ?? "Unassigned"}
                {approx && <span className="text-base-content/30"> (approx.)</span>}
                {moved && <span className="text-warning"> → now {machineNow}</span>}
            </span>
        </div>
    );
}