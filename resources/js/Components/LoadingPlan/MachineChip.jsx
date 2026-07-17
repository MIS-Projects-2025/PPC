import { machineToDroppableToken } from "@/Lib/dnd.js";
import { useDroppable } from "@dnd-kit/core";
import MachineChipClasses from "./MachineChipClasses";
import { PREFIX_EMPTY_DROPPABLE } from "./MachineSectionBody";

export default function MachineChip({ machine }) {
    const { setNodeRef, isOver } = useDroppable({
        id: `${PREFIX_EMPTY_DROPPABLE}${machineToDroppableToken(machine)}`,
    });
    return (
        <div
            ref={setNodeRef}
            className={MachineChipClasses(isOver ? "active" : "idle")}
            title={machine ?? "Unassigned"}
        >
            {machine ?? "Unassigned"}
        </div>
    );
}
