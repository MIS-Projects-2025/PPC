import { useDroppable } from "@dnd-kit/core";
import clsx from "clsx";
import { useCallback } from "react";
import { Row } from "react-data-grid";

function DroppableDataRow({ rowIdxByElement, props }) {
    const { row, rowIdx, className } = props;
    const { setNodeRef, isOver } = useDroppable({ id: `row-${row.id}` });

    const setRefs = useCallback((el) => {
        setNodeRef(el);
        if (el) rowIdxByElement.set(el, rowIdx);
    }, [setNodeRef, rowIdxByElement, rowIdx]);

    return <Row ref={setRefs} {...props} className={clsx(className, isOver && "bg-sky-500/10")} />;
}

export function DroppableRow({ rowIdxByElement, props }) {
    if (props.row.__type === "header") return <Row {...props} />;
    return <DroppableDataRow rowIdxByElement={rowIdxByElement} props={props} />;
}