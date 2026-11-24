import { HEADER_ROW_HEIGHT, ROW_HEIGHT } from "@/Constants/LoadingPlan/constants";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

const EASING = "cubic-bezier(0.2, 0, 0, 1)";
const TRANSITION = `transform 150ms ${EASING}`;

// the gap: a placeholder living inside the grid's scroll content, independent of virtualisation
const MARKER_STYLE = {
    position: "absolute",
    left: "0",
    zIndex: "1",
    pointerEvents: "none",
    boxSizing: "border-box",
    border: "2px dashed var(--color-primary)",
    background: "color-mix(in oklab, var(--color-primary) 12%, transparent)",
    transition: `top 150ms ${EASING}`,
};

/**
 * Where would every row go if the dragged group were dropped on `overKey`?
 * Mirrors placeRows() in useDragReorder.
 * Returns { shifts: Map<rowKey, { dy, ghost }>, gapAt, count } or null.
 */
function planShifts(rows, groupIds, overKey) {
    const target = rows.find((r) => String(r.id) === overKey);
    if (!target || target.__type === "header" || groupIds.has(overKey)) return null;
    if (target.machine === null) return null;

    const oldIdx = new Map(rows.map((r, i) => [String(r.id), i]));
    const group = rows.filter((r) => groupIds.has(String(r.id)));
    if (!group.length) return null;

    const lane = (r) => `${r.machine}|${r.bucket_id ?? ""}`;
    const targetIdx = oldIdx.get(overKey);
    const movingDown =
        group.every((r) => lane(r) === lane(target)) &&
        group.every((r) => oldIdx.get(String(r.id)) < targetIdx);

    const rest = rows.filter((r) => !groupIds.has(String(r.id)));
    const at = rest.indexOf(target) + (movingDown ? 1 : 0);
    const next = [...rest.slice(0, at), ...group, ...rest.slice(at)];

    const shifts = new Map();
    next.forEach((r, i) => {
        const key = String(r.id);
        const dy = (i - oldIdx.get(key)) * ROW_HEIGHT;
        const ghost = groupIds.has(key);
        if (dy || ghost) shifts.set(key, { dy, ghost });
    });
    return { shifts, gapAt: at, count: group.length };
}

export function useDragPreview({ containerRef, displayRows, getGroupIds }) {
    const rowsRef = useRef(displayRows);
    rowsRef.current = displayRows;

    const planRef = useRef(null);
    const gapRef = useRef(null); // { at, count }
    const markerRef = useRef(null);
    const touchedRef = useRef(new Set());
    const observerRef = useRef(null);
    const timerRef = useRef(0);
    const finishedRef = useRef(false);
    const activeRef = useRef(false); // a drag is in progress (start() .. release())
    const bailRef = useRef(null); // pointerup fallback listener
    const dragIdRef = useRef(0);

    const drawMarker = useCallback(() => {
        const grid = containerRef.current?.querySelector(".rdg");
        const gap = gapRef.current;

        if (!grid || !gap) {
            markerRef.current?.remove();
            markerRef.current = null;
            return;
        }

        let m = markerRef.current;
        if (!m || m.parentElement !== grid) {
            m?.remove();
            m = document.createElement("div");
            m.setAttribute("data-drag-gap", ""); // lets the sweep find a stray marker
            Object.assign(m.style, MARKER_STYLE);
            m.style.top = `${HEADER_ROW_HEIGHT + gap.at * ROW_HEIGHT}px`; // set before append: no slide-in
            grid.appendChild(m);
            markerRef.current = m;
        }
        m.style.top = `${HEADER_ROW_HEIGHT + gap.at * ROW_HEIGHT}px`;
        m.style.height = `${gap.count * ROW_HEIGHT}px`;
        m.style.width = `${grid.scrollWidth}px`;
    }, [containerRef]);

    // Safety net. Everything this hook writes (inline transform/opacity/transition, the gap marker)
    // lives outside React, so a missed cleanup leaves rows invisible or offset until a full page
    // reload. Clears anything stray; only called while no drag is running.
    const sweepStray = useCallback(() => {
        const container = containerRef.current;
        if (!container) return;

        let cleared = 0;
        container.querySelectorAll("[data-flip-key]").forEach((el) => {
            if (!el.style.transform && !el.style.opacity && !el.style.transition) return;
            el.style.transform = "";
            el.style.opacity = "";
            el.style.transition = "";
            cleared += 1;
        });
        container.querySelectorAll("[data-drag-gap]").forEach((el) => {
            if (el !== markerRef.current) el.remove();
        });

        if (cleared) console.warn(`[loading-plan] drag preview left inline styles on ${cleared} row(s); cleared.`);
    }, [containerRef]);

    // `instant`: called because the DOM changed (autoscroll mounted rows), not because `over` changed
    const apply = useCallback(
        (instant = false) => {
            const container = containerRef.current;
            const plan = planRef.current;
            if (!container || !plan) return;
            const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
            const transition = reduce ? "none" : TRANSITION;

            container.querySelectorAll("[data-flip-key]").forEach((el) => {
                const p = plan.get(el.dataset.flipKey);
                const fresh = !touchedRef.current.has(el);
                const skipSlide = instant && fresh; // newly mounted row: start in its shifted spot

                el.style.transition = skipSlide ? "none" : transition;
                el.style.transform = p?.dy && !p.ghost ? `translateY(${p.dy}px)` : "";
                el.style.opacity = p?.ghost ? "0" : ""; // the gap marker replaces the ghost
                touchedRef.current.add(el);

                if (skipSlide) {
                    requestAnimationFrame(() =>
                        requestAnimationFrame(() => {
                            if (touchedRef.current.has(el)) el.style.transition = transition;
                        }),
                    );
                }
            });
            drawMarker();
        },
        [containerRef, drawMarker],
    );

    const restore = useCallback(() => {
        touchedRef.current.forEach((el) => {
            el.style.transform = "";
            el.style.opacity = "";
        });
        gapRef.current = null;
        drawMarker();
    }, [drawMarker]);

    const release = useCallback(
        (animate) => {
            clearTimeout(timerRef.current);
            finishedRef.current = false;
            activeRef.current = false;
            if (bailRef.current) {
                window.removeEventListener("pointerup", bailRef.current, true);
                window.removeEventListener("pointercancel", bailRef.current, true);
                bailRef.current = null;
            }
            observerRef.current?.disconnect();
            observerRef.current = null;
            planRef.current = null;
            gapRef.current = null;
            markerRef.current?.remove();
            markerRef.current = null;

            const els = [...touchedRef.current];
            touchedRef.current = new Set();
            els.forEach((el) => {
                el.style.transform = "";
                el.style.opacity = "";
                if (!animate) el.style.transition = "";
            });
            if (animate) setTimeout(() => els.forEach((el) => (el.style.transition = "")), 220);
        },
        [],
    );

    const start = useCallback(() => {
        release(false);
        const container = containerRef.current;
        if (!container) return;
        activeRef.current = true;
        // dnd-kit calls finish()/cancel() right after pointerup. If it never does (lost event, an error
        // in a handler), undo the preview ourselves so rows can't stay hidden or shifted.
        const dragId = ++dragIdRef.current;
        const bail = () =>
            setTimeout(() => {
                if (dragIdRef.current === dragId && activeRef.current && !finishedRef.current) release(true);
            }, 400);
        bailRef.current = bail;
        window.addEventListener("pointerup", bail, true);
        window.addEventListener("pointercancel", bail, true);
        // rows that scroll into view (virtualisation) mid-drag must get their shift too
        observerRef.current = new MutationObserver(() => apply(true));
        observerRef.current.observe(container, { childList: true, subtree: true });
    }, [containerRef, apply, release]);

    const over = useCallback(
        ({ active, over: o }) => {
            if (!o) {
                // the pointer left every drop target: put the rows back instead of freezing the last preview
                planRef.current = null;
                restore();
                return;
            }
            const overId = String(o.id);
            const result = overId.startsWith("row-")
                ? planShifts(
                      rowsRef.current,
                      new Set(getGroupIds(active.id).map(String)),
                      overId.slice("row-".length),
                  )
                : null;

            planRef.current = result?.shifts ?? null;
            gapRef.current = result ? { at: result.gapAt, count: result.count } : null;
            if (result) apply(false);
            else restore();
        },
        [getGroupIds, apply, restore],
    );

    const finish = useCallback(() => {
        const had = !!planRef.current;
        observerRef.current?.disconnect();
        observerRef.current = null;
        finishedRef.current = true;
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => release(true), 150);
        return had;
    }, [release]);

    const cancel = useCallback(() => release(true), [release]);

    useLayoutEffect(() => {
        if (finishedRef.current) release(false);
        else if (!activeRef.current) sweepStray();
    }, [displayRows, release, sweepStray]);

    useEffect(
        () => () => {
            clearTimeout(timerRef.current);
            observerRef.current?.disconnect();
            if (bailRef.current) {
                window.removeEventListener("pointerup", bailRef.current, true);
                window.removeEventListener("pointercancel", bailRef.current, true);
            }
            markerRef.current?.remove();
        },
        [],
    );

    return { start, over, finish, cancel };
}