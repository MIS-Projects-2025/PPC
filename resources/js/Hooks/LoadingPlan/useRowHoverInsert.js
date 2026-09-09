import { useEffect, useRef, useState } from "react";

export function useRowHoverInsert(displayRows) {
    const containerRef = useRef(null);
    const buttonsRef = useRef(null);
    const historyButtonRef = useRef(null);
    const hoveredRowRef = useRef(null);
    const rowIdxByElement = useRef(new WeakMap()).current;

    const [hoveredRow, setHoveredRow] = useState(null);
    const [lastHoveredRow, setLastHoveredRow] = useState(null);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        function handlePointerOver(e) {
            const rowEl = e.target.closest(".rdg-row");
            if (!rowEl || rowEl === hoveredRowRef.current) return;
            const rowIdx = rowIdxByElement.get(rowEl);
            if (rowIdx === undefined) return;

            const displayRow = displayRows[rowIdx];
            const machine = displayRow?.machine;

            // if (! machine) {
            //     // there's no insertion on unassigned rows.
            //     return;
            // }

            if (displayRow) {
                setLastHoveredRow(displayRows[rowIdx]);
            }

            hoveredRowRef.current = rowEl;
            setHoveredRow({ rowIdx, element: rowEl });
        }

        function handlePointerLeave(e) {
            // Check if cursor moved into the floating buttons, the history
            // button, or back into the container itself.
            const movedTo = e.relatedTarget;
            const staysWithinUi =
                container?.contains(movedTo) ||
                buttonsRef.current?.contains(movedTo) ||
                historyButtonRef.current?.contains(movedTo);

            if (staysWithinUi) {
                return; // Stop here! Don't clear hover if we're hovering the buttons.
            }

            hoveredRowRef.current = null;
            setHoveredRow(null);
        }

        container.addEventListener("pointerover", handlePointerOver);
        container.addEventListener("pointerleave", handlePointerLeave);
        return () => {
            container.removeEventListener("pointerover", handlePointerOver);
            container.removeEventListener("pointerleave", handlePointerLeave);
        };
    }, [rowIdxByElement, displayRows]);

    function handleButtonsPointerLeave(e) {
        // Fired when the pointer leaves the insert-buttons wrapper. Don't
        // clear hover if it's headed back into the grid container or over
        // to the history button.
        const movedTo = e.relatedTarget;
        const staysWithinUi =
            containerRef.current?.contains(movedTo) ||
            historyButtonRef.current?.contains(movedTo);

        if (staysWithinUi) return;

        hoveredRowRef.current = null;
        setHoveredRow(null);
    }

    function handleHistoryButtonPointerLeave(e) {
        // Fired when the pointer leaves the history button. Don't clear
        // hover if it's headed back into the grid container or over to
        // the insert buttons.
        const movedTo = e.relatedTarget;
        const staysWithinUi =
            containerRef.current?.contains(movedTo) ||
            buttonsRef.current?.contains(movedTo);

        if (staysWithinUi) return;

        hoveredRowRef.current = null;
        setHoveredRow(null);
    }

    // Virtualization can unmount the hovered row mid-scroll — call this
    // from the grid's onScroll so we bail out if the anchor got ripped
    // out of the DOM.
    function handleGridScroll() {
        if (hoveredRowRef.current && !hoveredRowRef.current.isConnected) {
            hoveredRowRef.current = null;
            setHoveredRow(null);
        }
    }

    return {
        containerRef,
        buttonsRef,
        historyButtonRef,
        rowIdxByElement,
        hoveredRow,
        lastHoveredRow,
        handleButtonsPointerLeave,
        handleHistoryButtonPointerLeave,
        handleGridScroll,
    };
}