import DateNav from "@/Components/DateNav";
import AddEntryModal from "@/Components/LoadingPlan/AddEntriesModal";
import AutoSortModal from "@/Components/LoadingPlan/AutoSortModal";
import { BakeSelectionToolbar } from "@/Components/LoadingPlan/BakeSelectionToolbar";
import CapacityOverviewModal from "@/Components/LoadingPlan/CapacityOverviewModal";
import ColumnVisibilityModal from "@/Components/LoadingPlan/ColumnVisibilityModal";
import { TableActionsContext, makeBakeColumns, makeColumns, toReadOnlyColumns } from "@/Components/LoadingPlan/columns";
import DataIntegrityModal from "@/Components/LoadingPlan/DataIntegrityModal";
import DisseminationSummaryModal from "@/Components/LoadingPlan/DisseminationSummary";
import DoableEditModal from "@/Components/LoadingPlan/DoableEditModal";
import { DroppableRow } from "@/Components/LoadingPlan/DroppableRow";
import EntryHistoryModal from "@/Components/LoadingPlan/EntryHistoryModal";
import { TableInteractionContext } from "@/Components/LoadingPlan/MachineHeaderBar";
import MergeHistoryModal from "@/Components/LoadingPlan/MergeHistoryModal";
import MissingPartsModal from "@/Components/LoadingPlan/MissingPartsModal";
import NonMachinesModal from "@/Components/LoadingPlan/NonMachinesModal";
import PickupInsertModal from "@/Components/LoadingPlan/PickupInsertModal";
import { PlanActionsBar, PlanStatusAlert, PlanTabsBar } from "@/Components/LoadingPlan/PlanToolbar";
import { AddBlockModal, AddBucketModal, AddLotModal } from "@/Components/LoadingPlan/QuickAddModals";
import RowHoverTools from "@/Components/LoadingPlan/RowHoverTools";
import { SavingCursorBadge } from "@/Components/LoadingPlan/SavingCursorBadge";
import SchedulerModal from "@/Components/LoadingPlan/SchedulerModal";
import { SearchBar } from "@/Components/LoadingPlan/SearchBar";
import SelectionToolbar from "@/Components/LoadingPlan/SelectionToolbar";
import SplitHistoryModal from "@/Components/LoadingPlan/SplitHistoryModal";
import StatusMenu from "@/Components/LoadingPlan/StatusMenu";
import { StickyMachineHeader, StickyOvenHeader } from "@/Components/LoadingPlan/StickyHeaderOverlay";
import { HEADER_ROW_HEIGHT, ROW_HEIGHT } from "@/Constants/LoadingPlan/constants";
import {
    ALL_PACKAGES_TAB,
    F3_FLAG,
    FOR_BAKE_TAB,
    ORPHAN_TAB,
    UNASSIGNED_TAB,
    buildTabItems,
} from "@/Constants/LoadingPlan/tabs";
import { MACHINE_MANUAL } from "@/Constants/machines.js";
import { useBucketOperations } from "@/Hooks/LoadingPlan/useBucketOperations";
import { useBulkOperations } from "@/Hooks/LoadingPlan/useBulkOperations";
import { useCellEditPersistence } from "@/Hooks/LoadingPlan/useCellEditPersistence";
import { useColumnWidths } from "@/Hooks/LoadingPlan/useColumnWidths";
import { useDoableOperations } from "@/Hooks/LoadingPlan/useDoableOperations";
import { useDragReorder } from "@/Hooks/LoadingPlan/useDragReorder";
import { useEntryOperations } from "@/Hooks/LoadingPlan/useEntryOperations";
import { useLoadingPlanShortcuts } from "@/Hooks/LoadingPlan/useLoadingPlanShortcuts";
import { useNonMachineOperations } from "@/Hooks/LoadingPlan/useNonMachineOperations";
import { useRowHoverInsert } from "@/Hooks/LoadingPlan/useRowHoverInsert";
import { useHiddenRowCounts, useRowIndex } from "@/Hooks/LoadingPlan/useRowIndex";
import { useSplitMergeOperations } from "@/Hooks/LoadingPlan/useSplitMergeOperations";
import { useStickyGroupHeader } from "@/Hooks/LoadingPlan/useStickyGroupHeader";
import { useTableSearch } from "@/Hooks/LoadingPlan/useTableSearch";
import { useUndoRedoSync } from "@/Hooks/LoadingPlan/useUndoRedoSync";
import { useWriteLock } from "@/Hooks/LoadingPlan/useWriteLock";
import { useToast } from "@/Hooks/useToast";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { buildBakeDisplayRows, buildDisplayRows } from "@/Lib/LoadingPlan/buildDisplayRows";
import { DATA_COLUMNS } from "@/Lib/LoadingPlan/columnConfig";
import { isBlockRow } from "@/Lib/LoadingPlan/helpers";
import { timeFieldsFromDatetimes } from "@/Lib/LoadingPlan/loadingPlanSchedule.js";
import { compareUnassigned, createRowMatchers, getMachineLabel } from "@/Lib/LoadingPlan/rowPredicates";
import { createUndoStore } from "@/Store/undoStore";
import { usePersistedSet } from "@/Store/usePersistedSet";
import { DndContext, DragOverlay, MeasuringStrategy } from "@dnd-kit/core";
import { router } from "@inertiajs/react";
import clsx from "clsx";
import dayjs from "dayjs";
import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { DataGrid } from "react-data-grid";
import "react-data-grid/lib/styles.css";

/**
 * Loading-plan grid (react-data-grid). One component for both the editable
 * page and the view-only page: `readOnly` disables every write path (edits,
 * drag & drop, bulk actions, add lot/block, split/merge, scheduler) and hides
 * selection and undo/redo. Search, collapse/expand, column sizing/visibility,
 * history viewing and Excel export still work.
 *
 * Where things live:
 *   Hooks/LoadingPlan/useWriteLock            one-write-at-a-time lock + stale-plan detection
 *   Hooks/LoadingPlan/useEntryOperations      status change, add lot/block, auto-sort
 *   Hooks/LoadingPlan/useDoableOperations     doable override, recipe, missing part records
 *   Hooks/LoadingPlan/use{Bucket,Bulk,NonMachine,SplitMerge}Operations
 *   Hooks/LoadingPlan/useDragReorder          drag & drop
 *   Hooks/LoadingPlan/useCellEditPersistence  inline cell edits
 *   Hooks/LoadingPlan/useColumnWidths         auto-fit / resize / hide columns
 *   Hooks/LoadingPlan/useRowIndex             row lookups + totals
 *   Lib/LoadingPlan/buildDisplayRows          rows -> grid rows (headers, collapsed runs, groups)
 *
 * TODO(prod): enable gzip for JSON/JS/CSS in nginx (gzip_types application/json text/css
 * application/javascript image/svg+xml): the plan payloads are highly repetitive.
 */

const useLoadingPlanStore = createUndoStore([], { limit: 20 });

const EMPTY_ROWS = [];
const noop = () => {}; // bake toolbar actions are not implemented yet
const getRowKey = (row) => row.id;
const isRowLocked = (row) => row.isLocked;
const DEFAULT_COLUMN_OPTIONS = { resizable: true };
const MACHINE_GRID_STYLE = { blockSize: "80vh" };
const BAKE_GRID_STYLE = { blockSize: "70vh" };

const toggled = (set, value) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
};

export default function Deemo({
    data,
    bakeLots,
    machines: serverMachines,
    nonMachines: serverNonMachines,
    packageGroups,
    packageGroupNames,
    machineCapacity,
    buckets: serverBuckets,
    date,
    selectedLocation,
    status,
    baseTimes,
    onLotTransfer,
    onReorder,
    disseminationSummary,
    partnameMismatches,
    unknownPackages,
    recipeMismatches,
    schedulerHistory,
    readOnly = false,
}) {
    const toast = useToast();
    const isF3 = selectedLocation === F3_FLAG;

    // ── write lock ───────────────────────────────────────────────────────
    const {
        mutate, beginWrite, isLocked, isSaving, holdLock, withUpdating,
        isUpdating, writesLocked, staleInfo, clearStale,
    } = useWriteLock({ readOnly, toast });

    // ── undo store (rows) ────────────────────────────────────────────────
    const dataRows = useLoadingPlanStore((s) => s.present.rows);
    const update = useLoadingPlanStore((s) => s.update);
    const canUndoNow = useLoadingPlanStore((s) => s.past.length > 0);
    const canRedoNow = useLoadingPlanStore((s) => s.future.length > 0);
    const syncServerFields = useLoadingPlanStore.getState().syncServerFields;

    useLayoutEffect(() => {
        const seeded = (data ?? []).map((row) => ({
            ...row,
            ...timeFieldsFromDatetimes(row.time_start_at, row.time_end_at, date),
            machine: row.machine ?? null,
            tag: row.tag ?? null,
            doable: row.doable ?? 0,
            remarks: row.remarks ?? "",
            // helpers (findMachineNeighbors / applyTimeStartEdit) key rows off _dndId
            _dndId: row.entry_id ? `entry-${row.entry_id}` : `${row.id ?? Math.random()}`,
        }));
        useLoadingPlanStore.getState().reset(seeded);
    }, [data]);

    // ── view state ───────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState(() =>
        (packageGroupNames ?? []).includes("LGA") ? "LGA" : ALL_PACKAGES_TAB,
    );
    const activePackage = useDeferredValue(activeTab);
    const isTabSwitching = activeTab !== activePackage;
    const onBake = activePackage === FOR_BAKE_TAB;

    const [selectedRows, setSelectedRows] = useState(() => new Set());
    const [selectedBakeRows, setSelectedBakeRows] = useState(() => new Set());
    const [, setIsDirty] = useState(false);
    const [selectedDate, setSelectedDate] = useState(() => dayjs(date).toDate());
    const [showAllMachines, setShowAllMachines] = useState(false);
    const [highlightedMatch, setHighlightedMatch] = useState(null); // { rowId, columnKey }
    const [isExporting, setIsExporting] = useState(false);
    const [placementOfNewEntry, setPlacementOfNewEntry] = useState(null);
    const [insertAnchorRow, setInsertAnchorRow] = useState(null);
    const [historyEntryId, setHistoryEntryId] = useState(null);

    const [collapsedMachines, setCollapsedMachines] = usePersistedSet("collapsedMachines");
    const [collapsedOvens, setCollapsedOvens] = usePersistedSet("collapsedOven");
    const [expandedMachines, setExpandedMachines] = usePersistedSet("expandedMachines");
    const [expandedLocations, setExpandedLocations] = usePersistedSet("expandedLocations");

    const gridRef = useRef(null);
    const addEntryModalRef = useRef(null);
    const pickupInsertModalRef = useRef(null);
    const splitHistoryModalRef = useRef(null);
    const mergeHistoryModalRef = useRef(null);
    const historyModalRef = useRef(null);
    const addBlockModalRef = useRef(null);
    const addLotModalRef = useRef(null);
    const addBucketModalRef = useRef(null);
    const autoSortModalRef = useRef(null);

    useEffect(() => setSelectedDate(dayjs(date).toDate()), [date]);

    const clearSelection = useCallback(() => setSelectedRows(new Set()), []);
    const clearBakeSelection = useCallback(() => setSelectedBakeRows(new Set()), []);

    const toggleMachineCollapsed = useCallback((key) => {
        setCollapsedMachines((prev) => toggled(prev, key));
        setSelectedRows(new Set());
    }, []);
    const toggleOvenCollapsed = useCallback((oven) => setCollapsedOvens((prev) => toggled(prev, oven)), []);
    const toggleExpandedMachine = useCallback((machine) => {
        setExpandedMachines((prev) => toggled(prev, machine));
        setSelectedRows(new Set());
    }, []);
    const toggleExpandedLocation = useCallback((machine) => {
        setExpandedLocations((prev) => toggled(prev, machine));
        setSelectedRows(new Set());
    }, []);

    const goToTab = useCallback(
        (pkg) => {
            setActiveTab(pkg);
            clearSelection();
            clearBakeSelection();
        },
        [clearSelection, clearBakeSelection],
    );

    // ── navigation (date / line / refresh / import) ──────────────────────
    const visitPlan = useCallback(
        (params, options = {}) => {
            if (isSaving()) return;
            const release = holdLock();
            router.get(route(readOnly ? "loading-plan.readonly" : "loading-plan.index"), params, {
                ...options,
                onSuccess: clearStale,
                onFinish: release,
            });
        },
        [isSaving, holdLock, readOnly, clearStale],
    );

    const handleDateChange = (newDate) => {
        if (isSaving()) return;
        setSelectedDate(newDate);
        visitPlan({ date: dayjs(newDate).format("YYYY-MM-DD"), location: selectedLocation });
    };

    const handleLocationChange = (line) => {
        if (line === selectedLocation) return;
        const crossesF3 = line === F3_FLAG || selectedLocation === F3_FLAG;
        visitPlan(crossesF3 ? { location: line } : { date, location: line }, { preserveScroll: true, replace: true });
    };

    const handleRefresh = () => {
        if (isSaving()) return;
        const release = holdLock();
        router.reload({ preserveScroll: true, onSuccess: clearStale, onFinish: release });
    };

    const handleGoToImport = () => {
        if (isSaving()) return;
        const release = holdLock();
        router.get(route("import.index"), {}, { preserveScroll: true, onFinish: release });
    };

    // ── machines / buckets / non-machines ────────────────────────────────
    const machinesByName = useMemo(
        () => Object.fromEntries(Object.values(serverMachines).map((m) => [m.name, m])),
        [serverMachines],
    );
    const knownMachineNames = useMemo(() => new Set(serverMachines.map((m) => m.name)), [serverMachines]);
    const machinePlatform = useMemo(() => new Map(serverMachines.map((m) => [m.name, m.platform])), [serverMachines]);
    const machines = useMemo(() => [null, MACHINE_MANUAL, ...serverMachines.map((m) => m.name)], [serverMachines]);

    const [bucketList, setBucketList] = useState(serverBuckets ?? []);
    useEffect(() => setBucketList(serverBuckets ?? []), [serverBuckets]);

    const bucketsByMachine = useMemo(() => {
        const map = new Map();
        bucketList.forEach((b) => {
            const k = b.machine ?? null;
            if (!map.has(k)) map.set(k, []);
            map.get(k).push(b);
        });
        map.forEach((list) => list.sort((a, b) => a.sort_order - b.sort_order));
        return map;
    }, [bucketList]);

    const knownBucketIds = useMemo(() => new Set(bucketList.map((b) => b.id)), [bucketList]);
    // parked only if its group still exists; orphans fall back to Unassigned
    const isParked = useCallback((r) => r.bucket_id != null && knownBucketIds.has(r.bucket_id), [knownBucketIds]);

    const { parkRows, unparkRows, handleBulkPark, handleBulkUnpark, createBucket, renameBucket, deleteBucket } =
        useBucketOperations({
            store: useLoadingPlanStore, dataRows, selectedRows, update, withUpdating, beginWrite, mutate, toast,
            date, selectedLocation, setIsDirty, clearSelection, setBucketList,
        });

    const { nonMachineList, createNonMachine, renameNonMachine, deleteNonMachine } = useNonMachineOperations({
        store: useLoadingPlanStore, serverNonMachines, update, beginWrite, withUpdating, mutate, toast,
        date, selectedLocation, setIsDirty,
    });

    const nonMachineKeys = useMemo(() => nonMachineList.map((n) => n.key), [nonMachineList]);
    const nonMachineNameByKey = useMemo(() => new Map(nonMachineList.map((n) => [n.key, n.name])), [nonMachineList]);
    const labelOfMachine = useCallback((m) => getMachineLabel(m, nonMachineNameByKey), [nonMachineNameByKey]);

    // ── write operations ─────────────────────────────────────────────────
    const {
        statusMenu, openStatusMenu, closeStatusMenu, handleStatusChange,
        handleAddRow, saveBlock, handleAutoSortMachine,
    } = useEntryOperations({
        store: useLoadingPlanStore, dataRows, update, syncServerFields, setIsDirty, readOnly, isF3, isLocked,
        beginWrite, withUpdating, mutate, toast, date, activePackage, packageGroups,
    });

    const {
        handleBulkTag, handleBulkClearTag, handleBulkStatus, handleBulkFieldUpdate,
        handleBulkTransfer, handleBulkDelete, handleRework,
    } = useBulkOperations({
        dataRows, selectedRows, update, beginWrite, withUpdating, toast, mutate, setIsDirty,
        clearSelection, date, syncServerFields, store: useLoadingPlanStore,
    });

    const { handleUndo, handleRedo } = useUndoRedoSync({
        store: useLoadingPlanStore, withUpdating, isLocked, dataRows, baseTimes, date, mutate, update, toast,
    });

    const {
        splitHistoryData, mergeHistoryData, currentLotRole, historyLoading, loadSplitHistory, loadMergeHistory,
        revertSplit, revertMerge, mergeRows, splitRow, currentLotId: historyLotId,
    } = useSplitMergeOperations({ dataRows, update, beginWrite, withUpdating, mutate, date, toast, setIsDirty, syncServerFields });

    const doable = useDoableOperations({
        store: useLoadingPlanStore, dataRows, date, readOnly, isLocked, beginWrite, withUpdating, mutate,
        update, syncServerFields, setIsDirty, toast,
    });

    const handleShowSplitHistory = useCallback(
        (rootLotId, isParent, isChild, lotId) =>
            loadSplitHistory(rootLotId, isParent, isChild, {
                lotId,
                onOpen: () => splitHistoryModalRef.current?.showModal(),
                onError: () => splitHistoryModalRef.current?.close(),
            }),
        [loadSplitHistory],
    );

    const handleShowMergeHistory = useCallback(
        (targetLotId, isParent, isChild, lotId) =>
            loadMergeHistory(targetLotId, isParent, isChild, {
                lotId,
                onOpen: () => mergeHistoryModalRef.current?.showModal(),
                onError: () => mergeHistoryModalRef.current?.close(),
            }),
        [loadMergeHistory],
    );

    const handleSplitRevert = useCallback(
        (args) => revertSplit(args, { onDone: () => splitHistoryModalRef.current?.close() }),
        [revertSplit],
    );
    const handleMergeRevert = useCallback(
        (args) => revertMerge(args, { onDone: () => mergeHistoryModalRef.current?.close() }),
        [revertMerge],
    );

    // ── columns ──────────────────────────────────────────────────────────
    const rawColumns = useMemo(
        () =>
            makeColumns(
                isLocked,
                readOnly ? undefined : openStatusMenu,
                toggleMachineCollapsed,
                highlightedMatch,
                selectedLocation,
                readOnly ? undefined : doable.onEditDoable,
                readOnly,
            ),
        [isLocked, openStatusMenu, toggleMachineCollapsed, highlightedMatch, selectedLocation, doable.onEditDoable, readOnly],
    );
    const columns = useMemo(() => (readOnly ? toReadOnlyColumns(rawColumns) : rawColumns), [readOnly, rawColumns]);

    const bakeColumns = useMemo(() => {
        const cols = makeBakeColumns(highlightedMatch, toggleOvenCollapsed);
        return readOnly ? toReadOnlyColumns(cols) : cols;
    }, [highlightedMatch, toggleOvenCollapsed, readOnly]);

    const {
        decoratedColumns, gridColumnWidths, onColumnWidthsChange, hiddenColumnKeys, hasHiddenColumns,
        isColumnHidden, toggleColumnVisibility, showAllColumns,
    } = useColumnWidths({ columns, data, getMachineLabel: labelOfMachine });

    // ── row indexes, tab matching, display rows ──────────────────────────
    const {
        rowsByMachine, rowsByBucket, machineTotalDoable, machineTotalQuantity,
        nonMachineRowCounts, orphanMachines, missingPartCount,
    } = useRowIndex(dataRows, knownMachineNames);

    const { isOtherLoc, rowInActiveTab, rowInActiveTabOwn } = useMemo(
        () => createRowMatchers({ activePackage, selectedLocation, knownMachineNames }),
        [activePackage, selectedLocation, knownMachineNames],
    );

    const { otherLocationCounts, otherPackageCounts, machineSectionDoable } = useHiddenRowCounts({
        dataRows, isParked, isOtherLoc, rowInActiveTab,
    });

    const tabItems = useMemo(
        () => buildTabItems({ readOnly, isF3, hasOrphans: orphanMachines.length > 0, packageGroupNames }),
        [readOnly, isF3, orphanMachines.length, packageGroupNames],
    );

    useEffect(() => {
        if (!tabItems.includes(activeTab)) goToTab(ALL_PACKAGES_TAB);
    }, [tabItems, activeTab, goToTab]);

    const displayRows = useMemo(
        () =>
            buildDisplayRows({
                activePackage, readOnly, machines, nonMachineKeys, nonMachineNameByKey,
                rowsByMachine, rowsByBucket, bucketsByMachine, collapsedMachines, expandedMachines, expandedLocations,
                orphanMachines, machinesByName, machinePlatform, otherPackageCounts, showAllMachines,
                isParked, isOtherLoc, rowInActiveTab, rowInActiveTabOwn,
            }),
        [
            activePackage, readOnly, machines, nonMachineKeys, nonMachineNameByKey,
            rowsByMachine, rowsByBucket, bucketsByMachine, collapsedMachines, expandedMachines, expandedLocations,
            orphanMachines, machinesByName, machinePlatform, otherPackageCounts, showAllMachines,
            isParked, isOtherLoc, rowInActiveTab, rowInActiveTabOwn,
        ],
    );

    const bakeDisplayRows = useMemo(() => buildBakeDisplayRows(bakeLots, collapsedOvens), [bakeLots, collapsedOvens]);

    const collapsedRunsById = useMemo(
        () => new Map(displayRows.filter((r) => r.__type === "collapsed").map((r) => [r.id, r])),
        [displayRows],
    );

    // real machines + non-machines + orphans (Unassigned / MANUAL / group headers are left alone)
    const collapsibleMachineKeys = useMemo(
        () =>
            displayRows
                .filter((r) => r.__type === "header" && r.__headerKind !== "bucket" && r.machine !== null && r.machine !== MACHINE_MANUAL)
                .map((r) => r.machine),
        [displayRows],
    );
    const allMachinesCollapsed =
        collapsibleMachineKeys.length > 0 && collapsibleMachineKeys.every((k) => collapsedMachines.has(k));

    const toggleAllMachines = useCallback(() => {
        setCollapsedMachines((prev) => {
            const next = new Set(prev);
            collapsibleMachineKeys.forEach((k) => (allMachinesCollapsed ? next.delete(k) : next.add(k)));
            return next;
        });
        setSelectedRows(new Set());
    }, [allMachinesCollapsed, collapsibleMachineKeys, setCollapsedMachines]);

    // real machines that currently have no header (no lots) in the grid
    const idleMachines = useMemo(() => {
        const withLots = new Set(
            displayRows
                .filter((r) => r.__type === "header" && r.__headerKind !== "bucket" && r.__lotCount > 0)
                .map((r) => r.machine),
        );
        return [...machines, ...nonMachineKeys].filter((m) => m !== null && m !== MACHINE_MANUAL && !withLots.has(m));
    }, [displayRows, machines, nonMachineKeys]);

    const gridKey = `${activeTab}-${activePackage}`;
    const stickyMachine = useStickyGroupHeader(onBake ? EMPTY_ROWS : displayRows, gridRef, gridKey);
    const stickyOven = useStickyGroupHeader(onBake ? bakeDisplayRows : EMPTY_ROWS, gridRef, gridKey);

    // ── search + shortcuts ───────────────────────────────────────────────
    const search = useTableSearch({
        activePackage, setActivePackage: goToTab,
        dataRows, bakeLots, displayRows, bakeDisplayRows,
        columns, bakeColumns, rowInActiveTab, isParked, bucketList,
        collapsedMachines, setCollapsedMachines, collapsedOvens, setCollapsedOvens,
        hiddenColumnKeys, setHighlightedMatch, gridRef,
    });

    useLoadingPlanShortcuts({
        readOnly,
        searchOpen: search.searchOpen,
        openSearch: search.openSearch,
        closeSearch: search.closeSearch,
        clearSelection,
        beginWrite,
        onUndo: handleUndo,
        onRedo: handleRedo,
    });

    // ── cell edits, bulk delete, groups, drag & drop ─────────────────────
    const handleRowsChange = useCellEditPersistence({
        dataRows, displayRows, baseTimes, date, update, beginWrite, withUpdating, mutate, toast, setIsDirty, syncServerFields,
    });

    const handleBulkDeleteNotice = useCallback(() => {
        const selected = dataRows.filter((r) => selectedRows.has(r.id));
        const parked = selected.filter(isParked);
        const rest = selected.filter((r) => !isParked(r));

        if (parked.length && rest.length) {
            toast?.error?.("Select either grouped rows or placed rows, not both.");
            return;
        }

        if (parked.length) unparkRows(parked);

        if (rest.length) {
            const returned = rest.filter((r) => r.entry_id && !isBlockRow(r) && !r.is_rework && isOtherLoc(r));
            const isSucceed = handleBulkDelete();
            if (returned.length && isSucceed !== false) {
                const locs = [...new Set(returned.map((r) => r.location))].join("/");
                toast?.info?.(`${returned.length} lot(s) will return to ${locs} Unassigned. Not visible under ${selectedLocation}.`);
            }
        }
    }, [dataRows, selectedRows, isParked, unparkRows, isOtherLoc, handleBulkDelete, toast, selectedLocation]);

    // groups are per location: other-location lots can't be parked here
    const blockOtherLocPark = useCallback(
        (rows) => {
            const bad = rows.filter(isOtherLoc);
            if (!bad.length) return false;
            toast?.error?.(`${bad[0].location} lots can't be put in a ${selectedLocation} group. Groups are per location.`);
            return true;
        },
        [isOtherLoc, toast, selectedLocation],
    );
    const safeParkRows = useCallback(
        (lots, ...rest) => (blockOtherLocPark(lots) ? undefined : parkRows(lots, ...rest)),
        [blockOtherLocPark, parkRows],
    );
    const safeBulkPark = useCallback(
        (...args) =>
            blockOtherLocPark(dataRows.filter((r) => selectedRows.has(r.id))) ? undefined : handleBulkPark(...args),
        [blockOtherLocPark, dataRows, selectedRows, handleBulkPark],
    );

    const {
        sensors, collisionDetection, draggedRow, draggedCount, handleDragStart, handleDragEnd, handleDragCancel,
    } = useDragReorder({
        selectedRows, displayRows, collapsedRunsById, dataRows, store: useLoadingPlanStore,
        update, withUpdating, beginWrite, mutate, date, toast, clearSelection, setIsDirty, syncServerFields, selectedLocation,
        onUnassign: handleBulkDeleteNotice, onUnpark: unparkRows, onPark: safeParkRows, onReorder, onLotTransfer,
    });

    // ── modal openers ────────────────────────────────────────────────────
    const handleAddBlock = useCallback((m) => { if (!readOnly) addBlockModalRef.current?.open(m); }, [readOnly]);
    const handleAddLot = useCallback((m) => { if (!readOnly && !isF3) addLotModalRef.current?.open(m); }, [readOnly, isF3]);
    const handleAddBucket = useCallback((m) => addBucketModalRef.current?.open(m), []);
    const handleAutoSort = useCallback((m) => autoSortModalRef.current?.open(m), []);

    const handleInsert = useCallback((position, row) => {
        setPlacementOfNewEntry(position);
        setInsertAnchorRow(row);
        setSelectedRows(new Set([row.id]));
        addEntryModalRef.current?.showModal();
    }, []);

    const handleViewHistory = useCallback((row) => {
        setHistoryEntryId(row.entry_id);
        historyModalRef.current?.showModal();
    }, []);

    // ── hover tools / grid renderers / contexts ──────────────────────────
    const {
        containerRef, buttonsRef, historyButtonRef, rowIdxByElement, hoveredRow,
        handleButtonsPointerLeave, handleHistoryButtonPointerLeave, handleGridScroll,
    } = useRowHoverInsert(displayRows);

    const renderers = useMemo(
        () => ({ renderRow: (key, props) => <DroppableRow key={key} rowIdxByElement={rowIdxByElement} {...props} /> }),
        [rowIdxByElement],
    );

    const rowClass = useCallback(
        (row) => {
            const isData = row.__type === "data";
            const scm = isData && row.is_scm ? "bg-error/25" : "";
            const other = isData && isOtherLoc(row) ? "bg-secondary/10" : "";

            if (row.__headerKind === "bucket") return "text-xs border-t-2 border-info/50 flex machine-header-row";
            if (row.__type === "header") return "text-xs border-t-4 border-yellow-500 flex machine-header-row";
            if (isBlockRow(row)) return "block-row-bg border-l-4 border-warning/60";
            if (row.is_rework) return clsx("border-l-4 border-info/60", scm || other);
            return clsx(scm || other) || undefined;
        },
        [isOtherLoc],
    );

    const tableInteractionValue = useMemo(
        () => ({
            readOnly,
            serverMachines,
            machineCapacity,
            machineTotalDoable,
            machineTotalQuantity,
            otherPackageCounts,
            machineSectionDoable,
            otherLocationCounts,
            expandedMachines,
            expandedLocations,
            isUpdating: writesLocked,
            onToggleExpandOthers: toggleExpandedMachine,
            onToggleExpandLocations: toggleExpandedLocation,
            onAddLot: readOnly || isF3 ? undefined : handleAddLot,
            onAddRow: readOnly || isF3 ? undefined : handleAddRow,
            onAddBlock: readOnly ? undefined : handleAddBlock,
            onAddBucket: readOnly ? undefined : handleAddBucket,
            onAutoSort: readOnly ? undefined : handleAutoSort,
            onRenameBucket: readOnly ? undefined : renameBucket,
            onDeleteBucket: readOnly ? undefined : deleteBucket,
            onRenameNonMachine: readOnly ? undefined : renameNonMachine,
            onDeleteNonMachine: readOnly ? undefined : deleteNonMachine,
        }),
        [
            readOnly, isF3, serverMachines, machineCapacity, machineTotalDoable, machineTotalQuantity,
            otherPackageCounts, machineSectionDoable, otherLocationCounts, expandedMachines, expandedLocations,
            writesLocked, toggleExpandedMachine, toggleExpandedLocation, handleAddLot, handleAddRow, handleAddBlock,
            handleAddBucket, handleAutoSort, renameBucket, deleteBucket, renameNonMachine, deleteNonMachine,
        ],
    );

    const tableActionsValue = useMemo(
        () => ({
            handleStatusClick: openStatusMenu,
            handleShowHistory: handleShowSplitHistory,
            handleShowMergeHistory,
            writesLocked,
            isUpdating: writesLocked,
            nonMachineNameByKey,
        }),
        [openStatusMenu, handleShowSplitHistory, handleShowMergeHistory, nonMachineNameByKey, writesLocked],
    );

    // ── pickups / export ─────────────────────────────────────────────────
    const handleSchedulePickups = useCallback(
        async (pickups) => {
            if (pickups.length === 0) {
                toast?.error?.("Pickup is Empty");
                throw new Error("Pickup is Empty");
            }
            if (!beginWrite()) throw new Error("Still saving…");

            const release = holdLock(); // one lock covering submit + reload
            try {
                const result = await mutate(route("loading-plan.schedule-pickup"), { body: { date, pickups } });

                await new Promise((resolve) =>
                    router.reload({ preserveScroll: true, onSuccess: clearStale, onFinish: resolve }),
                );

                const unplaced = result?.unassigned?.length ?? 0;
                const unmatched = result?.unmatched_part_names?.length ?? 0;
                if (unplaced || unmatched) {
                    toast?.info?.(`${unplaced} lot(s) couldn't be placed. ${unmatched} part name(s) weren't found in the part list.`);
                } else {
                    toast?.success?.("Pickups scheduled.");
                }
                return result;
            } catch (err) {
                toast?.error?.(err?.status === 409 ? "Someone else changed this plan. Refresh and try again." : (err?.data?.message ?? err?.message ?? "Couldn't schedule the pickups."));
                throw err; // keeps the modal open
            } finally {
                release();
            }
        },
        [beginWrite, holdLock, mutate, date, toast, clearStale],
    );

    async function handleExport() {
        setIsExporting(true);
        try {
            const { exportLoadingPlanToExcel, downloadExcelBuffer } = await import("@/Lib/LoadingPlan/loadingPlanExcelExporter");
            const buffer = await exportLoadingPlanToExcel({
                dataRows,
                machines: [...machines, ...nonMachineKeys],
                groupNames: packageGroupNames ?? [],
                buckets: bucketList,
                selectedLocation,
                date,
                columns: DATA_COLUMNS,
                isBlockRow,
                sortUnassigned: compareUnassigned,
                getMachineLabel: labelOfMachine,
            });
            downloadExcelBuffer(buffer, `loading_plan_${date}.xlsx`);
        } catch (err) {
            console.error("Export failed:", err);
            toast?.error?.("Couldn't export to Excel.");
        } finally {
            setIsExporting(false);
        }
    }

    // ── derived toolbar props ────────────────────────────────────────────
    const showDataIntegrity = !!status && status !== "not_imported";
    const dataIntegrityCount =
        partnameMismatches !== undefined && unknownPackages !== undefined && recipeMismatches !== undefined
            ? partnameMismatches.length + unknownPackages.length + recipeMismatches.length
            : undefined;
    const showIdleToggle = idleMachines.length > 0 && activePackage !== UNASSIGNED_TAB && activePackage !== ORPHAN_TAB;

    // ─────────────────────────────────────────────────────────────────────
    return (
        <div className="bg-base-100" style={{ paddingLeft: 8, paddingRight: 8, minHeight: "93vh" }}>
            <SavingCursorBadge active={isUpdating} />

            <EntryHistoryModal ref={historyModalRef} entryId={historyEntryId} onClose={() => historyModalRef.current?.close()} />

            {!readOnly && !isF3 && (
                <PickupInsertModal
                    ref={pickupInsertModalRef}
                    onSubmit={handleSchedulePickups}
                    onClose={() => pickupInsertModalRef.current?.close()}
                />
            )}

            <div className="flex-none pt-2">
                <div className="flex flex-col">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                        <div className="flex gap-2 items-center">
                            <DateNav selected={selectedDate} onChange={handleDateChange} isNoFuture />
                            {readOnly && <span className="badge badge-ghost badge-sm">Read-only</span>}
                            <PlanStatusAlert status={status} date={date} readOnly={readOnly} onGoToImport={handleGoToImport} />
                        </div>

                        <PlanActionsBar
                            readOnly={readOnly}
                            isUpdating={isUpdating}
                            writesLocked={writesLocked}
                            selectedCount={selectedRows.size}
                            onClearSelection={clearSelection}
                            canUndo={canUndoNow}
                            canRedo={canRedoNow}
                            onUndo={handleUndo}
                            onRedo={handleRedo}
                            isExporting={isExporting}
                            onExport={handleExport}
                            hasHiddenColumns={hasHiddenColumns}
                            allMachinesCollapsed={allMachinesCollapsed}
                            canToggleMachines={collapsibleMachineKeys.length > 0}
                            onToggleMachines={toggleAllMachines}
                            schedulerFailed={schedulerHistory?.[0]?.status === "error"}
                            showDataIntegrity={showDataIntegrity}
                            dataIntegrityCount={dataIntegrityCount}
                            missingPartCount={missingPartCount}
                            onOpenMissingParts={doable.openMissingParts}
                        />
                    </div>

                    <PlanTabsBar
                        tabs={tabItems}
                        activeTab={activeTab}
                        onTabChange={goToTab}
                        location={selectedLocation}
                        locationDisabled={writesLocked}
                        onLocationChange={handleLocationChange}
                        onOpenSearch={search.openSearch}
                        idleCount={showIdleToggle ? idleMachines.length : 0}
                        showAllIdle={showAllMachines}
                        onToggleIdle={() => setShowAllMachines((v) => !v)}
                    />
                </div>
            </div>

            <TableActionsContext.Provider value={tableActionsValue}>
                <TableInteractionContext.Provider value={tableInteractionValue}>
                    <div style={{ position: "relative" }} className={clsx(isTabSwitching && "opacity-60 transition-opacity")}>
                        {search.searchOpen && (
                            <SearchBar
                                query={search.searchQuery}
                                onQueryChange={search.setSearchQuery}
                                matchCount={search.matchCount}
                                matchIndex={search.searchMatchIndex}
                                onNext={search.findNext}
                                onPrev={search.findPrev}
                                elsewhere={search.elsewhere}
                                onGoElsewhere={search.goElsewhere}
                                onClose={search.closeSearch}
                                inputRef={search.searchInputRef}
                            />
                        )}

                        {staleInfo && !readOnly && (
                            <div role="alert" className="alert alert-warning alert-soft my-2 flex justify-between">
                                <span>
                                    Someone changed this plan after you loaded it. Your last change may have been reverted.
                                    Refresh to get the latest rows before editing.
                                </span>
                                <button className="btn btn-sm btn-warning" onClick={handleRefresh}>Refresh</button>
                            </div>
                        )}

                        {onBake ? (
                            <div className="border-none" style={{ position: "relative" }}>
                                <DataGrid
                                    ref={gridRef}
                                    columns={bakeColumns}
                                    rows={bakeDisplayRows}
                                    rowKeyGetter={getRowKey}
                                    selectedRows={readOnly ? undefined : selectedBakeRows}
                                    onSelectedRowsChange={readOnly ? undefined : setSelectedBakeRows}
                                    rowClass={(row) =>
                                        row.__type === "header" ? "text-xs border-t-4 border-yellow-500 flex machine-header-row" : undefined
                                    }
                                    rowHeight={ROW_HEIGHT}
                                    headerRowHeight={HEADER_ROW_HEIGHT}
                                    defaultColumnOptions={DEFAULT_COLUMN_OPTIONS}
                                    isRowSelectionDisabled={isRowLocked}
                                    className="bg-base-100"
                                    style={BAKE_GRID_STYLE}
                                />
                                {stickyOven && (
                                    <StickyOvenHeader oven={stickyOven} readOnly={readOnly} onToggleCollapse={toggleOvenCollapsed} />
                                )}
                            </div>
                        ) : (
                            <DndContext
                                collisionDetection={collisionDetection}
                                measuring={{ droppable: { strategy: MeasuringStrategy.BeforeDragging } }}
                                sensors={readOnly || staleInfo ? [] : sensors}
                                onDragStart={readOnly ? undefined : handleDragStart}
                                onDragEnd={readOnly ? undefined : handleDragEnd}
                                onDragCancel={readOnly ? undefined : handleDragCancel}
                            >
                                <div ref={containerRef} className="border-none" style={{ position: "relative" }}>
                                    <DataGrid
                                        ref={gridRef}
                                        columns={decoratedColumns}
                                        rows={displayRows}
                                        columnWidths={gridColumnWidths}
                                        onColumnWidthsChange={onColumnWidthsChange}
                                        renderers={renderers}
                                        onRowsChange={readOnly ? undefined : handleRowsChange}
                                        onScroll={handleGridScroll}
                                        rowKeyGetter={getRowKey}
                                        selectedRows={readOnly ? undefined : selectedRows}
                                        onSelectedRowsChange={readOnly ? undefined : setSelectedRows}
                                        rowClass={rowClass}
                                        rowHeight={ROW_HEIGHT}
                                        headerRowHeight={HEADER_ROW_HEIGHT}
                                        defaultColumnOptions={DEFAULT_COLUMN_OPTIONS}
                                        isRowSelectionDisabled={isRowLocked}
                                        className="bg-base-100"
                                        style={MACHINE_GRID_STYLE}
                                    />

                                    <RowHoverTools
                                        hoveredRow={hoveredRow}
                                        displayRows={displayRows}
                                        canInsert={!readOnly && !writesLocked}
                                        buttonsRef={buttonsRef}
                                        historyButtonRef={historyButtonRef}
                                        onButtonsPointerLeave={handleButtonsPointerLeave}
                                        onHistoryPointerLeave={handleHistoryButtonPointerLeave}
                                        onInsert={handleInsert}
                                        onViewHistory={handleViewHistory}
                                    />

                                    {stickyMachine && (
                                        <StickyMachineHeader group={stickyMachine} readOnly={readOnly} onToggleCollapse={toggleMachineCollapsed} />
                                    )}
                                </div>

                                <DragOverlay>
                                    {!readOnly && draggedRow ? (
                                        <div className="bg-base-200 w-[300px] p-2 rounded shadow-lg text-sm font-semibold">
                                            {draggedRow.part_name || "Lot"} - {draggedRow.lot_id} - {draggedRow.package_name}
                                            {draggedCount > 1 && (
                                                <div className="text-xs font-normal opacity-70">+{draggedCount - 1} more</div>
                                            )}
                                        </div>
                                    ) : null}
                                </DragOverlay>
                            </DndContext>
                        )}
                    </div>

                    {!readOnly && (
                        <BakeSelectionToolbar
                            selectedIds={selectedBakeRows}
                            onApprove={noop}
                            onReprocess={noop}
                            onExport={noop}
                            onDelete={clearBakeSelection}
                            onClearSelection={clearBakeSelection}
                        />
                    )}

                    {!readOnly && (
                        <SelectionToolbar
                            selectedIds={selectedRows}
                            buckets={bucketList}
                            onMoveToBucket={safeBulkPark}
                            onUngroup={handleBulkUnpark}
                            machinePlatform={machinePlatform}
                            allData={dataRows}
                            machines={machines}
                            nonMachines={nonMachineList}
                            disabled={writesLocked}
                            onTag={handleBulkTag}
                            onClearTag={handleBulkClearTag}
                            onStatusChange={handleBulkStatus}
                            onBulkFieldUpdate={handleBulkFieldUpdate}
                            onTransfer={handleBulkTransfer}
                            onSplitRow={splitRow}
                            onRework={handleRework}
                            onMergeRows={mergeRows}
                            onDelete={handleBulkDeleteNotice}
                            onClearSelection={clearSelection}
                            date={date}
                        />
                    )}

                    <SplitHistoryModal
                        ref={splitHistoryModalRef}
                        loading={historyLoading}
                        history={splitHistoryData}
                        onRevert={readOnly ? undefined : handleSplitRevert}
                        onClose={() => splitHistoryModalRef.current?.close()}
                        isParent={currentLotRole.isParent}
                        isChild={currentLotRole.isChild}
                        currentLotId={historyLotId}
                    />

                    <MergeHistoryModal
                        ref={mergeHistoryModalRef}
                        loading={historyLoading}
                        history={mergeHistoryData}
                        onRevert={readOnly ? undefined : handleMergeRevert}
                        onClose={() => mergeHistoryModalRef.current?.close()}
                        isTarget={currentLotRole.isParent}
                        isSource={currentLotRole.isChild}
                        currentLotId={historyLotId}
                    />

                    {!readOnly && (
                        <AddEntryModal
                            ref={addEntryModalRef}
                            placement={placementOfNewEntry}
                            anchorRow={insertAnchorRow}
                            onClose={() => {
                                addEntryModalRef.current?.close();
                                setPlacementOfNewEntry(null);
                            }}
                            date={date}
                            packageGroups={packageGroups}
                            activePackage={activePackage}
                            handleAddRow={isF3 ? undefined : handleAddRow}
                            allowLots={!isF3}
                            saveBlock={saveBlock}
                        />
                    )}

                    <DataIntegrityModal
                        partnameMismatches={partnameMismatches}
                        unknownPackages={unknownPackages}
                        recipeMismatches={recipeMismatches}
                    />
                    <DisseminationSummaryModal summary={disseminationSummary} />
                </TableInteractionContext.Provider>
            </TableActionsContext.Provider>

            {/* ── single-row status dropdown ── */}
            {!readOnly && statusMenu && (
                <StatusMenu
                    anchor={statusMenu.anchor}
                    current={dataRows.find((r) => r.id === statusMenu.rowId)?.status}
                    disabled={writesLocked}
                    onPick={handleStatusChange}
                    onClose={closeStatusMenu}
                />
            )}

            {/* ── write-only modals ── */}
            {!readOnly && (
                <>
                    <DoableEditModal
                        row={doable.doableEditRow}
                        sameCount={doable.doableSameCount}
                        disabled={writesLocked}
                        onSaveOverride={doable.handleSaveOverride}
                        onSaveRecipe={doable.handleSaveRecipe}
                        onOpenPartRecord={doable.openMissingParts}
                    />
                    <MissingPartsModal parts={doable.missingParts} onSaved={doable.handleMissingPartsSaved} />

                    <AddBlockModal ref={addBlockModalRef} disabled={writesLocked} onSave={saveBlock} />
                    <AddLotModal ref={addLotModalRef} disabled={writesLocked} onSave={handleAddRow} />
                    <AddBucketModal ref={addBucketModalRef} disabled={writesLocked} onCreate={createBucket} />
                    <AutoSortModal ref={autoSortModalRef} disabled={writesLocked} onConfirm={handleAutoSortMachine} />

                    <SchedulerModal
                        date={date}
                        location={selectedLocation}
                        history={schedulerHistory}
                        beginWrite={beginWrite}
                        holdLock={holdLock}
                    />

                    <NonMachinesModal
                        nonMachines={nonMachineList}
                        rowCounts={nonMachineRowCounts}
                        location={selectedLocation}
                        disabled={writesLocked}
                        onCreate={createNonMachine}
                        onRename={renameNonMachine}
                        onDelete={deleteNonMachine}
                    />
                </>
            )}

            {/* ── always available (local view preferences / read-only data) ── */}
            <ColumnVisibilityModal
                isColumnHidden={isColumnHidden}
                onToggle={toggleColumnVisibility}
                onShowAll={showAllColumns}
            />
            <CapacityOverviewModal
                serverMachines={serverMachines}
                machineCapacity={machineCapacity}
                machineTotalDoable={machineTotalDoable}
                machineTotalQuantity={machineTotalQuantity}
            />
        </div>
    );
}

Deemo.layout = (page) =>
    page.props.readOnly ? <div className="p-4">{page}</div> : <AuthenticatedLayout>{page}</AuthenticatedLayout>;