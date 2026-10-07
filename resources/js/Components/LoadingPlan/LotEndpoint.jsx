import { TableActionsContext } from "@/Components/LoadingPlan/columns";
import { isNonMachineKey } from "@/Hooks/LoadingPlan/useNonMachineOperations";
import { useContext } from "react";

export default function LotEndpoint({ lotId, machine, machineNow, approx = false, className = "" }) {
    const { nonMachineNameByKey } = useContext(TableActionsContext) ?? {};
    const label = (m) =>
        isNonMachineKey(m) ? (nonMachineNameByKey?.get(m) ?? "Deleted non-machine") : m;

    const moved = machineNow && machineNow !== machine;
    return (
        <div className="flex flex-col">
            <span className={`font-mono text-sm ${className}`}>{lotId}</span>
            <span className="text-[10px] text-base-content/50">
                {label(machine) ?? "Unassigned"}
                {approx && <span className="text-base-content/30"> (approx.)</span>}
                {moved && <span className="text-warning"> → now {label(machineNow)}</span>}
            </span>
        </div>
    );
}