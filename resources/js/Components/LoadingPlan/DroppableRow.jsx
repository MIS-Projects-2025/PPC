import { useDroppable } from "@dnd-kit/core";
import clsx from "clsx";
import { memo, useCallback, useLayoutEffect, useRef } from "react";
import { Row } from "react-data-grid";

function DroppableDataRow({ rowIdxByElement, ...rowProps }) {
    const { row, rowIdx, className } = rowProps;
    const { setNodeRef, isOver } = useDroppable({ id: `row-${row.id}` });
    const elRef = useRef(null);

    // stable callback: a changing rowIdx no longer detaches/re-attaches the droppable node
    const setRefs = useCallback((el) => {
        elRef.current = el;
        setNodeRef(el);
    }, [setNodeRef]);

    useLayoutEffect(() => {
        if (elRef.current) rowIdxByElement.set(elRef.current, rowIdx);
    }, [rowIdx, rowIdxByElement]);

    return (
        <Row
            ref={setRefs}
            {...rowProps}
            className={clsx(className, isOver && "!bg-pink-500 relative drop-target-row")}
        />
    );
}

function DroppableRowImpl({ rowIdxByElement, ...rowProps }) {
    if (rowProps.row.__type === "header") return <Row {...rowProps} />;
    return <DroppableDataRow rowIdxByElement={rowIdxByElement} {...rowProps} />;
}

export const DroppableRow = memo(DroppableRowImpl);