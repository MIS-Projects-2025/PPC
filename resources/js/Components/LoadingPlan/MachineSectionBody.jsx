import { machineToDroppableToken } from "@/Lib/dnd.js";
import { formatExpectedPT } from "@/Lib/time";
import { useDroppable } from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
    createContext,
    Fragment,
    memo,
    useContext,
    useLayoutEffect,
    useMemo,
    useRef,
} from "react";
import { COLUMNS, TOTAL_MIN_WIDTH } from "./columns";
import { SortableRow } from "./SortableRow";

export const PREFIX_EMPTY_DROPPABLE = "empty-";

function EmptyMachineDropRow({ machine }) {
    const { setNodeRef, isOver } = useDroppable({
        id: `${PREFIX_EMPTY_DROPPABLE}${machineToDroppableToken(machine)}`,
    });
    return (
        <tr ref={setNodeRef}>
            <td
                colSpan={COLUMNS.length}
                className={`px-2.5 py-6 text-center text-xs ${
                    isOver ? "bg-info/10 text-info" : "text-base-content/30"
                }`}
            >
                Drop a lot here
            </td>
        </tr>
    );
}

export const ScrollParentContext = createContext(null);
export const SortableTableContext = createContext(null);
export const GapInfoContext = createContext({});

function GapHintRow({ segments }) {
    const totalMinutes = segments.reduce((s, seg) => s + seg.minutes, 0);
    const totalH = Math.floor(totalMinutes / 60);
    const totalM = totalMinutes % 60;
    const totalDur = totalH > 0 ? `${totalH}h ${totalM}m` : `${totalM}m`;

    return (
        <tr className="bg-base-300/50">
            <td
                colSpan={COLUMNS.length}
                className="px-2.5 py-1.5 text-center text-[11px] text-base-content/40 italic"
            >
                <span className="mr-1.5">— {totalDur} elapsed —</span>
                {segments.map((seg, i) => (
                    <span
                        key={i}
                        className={`not-italic font-medium px-1.5 py-0.5 rounded-full mx-0.5 ${
                            seg.kind === "block"
                                ? "bg-base-content/10 text-base-content/50"
                                : "bg-info/10 text-info/70"
                        }`}
                    >
                        {seg.label} {formatExpectedPT(seg.minutes)}
                    </span>
                ))}
            </td>
        </tr>
    );
}

const MachineSectionBody = memo(function MachineSectionBody({
    rows,
    globalSorting,
    onSortingChange,
    machine,
}) {
    const isSortable = useContext(SortableTableContext);
    const scrollParentRef = useContext(ScrollParentContext);
    const sectionRef = useRef(null); // the section's own <table> wrapper, NOT scrollable

    const table = useReactTable({
        data: rows,
        columns: COLUMNS,
        state: { sorting: globalSorting },
        onSortingChange,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getRowId: (row) => row._dndId,
        defaultColumn: { minSize: 40 },
    });
    const allGapInfo = useContext(GapInfoContext);
    const machineGapInfo = allGapInfo[machine] ?? {};

    const tableRows = table.getRowModel().rows;
    const dndIds = useMemo(
        () => tableRows.map((r) => r.original._dndId),
        [tableRows],
    );

    const scrollMarginRef = useRef(0);
    useLayoutEffect(() => {
        if (sectionRef.current) {
            scrollMarginRef.current = sectionRef.current.offsetTop;
        }
    }); // no deps — runs after every commit of this component

    const rowVirtualizer = useVirtualizer({
        count: tableRows.length,
        getScrollElement: () => scrollParentRef.current,
        estimateSize: () => 33,
        overscan: 5,
        scrollMargin: scrollMarginRef.current, // read fresh value, no render lag
        measureElement: (el) => el?.getBoundingClientRect().height,
    });

    const virtualRows = rowVirtualizer.getVirtualItems();
    // const paddingTop = virtualRows[0]?.start ?? 0;
    const paddingTop = virtualRows[0]
        ? virtualRows[0].start - rowVirtualizer.options.scrollMargin
        : 0;
    const paddingBottom =
        rowVirtualizer.getTotalSize() - (virtualRows.at(-1)?.end ?? 0);

    return (
        <div ref={sectionRef} className="rounded-b-xl">
            <table
                className="w-full border-collapse"
                style={{ tableLayout: "fixed", minWidth: TOTAL_MIN_WIDTH }}
            >
                <colgroup>
                    {table.getAllColumns().map((col) => (
                        <col key={col.id} style={{ width: col.getSize() }} />
                    ))}
                </colgroup>
                <tbody>
                    <SortableContext
                        items={dndIds}
                        strategy={verticalListSortingStrategy}
                    >
                        {tableRows.length === 0 ? (
                            <EmptyMachineDropRow machine={machine} />
                        ) : (
                            <>
                                {paddingTop > 0 && (
                                    <tr>
                                        <td
                                            style={{ height: paddingTop }}
                                            colSpan={COLUMNS.length}
                                        />
                                    </tr>
                                )}
                                {virtualRows.map((vRow) => {
                                    const row = tableRows[vRow.index];
                                    const segments =
                                        allGapInfo[machine]?.[
                                            row.original._dndId
                                        ];
                                    return (
                                        <Fragment key={row.original._dndId}>
                                            <SortableRow
                                                row={row}
                                                orderedDndIds={dndIds}
                                                itemNumber={vRow.index + 1}
                                                measureElement={
                                                    rowVirtualizer.measureElement
                                                }
                                                virtualIndex={vRow.index}
                                                isSortable={isSortable}
                                            />
                                            {segments && (
                                                <GapHintRow
                                                    segments={segments}
                                                />
                                            )}
                                        </Fragment>
                                    );
                                })}
                                {paddingBottom > 0 && (
                                    <tr>
                                        <td
                                            style={{ height: paddingBottom }}
                                            colSpan={COLUMNS.length}
                                        />
                                    </tr>
                                )}
                            </>
                        )}
                    </SortableContext>
                </tbody>
            </table>
        </div>
    );
});

export default MachineSectionBody;
