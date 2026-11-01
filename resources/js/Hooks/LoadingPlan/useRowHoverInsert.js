import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Tracks which grid row the pointer is over (for the floating insert/history
 * buttons). Attach `containerRef` to the element wrapping the <DataGrid>;
 * `rowIdxByElement` is filled by DroppableRow.
 */
export function useRowHoverInsert(displayRows) {
    const containerRef = useRef(null);
    const buttonsRef = useRef(null);
    const historyButtonRef = useRef(null);
    const hoveredRowRef = useRef(null);
    const rowIdxByElement = useRef(new WeakMap()).current;
    const scrollingRef = useRef(false);
    const scrollTimer = useRef(0);

    const [hoveredRow, setHoveredRow] = useState(null);

    const clearHover = useCallback(() => {
        hoveredRowRef.current = null;
        setHoveredRow(null);
    }, []);

    // Clear hover unless the pointer is moving into one of `refs`.
    const leaveUnlessInside = useCallback(
        (e, ...refs) => {
            if (refs.some((ref) => ref.current?.contains(e.relatedTarget))) return;
            clearHover();
        },
        [clearHover],
    );

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const onPointerOver = (e) => {
            if (scrollingRef.current) return;
            const rowEl = e.target.closest(".rdg-row");
            if (!rowEl || rowEl === hoveredRowRef.current) return;

            const rowIdx = rowIdxByElement.get(rowEl);
            if (rowIdx === undefined) return;

            hoveredRowRef.current = rowEl;
            setHoveredRow({ rowIdx, element: rowEl });
        };

        const onPointerLeave = (e) => leaveUnlessInside(e, containerRef, buttonsRef, historyButtonRef);

        container.addEventListener("pointerover", onPointerOver);
        container.addEventListener("pointerleave", onPointerLeave);
        return () => {
            container.removeEventListener("pointerover", onPointerOver);
            container.removeEventListener("pointerleave", onPointerLeave);
        };
        // displayRows: the container can be re-mounted when the tab changes
    }, [rowIdxByElement, displayRows, leaveUnlessInside]);

    // Pass to the grid's onScroll: virtualisation can unmount the hovered row mid-scroll.
    const handleGridScroll = useCallback(() => {
        scrollingRef.current = true;
        clearTimeout(scrollTimer.current);
        scrollTimer.current = setTimeout(() => {
            scrollingRef.current = false;
        }, 120);
        if (hoveredRowRef.current) clearHover();
    }, [clearHover]);

    return {
        containerRef,
        buttonsRef,
        historyButtonRef,
        rowIdxByElement,
        hoveredRow,
        handleButtonsPointerLeave: (e) => leaveUnlessInside(e, containerRef, historyButtonRef),
        handleHistoryButtonPointerLeave: (e) => leaveUnlessInside(e, containerRef, buttonsRef),
        handleGridScroll,
    };
}