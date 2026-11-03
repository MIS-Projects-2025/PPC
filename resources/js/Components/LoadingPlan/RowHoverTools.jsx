import { ROW_HEIGHT } from "@/Constants/LoadingPlan/constants";
import { useRowHoverInsert } from "@/Hooks/LoadingPlan/useRowHoverInsert";
import { autoUpdate, offset, useFloating } from "@floating-ui/react";
import { memo, useEffect } from "react";
import { createPortal } from "react-dom";

const INSERT_BTN_H = 20;

/** Two stacked buttons sticking out of the row's left edge: insert above / below. */
function RowInsertButtons({ anchorElement, onInsertAbove, onInsertBelow, buttonsRef, onPointerLeave }) {
    // how far the whole stack sticks out past each edge of the row
    const overhang = ({ rects }) => (2 * INSERT_BTN_H - rects.reference.height) / 2;

    const above = useFloating({
        placement: "left-start",
        strategy: "fixed",
        whileElementsMounted: autoUpdate,
        middleware: [offset((state) => ({ mainAxis: 0, crossAxis: -overhang(state) }))],
    });
    const below = useFloating({
        placement: "left-end",
        strategy: "fixed",
        whileElementsMounted: autoUpdate,
        middleware: [offset((state) => ({ mainAxis: 0, crossAxis: overhang(state) }))],
    });

    useEffect(() => {
        above.refs.setReference(anchorElement);
        below.refs.setReference(anchorElement);
    }, [anchorElement, above.refs, below.refs]);

    const btnStyle = { height: INSERT_BTN_H, minHeight: INSERT_BTN_H, zIndex: 9999 };

    return createPortal(
        <div ref={buttonsRef} onPointerLeave={onPointerLeave}>
            <button
                ref={above.refs.setFloating}
                style={{ ...above.floatingStyles, ...btnStyle }}
                className="btn btn-xs border border-opposite-100/25 insert-row-btn rounded-r-none rounded-bl-none flex items-center justify-center"
                onClick={onInsertAbove}
            >
                ↓<span className="font-thin text-xs ml-0.5">+</span>
            </button>
            <button
                ref={below.refs.setFloating}
                style={{ ...below.floatingStyles, ...btnStyle }}
                className="btn btn-xs border border-opposite-100/25 insert-row-btn rounded-r-none rounded-tl-none flex items-center justify-center"
                onClick={onInsertBelow}
            >
                ↑<span className="font-thin text-xs ml-0.5">+</span>
            </button>
        </div>,
        document.body,
    );
}

/** Pinned to the viewport's right edge, vertically tracking the hovered row. */
function RowHistoryButton({ anchorElement, onViewHistory, buttonRef, onPointerLeave }) {
    const { refs, y } = useFloating({
        placement: "left-start", // only used for vertical tracking
        strategy: "fixed",
        whileElementsMounted: autoUpdate,
        middleware: [offset({ mainAxis: 0 })],
    });

    useEffect(() => {
        refs.setReference(anchorElement);
    }, [anchorElement, refs]);

    return createPortal(
        <button
            ref={(node) => {
                refs.setFloating(node);
                if (buttonRef) buttonRef.current = node;
            }}
            style={{ position: "fixed", top: y ?? 0, height: ROW_HEIGHT, right: 8, zIndex: 9999 }}
            className="btn btn-xs insert-row-btn border border-opposite-100/25 rounded-l-none flex items-center justify-center"
            onClick={onViewHistory}
            onPointerLeave={onPointerLeave}
            title="View history"
        >
            🕘
        </button>,
        document.body,
    );
}

/**
 * Owns the hover state (see useRowHoverInsert). Must be rendered INSIDE the element that
 * `containerRef` is attached to, so it unmounts/remounts together with the grid.
 */
function RowHoverTools({ containerRef, rowIdxByElement, displayRows, canInsert, disabled = false, onInsert, onViewHistory }) {
    const { hoveredRow, buttonsRef, historyButtonRef, handleButtonsPointerLeave, handleHistoryButtonPointerLeave } =
        useRowHoverInsert({ containerRef, rowIdxByElement, disabled });

    if (!hoveredRow) return null;

    const row = displayRows[hoveredRow.rowIdx];
    if (row?.__type !== "data") return null;

    return (
        <>
            {canInsert && row.machine !== null && (
                <RowInsertButtons
                    anchorElement={hoveredRow.element}
                    buttonsRef={buttonsRef}
                    onPointerLeave={handleButtonsPointerLeave}
                    onInsertAbove={() => onInsert("above", row)}
                    onInsertBelow={() => onInsert("below", row)}
                />
            )}
            {row.entry_id && (
                <RowHistoryButton
                    anchorElement={hoveredRow.element}
                    buttonRef={historyButtonRef}
                    onPointerLeave={handleHistoryButtonPointerLeave}
                    onViewHistory={() => onViewHistory(row)}
                />
            )}
        </>
    );
}

export default memo(RowHoverTools);