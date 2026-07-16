import { machineToDroppableToken } from "@/Lib/dnd.js";
import { useDroppable } from "@dnd-kit/core";
import { PREFIX_EMPTY_DROPPABLE } from "./MachineSectionBody";

export default function MachineChip({ machine, isDropTarget }) {
    const { setNodeRef, isOver } = useDroppable({
        id: `${PREFIX_EMPTY_DROPPABLE}${machineToDroppableToken(machine)}`,
    });

    return (
        <div
            ref={setNodeRef}
            className={`rounded-md border px-2 py-1.5 text-[11px] text-center truncate transition-colors
                ${
                    isOver
                        ? "ring-2 ring-info bg-info/10 border-info/40 text-info"
                        : "border-base-300 bg-base-200/40 text-base-content/50"
                }`}
            title={machine ?? "Unassigned"}
        >
            {machine ?? "Unassigned"}
        </div>
    );
}
