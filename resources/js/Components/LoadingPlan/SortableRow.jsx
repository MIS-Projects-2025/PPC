import { mergeRefs } from "@/Lib/dnd.js";
import { useSortable } from "@dnd-kit/sortable";
import { memo, useContext } from "react";
import { TableInteractionContext } from "./MachineSectionBody";
import RowContent from "./RowContent";

export const SortableRow = memo(function SortableRow({
    row,
    orderedDndIds,
    itemNumber,
    measureElement,
    virtualIndex,
}) {
    const { isSortable } = useContext(TableInteractionContext);
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
