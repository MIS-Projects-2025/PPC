import { DATA_COLUMN_KEYS } from "@/Lib/LoadingPlan/columnConfig";
import {
    COLLAPSE_HINT_THRESHOLD,
    MIN_COLUMN_WIDTH,
    computeAutoWidths,
    loadColumnWidths,
    saveColumnWidths,
    sameRecord,
    sameWidthMap,
} from "@/Lib/LoadingPlan/columnSizing";
import { DATA_COLUMNS } from "@/Lib/LoadingPlan/columnConfig";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_COL_WIDTH = 120;

/**
 * Column sizing for the machine grid:
 *  - auto-fit widths from content
 *  - user resize overrides (persisted)
 *  - "hidden" = shrunk to a thin sliver (resize to the floor, or toggle in the Columns modal)
 *  - double-click a header to drop the override
 */
export function useColumnWidths({ columns, data, getMachineLabel, location }) {
    // widths live together with the location they belong to, so a save can never write
    // one location's widths under the other location's key
    const [state, setState] = useState(() => ({ location, widths: loadColumnWidths(location) }));

    // Inertia keeps this component mounted when the location changes, so reload during render
    // (React's supported "adjust state on prop change" pattern: no frame with stale widths)
    let current = state;
    if (state.location !== location) {
        current = { location, widths: loadColumnWidths(location) };
        setState(current);
    }
    const columnWidths = current.widths;

    // same call signature as before, so the callbacks below don't change
    const setColumnWidths = useCallback((updater) => {
        setState((s) => {
            const widths = typeof updater === "function" ? updater(s.widths) : updater;
            return widths === s.widths ? s : { ...s, widths };
        });
    }, []);

    const columnWidthsRef = useRef(columnWidths);
    columnWidthsRef.current = columnWidths;

    const [measuredWidths, setMeasuredWidths] = useState(() => new Map());
    const measuredWidthsRef = useRef(measuredWidths);
    measuredWidthsRef.current = measuredWidths;

    // re-measure once web fonts are ready
    const [fontTick, setFontTick] = useState(0);
    useEffect(() => {
        document.fonts?.ready?.then(() => setFontTick((t) => t + 1));
    }, []);

    useEffect(() => {
        const t = setTimeout(() => saveColumnWidths(state.widths, state.location), 300);
        return () => clearTimeout(t);
    }, [state]);

    // ── auto-fit (referentially stable when nothing changed) ─────────────
    const autoWidthsRef = useRef({});
    const autoWidths = useMemo(() => {
        const next = computeAutoWidths(data ?? [], DATA_COLUMNS, getMachineLabel);
        if (sameRecord(autoWidthsRef.current, next)) return autoWidthsRef.current;
        autoWidthsRef.current = next;
        return next;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, getMachineLabel, fontTick]);

    // ── hidden / visible ─────────────────────────────────────────────────
    const isColumnHidden = useCallback(
        (key) => (columnWidths[key] ?? Infinity) <= COLLAPSE_HINT_THRESHOLD,
        [columnWidths],
    );

    const hiddenColumnKeys = useMemo(
        () => new Set(Object.entries(columnWidths).filter(([, w]) => w <= COLLAPSE_HINT_THRESHOLD).map(([k]) => k)),
        [columnWidths],
    );

    const toggleColumnVisibility = useCallback((key) => {
        setColumnWidths((prev) => {
            const next = { ...prev };
            if ((prev[key] ?? Infinity) <= COLLAPSE_HINT_THRESHOLD) delete next[key]; // back to auto-fit
            else next[key] = MIN_COLUMN_WIDTH;
            return next;
        });
    }, []);

    const showAllColumns = useCallback(() => {
        setColumnWidths((prev) => {
            const next = Object.fromEntries(Object.entries(prev).filter(([, w]) => w > COLLAPSE_HINT_THRESHOLD));
            return Object.keys(next).length === Object.keys(prev).length ? prev : next;
        });
    }, []);

    const resetColumnWidth = useCallback((key) => {
        setColumnWidths((prev) => {
            if (!(key in prev)) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
    }, []);

    // ── controlled width map for <DataGrid> ──────────────────────────────
    const gridColumnWidths = useMemo(() => {
        const map = new Map(measuredWidths);
        for (const [key, width] of Object.entries(columnWidths)) map.set(key, { type: "resized", width });
        return map;
    }, [measuredWidths, columnWidths]);

    // The grid reports its whole map here: split it, normalise, and only touch
    // state when something really changed (that's what prevents an update loop).
    const onColumnWidthsChange = useCallback((next) => {
        const resized = {};
        const measured = new Map();
        next.forEach((entry, key) => {
            if (DATA_COLUMN_KEYS.has(key) && entry.type === "resized") {
                resized[key] = entry.width <= COLLAPSE_HINT_THRESHOLD ? MIN_COLUMN_WIDTH : entry.width;
            } else {
                measured.set(key, entry);
            }
        });
        if (!sameRecord(columnWidthsRef.current, resized)) setColumnWidths(resized);
        if (!sameWidthMap(measuredWidthsRef.current, measured)) setMeasuredWidths(measured);
    }, []);

    // ── decorate columns: widths, hidden styling, double-click header ─────
    const decoratedColumns = useMemo(
        () =>
            columns.map((col) => {
                if (!col.key || !DATA_COLUMN_KEYS.has(col.key)) return col;

                const override = columnWidths[col.key];
                const isCollapsed = override !== undefined && override <= COLLAPSE_HINT_THRESHOLD;
                const OriginalHeader = col.renderHeaderCell;

                return {
                    ...col,
                    width: override ?? autoWidths[col.key] ?? col.width ?? DEFAULT_COL_WIDTH,
                    minWidth: MIN_COLUMN_WIDTH,
                    resizable: col.resizable ?? true,
                    headerCellClass: clsx(col.headerCellClass, isCollapsed && "bg-warning/20"),
                    cellClass: (row) =>
                        clsx(
                            typeof col.cellClass === "function" ? col.cellClass(row) : col.cellClass,
                            isCollapsed && "!p-0 overflow-hidden bg-warning/5",
                        ),
                    renderHeaderCell: (props) => (
                        <div
                            className="h-full w-full flex items-center overflow-hidden select-none"
                            onDoubleClick={() => resetColumnWidth(col.key)}
                            title={isCollapsed ? `${col.name ?? col.key} — hidden, double-click to restore` : undefined}
                        >
                            {isCollapsed ? (
                                <span className="mx-auto w-1 h-3.5 rounded-full bg-warning" />
                            ) : OriginalHeader ? (
                                OriginalHeader(props)
                            ) : (
                                <span className="truncate px-1 text-xs">{props.column.name}</span>
                            )}
                        </div>
                    ),
                };
            }),
        [columns, columnWidths, autoWidths, resetColumnWidth],
    );

    return {
        decoratedColumns,
        gridColumnWidths,
        onColumnWidthsChange,
        hiddenColumnKeys,
        hasHiddenColumns: hiddenColumnKeys.size > 0,
        isColumnHidden,
        toggleColumnVisibility,
        showAllColumns,
    };
}