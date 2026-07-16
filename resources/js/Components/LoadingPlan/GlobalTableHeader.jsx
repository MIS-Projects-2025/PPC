import {
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { COLUMNS, TOTAL_MIN_WIDTH } from "./columns.jsx";

export default function GlobalTableHeader({ sorting, onSortingChange }) {
    const table = useReactTable({
        data: [], // header-only instance, no rows needed
        columns: COLUMNS,
        state: { sorting },
        onSortingChange,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });
    return (
        <table
            className="bg-base-100 border-collapse"
            style={{ tableLayout: "fixed", minWidth: TOTAL_MIN_WIDTH }}
        >
            <colgroup>
                {table.getAllColumns().map((col) => (
                    <col key={col.id} style={{ width: col.getSize() }} />
                ))}
            </colgroup>
            <thead>
                {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id} className="border-b border-base-300">
                        {hg.headers.map((header) => (
                            <th
                                key={header.id}
                                style={{ width: header.getSize() }}
                                className={`px-2.5 py-1.5 text-left text-[11px] font-medium text-base-content/50 whitespace-nowrap overflow-hidden text-ellipsis ${
                                    header.column.getCanSort()
                                        ? "cursor-pointer hover:text-base-content/80 select-none"
                                        : ""
                                }`}
                                onClick={header.column.getToggleSortingHandler()}
                            >
                                {header.isPlaceholder
                                    ? null
                                    : flexRender(
                                          header.column.columnDef.header,
                                          header.getContext(),
                                      )}
                                {header.column.getIsSorted() === "asc" && (
                                    <span className="ml-1 text-info">↑</span>
                                )}
                                {header.column.getIsSorted() === "desc" && (
                                    <span className="ml-1 text-info">↓</span>
                                )}
                            </th>
                        ))}
                    </tr>
                ))}
            </thead>
        </table>
    );
}
