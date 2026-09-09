import { BAKE_COLUMNS, DATA_COLUMNS } from "@/Components/LoadingPlan/columns";
import { ROW_HEIGHT } from "@/Constants/LoadingPlan/constants";
import { isBlockRow } from "@/Lib/LoadingPlan/helpers";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * `highlightedMatch` is threaded in/out rather than owned by this hook.
 * Reason: `columns`/`bakeColumns` (built in the parent via makeColumns/
 * makeBakeColumns) need the *current* highlightedMatch value to style the
 * matched cell, but this hook's scroll-to-match effect needs the
 * *resulting* `columns`/`displayRows` to know where to scroll. Those two
 * facts can't both be true if this hook also owns the state — the parent
 * would need the hook's output before it can produce the hook's input.
 * Owning highlightedMatch in the parent breaks that cycle: the parent
 * computes columns from state it already holds, then hands the finished
 * columns/displayRows into this hook for the scroll effect.
 */
export function useTableSearch({
    activePackage,
    dataRows,
    bakeLots,
    activePackageGroup,
    displayRows,
    bakeDisplayRows,
    columns,
    bakeColumns,
    collapsedMachines,
    setCollapsedMachines,
    highlightedMatch,
    setHighlightedMatch,
    gridRef,
}) {
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchMatchIndex, setSearchMatchIndex] = useState(0);
    const [scrollTarget, setScrollTarget] = useState(null); // { rowId, columnKey, nonce }
    const searchInputRef = useRef(null);
    const scrollNonce = useRef(0);

    const searchableColumns = useMemo(
        () => (activePackage === "Bake" ? BAKE_COLUMNS : DATA_COLUMNS).map((c) => c.key),
        [activePackage],
    );

    // Same visibility rule displayRows uses, applied to raw dataRows so
    // search only surfaces rows that can actually be scrolled to right now.
    const searchVisibleRows = useMemo(() => {
        if (activePackage === "Bake") return bakeLots ?? [];
        const activeList = activePackageGroup ?? [];
        return dataRows.filter((r) => isBlockRow(r) || activeList.includes(r.package_name));
    }, [activePackage, dataRows, bakeLots, activePackageGroup]);

    const searchMatches = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return [];
        const matches = [];
        searchVisibleRows.forEach((row) => {
            for (const key of searchableColumns) {
                const val = row[key];
                if (val !== null && val !== undefined && String(val).toLowerCase().includes(q)) {
                    matches.push({ rowId: row.id, machine: row.machine, columnKey: key });
                    break;
                }
            }
        });
        return matches;
    }, [searchQuery, searchVisibleRows, searchableColumns]);

    // Keep the index valid as the match list changes size.
    useEffect(() => {
        setSearchMatchIndex((i) => (searchMatches.length === 0 ? 0 : i % searchMatches.length));
    }, [searchMatches.length]);

    const goToMatch = useCallback(
        (idx) => {
            if (searchMatches.length === 0) return;
            const wrapped = ((idx % searchMatches.length) + searchMatches.length) % searchMatches.length;
            setSearchMatchIndex(wrapped);
            const match = searchMatches[wrapped];

            if (activePackage !== "Bake" && collapsedMachines.has(match.machine)) {
                setCollapsedMachines((prev) => {
                    const next = new Set(prev);
                    next.delete(match.machine);
                    return next;
                });
            }

            scrollNonce.current += 1;
            setScrollTarget({ ...match, nonce: scrollNonce.current });
        },
        [searchMatches, activePackage, collapsedMachines, setCollapsedMachines],
    );

    const findNext = useCallback(() => goToMatch(searchMatchIndex + 1), [goToMatch, searchMatchIndex]);
    const findPrev = useCallback(() => goToMatch(searchMatchIndex - 1), [goToMatch, searchMatchIndex]);

    const closeSearch = useCallback(() => {
        setSearchOpen(false);
        setSearchQuery("");
        setHighlightedMatch(null);
        setScrollTarget(null);
    }, [setHighlightedMatch]);

    const openSearch = useCallback(() => {
        setSearchOpen(true);
        requestAnimationFrame(() => searchInputRef.current?.focus());
    }, []);

    // Trigger the first jump as soon as a query starts producing matches.
    useEffect(() => {
        if (searchQuery.trim() && searchMatches.length > 0) {
            goToMatch(searchMatchIndex);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery]);

    // Scroll effect — scrolls to the match and sets the highlight.
    useEffect(() => {
        if (!scrollTarget) return;

        const rows = activePackage === "Bake" ? bakeDisplayRows : displayRows;
        const rowIdx = rows.findIndex((r) => r.id === scrollTarget.rowId);
        if (rowIdx === -1) return;

        const cols = activePackage === "Bake" ? bakeColumns : columns;
        const colIdx = cols.findIndex((c) => c.key === scrollTarget.columnKey);

        gridRef.current?.scrollToCell?.({ rowIdx, idx: colIdx > -1 ? colIdx : 0 });
        const el = gridRef.current?.element;
        if (el) {
            el.scrollTop = Math.max(0, rowIdx * ROW_HEIGHT - el.clientHeight / 2);
        }

        setHighlightedMatch({ rowId: scrollTarget.rowId, columnKey: scrollTarget.columnKey });
        setScrollTarget(null);
    }, [scrollTarget, displayRows, bakeDisplayRows, activePackage, columns, bakeColumns, gridRef, setHighlightedMatch]);

    // Separate effect, sole job: clear the highlight 1.5s after it's set.
    // Depends ONLY on highlightedMatch — untouched by columns/displayRows
    // recomputing, so nothing can cancel it early.
    useEffect(() => {
        if (!highlightedMatch) return;
        const t = setTimeout(() => setHighlightedMatch(null), 1500);
        return () => clearTimeout(t);
    }, [highlightedMatch, setHighlightedMatch]);

    return {
        searchOpen,
        openSearch,
        closeSearch,
        searchQuery,
        setSearchQuery,
        searchMatchIndex,
        matchCount: searchMatches.length,
        findNext,
        findPrev,
        searchInputRef,
    };
}
