import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Refs Deemo needs to wire the grid up. Holds NO state, so calling this in Deemo
 * never causes a Deemo re-render.
 *
 *  - attach `containerRef` to the element wrapping <DataGrid> (RowHoverTools lives inside it)
 *  - `rowIdxByElement` is filled by DroppableRow
 */
export function useRowHoverRefs() {
    const containerRef = useRef(null);
    const rowIdxByElement = useRef(new WeakMap()).current;
    return { containerRef, rowIdxByElement };
}

/**
 * Tracks which grid row the pointer is over (for the floating insert/history buttons).
 *
 * Call this from <RowHoverTools>, NOT from the page component: `hoveredRow` changes every time
 * the pointer crosses a row, and when the state lived in Deemo that re-rendered the whole page
 * (grid, toolbars, every modal) on each row crossing, including during drag & drop.
 *
 * `disabled` (e.g. while dragging) clears the hover and stops listening.
 */
export function useRowHoverInsert({ containerRef, rowIdxByElement, disabled = false }) {
    const buttonsRef = useRef(null);
    const historyButtonRef = useRef(null);
    const hoveredRowRef = useRef(null);
    const scrollingRef = useRef(false);
    const scrollTimer = useRef(0);

    const [hoveredRow, setHoveredRow] = useState(null);

    const clearHover = useCallback(() => {
        hoveredRowRef.current = null;
        setHoveredRow(null); // no-op (bail-out) when it is already null
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

        if (disabled) {
            clearHover();
            return;
        }

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

        // Virtualisation can unmount the hovered row mid-scroll. `scroll` doesn't bubble, so listen
        // in the capture phase (this replaces the <DataGrid onScroll> prop).
        const onScroll = () => {
            scrollingRef.current = true;
            clearTimeout(scrollTimer.current);
            scrollTimer.current = setTimeout(() => {
                scrollingRef.current = false;
            }, 120);
            if (hoveredRowRef.current) clearHover();
        };

        container.addEventListener("pointerover", onPointerOver);
        container.addEventListener("pointerleave", onPointerLeave);
        container.addEventListener("scroll", onScroll, { capture: true, passive: true });
        return () => {
            clearTimeout(scrollTimer.current);
            container.removeEventListener("pointerover", onPointerOver);
            container.removeEventListener("pointerleave", onPointerLeave);
            container.removeEventListener("scroll", onScroll, { capture: true });
        };
    }, [containerRef, rowIdxByElement, disabled, clearHover, leaveUnlessInside]);

    return {
        hoveredRow,
        buttonsRef,
        historyButtonRef,
        handleButtonsPointerLeave: (e) => leaveUnlessInside(e, containerRef, historyButtonRef),
        handleHistoryButtonPointerLeave: (e) => leaveUnlessInside(e, containerRef, buttonsRef),
    };
}