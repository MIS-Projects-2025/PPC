import { ROW_HEIGHT } from "@/Constants/LoadingPlan/constants";
import { useCallback, useLayoutEffect, useRef } from "react";

const DURATION_MS = 180;
const EASING = "cubic-bezier(0.2, 0, 0, 1)";
const MAX_ROWS_SHIFT = 12;  // farther than this: let it jump instead of flying across the screen
const ARM_WINDOW_MS = 500;  // an arm only counts for the very next row change

/**
 * Slides rows to their new position after a reorder.
 * Call `armFlip()` right before the action that reorders rows (drop, transfer, undo...).
 * Rows in `skipIds` are not animated (e.g. the dragged rows, which DragOverlay animates itself).
 */
export function useRowFlip({ containerRef, displayRows, enabled = true }) {
    const prevRowsRef = useRef(displayRows);
    const armedRef = useRef(null);

    const armFlip = useCallback((skipIds = []) => {
        armedRef.current = { at: performance.now(), skip: new Set([...skipIds].map(String)) };
    }, []);

    useLayoutEffect(() => {
        const prevRows = prevRowsRef.current;
        prevRowsRef.current = displayRows;

        const armed = armedRef.current;
        armedRef.current = null;

        if (!enabled || !armed || prevRows === displayRows) return;
        if (performance.now() - armed.at > ARM_WINDOW_MS) return;
        if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

        const container = containerRef.current;
        if (!container) return;

        const indexMap = (rows) => new Map(rows.map((r, i) => [String(r.id), i]));
        const oldIdx = indexMap(prevRows);
        const newIdx = indexMap(displayRows);

        // only rows currently in the DOM (virtualised grid) are animated
        container.querySelectorAll("[data-flip-key]").forEach((el) => {
            const key = el.dataset.flipKey;
            if (armed.skip.has(key)) return;

            const from = oldIdx.get(key);
            const to = newIdx.get(key);
            if (from === undefined || to === undefined || from === to) return;
            if (Math.abs(from - to) > MAX_ROWS_SHIFT) return;

            el.getAnimations().forEach((a) => a.cancel());
            el.animate(
                [{ transform: `translateY(${(from - to) * ROW_HEIGHT}px)` }, { transform: "translateY(0)" }],
                { duration: DURATION_MS, easing: EASING },
            );
        });
    }, [displayRows, enabled, containerRef]);

    return { armFlip };
}