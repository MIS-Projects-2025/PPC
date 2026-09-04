import { useDraggable } from "@dnd-kit/core";

export function RowDropTargetCell({ rowId }) {
    const { attributes, listeners, setNodeRef } = useDraggable({ id: rowId });

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className="absolute inset-0 ..."
        >
            <button className="btn btn-ghost rounded-none w-full h-full cursor-grab">
                ⠿
            </button>
        </div>
    );
}
