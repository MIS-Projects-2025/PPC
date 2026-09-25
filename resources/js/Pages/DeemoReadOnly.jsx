import DateNav from "@/Components/DateNav";
import { DATA_COLUMNS, TableActionsContext, makeBakeColumns, makeColumns } from "@/Components/LoadingPlan/columns";
import DataIntegrityModal, {
    DATA_INTEGRITY_MODAL_ID,
    TabBadge,
} from "@/Components/LoadingPlan/DataIntegrityModal";
import DisseminationSummaryModal, {
    DISSEMINATION_MODAL_ID,
} from "@/Components/LoadingPlan/DisseminationSummary";
import EntryHistoryModal from "@/Components/LoadingPlan/EntryHistoryModal";
import { MachineHeaderBar, TableInteractionContext } from "@/Components/LoadingPlan/MachineHeaderBar";
import { OvenHeaderCell } from "@/Components/LoadingPlan/OvenHeaderCell";
import ScrollableTabs from "@/Components/LoadingPlan/ScrollableTabs";
import { SearchBar } from "@/Components/LoadingPlan/SearchBar";
import { packagesInGroup as _packagesInGroup } from "@/Constants/loadingPlanPackageGroups.js"; // eslint-disable-line no-unused-vars -- kept for parity/reference, unused in read-only mode
import { MACHINE_MANUAL, hasTimeline } from "@/Constants/machines.js";
import { getStatusMessage } from "@/Constants/wipStatus.js";
import { useRowHoverInsert } from "@/Hooks/LoadingPlan/useRowHoverInsert";
import { useStickyGroupHeader } from "@/Hooks/LoadingPlan/useStickyGroupHeader";
import { useTableSearch } from "@/Hooks/LoadingPlan/useTableSearch";
import { isBlockRow } from "@/Lib/LoadingPlan/helpers";
import { downloadExcelBuffer, exportLoadingPlanToExcel } from "@/Lib/LoadingPlan/loadingPlanExcelExporter";
import { usePersistedSet } from "@/Store/usePersistedSet";
import { autoUpdate, offset, useFloating } from "@floating-ui/react";
import { router } from "@inertiajs/react";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DataGrid } from "react-data-grid";
import "react-data-grid/lib/styles.css";
import { createPortal } from "react-dom";
import { BsSearch } from "react-icons/bs";
import { GoAlert } from "react-icons/go";
import { PiOvenDuotone } from "react-icons/pi";

/**
 * DeemoReadOnly — view-only sibling of Deemo.jsx
 * -----------------------------------------------------------------------
 * Same visual/navigation shell (date nav, PL1/PL6 toggle, package tabs,
 * machine/oven sections, sticky headers, search, column show/hide,
 * Excel export) but with EVERY write path removed:
 *
 *   - no undo/redo store — `dataRows` is a plain useMemo off the `data`
 *     prop, never mutated locally
 *   - no DndContext / drag-reorder — dragHandle + select-row columns are
 *     filtered out of the grid entirely (see `toReadOnlyColumns`)
 *   - no cell editing — every column gets `editable: false` and its
 *     `renderEditCell` stripped, so double-click/enter can't open an
 *     inline editor even if columns.js defines one
 *   - no status-change dropdown — `handleStatusClick` is a no-op and
 *     there's no menu UI wired to it, so clicking a status badge does
 *     nothing rather than opening the "set status" popover
 *   - no bulk toolbar, no add-row/add-block, no split/merge, no
 *     scheduler-run button — those components/handlers are simply not
 *     rendered/imported
 *   - `onAddRow` / `onAddBlock` passed to TableInteractionContext are
 *     `undefined`, so MachineHeaderBar shouldn't render its add buttons
 *     for this view (verify it guards on their presence — if it always
 *     renders the buttons regardless, hide them there behind a
 *     `readOnly` prop instead)
 *   - `handleShowHistory` / `handleShowMergeHistory` on
 *     TableActionsContext are no-ops (not omitted) so that if a column
 *     renderer calls them unconditionally, it doesn't throw — they just
 *     do nothing instead of opening a revert-capable modal
 *
 * Kept, because none of it writes anything:
 *   - EntryHistoryModal (viewing an entry's history) on row hover
 *   - DataIntegrityModal / DisseminationSummaryModal (display only)
 *   - Excel export (reads current `dataRows`, writes nothing server-side)
 *   - collapse/expand state + column widths/visibility (localStorage-only
 *     view preferences, not loading-plan data)
 *
 * Assumptions to double check against your real files (I don't have
 * columns.js, useRowHoverInsert, or MachineHeaderBar in this
 * conversation):
 *   - react-data-grid's built-in checkbox column has key `"select-row"`.
 *     If yours is customized, adjust READONLY_STRIP_KEYS below.
 *   - The drag-handle column's key is `"dragHandle"` — this is a guess
 *     ported from Deemo.jsx's comments; check columns.js and fix the key
 *     in READONLY_STRIP_KEYS if it's named differently.
 *   - `useRowHoverInsert(displayRows)` returns hover state generically
 *     (it was originally used to power both insert buttons AND the
 *     history button in Deemo.jsx) — this file only consumes the pieces
 *     needed for the history button and ignores insert-specific return
 *     values.
 *   - EntryHistoryModal is read-only (shows a list of past changes, no
 *     "revert" action). If it has a revert button, gate it there behind
 *     a `readOnly` prop, since nothing here can prevent it from calling
 *     its own internal fetch/mutation.
 *   - `route("loading-plan.readonly")` — name this whatever you wire up
 *     for the new controller method (see LoadingPlanController snippet).
 * -----------------------------------------------------------------------
 */

const ROW_HEIGHT = 35;
const HEADER_ROW_HEIGHT = 35;
const MIN_COLUMN_WIDTH = 6;
const COLLAPSE_HINT_THRESHOLD = 28;
const COLUMN_WIDTHS_STORAGE_KEY = "loadingPlan:columnWidths"; // shared with the editable page on purpose — same visual preference

// Structural (non-data) columns to drop entirely in read-only mode:
// checkbox-select and the drag handle. See assumptions above re: keys.
const READONLY_STRIP_KEYS = new Set(["select-row", "dragHandle"]);

function toReadOnlyColumns(columns) {
    return columns
        .filter((col) => !READONLY_STRIP_KEYS.has(col.key))
        .map((col) => {
            // eslint-disable-next-line no-unused-vars
            const { renderEditCell, ...rest } = col;
            return { ...rest, editable: false };
        });
}

function RowHistoryButton({ isHidden, anchorElement, onViewHistory, buttonsRef }) {
    const { refs, y } = useFloating({
        placement: "left-start",
        strategy: "fixed",
        whileElementsMounted: autoUpdate,
        middleware: [offset({ mainAxis: 0 })],
    });

    useEffect(() => {
        refs.setReference(anchorElement);
    }, [anchorElement, refs]);

    if (isHidden) return null;

    return createPortal(
        <button
            ref={(node) => {
                refs.setFloating(node);
                if (buttonsRef) buttonsRef.current = node;
            }}
            style={{ position: "fixed", top: y ?? 0, right: 8, zIndex: 9999 }}
            className="btn btn-xs insert-row-btn border border-opposite-100/25 rounded-l-none h-9 min-h-9 flex items-center justify-center"
            onClick={onViewHistory}
            title="View history"
        >
            🕘
        </button>,
        document.body,
    );
}

export default function DeemoReadOnly({
    data,
    bakeLots,
    machines: serverMachines,
    packageGroups,
    packageGroupNames,
    machineCapacity,
    date,
    selectedLocation,
    status,
    disseminationSummary,
    partnameMismatches,
    unknownPackages,
    recipeMismatches,
}) {
    // No undo store: dataRows is a straight, immutable projection of `data`.
    const dataRows = useMemo(
        () =>
            (data ?? []).map((row) => ({
                ...row,
                machine: row.machine ?? null,
                tag: row.tag ?? null,
                doable: row.doable ?? 0,
                remarks: row.remarks ?? "",
            })),
        [data],
    );

    const [activePackage, setActivePackage] = useState("LGA");
    const [highlightedMatch, setHighlightedMatch] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date(date));
    const [isExporting, setIsExporting] = useState(false);

    const [columnWidths, setColumnWidths] = useState(() => {
        if (typeof window === "undefined") return {};
        try {
            const raw = window.localStorage.getItem(COLUMN_WIDTHS_STORAGE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    });

    useEffect(() => {
        try {
            window.localStorage.setItem(COLUMN_WIDTHS_STORAGE_KEY, JSON.stringify(columnWidths));
        } catch {
            // ignore write errors
        }
    }, [columnWidths]);

    const [collapsedMachines, setCollapsedMachines] = usePersistedSet("collapsedMachines");
    const [collapsedOvens, setCollapsedOvens] = usePersistedSet("collapsedOven");

    const historyModalRef = useRef(null);
    const [historyEntryId, setHistoryEntryId] = useState(null);
    const gridRef = useRef(null);

    const handleDateChange = (newDate) => {
        setSelectedDate(newDate);
        router.get(route("loading-plan.readonly"), {
            date: newDate.toISOString().slice(0, 10),
            location: selectedLocation,
        });
    };

    const setLocation = (line) => {
        if (line === selectedLocation) return;
        router.get(
            route("loading-plan.readonly"),
            { date, location: line },
            { preserveScroll: true, replace: true },
        );
    };

    const machines = useMemo(() => {
        return [null, MACHINE_MANUAL, ...serverMachines.map((m) => m.name)];
    }, [serverMachines]);

    const activePackageGroup = useMemo(() => {
        if (activePackage === "Unassigned") return null;
        return packageGroups[activePackage] || null;
    }, [activePackage, packageGroups]);

    const toggleMachineCollapsed = useCallback((machine) => {
        setCollapsedMachines((prev) => {
            const next = new Set(prev);
            if (next.has(machine)) next.delete(machine);
            else next.add(machine);
            return next;
        });
    }, [setCollapsedMachines]);

    const toggleOvenCollapsed = useCallback((oven) => {
        setCollapsedOvens((prev) => {
            const next = new Set(prev);
            if (next.has(oven)) next.delete(oven);
            else next.add(oven);
            return next;
        });
    }, [setCollapsedOvens]);

    // No-op: nothing listens to this, there's no status-menu UI in this
    // page, so clicking a status badge is inert rather than opening a
    // "change status" popover.
    const noopStatusClick = useCallback((e) => {
        e?.stopPropagation?.();
    }, []);

    const machinePlatform = useMemo(() => {
        const map = new Map();
        serverMachines.forEach((m) => map.set(m.name, m.platform));
        return map;
    }, [serverMachines]);

    const rawColumns = useMemo(
        () => makeColumns(false, noopStatusClick, toggleMachineCollapsed, highlightedMatch),
        [noopStatusClick, toggleMachineCollapsed, highlightedMatch],
    );
    const columns = useMemo(() => toReadOnlyColumns(rawColumns), [rawColumns]);

    const dataColumnKeys = useMemo(() => new Set(DATA_COLUMNS.map((c) => c.key)), []);

    const handleHeaderDoubleClick = useCallback((columnKey) => {
        setColumnWidths((prev) => {
            if (!(columnKey in prev)) return prev;
            const next = { ...prev };
            delete next[columnKey];
            return next;
        });
    }, []);

    const handleColumnResize = useCallback(
        (idx, width) => {
            const col = columns[idx];
            if (!col?.key || !dataColumnKeys.has(col.key)) return;
            setColumnWidths((prev) => ({
                ...prev,
                [col.key]: Math.max(MIN_COLUMN_WIDTH, width),
            }));
        },
        [columns, dataColumnKeys],
    );

    const toggleColumnVisibility = useCallback(
        (key) => {
            setColumnWidths((prev) => {
                const col = columns.find((c) => c.key === key);
                const currentWidth = prev[key] ?? col?.width ?? 120;
                const isHidden = currentWidth <= COLLAPSE_HINT_THRESHOLD;
                const next = { ...prev };
                if (isHidden) delete next[key];
                else next[key] = MIN_COLUMN_WIDTH;
                return next;
            });
        },
        [columns],
    );

    const decoratedColumns = useMemo(() => {
        return columns.map((col) => {
            if (!col.key || !dataColumnKeys.has(col.key)) return col;
            const width = columnWidths[col.key];
            const isCollapsed = width !== undefined && width <= COLLAPSE_HINT_THRESHOLD;
            const OriginalHeader = col.renderHeaderCell;

            return {
                ...col,
                width: width ?? col.width,
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
                        onDoubleClick={() => handleHeaderDoubleClick(col.key)}
                        title={isCollapsed ? `${col.name ?? col.key} — collapsed, double-click to restore` : undefined}
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
        });
    }, [columns, columnWidths, dataColumnKeys, handleHeaderDoubleClick]);

    const bakeColumns = useMemo(
        () => toReadOnlyColumns(makeBakeColumns(highlightedMatch, toggleOvenCollapsed)),
        [highlightedMatch, toggleOvenCollapsed],
    );

    const machineTotalDoable = useMemo(() => {
        const result = {};
        dataRows.forEach((r) => {
            if (!r.machine || !hasTimeline(r.machine)) return;
            if (isBlockRow(r)) return;
            result[r.machine] = (result[r.machine] || 0) + (Number(r.doable) || 0);
        });
        return result;
    }, [dataRows]);

    const machineTotalQuantity = useMemo(() => {
        const result = {};
        dataRows.forEach((r) => {
            if (!r.machine || !hasTimeline(r.machine)) return;
            if (isBlockRow(r)) return;
            result[r.machine] = (result[r.machine] || 0) + (Number(r.qty) || 0);
        });
        return result;
    }, [dataRows]);

    const otherPackageCounts = useMemo(() => {
        const activeList = activePackageGroup ?? [];
        const result = {};
        dataRows.forEach((r) => {
            if (r.machine === null) return;
            if (activeList.includes(r.package_name)) return;
            result[r.machine] = (result[r.machine] ?? 0) + 1;
        });
        return result;
    }, [dataRows, activePackageGroup]);

    const bakeOvens = useMemo(() => {
        const set = new Set((bakeLots ?? []).map((r) => r.oven_num));
        return Array.from(set).sort((a, b) => {
            const an = Number(a), bn = Number(b);
            if (!Number.isNaN(an) && !Number.isNaN(bn)) return an - bn;
            return String(a).localeCompare(String(b));
        });
    }, [bakeLots]);

    const bakeDisplayRows = useMemo(() => {
        return bakeOvens.flatMap((oven) => {
            const rowsForOven = (bakeLots ?? [])
                .filter((r) => r.oven_num === oven)
                .map((r) => ({ ...r, __type: "data" }));
            const isCollapsed = collapsedOvens.has(oven);
            const headerRow = {
                id: `bake-header-${oven}`,
                __type: "header",
                ovenLabel: oven,
                __rowCount: rowsForOven.length,
                __isCollapsed: isCollapsed,
                isLocked: true,
            };
            if (isCollapsed) return [headerRow];
            return [headerRow, ...rowsForOven];
        });
    }, [bakeOvens, bakeLots, collapsedOvens]);

    const displayRows = useMemo(() => {
        if (activePackage === "Unassigned") {
            const rowsForMachine = dataRows.filter((r) => r.machine === null);
            const isCollapsed = collapsedMachines.has(null);
            const lotCount = rowsForMachine.filter((r) => !isBlockRow(r)).length;
            const headerRow = {
                id: "header-unassigned-all",
                __type: "header",
                machine: null,
                machineLabel: "Unassigned",
                platform: undefined,
                __rowCount: rowsForMachine.length,
                __lotCount: lotCount,
                otherPackageCount: 0,
                __isCollapsed: isCollapsed,
                isLocked: true,
            };
            if (isCollapsed) return [headerRow];
            return [headerRow, ...rowsForMachine.map((r) => ({ ...r, id: r.id, __type: "data" }))];
        }

        return machines.flatMap((m) => {
            const isUnassigned = m === null;
            const isManual = m === MACHINE_MANUAL;

            const rowsForMachine = dataRows.filter((r) => {
                if (r.machine !== m) return false;
                if (isBlockRow(r)) return true;
                const activeList = activePackageGroup ?? [];
                return activeList.includes(r.package_name);
            });

            const lotCount = rowsForMachine.filter((r) => !isBlockRow(r)).length;
            if (lotCount === 0 && !isUnassigned && !isManual) return [];

            const isCollapsed = collapsedMachines.has(m);
            const headerRow = {
                id: `header-${m ?? "unassigned"}`,
                __type: "header",
                machine: m,
                machineLabel: isUnassigned ? "Unassigned" : isManual ? "MANUAL" : m,
                platform: machinePlatform.get(m),
                __rowCount: rowsForMachine.length,
                __lotCount: lotCount,
                otherPackageCount: isUnassigned ? 0 : (otherPackageCounts[m] ?? 0),
                __isCollapsed: isCollapsed,
                isLocked: true,
            };

            if (isCollapsed) return [headerRow];
            return [headerRow, ...rowsForMachine.map((r) => ({ ...r, id: r.id, __type: "data" }))];
        });
    }, [activePackage, machines, dataRows, activePackageGroup, machinePlatform, otherPackageCounts, collapsedMachines]);

    async function handleExport() {
        setIsExporting(true);
        try {
            const buffer = await exportLoadingPlanToExcel({
                dataRows,
                machines,
                packageGroups,
                columns: DATA_COLUMNS,
                isBlockRow,
                getMachineLabel: (m) => (m === null ? "Unassigned" : m === MACHINE_MANUAL ? "MANUAL" : m),
            });
            downloadExcelBuffer(buffer, `loading_plan_${new Date().toISOString().slice(0, 10)}.xlsx`);
        } finally {
            setIsExporting(false);
        }
    }

    const stickyMachine = useStickyGroupHeader(displayRows, gridRef);
    const stickyOven = useStickyGroupHeader(bakeDisplayRows, gridRef);

    useEffect(() => {
        if (!highlightedMatch) return;
        const t = setTimeout(() => setHighlightedMatch(null), 1500);
        return () => clearTimeout(t);
    }, [highlightedMatch]);

    const search = useTableSearch({
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
    });

    useEffect(() => {
        const onKey = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
                e.preventDefault();
                search.openSearch();
                return;
            }
            if (e.key === "Escape" && search.searchOpen) search.closeSearch();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [search]);

    const rowClass = useCallback((row) => {
        if (row.__type === "header") return "text-xs border-t-4 border-yellow-500 flex machine-header-row";
        if (isBlockRow(row)) return "block-row-bg border-l-4 border-warning/60";
        return undefined;
    }, []);

    const tableInteractionValue = useMemo(
        () => ({
            machineCapacity,
            machineTotalDoable,
            machineTotalQuantity,
            otherPackageCounts,
            onAddRow: undefined, // no add-lot capability in read-only mode
            onAddBlock: undefined, // no add-block capability in read-only mode
            isUpdating: false,
        }),
        [machineCapacity, machineTotalDoable, machineTotalQuantity, otherPackageCounts],
    );

    const {
        containerRef,
        historyButtonRef,
        hoveredRow,
        handleButtonsPointerLeave,
        handleGridScroll,
    } = useRowHoverInsert(displayRows);

    const hoveredRowData = displayRows[hoveredRow?.rowIdx] ?? null;
    const isHistoryButtonVisible = hoveredRowData && hoveredRowData.__type === "data";

    const tableActionsValue = useMemo(
        () => ({
            handleStatusClick: noopStatusClick,
            handleShowHistory: () => {}, // no-op: no revert-capable split modal in this view
            handleShowMergeHistory: () => {}, // no-op: no revert-capable merge modal in this view
            isUpdating: false,
        }),
        [noopStatusClick],
    );

    return (
        <div className="bg-base-100" style={{ padding: 24, minHeight: "90vh" }}>
            <EntryHistoryModal
                ref={historyModalRef}
                entryId={historyEntryId}
                onClose={() => historyModalRef.current?.close()}
            />

            <div className="flex-none pt-4">
                <div className="flex flex-col">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                        <div className="flex gap-2 items-center">
                            <DateNav selected={selectedDate} onChange={handleDateChange} isNoFuture />
                            <span className="badge badge-ghost badge-sm">Read-only</span>
                            {status && status !== "ok" && (
                                <div className="flex text-sm py-0 px-2 alert alert-error alert-soft">
                                    <GoAlert size={16} />
                                    <div role="alert">{getStatusMessage(date, status)}</div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button className="btn btn-sm" onClick={handleExport} disabled={isExporting}>
                                {isExporting ? "Exporting…" : "Export to Excel"}
                            </button>
                            <button
                                className="btn btn-sm"
                                onClick={() => document.getElementById("column_visibility_modal")?.showModal()}
                                title="Show/hide columns"
                            >
                                Columns
                            </button>
                            {status && status !== "not_imported" && (
                                <button
                                    className="btn btn-sm rounded-box btn-secondary"
                                    onClick={() => document.getElementById(DATA_INTEGRITY_MODAL_ID)?.showModal()}
                                >
                                    Data Integrity
                                    <TabBadge
                                        count={
                                            partnameMismatches !== undefined &&
                                            unknownPackages !== undefined &&
                                            recipeMismatches !== undefined
                                                ? partnameMismatches.length + unknownPackages.length + recipeMismatches.length
                                                : undefined
                                        }
                                        tone="warning"
                                    />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap justify-between gap-2">
                        <ScrollableTabs
                            items={[
                                "Unassigned",
                                ...packageGroupNames,
                                { value: "Bake", label: "Bake", icon: <PiOvenDuotone size={20} /> },
                            ]}
                            active={activePackage}
                            onChange={(pkg) => setActivePackage(pkg)}
                            storageKey="loadingPlan:packageTabs:active"
                        />

                        <div className="flex items-end mb-1 gap-2">
                            <fieldset className="fieldset rounded-box pb-2 px-2">
                                <legend className="fieldset-legend text-[11px] px-1">Production Line</legend>
                                <div className="join h-2 items-center">
                                    {["PL1", "PL6"].map((line) => (
                                        <button
                                            key={line}
                                            type="button"
                                            onClick={() => setLocation(line)}
                                            className={clsx(
                                                "btn btn-xs join-item",
                                                selectedLocation === line ? "btn-primary" : "btn-dash opacity-60",
                                            )}
                                        >
                                            {line}
                                        </button>
                                    ))}
                                </div>
                            </fieldset>

                            <button
                                className="btn btn-sm rounded-box btn-secondary"
                                onClick={() => document.getElementById(DISSEMINATION_MODAL_ID)?.showModal()}
                            >
                                <span>{disseminationSummary?.summary?.saved}</span>
                                <span>{disseminationSummary?.unplaced?.length}</span>
                            </button>

                            <button className="btn btn-sm z-50" onClick={() => search.openSearch()}>
                                <BsSearch size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <TableActionsContext.Provider value={tableActionsValue}>
                <TableInteractionContext.Provider value={tableInteractionValue}>
                    <div style={{ position: "relative" }}>
                        {search.searchOpen && (
                            <SearchBar
                                query={search.searchQuery}
                                onQueryChange={search.setSearchQuery}
                                matchCount={search.matchCount}
                                matchIndex={search.searchMatchIndex}
                                onNext={search.findNext}
                                onPrev={search.findPrev}
                                onClose={search.closeSearch}
                                inputRef={search.searchInputRef}
                            />
                        )}

                        {activePackage === "Bake" ? (
                            <div className="border-none" style={{ position: "relative" }}>
                                <DataGrid
                                    ref={gridRef}
                                    columns={bakeColumns}
                                    rows={bakeDisplayRows}
                                    rowKeyGetter={(row) => row.id}
                                    rowClass={(row) =>
                                        row.__type === "header"
                                            ? "text-xs border-t-4 border-yellow-500 flex machine-header-row"
                                            : undefined
                                    }
                                    rowHeight={ROW_HEIGHT}
                                    headerRowHeight={HEADER_ROW_HEIGHT}
                                    defaultColumnOptions={{ resizable: true }}
                                    onScroll={handleGridScroll}
                                    className="bg-base-100"
                                    style={{ blockSize: "70vh" }}
                                />
                                {stickyOven && (
                                    <div
                                        className="bg-base-200 shadow-[0_15px_15px_-10px_rgba(0,0,0,0.3)]"
                                        style={{ position: "absolute", top: HEADER_ROW_HEIGHT, left: 0, right: 0, height: ROW_HEIGHT }}
                                    >
                                        <div className="absolute left-0 right-0 pl-9 h-full w-full flex items-center">
                                            <OvenHeaderCell
                                                row={stickyOven}
                                                rowCount={stickyOven.__rowCount}
                                                onToggleCollapse={toggleOvenCollapsed}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div ref={containerRef} className="border-none" style={{ position: "relative" }}>
                                <DataGrid
                                    ref={gridRef}
                                    columns={decoratedColumns}
                                    rows={displayRows}
                                    onColumnResize={handleColumnResize}
                                    rowKeyGetter={(row) => row.id}
                                    rowClass={(row) => rowClass(row)}
                                    rowHeight={ROW_HEIGHT}
                                    headerRowHeight={HEADER_ROW_HEIGHT}
                                    defaultColumnOptions={{ resizable: true }}
                                    onScroll={handleGridScroll}
                                    className="bg-base-100"
                                    style={{ blockSize: "70vh" }}
                                />

                                {hoveredRow && (
                                    <div onPointerLeave={handleButtonsPointerLeave}>
                                        <RowHistoryButton
                                            isHidden={!isHistoryButtonVisible}
                                            anchorElement={hoveredRow.element}
                                            buttonsRef={historyButtonRef}
                                            onViewHistory={() => {
                                                const entry = displayRows[hoveredRow.rowIdx];
                                                setHistoryEntryId(entry.entry_id);
                                                historyModalRef.current?.showModal();
                                            }}
                                        />
                                    </div>
                                )}

                                {stickyMachine && (
                                    <div
                                        className="bg-base-200 shadow-[0_15px_15px_-10px_rgba(0,0,0,0.3)]"
                                        style={{ position: "absolute", top: HEADER_ROW_HEIGHT, left: 0, right: 0, height: ROW_HEIGHT }}
                                    >
                                        <div className="absolute left-0 right-0 pl-9 h-full w-full flex items-center justify-between">
                                            <div className="flex items-center h-full gap-2 min-w-0">
                                                <MachineHeaderBar
                                                    row={{
                                                        machineLabel: stickyMachine?.machineLabel ?? null,
                                                        machine: stickyMachine.machine,
                                                        otherPackageCount: stickyMachine.otherPackageCount,
                                                    }}
                                                    machineKey={stickyMachine.machine}
                                                    rowCount={stickyMachine.__rowCount}
                                                    lotCount={stickyMachine.__lotCount}
                                                    isCollapsed={stickyMachine.__isCollapsed}
                                                    onToggleCollapse={toggleMachineCollapsed}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <DataIntegrityModal
                        partnameMismatches={partnameMismatches}
                        unknownPackages={unknownPackages}
                        recipeMismatches={recipeMismatches}
                    />
                    <DisseminationSummaryModal summary={disseminationSummary} />
                </TableInteractionContext.Provider>
            </TableActionsContext.Provider>

            <dialog id="column_visibility_modal" className="modal">
                <div className="modal-box bg-base-300 max-h-[80vh] flex flex-col">
                    <h3 className="font-bold text-lg mb-4">Column Visibility</h3>
                    <div className="flex flex-col gap-1 overflow-y-auto pr-1">
                        {columns
                            .filter((col) => dataColumnKeys.has(col.key))
                            .map((col) => {
                                const width = columnWidths[col.key];
                                const isHidden = width !== undefined && width <= COLLAPSE_HINT_THRESHOLD;
                                return (
                                    <label key={col.key} className="label cursor-pointer justify-between gap-3 py-1">
                                        <span className="label-text text-sm flex items-center gap-1.5">
                                            {isHidden && <span className="w-1 h-3 rounded-full bg-warning shrink-0" />}
                                            {col.name ?? col.key}
                                        </span>
                                        <input
                                            type="checkbox"
                                            className="toggle toggle-sm"
                                            checked={!isHidden}
                                            onChange={() => toggleColumnVisibility(col.key)}
                                        />
                                    </label>
                                );
                            })}
                    </div>
                    <div className="modal-action">
                        <form method="dialog">
                            <button className="btn btn-ghost btn-sm">Close</button>
                        </form>
                    </div>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>
        </div>
    );
}