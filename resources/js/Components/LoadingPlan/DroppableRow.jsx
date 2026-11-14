import { useDroppable } from "@dnd-kit/core";
import clsx from "clsx";
import { memo, useCallback, useLayoutEffect, useRef } from "react";
import { Row } from "react-data-grid";

function DroppableDataRow({ rowIdxByElement, flipKey, ...rowProps }) {
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
            data-flip-key={flipKey}
            {...rowProps}
            className={className}
        />
    );
}

function DroppableRowImpl({ rowIdxByElement, flipKey, ...rowProps }) {
    if (rowProps.row.__type === "header") return <Row data-flip-key={flipKey} {...rowProps} />;
    return <DroppableDataRow rowIdxByElement={rowIdxByElement} flipKey={flipKey} {...rowProps} />;
}

export const DroppableRow = memo(DroppableRowImpl);