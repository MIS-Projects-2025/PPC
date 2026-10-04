import { BAKE_COLUMNS, DATA_COLUMNS } from "@/Components/LoadingPlan/columns";
import { ROW_HEIGHT } from "@/Constants/LoadingPlan/constants";
import { isBlockRow } from "@/Lib/LoadingPlan/helpers";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

// Keep in sync with Deemo.jsx (ideally move all three to Constants/LoadingPlan/constants).
const ALL_PACKAGES_TAB = "ALL PACKAGE";
const RES_TAB = "RES";
const RES_STATION = "GTTRES_T";
const isResRow = (r) => r.station === RES_STATION;

// Internal ids are in the column lists but aren't something a user types.
const NON_SEARCHABLE = new Set(["id", "entry_id"]);

const byBucketPosition = (a, b) => (a.bucket_position ?? 0) - (b.bucket_position ?? 0);

// ---------------------------------------------------------------------
// What the cell SHOWS, not what the row stores. This is the one place to
// align with columns.js (block rows blank most cells, machine null renders
// "Unassigned"). If TimeCell / StatusBadge / LotIdCell / DoableCell show
// text that differs from the raw field, map it here.
// ---------------------------------------------------------------------
function cellText(row, key, bake) {
    if (bake) return row[key];
    if (isBlockRow(row)) {
        if (key === "part_name" || key === "lot_id") return row.block_label;
        if (key === "accu_time" || key === "time_start" || key === "time_end") return row[key];
        return null;
    }
    if (key === "machine") return row.machine ?? "Unassigned";
    return row[key];
}

const compact = (s) => s.replace(/[\s\-_]/g, ""); // "ABC-123" ~ "ABC123"

function buildCells(row, keys, bake) {
    const cells = [];
    for (const key of keys) {
        const v = cellText(row, key, bake);
        if (v === null || v === undefined || v === "") continue;
        const text = String(v).toLowerCase();
        cells.push({ key, text, flat: compact(text) });
    }
    return cells;
}

// Every term must hit some cell in the row; returns the column of the first
// term's hit (that's the cell we highlight), or null if the row doesn't match.
function findColumn(cells, terms) {
    let first = null;
    for (const t of terms) {
        const flatT = compact(t);
        const hit = cells.find(
            (c) => c.text.includes(t) || (flatT.length >= 3 && c.flat.includes(flatT)),
        );
        if (!hit) return null;
        first ??= hit.key;
    }
    return first;
}

/**
 * `highlightedMatch` is owned by the parent (columns need it to style the
 * cell). The highlight now stays on the current match until the search is
 * closed or the query is cleared — no timer.
 *
 * Scope: the ACTIVE tab, in on-screen order, including rows inside
 * collapsed machines / buckets / ovens (they get expanded on jump). If the
 * active tab has zero matches, `elsewhere` lists tabs that do.
 */
export function useTableSearch({
    activePackage,
    setActivePackage,
    dataRows,
    bakeLots,
    displayRows,
    bakeDisplayRows,
    columns,
    bakeColumns,
    rowInActiveTab,
    isParked,
    bucketList,
    collapsedMachines,
    setCollapsedMachines,
    collapsedOvens,
    setCollapsedOvens,
    hiddenColumnKeys, // Set of data-column keys currently shrunk to the sliver
    setHighlightedMatch,
    gridRef,
}) {
    const isBake = activePackage === "Bake";

    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchMatchIndex, setSearchMatchIndex] = useState(0);
    const [scrollTarget, setScrollTarget] = useState(null); // { rowId, columnKey, nonce, attempts }
    const searchInputRef = useRef(null);
    const scrollNonce = useRef(0);
    const currentKeyRef = useRef(null);
    const pendingJumpRef = useRef(false);

    const deferredQuery = useDeferredValue(searchQuery);
    const terms = useMemo(
        () => deferredQuery.trim().toLowerCase().split(/\s+/).filter(Boolean),
        [deferredQuery],
    );

    const searchableKeys = useMemo(
        () =>
            (isBake ? BAKE_COLUMNS : DATA_COLUMNS)
                .map((c) => c.key)
                .filter(
                    (k) =>
                        !NON_SEARCHABLE.has(k) &&
                        (isBake || !hiddenColumnKeys?.has(k)), // collapsed columns show nothing to highlight
                ),
        [isBake, hiddenColumnKeys],
    );

    // Rows in on-screen order. Collapsed headers contribute the rows they hide,
    // tagged with the collapse keys to open when we jump to them.
    const candidates = useMemo(() => {
        if (!searchOpen) return [];
        const out = [];

        if (isBake) {
            bakeDisplayRows.forEach((row) => {
                if (row.__type === "data") out.push({ row, expand: [] });
                else if (row.__type === "header" && row.__isCollapsed) {
                    (bakeLots ?? []).forEach((r) => {
                        if (r.oven_num === row.ovenLabel) out.push({ row: r, expand: [row.ovenLabel] });
                    });
                }
            });
            return out;
        }

        const onUnassignedTab = activePackage === "Unassigned";
        const machineRowVisible = (r) =>
            onUnassignedTab ? !isResRow(r) : isBlockRow(r) || rowInActiveTab(r);
        const bucketRowVisible = (r) => (onUnassignedTab ? !isResRow(r) : rowInActiveTab(r));

        displayRows.forEach((row) => {
            if (row.__type === "data") {
                out.push({ row, expand: [] });
                return;
            }
            if (row.__type !== "header" || !row.__isCollapsed) return;

            if (row.__headerKind === "bucket") {
                dataRows
                    .filter((r) => r.bucket_id === row.bucketId && bucketRowVisible(r))
                    .sort(byBucketPosition)
                    .forEach((r) => out.push({ row: r, expand: [row.collapseKey] }));
                return;
            }

            const m = row.machine;
            dataRows
                .filter((r) => r.machine === m && !isParked(r) && machineRowVisible(r))
                .forEach((r) => out.push({ row: r, expand: [m] }));

            // A collapsed machine also hides the groups nested under it.
            if (m !== null && !onUnassignedTab) {
                (bucketList ?? [])
                    .filter((b) => (b.machine ?? null) === m)
                    .forEach((b) => {
                        dataRows
                            .filter((r) => r.bucket_id === b.id && bucketRowVisible(r))
                            .sort(byBucketPosition)
                            .forEach((r) => out.push({ row: r, expand: [m, `bucket:${b.id}`] }));
                    });
            }
        });
        return out;
    }, [
        searchOpen,
        isBake,
        activePackage,
        displayRows,
        bakeDisplayRows,
        dataRows,
        bakeLots,
        bucketList,
        isParked,
        rowInActiveTab,
    ]);

    // Per-row searchable text — rebuilt only when rows/columns change, not per keystroke.
    const indexed = useMemo(
        () => candidates.map((c) => ({ ...c, cells: buildCells(c.row, searchableKeys, isBake) })),
        [candidates, searchableKeys, isBake],
    );

    const searchMatches = useMemo(() => {
        if (!terms.length) return [];
        const out = [];
        indexed.forEach(({ row, expand, cells }) => {
            const columnKey = findColumn(cells, terms);
            if (columnKey) out.push({ key: `${row.id}:${columnKey}`, rowId: row.id, columnKey, expand });
        });
        return out;
    }, [indexed, terms]);

    // Nothing on this tab? Say where the hits are instead of a dead "0/0".
    const elsewhere = useMemo(() => {
        if (!searchOpen || !terms.length || isBake || searchMatches.length > 0) return [];
        let res = 0;
        let other = 0;
        for (const row of dataRows) {
            if (!findColumn(buildCells(row, searchableKeys, false), terms)) continue;
            if (isResRow(row)) res++;
            else other++;
        }
        const out = [];
        if (res && activePackage !== RES_TAB) out.push({ tab: RES_TAB, label: "RES", count: res });
        if (other && activePackage !== ALL_PACKAGES_TAB)
            out.push({ tab: ALL_PACKAGES_TAB, label: "ALL PACKAGE", count: other });
        return out;
    }, [searchOpen, terms, isBake, searchMatches.length, dataRows, searchableKeys, activePackage]);

    const goToMatch = useCallback(
        (idx) => {
            const n = searchMatches.length;
            if (n === 0) return;
            const wrapped = ((idx % n) + n) % n;
            const match = searchMatches[wrapped];

            currentKeyRef.current = match.key;
            setSearchMatchIndex(wrapped);

            if (match.expand.length) {
                const current = isBake ? collapsedOvens : collapsedMachines;
                const setCurrent = isBake ? setCollapsedOvens : setCollapsedMachines;
                if (match.expand.some((k) => current.has(k))) {
                    setCurrent((prev) => {
                        const next = new Set(prev);
                        match.expand.forEach((k) => next.delete(k));
                        return next;
                    });
                }
            }

            scrollNonce.current += 1;
            setScrollTarget({
                rowId: match.rowId,
                columnKey: match.columnKey,
                nonce: scrollNonce.current,
                attempts: 0,
            });
        },
        [searchMatches, isBake, collapsedMachines, setCollapsedMachines, collapsedOvens, setCollapsedOvens],
    );

    // New query → first match. (Declared before the realign effect: same commit, this runs first.)
    useEffect(() => {
        pendingJumpRef.current = terms.length > 0;
        if (terms.length === 0) {
            currentKeyRef.current = null;
            setHighlightedMatch(null);
        }
    }, [terms, setHighlightedMatch]);

    // Match list changed (query, tab, data edit, expand): jump if a jump is pending,
    // otherwise keep pointing at the same match by key instead of by position.
    useEffect(() => {
        if (searchMatches.length === 0) {
            pendingJumpRef.current = false;
            setSearchMatchIndex(0);
            return;
        }
        if (pendingJumpRef.current) {
            pendingJumpRef.current = false;
            goToMatch(0);
            return;
        }
        const i = currentKeyRef.current
            ? searchMatches.findIndex((m) => m.key === currentKeyRef.current)
            : -1;
        setSearchMatchIndex(i >= 0 ? i : (prev) => Math.min(prev, searchMatches.length - 1));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchMatches]);

    const findNext = useCallback(() => goToMatch(searchMatchIndex + 1), [goToMatch, searchMatchIndex]);
    const findPrev = useCallback(() => goToMatch(searchMatchIndex - 1), [goToMatch, searchMatchIndex]);

    const goElsewhere = useCallback(
        (tab) => {
            console.log("🚀 ~ useTableSearch ~ tab:", tab)
            pendingJumpRef.current = true;
            setActivePackage(tab);
        },
        [setActivePackage],
    );

    const closeSearch = useCallback(() => {
        setSearchOpen(false);
        setSearchQuery("");
        setHighlightedMatch(null);
        setScrollTarget(null);
        currentKeyRef.current = null;
        pendingJumpRef.current = false;
    }, [setHighlightedMatch]);

    const openSearch = useCallback(() => {
        setSearchOpen(true);
        requestAnimationFrame(() => {
            searchInputRef.current?.focus();
            searchInputRef.current?.select();
        });
    }, []);

    // Scroll + highlight. If the row isn't in the grid yet (a collapse-state update can
    // land a render late) retry a couple of times, then drop the target so it can never
    // fire later on an unrelated displayRows change.
    useEffect(() => {
        if (!scrollTarget) return;

        const rows = isBake ? bakeDisplayRows : displayRows;
        const rowIdx = rows.findIndex((r) => r.id === scrollTarget.rowId);
        if (rowIdx === -1) {
            setScrollTarget(
                scrollTarget.attempts >= 2 ? null : { ...scrollTarget, attempts: scrollTarget.attempts + 1 },
            );
            return;
        }

        const cols = isBake ? bakeColumns : columns;
        const colIdx = cols.findIndex((c) => c.key === scrollTarget.columnKey);

        gridRef.current?.scrollToCell?.({ rowIdx, idx: colIdx > -1 ? colIdx : 0 });
        const el = gridRef.current?.element;
        if (el) {
            // Center the row in the area BELOW the sticky header (header height === ROW_HEIGHT).
            el.scrollTop = Math.max(
                0,
                rowIdx * ROW_HEIGHT + ROW_HEIGHT / 2 - (el.clientHeight - ROW_HEIGHT) / 2,
            );
        }

        setHighlightedMatch({ rowId: scrollTarget.rowId, columnKey: scrollTarget.columnKey });
        setScrollTarget(null);
    }, [scrollTarget, displayRows, bakeDisplayRows, isBake, columns, bakeColumns, gridRef, setHighlightedMatch]);

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
        elsewhere,
        goElsewhere,
        searchInputRef,
    };
}