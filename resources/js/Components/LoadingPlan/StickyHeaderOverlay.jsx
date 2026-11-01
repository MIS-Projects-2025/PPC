import { HEADER_ROW_HEIGHT, ROW_HEIGHT } from "@/Constants/LoadingPlan/constants";
import clsx from "clsx";
import { BucketHeaderBar } from "./BucketHeaderBar";
import { MachineHeaderBar } from "./MachineHeaderBar";
import { OvenHeaderCell } from "./OvenHeaderCell";

/** Stand-in pinned under the column headers for the group whose real header row scrolled away. */
function StickyHeaderOverlay({ readOnly, children }) {
    return (
        <div
            className="bg-base-200 shadow-[0_15px_15px_-10px_rgba(0,0,0,0.3)]"
            style={{ position: "absolute", top: HEADER_ROW_HEIGHT, left: 0, right: 0, height: ROW_HEIGHT }}
        >
            <div
                className={clsx(
                    "absolute left-0 right-0 h-full w-full flex items-center justify-between",
                    readOnly ? "pl-1" : "pl-9",
                )}
            >
                {children}
            </div>
        </div>
    );
}

export function StickyMachineHeader({ group, readOnly, onToggleCollapse }) {
    return (
        <StickyHeaderOverlay readOnly={readOnly}>
            <div className="flex items-center h-full gap-2 min-w-0 flex-1">
                {group.__headerKind === "bucket" ? (
                    <BucketHeaderBar row={group} onToggleCollapse={onToggleCollapse} />
                ) : (
                    <MachineHeaderBar
                        row={{
                            isNonMachine: group.isNonMachine,
                            nonMachineId: group.nonMachineId,
                            machineLabel: group.machineLabel ?? null,
                            machine: group.machine,
                            machineId: group.machineId,
                            otherPackageCount: group.otherPackageCount,
                            machineLocation: group.machineLocation,
                        }}
                        machineKey={group.machine}
                        rowCount={group.__rowCount}
                        lotCount={group.__lotCount}
                        isCollapsed={group.__isCollapsed}
                        onToggleCollapse={onToggleCollapse}
                    />
                )}
            </div>
        </StickyHeaderOverlay>
    );
}

export function StickyOvenHeader({ oven, readOnly, onToggleCollapse }) {
    return (
        <StickyHeaderOverlay readOnly={readOnly}>
            <OvenHeaderCell row={oven} rowCount={oven.__rowCount} onToggleCollapse={onToggleCollapse} />
        </StickyHeaderOverlay>
    );
}