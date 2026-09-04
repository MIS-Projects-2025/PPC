import { MachineHeaderBar } from "@/Components/LoadingPlan/MachineHeaderBar";
import { useDroppable } from "@dnd-kit/core";

// This is the actual drop target (id keyed off machine name, matching
// row.machine on data rows). For Unassigned/MANUAL, row.machine is
// null/"MANUAL" -- droppableMachineFromToken() (helpers.js) undoes the
// string coercion when reading the id back on drop.
export function MachineHeaderCell({ row, rowCount, onToggleCollapse }) {
    const { setNodeRef, isOver } = useDroppable({
        id: `machine-${row.machine}`,
    });

    return (
        <div ref={setNodeRef} className="flex items-center gap-1 w-full h-full">
            <div className="flex-1 min-w-0 h-full">
                <MachineHeaderBar
                    row={row}
                    rowCount={rowCount}
                    isOver={isOver}
                    innerRef={setNodeRef}
                    isCollapsed={row.__isCollapsed}
                    onToggleCollapse={onToggleCollapse}
                />
            </div>
        </div>
    );
}
