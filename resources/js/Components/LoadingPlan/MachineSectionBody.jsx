import { machineToDroppableToken } from "@/Lib/dnd.js";
import { useDroppable } from "@dnd-kit/core";
import {
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
    createContext,
    memo,
    useContext,
    useLayoutEffect,
    useMemo,
    useRef,
} from "react";

export const PREFIX_EMPTY_DROPPABLE = "empty-";

export const ScrollParentContext = createContext(null);

export const TableInteractionContext = createContext({
    isSortable: false,
    disableSelection: false,
    disableGripButton: false,
    disableAddRowLot: false,
    disableAddRowBlock: false,
});
export const GapInfoContext = createContext({});

const MachineSectionBody = memo(function MachineSectionBody({
    rows,
    globalSorting,
    onSortingChange,
    machine,
}) {
    const scrollParentRef = useContext(ScrollParentContext);
    const sectionRef = useRef(null); // the section's own <table> wrapper, NOT scrollable

    const table = useReactTable({
        data: rows,
        columns: null,
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
        <div>empty</div>
        // <div ref={sectionRef} className="rounded-b-xl">
        //     <table
        //         className="w-full border-collapse"
        //         style={{ tableLayout: "fixed", minWidth: TOTAL_MIN_WIDTH }}
        //     >
        //         <colgroup>
        //             {table.getAllColumns().map((col) => (
        //                 <col key={col.id} style={{ width: col.getSize() }} />
        //             ))}
        //         </colgroup>
        //         <tbody>
        //             <SortableContext
        //                 items={dndIds}
        //                 strategy={verticalListSortingStrategy}
        //             >
        //                 {tableRows.length === 0 ? (
        //                     <EmptyMachineDropRow machine={machine} />
        //                 ) : (
        //                     <>
        //                         {paddingTop > 0 && (
        //                             <tr>
        //                                 <td
        //                                     style={{ height: paddingTop }}
        //                                     colSpan={COLUMNS.length}
        //                                 />
        //                             </tr>
        //                         )}
        //                         {virtualRows.map((vRow) => {
        //                             const row = tableRows[vRow.index];
        //                             const gapEntry =
        //                                 allGapInfo[machine]?.[
        //                                     row.original._dndId
        //                                 ];
        //                             return (
        //                                 <Fragment key={row.original._dndId}>
        //                                     {gapEntry && (
        //                                         <GapHintRow
        //                                             segments={gapEntry.segments}
        //                                             gapStart={gapEntry.gapStart}
        //                                             gapEnd={gapEntry.gapEnd}
        //                                         />
        //                                     )}
        //                                     <SortableRow
        //                                         row={row}
        //                                         orderedDndIds={dndIds}
        //                                         itemNumber={vRow.index + 1}
        //                                         measureElement={
        //                                             rowVirtualizer.measureElement
        //                                         }
        //                                         virtualIndex={vRow.index}
        //                                     />
        //                                 </Fragment>
        //                             );
        //                         })}
        //                         {paddingBottom > 0 && (
        //                             <tr>
        //                                 <td
        //                                     style={{ height: paddingBottom }}
        //                                     colSpan={COLUMNS.length}
        //                                 />
        //                             </tr>
        //                         )}
        //                     </>
        //                 )}
        //             </SortableContext>
        //         </tbody>
        //     </table>
        // </div>
    );
});

export default MachineSectionBody;
