import { initialData as _initialData } from "@/Constants/loadingPlanData.js";
import {
    closestCenter,
    DndContext,
    DragOverlay,
    PointerSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";

import DateNav from "@/Components/DateNav";
import { TOTAL_MIN_WIDTH } from "@/Components/LoadingPlan/columns.jsx";
import GlobalTableHeader from "@/Components/LoadingPlan/GlobalTableHeader";
import MachineSection from "@/Components/LoadingPlan/MachineSection";
import {
    ScrollParentContext,
    TableInteractionContext,
} from "@/Components/LoadingPlan/MachineSectionBody";
import { TableActionsContext } from "@/Components/LoadingPlan/RowContent";
import { recomputeMachine } from "@/Constants/loadingPlanSchedule.js";
import { getStatusMessage } from "@/Constants/wipStatus.js";
import { createUndoStore } from "@/Store/undoStore";
import { router } from "@inertiajs/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const useLoadingPlanStore = createUndoStore([]);

export default function LoadingPlanTableByMachine({
    data: initialData,
    date,
    machines,
    status,
    baseTimes = {},
}) {
    console.log("🚀 ~ LoadingPlanTableByMachine ~ machines:", machines);
    console.log("🚀 ~ LoadingPlanTableByMachine ~ initialData:", initialData);
    const { present: data, undo, redo } = useLoadingPlanStore();
    console.log("🚀 ~ LoadingPlanTableByMachine ~ data:", data);

    const resolvedData = initialData ?? _initialData;
    console.log("🚀 ~ LoadingPlanTableByMachine ~ resolvedData:", resolvedData);
    const [selectedDate, setSelectedDate] = useState(new Date(date));

    // ── Selection state ──────────────────────────────────────────────────────
    const [selectedIds, setSelectedIds] = useState(() => new Set());
    const anchorIdRef = useRef(null);
    const scrollParentRef = useRef(null);

    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
        anchorIdRef.current = null;
    }, []);

    const handleDateChange = (newDate) => {
        setSelectedDate(newDate);
        router.get(
            route("loading-plan.by-machine"),
            {
                date: newDate.toISOString().slice(0, 10),
                machines: machines,
            }, // 'YYYY-MM-DD'
            // { preserveState: true, preserveScroll: true },
        );
    };

    const dataRef = useRef(data);
    useEffect(() => {
        dataRef.current = data;
    }, [data]);

    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape") {
                clearSelection();
            }
            if (e.ctrlKey || e.metaKey) {
                if (e.key === "a") {
                    e.preventDefault();

                    // TODO: all rows means all packages which is not the user wants, usually they want all rows in the current package or machine.
                    setSelectedIds(
                        new Set(dataRef.current.map((r) => r._dndId)),
                    );
                }
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [undo, redo, clearSelection]);

    // NOTE: now that `machines` (below) is driven entirely by the MACHINES
    // config rather than by scanning data, this ref is write-only — nothing
    // currently reads it for rendering. Left in place (harmless bookkeeping)
    // in case it's useful later (e.g. "recently used machines" UI); safe to
    // remove if you want to trim it.
    const seenMachinePackagePairsRef = useRef(new Map());

    // ── Seed data on mount ───────────────────────────────────────────────────
    useEffect(() => {
        const seeded = resolvedData.map((row, i) => {
            const { item, ...rest } = row; // ← strip item
            return {
                ...rest,
                // Brand-new lots (no machine field at all, or explicitly
                // null) start life Unassigned. A previously-saved plan that
                // already has a machine/MANUAL value keeps it as-is — this
                // is NOT a one-way reset on every reload.
                machine: row.machine ?? null,
                tag: row.tag ?? null,
                doable: row.doable ?? 0,
                accu_time: row.accu_time ?? row.duration ?? 0,
                remarks: row.remarks ?? "",
                _dndId: row.entry_id
                    ? `entry-${row.entry_id}`
                    : `wip-${row.id}`,
            };
        });

        // One continuous timeline per machine/MANUAL bucket, independent of
        // package/group. Unassigned (null) is skipped automatically inside
        // recomputeMachine (hasTimeline() returns false for it).
        const machineBuckets = new Set(seeded.map((r) => r.machine));
        machineBuckets.forEach((machine) => {
            recomputeMachine(seeded, machine, baseTimes);
        });

        // machine -> set of Package_Name values seen on it. Currently
        // write-only (see note on seenMachinePackagePairsRef above) but
        // kept for parity / potential future use.
        const machinePkgPairs = new Map();
        seeded.forEach((r) => {
            if (!machinePkgPairs.has(r.machine))
                machinePkgPairs.set(r.machine, new Set());
            machinePkgPairs.get(r.machine).add(r.package_name);
        });

        useLoadingPlanStore.getState().reset(seeded);
        seenMachinePackagePairsRef.current = machinePkgPairs;
    }, []);

    // ── UI state ─────────────────────────────────────────────────────────────
    const [sorting, setSorting] = useState([]);
    const [activeId, setActiveId] = useState(null);

    const groupedRows = useMemo(() => {
        const map = {};
        data.forEach((r) => {
            const key = r.machine ?? "unassigned";
            if (!map[key]) map[key] = [];
            map[key].push(r);
        });
        return map;
    }, [data]);
    console.log("🚀 ~ LoadingPlanTableByMachine ~ groupedRows:", groupedRows);

    const activeRow = useMemo(
        () => (activeId ? data.find((r) => r._dndId === activeId) : null),
        [activeId, data],
    );

    // ── DnD ──────────────────────────────────────────────────────────────────
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    );

    // ── Add row / block ──────────────────────────────────────────────────────
    const [justAddedMachine, setJustAddedMachine] = useState(null);

    useEffect(() => {
        if (justAddedMachine === null) return;
        const id = requestAnimationFrame(() => setJustAddedMachine(null));
        return () => cancelAnimationFrame(id);
    }, [justAddedMachine]);

    // ── Context value ────────────────────────────────────────────────────────
    const tableActionsValue = useMemo(
        () => ({
            selectedIds,
            anchorIdRef,
        }),
        [selectedIds],
    );

    const tableInteractionValue = {
        disableSelection: true,
        disableGripButton: true,
        disableAddRowLot: true,
        disableAddRowBlock: true,
    };

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="relative h-full">
            <TableActionsContext.Provider value={tableActionsValue}>
                <div className="absolute inset-0 overflow-hidden flex flex-col">
                    {sorting.length > 0 && (
                        <div className="text-xs text-warning px-4 pb-2">
                            Sorted by {sorting[0].id} — clear sort to
                            drag/reorder lots.
                            <button
                                onClick={() => setSorting([])}
                                className="underline ml-1"
                            >
                                Clear sort
                            </button>
                        </div>
                    )}

                    {/* ── Top bar: undo/redo + package tabs ── */}
                    <div className="flex-none px-4 pt-4">
                        <div className="flex items-start">
                            <div className="flex flex-col">
                                <DateNav
                                    selected={selectedDate}
                                    onChange={handleDateChange}
                                    isNoFuture
                                />
                                <div className="h-6 mt-1">
                                    {status && status !== "ok" && (
                                        <div className="text-sm text-muted-foreground leading-5">
                                            {getStatusMessage(date, status)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Scrollable machine list ── */}
                    {/*
                            overflow-x-auto lives HERE on the vertical scroll container.
                            This makes it the single horizontal scroll viewport for every
                            MachineSection. The sticky headers inside each section use
                            position:sticky top:0 which works relative to this same
                            ancestor — so stickiness is preserved and there is only one
                            scrollbar that moves header + body together.
                            */}
                    <div
                        ref={scrollParentRef}
                        className="flex-1 min-h-0 px-4 pb-4 overflow-auto"
                    >
                        {/* <div className="flex-1 overflow-x-auto px-4 pb-4"> */}
                        <ScrollParentContext.Provider value={scrollParentRef}>
                            <DndContext
                                sensors={sensors}
                                autoScroll={{
                                    acceleration: 30,
                                    threshold: { x: 0.2, y: 0.2 },
                                    interval: 5,
                                }}
                                collisionDetection={closestCenter}
                            >
                                <div style={{ minWidth: TOTAL_MIN_WIDTH }}>
                                    <div className="sticky top-0 z-20 px-1">
                                        <GlobalTableHeader
                                            sorting={sorting}
                                            onSortingChange={setSorting}
                                        />
                                    </div>
                                    <TableInteractionContext.Provider
                                        value={tableInteractionValue}
                                    >
                                        {machines.map((machine) => (
                                            <MachineSection
                                                key={machine ?? "unassigned"}
                                                machine={machine}
                                                rows={
                                                    groupedRows[
                                                        machine ?? "unassigned"
                                                    ] ?? []
                                                }
                                                justAdded={
                                                    justAddedMachine === machine
                                                }
                                                globalSorting={sorting}
                                                onSortingChange={setSorting}
                                            />
                                        ))}
                                    </TableInteractionContext.Provider>
                                </div>

                                <DragOverlay
                                    dropAnimation={{
                                        duration: 150,
                                        easing: "ease",
                                    }}
                                >
                                    {activeRow ? (
                                        <DragGhostRow row={activeRow} />
                                    ) : null}
                                </DragOverlay>
                            </DndContext>
                        </ScrollParentContext.Provider>
                    </div>
                </div>
            </TableActionsContext.Provider>
        </div>
    );
}
