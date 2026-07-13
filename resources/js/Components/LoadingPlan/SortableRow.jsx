import { mergeRefs } from "@/Lib/dnd.js";
import { useSortable } from "@dnd-kit/sortable";
import { memo } from "react";
import RowContent from "./RowContent";

export const SortableRow = memo(function SortableRow({
    row,
    orderedDndIds,
    itemNumber,
    measureElement,
    virtualIndex,
    isSortable = true,
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: row.original._dndId, disabled: !isSortable });

    return (
        <RowContent
            row={row}
            orderedDndIds={orderedDndIds}
            setNodeRef={mergeRefs(setNodeRef, measureElement)}
            virtualIndex={virtualIndex}
            transform={transform}
            transition={transition}
            isDragging={isDragging}
            dragHandleProps={{ ...attributes, ...listeners }}
            itemNumber={itemNumber}
            isSortable={isSortable}
        />
    );
});
