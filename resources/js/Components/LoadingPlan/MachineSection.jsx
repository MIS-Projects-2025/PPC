import { COLUMNS, TOTAL_MIN_WIDTH } from "@/Components/LoadingPlan/columns.jsx";
import { initialData as _initialData } from "@/Constants/loadingPlanData.js";
import { MACHINE_MANUAL } from "@/Constants/machines.js";
import { Deferred } from "@inertiajs/react";
import clsx from "clsx";
import { memo, useContext, useEffect, useMemo, useRef, useState } from "react";
import HoverCell from "./HoverCell";
import { TableInteractionContext } from "./MachineSectionBody";
import MachineSectionBody from "./MachineSectionBody.jsx";

export const isBlockRow = (row) => row?.isBlock === true;

const MachineSection = memo(
    function MachineSection({
        machine,
        rows,
        isDropTarget,
        justAdded,
        otherPackageCount,
        globalSorting,
        onSortingChange,
        onAddRow,
        onAddBlock,
        isUpdating,
    }) {
        const outerRef = useRef(null);
        const {
            disableAddRowLot,
            disableAddRowBlock,
            scrollParentRef,
            machineCapacity,
            machineTotalDoable,
        } = useContext(TableInteractionContext);
        // console.log(
        //     "🚀 ~ MachineSection ~ machineTotalDoable:",
        //     machineTotalDoable,
        // );
        const [collapsed, setCollapsed] = useState(true);
        const sentinelRef = useRef(null);
        const [isStuck, setIsStuck] = useState(false);

        const prevAutoExpand = useRef(false);
        const shouldAutoExpand = isDropTarget || justAdded;
        if (shouldAutoExpand && !prevAutoExpand.current) {
            prevAutoExpand.current = true;
            if (collapsed) setCollapsed(false);
        }
        if (!shouldAutoExpand) prevAutoExpand.current = false;

        const totalQty = useMemo(
            () =>
                rows.reduce((s, r) => s + (isBlockRow(r) ? 0 : r.Qty || 0), 0),
            [rows],
        );

        const totalDoable = useMemo(
            () =>
                rows.reduce(
                    (s, r) => s + (isBlockRow(r) ? 0 : r.Doable || 0),
                    0,
                ),
            [rows],
        );

        const toggleCollapsed = () => {
            const scrollEl = scrollParentRef?.current;
            const beforeTop = outerRef.current?.getBoundingClientRect().top;

            setCollapsed((c) => !c);

            if (scrollEl && beforeTop != null) {
                requestAnimationFrame(() => {
                    const afterTop =
                        outerRef.current.getBoundingClientRect().top;
                    scrollEl.scrollTop += afterTop - beforeTop;
                });
            }
        };

        const incompleteCount = useMemo(
            () => rows.filter((r) => !isBlockRow(r) && !r.Lot_Id).length,
            [rows],
        );

        const isUnassigned = machine === null;
        const isManual = machine === MACHINE_MANUAL;
        const isPseudo = isUnassigned || isManual;

        const isExceeded = useMemo(() => {
            if (isUnassigned || isManual) return false;
            const capacityData = machineCapacity?.[machine];
            const CAPACITY = capacityData?.capacity ?? 0;
            const overallDoable = machineTotalDoable?.[machine] ?? totalDoable;
            return CAPACITY > 0 && overallDoable > CAPACITY;
        }, [
            machineCapacity,
            machineTotalDoable,
            machine,
            totalDoable,
            isUnassigned,
            isManual,
        ]);

        useEffect(() => {
            const sentinel = sentinelRef.current;
            const root = scrollParentRef?.current;
            if (!sentinel) return;

            const observer = new IntersectionObserver(
                ([entry]) => setIsStuck(!entry.isIntersecting),
                {
                    root: root ?? null, // null falls back to viewport
                    threshold: [1],
                    rootMargin: `-29px 0px 0px 0px`, // matches top-7 (7 * 4px = 28px, +1 to force trigger)
                },
            );
            observer.observe(sentinel);
            return () => observer.disconnect();
        }, [scrollParentRef]);

        return (
            <div
                ref={outerRef}
                id={`machine-section-${machine ?? "unassigned"}`}
                className={`mb-2 rounded-xl transition-all duration-150 ${
                    isExceeded
                        ? "ring-2 ring-error"
                        : isDropTarget
                          ? "ring-2 ring-info shadow-md"
                          : isPseudo
                            ? "ring-1 ring-base-300 opacity-60"
                            : "ring-1 ring-base-300"
                }`}
                // className={`mb-2 rounded-xl transition-all duration-150 ${
                //     isDropTarget
                //         ? "ring-2 ring-info shadow-md"
                //         : isPseudo
                //           ? "ring-1 ring-base-300 opacity-60"
                //           : "ring-1 ring-base-300"
                // }`}
            >
                <div ref={sentinelRef} style={{ height: 0 }} />
                {/* Sticky machine header */}
                <div className="sticky top-7 z-10 rounded-t-xl">
                    <table
                        className={`shadow-lg w-full border-collapse cursor-pointer select-none bg-base-200
                            ${isStuck ? "shadow-2xl" : "shadow-none"}
                            ${collapsed ? "bg-base-300 border-b border-base-content/10" : "border-b-4 border-base-content/20"}    
                        `}
                        style={{
                            tableLayout: "fixed",
                            minWidth: TOTAL_MIN_WIDTH,
                        }}
                        onClick={() => toggleCollapsed()}
                    >
                        <colgroup>
                            {COLUMNS.map((col) => (
                                <col
                                    key={col.id ?? col.accessorKey}
                                    style={{ width: col.size ?? 100 }}
                                />
                            ))}
                        </colgroup>
                        <tbody>
                            <tr>
                                {/* + lot / + block buttons — Unassigned never
                                    gets either (lots only arrive there via
                                    drag/transfer, and there's no timeline to
                                    interrupt with a block). Manual gets both,
                                    same as a real machine, since it has its
                                    own real queue. */}
                                <td className="flex flex-col">
                                    {!disableAddRowLot && !isUnassigned && (
                                        <button
                                            disabled={isUpdating}
                                            className="btn btn-ghost btn-sm w-16 z-1000 text-left h-5 leading-0 text-[10px] font-medium text-info hover:text-info/80 hover:bg-info/10"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onAddRow(machine);
                                            }}
                                        >
                                            + lot
                                        </button>
                                    )}
                                    {!disableAddRowBlock && !isUnassigned && (
                                        <button
                                            disabled={isUpdating}
                                            className="btn btn-ghost btn-sm w-16 z-1000 text-left h-5 leading-0 text-[10px] font-medium text-base-content/50 hover:text-base-content/80 hover:bg-base-300"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onAddBlock(machine);
                                            }}
                                        >
                                            + block
                                        </button>
                                    )}
                                </td>

                                {/* Collapse chevron */}
                                <td className="py-2 text-center">
                                    <svg
                                        className="text-base-content/30 transition-transform duration-150 inline-block"
                                        style={{
                                            transform: collapsed
                                                ? "rotate(-90deg)"
                                                : "rotate(0deg)",
                                        }}
                                        width="12"
                                        height="12"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </td>

                                {/* Lot count + machine name */}
                                <td
                                    colSpan={3}
                                    className="sticky left-12 z-20 py-2"
                                >
                                    <div className="flex gap-10 items-center leading-0">
                                        <span
                                            className={clsx(
                                                "w-30 text-sm font-semibold",
                                                isExceeded
                                                    ? "text-error"
                                                    : isPseudo
                                                      ? "italic text-base-content/60"
                                                      : rows.length === 0
                                                        ? "text-base-content/30"
                                                        : "text-base-content",
                                            )}
                                            // className={`w-30 text-sm font-semibold ${
                                            //     isPseudo
                                            //         ? "italic text-base-content/60"
                                            //         : rows.length === 0
                                            //           ? "text-base-content/30"
                                            //           : "text-base-content"
                                            // }`}
                                        >
                                            {(() => {
                                                if (machine === null)
                                                    return "Unassigned";
                                                if (machine === MACHINE_MANUAL)
                                                    return "Manual";
                                                return machine;
                                            })()}
                                        </span>

                                        <div>
                                            {rows.length === 0 ? (
                                                <span className="text-[11px] font-medium font-mono text-base-content/30 italic">
                                                    0 rows
                                                    {otherPackageCount > 0 &&
                                                        ` · ${otherPackageCount} in other packages`}
                                                </span>
                                            ) : (
                                                <span className="text-[11px] font-mono text-base-content/50">
                                                    <span className="font-bold text-sm text-base-content">
                                                        {rows.length}
                                                    </span>{" "}
                                                    row
                                                    {rows.length !== 1
                                                        ? "s"
                                                        : ""}
                                                </span>
                                            )}
                                            {incompleteCount > 0 && (
                                                <span className="ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full bg-warning/20 text-warning font-medium">
                                                    {incompleteCount} incomplete
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </td>

                                {/* Machine name */}
                                {/* <td className="px-2.5 py-2">
                                </td> */}

                                {/* Package — empty */}
                                {/* <td /> */}

                                {/* Lot ID — drop target indicator */}
                                <td className="px-2.5 py-2">
                                    {isDropTarget && (
                                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-info/20 text-info font-medium animate-pulse">
                                            ↓ transfer here
                                        </span>
                                    )}
                                </td>

                                {/* Status */}
                                <td />
                                {/* Remarks */}
                                <td />
                                {/* Station */}
                                <td />

                                {/* 2. Sticky Qty total (assuming Machine Name cell width is 320px -> left = 12 + 320 = 332px) */}
                                <td className="sticky left-[332px] z-20 px-2.5 py-2">
                                    <span className="text-[11px] font-medium text-base-content/60">
                                        {totalQty.toLocaleString()}
                                    </span>
                                </td>

                                <td
                                    colSpan={3}
                                    className={`sticky left-[400px] z-20 transition-colors`}
                                >
                                    {!isUnassigned && !isManual && (
                                        <Deferred
                                            data="machineCapacity"
                                            fallback={
                                                <div className="flex flex-col min-w-[170px]">
                                                    <div className="h-6 w-full rounded-md animate-pulse flex items-center text-[10px] text-base-content/40 font-mono">
                                                        <span className="loading loading-spinner loading-xs mr-2"></span>{" "}
                                                        Loading capacity...
                                                    </div>
                                                </div>
                                            }
                                        >
                                            {/* Resolved State */}
                                            {(() => {
                                                const capacityData =
                                                    machineCapacity?.[machine];

                                                const CAPACITY =
                                                    capacityData?.capacity ?? 0;
                                                const effectiveFrom =
                                                    capacityData?.effective_from
                                                        ? capacityData.effective_from.split(
                                                              "T",
                                                          )[0]
                                                        : null;

                                                // 1. Distinguish section Doable vs overall machine Doable
                                                const sectionDoable =
                                                    totalDoable ?? 0;
                                                const overallDoable =
                                                    machineTotalDoable?.[
                                                        machine
                                                    ] ?? sectionDoable;
                                                const otherDoable = Math.max(
                                                    0,
                                                    overallDoable -
                                                        sectionDoable,
                                                );

                                                // const isExceeded =
                                                //     CAPACITY > 0 &&
                                                //     overallDoable > CAPACITY;

                                                // 2. Compute fill widths relative to Capacity
                                                const sectionPct =
                                                    CAPACITY > 0
                                                        ? Math.min(
                                                              (sectionDoable /
                                                                  CAPACITY) *
                                                                  100,
                                                              100,
                                                          )
                                                        : 0;

                                                const otherPct =
                                                    CAPACITY > 0
                                                        ? Math.min(
                                                              (otherDoable /
                                                                  CAPACITY) *
                                                                  100,
                                                              Math.max(
                                                                  0,
                                                                  100 -
                                                                      sectionPct,
                                                              ),
                                                          )
                                                        : 0;

                                                const capacityTooltip = (
                                                    <div
                                                        className={`rounded-md shadow-md border border-opposite-100/20 relative w-full h-6 overflow-hidden flex cursor-pointer ${
                                                            isExceeded
                                                                ? "ring-1 ring-error"
                                                                : ""
                                                        }`}
                                                    >
                                                        {/* Segment A: Current Section Doable */}
                                                        <div
                                                            className={`h-full transition-all duration-300 ${
                                                                isExceeded
                                                                    ? "bg-error"
                                                                    : sectionPct +
                                                                            otherPct >
                                                                        85
                                                                      ? "bg-warning/50"
                                                                      : //   : "bg-base-content/25"
                                                                        "bg-lime-300/50"
                                                            }`}
                                                            style={{
                                                                width: `${sectionPct}%`,
                                                            }}
                                                        />

                                                        {/* Segment B: Other Sections Doable */}
                                                        <div
                                                            className={`h-full transition-all duration-300 ${
                                                                isExceeded
                                                                    ? "bg-error"
                                                                    : sectionPct +
                                                                            otherPct >
                                                                        85
                                                                      ? "bg-warning/50"
                                                                      : //   : "bg-base-content/25"
                                                                        "bg-lime-300"
                                                            }`}
                                                            style={{
                                                                width: `${otherPct}%`,
                                                            }}
                                                        />

                                                        {/* Clean Single-Line Overlay Label */}
                                                        <div className="absolute inset-0 flex items-center justify-between px-2 font-mono text-[11px] z-10 pointer-events-none whitespace-nowrap">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-base-content bg-base-300 rounded px-1 font-black">
                                                                    {overallDoable.toLocaleString()}{" "}
                                                                </span>
                                                                <span className="text-base-content text-[10px] font-normal">
                                                                    (
                                                                    {sectionDoable.toLocaleString()}{" "}
                                                                    here)
                                                                </span>
                                                            </div>

                                                            <span className="text-base-content text-[10px] font-normal">
                                                                /{" "}
                                                                {CAPACITY.toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );

                                                return (
                                                    <div className="flex flex-col min-w-[170px]">
                                                        {/* DaisyUI Rich Tooltip */}
                                                        <HoverCell
                                                            trigger={
                                                                capacityTooltip
                                                            }
                                                        >
                                                            <div className="text-xs font-mono rounded-lg text-base-100 space-y-1.5 min-w-[180px] text-left">
                                                                <div className="flex justify-between items-center gap-3">
                                                                    <span className="text-primary font-bold">
                                                                        This
                                                                        Section:
                                                                    </span>
                                                                    <span className="font-bold bg-primary px-1.5 py-0.5 rounded text-[11px]">
                                                                        {sectionDoable.toLocaleString()}
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between items-center gap-3">
                                                                    <span className="opacity-70">
                                                                        Machine
                                                                        Total:
                                                                    </span>
                                                                    <span className="font-semibold">
                                                                        {overallDoable.toLocaleString()}
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between items-center gap-3 border-t border-neutral-content/15 pt-1">
                                                                    <span className="opacity-70">
                                                                        Capacity:
                                                                    </span>
                                                                    <span className="font-semibold">
                                                                        {CAPACITY.toLocaleString()}
                                                                    </span>
                                                                </div>
                                                                {effectiveFrom && (
                                                                    <div className="text-[10px] opacity-50 pt-0.5 border-t border-neutral-content/10">
                                                                        Effective:{" "}
                                                                        {
                                                                            effectiveFrom
                                                                        }
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </HoverCell>
                                                    </div>
                                                );
                                            })()}
                                        </Deferred>
                                    )}
                                </td>

                                {/* Rest empty */}
                                {/* <td /> */}
                                {/* <td /> */}
                                <td />
                                <td />
                                <td />
                                <td />
                                <td />
                                <td />
                                <td />
                                <td />
                                <td />
                                <td />
                                <td />
                                <td />
                            </tr>
                        </tbody>
                    </table>
                </div>

                {!collapsed && (
                    <MachineSectionBody
                        rows={rows}
                        globalSorting={globalSorting}
                        onSortingChange={onSortingChange}
                        machine={machine}
                    />
                )}
                {/* <div
                    style={{
                        contentVisibility: collapsed ? "hidden" : "visible",
                        containIntrinsicSize: collapsed ? "0 0" : undefined,
                    }}
                >
                    <MachineSectionBody
                        rows={rows}
                        globalSorting={globalSorting}
                        onSortingChange={onSortingChange}
                        machine={machine}
                    />
                </div> */}
            </div>
        );
    },
    (prev, next) =>
        prev.rows === next.rows &&
        prev.isDropTarget === next.isDropTarget &&
        prev.justAdded === next.justAdded &&
        prev.otherPackageCount === next.otherPackageCount &&
        prev.globalSorting === next.globalSorting,
);

export default MachineSection;
