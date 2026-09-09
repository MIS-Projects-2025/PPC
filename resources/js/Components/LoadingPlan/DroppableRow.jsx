import { useDroppable } from "@dnd-kit/core";
import { Row } from "react-data-grid";

export function DroppableRow({ rowIdxByElement, props }) {
    const { row, rowIdx } = props;

    if (row.__type === "header") {
        return <Row {...props} />;
    }

    const { setNodeRef, isOver } = useDroppable({
        id: `row-${row.id}`,
    });

    const setRefs = (el) => {
        setNodeRef(el);
        if (el) rowIdxByElement.set(el, rowIdx);
    };

    return (
        <Row
            ref={setRefs}
            {...props}
            className={isOver ? "bg-sky-500/10" : undefined}
        />
    );
}
