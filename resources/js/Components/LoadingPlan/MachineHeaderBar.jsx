import { initialData as _initialData } from "@/Constants/loadingPlanData.js";
import { MACHINE_MANUAL } from "@/Constants/machines.js";
import { Deferred } from "@inertiajs/react";
import { createContext, useContext, useMemo } from "react";
import HoverCell from "./HoverCell";

export const TableInteractionContext = createContext({
    isSortable: false,
    disableSelection: false,
    disableGripButton: false,
    disableAddRowLot: false,
    disableAddRowBlock: false,
});

export function MachineHeaderBar({
    row,
	rowCount,
    isOver,
	isCollapsed,
	onToggleCollapse,
	machineKey,
    innerRef,
}) {
	const toggleKey = machineKey !== undefined ? machineKey : row.machine;
    const machine = row?.machine;
	const machineLabel = row?.machineLabel;
    const isUnassigned = (String (machineLabel)).toLowerCase() === "Unassigned" || machine === null;
    const isManual = machine === MACHINE_MANUAL;
    const isPseudo = isUnassigned || isManual;

    const {
        // disableAddRowLot,
        // disableAddRowBlock,
        // scrollParentRef,
        machineCapacity,
        machineTotalDoable,
        machineTotalQuantity,
    } = useContext(TableInteractionContext);

	const totalQty = machineTotalQuantity[machine];
	const totalDoable = machineTotalDoable[machine];

    const capacityData = machineCapacity?.[machine];
    const CAPACITY = capacityData?.capacity ?? 0;
    const effectiveFrom = capacityData?.effective_from
        ? capacityData.effective_from.split("T")[0]
        : null;

    const sectionDoable = totalDoable ?? 0;
    const overallDoable = machineTotalDoable?.[machine] ?? sectionDoable;
    const otherDoable = Math.max(0, overallDoable - sectionDoable);

    const isExceeded = useMemo(() => {
        if (isUnassigned || isManual) return false;
        return CAPACITY > 0 && overallDoable > CAPACITY;
    }, [isUnassigned, isManual, CAPACITY, overallDoable]);

    const sectionPct =
        CAPACITY > 0 ? Math.min((sectionDoable / CAPACITY) * 100, 100) : 0;

    const otherPct =
        CAPACITY > 0
            ? Math.min(
                  (otherDoable / CAPACITY) * 100,
                  Math.max(0, 100 - sectionPct),
              )
            : 0;

    return (
        <div
            className={`w-full h-full border-opposite-100 font-semibold flex items-center box-border transition-colors duration-100 ${
                isOver
                    ? "outline-2 outline-dashed outline-[#7dd3fc] outline-offset-[-2px]"
                    : "outline-none"
            }`}
            ref={innerRef}
        >
			<div className="sticky left-9 flex gap-2 h-full items-center">	
				<div className="w-50 h-full font-extrabold whitespace-nowrap flex items-center gap-2">
					<button
						type="button"
						onClick={(e) => {
							// stop it from also triggering row-select/drag on the bar
							e.stopPropagation();
							onToggleCollapse?.(toggleKey);
						}}
						className="btn btn-ghost btn-2xs shrink-0 px-1"
						title={isCollapsed ? "Expand section" : "Collapse section"}
						aria-expanded={!isCollapsed}
					>
						<span>
							{isCollapsed ? "►" : "▼"}
						</span>
						<span key={toggleKey} className="text-[20px] font-mono animate-slide-down inline-block">
							{machineLabel}
						</span>
					</button>
				</div>

				<div className="w-65">
                    <span className="opacity-50 font-extralight mr-2">Rows:</span>
                    <span key={`rows-${toggleKey}`} className="animate-slide-down inline-block font-mono mr-4">{rowCount?.toLocaleString() ?? 0}</span>
                    <span className="opacity-50 font-extralight mr-2">total Qty:</span> 
                    <span key={`qty-${toggleKey}`} className="animate-slide-down inline-block font-mono">{totalQty?.toLocaleString()}</span>
                </div>

				{/* Capacity bar — only for real machines, mirrors MachineSection's Deferred block */}
				{!isUnassigned && !isManual && (
					<Deferred
						data="machineCapacity"
						fallback={
							<div className="flex flex-col min-w-[170px]">
								<div className="h-6 w-full rounded-md animate-pulse flex items-center text-[10px] text-base-content/40 font-mono">
									<span className="loading loading-spinner loading-xs mr-2"></span>
									Loading capacity...
								</div>
							</div>
						}
					>
						<div className="flex flex-col h-full min-w-[300px]">
							<HoverCell
								trigger={
									<div
										className={`bg-puple-500 shadow-md border border-opposite-100/20 relative w-full h-full overflow-hidden flex cursor-pointer ${
											isExceeded ? "ring-1 ring-error" : ""
										}`}
									>
										<div
											className={`h-full transition-all duration-300 ${
												isExceeded
													? "bg-error"
													: sectionPct + otherPct > 85
													? "bg-warning/50"
													: "bg-lime-300/50"
											}`}
											style={{ width: `${sectionPct}%` }}
										/>
										<div
											className={`h-full transition-all duration-300 ${
												isExceeded
													? "bg-error"
													: sectionPct + otherPct > 85
													? "bg-warning/50"
													: "bg-lime-300"
											}`}
											style={{ width: `${otherPct}%` }}
										/>
										<div className="absolute inset-0 flex items-center justify-between px-2 font-mono text-[11px] z-10 pointer-events-none whitespace-nowrap">
											<div className="flex items-center gap-1.5">
												<span className="text-base-content bg-base-300 rounded px-1 font-black">
													{overallDoable.toLocaleString()}{" "}
												</span>
												<span className="text-base-content text-[10px] font-normal">
													({sectionDoable.toLocaleString()} here)
												</span>
											</div>
											<span className="text-base-content text-[10px] font-normal">
												/ {CAPACITY.toLocaleString()}
											</span>
										</div>
									</div>
								}
							>
								<div className="text-xs font-mono rounded-lg text-base-100 space-y-1.5 min-w-[180px] text-left">
									<div className="flex justify-between items-center gap-3">
										<span className="text-primary font-bold">This Section:</span>
										<span className="font-bold bg-primary px-1.5 py-0.5 rounded text-[11px]">
											{sectionDoable.toLocaleString()}
										</span>
									</div>
									<div className="flex justify-between items-center gap-3">
										<span className="opacity-70">Machine Total:</span>
										<span className="font-semibold">
											{overallDoable.toLocaleString()}
										</span>
									</div>
									<div className="flex justify-between items-center gap-3 border-t border-neutral-content/15 pt-1">
										<span className="opacity-70">Capacity:</span>
										<span className="font-semibold">
											{CAPACITY.toLocaleString()}
										</span>
									</div>
									{effectiveFrom && (
										<div className="text-[10px] opacity-50 pt-0.5 border-t border-neutral-content/10">
											Effective: {effectiveFrom}
										</div>
									)}
								</div>
							</HoverCell>
						</div>
					</Deferred>
				)}
			</div>
        </div>
    );
}