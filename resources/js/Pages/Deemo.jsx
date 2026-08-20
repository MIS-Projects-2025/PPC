import {
    DndContext,
    DragOverlay,
    PointerSensor,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { useCallback, useMemo, useState } from "react";
import { DataGrid, renderTextEditor } from "react-data-grid";
import "react-data-grid/lib/styles.css";

/**
 * DEMO: machine-grouped lot table
 * -----------------------------------------------------------------------
 * - Rows are grouped by machine. Each group starts with a "header" row
 *   (different shape than data rows, spans the full width, not editable).
 * - Data rows underneath are normal editable grid rows.
 * - A drag handle on each data row lets you drag it onto a DIFFERENT
 *   machine's header to reassign it to that group (dnd-kit).
 *
 * Row shape now mirrors LoadingPlanController::createPlannedLot()'s
 * return array (subset of fields relevant to this table), instead of
 * the old placeholder partname/lotid/pkg/lc field names. Grouping key
 * is `machine` (the machine name string createPlannedLot returns),
 * not a synthetic machineId.
 *
 * This does NOT use react-data-grid's TreeDataGrid/groupBy. Grouping here
 * is just "which machine does this row belong to" -- the grid only ever
 * sees one flat array that we rebuild (header, then its rows, per
 * machine) on every render via useMemo. That keeps onFill / drag-fill
 * available on data rows, which TreeDataGrid does not support.
 * -----------------------------------------------------------------------
 */

// ---------------------------------------------------------------------
// Sample seed data
// ---------------------------------------------------------------------

// `name` here is what createPlannedLot's `machine` field will hold for
// entries assigned to this machine (machine_snapshot / getMachineName()).
const initialMachines = [
    { name: "Machine A", operator: "JB", shift: "AM" },
    { name: "Machine B", operator: "Dave", shift: "PM" },
    { name: "Machine C", operator: "Nico", shift: "AM" },
];

const PACKAGE_NAMES = ["DFN", "SOIC_N", "QFN", "TSSOP", "BGA"];
const STATUSES = ["scheduled", "running", "done"];

// Builds rows shaped like createPlannedLot()'s return array -- only the
// subset of fields this table actually displays/edits.
function generateDataRows(
    count = 1000,
    machineNames = initialMachines.map((m) => m.name),
) {
    return Array.from({ length: count }, (_, i) => {
        const n = i + 1;
        const startHour = 6 + (n % 12);
        return {
            entry_id: `e${n}`,
            machine: machineNames[n % machineNames.length],

            // Lot & WIP identifiers/specs
            part_name: `LT${3000 + (n % 500)}${n % 2 === 0 ? "EDD" : "HDD"}#${
                n % 3 === 0 ? "TRPBF" : "PBF"
            }`,
            lot_id: `bc${99800 + Math.floor(n / 10)}.${n % 10}`,
            package_name: PACKAGE_NAMES[n % PACKAGE_NAMES.length],
            lead_count: 1 + (n % 12),

            // Execution & timing
            status: STATUSES[n % STATUSES.length],
            sequence_order: n * 1000,
            time_start: `${String(startHour).padStart(2, "0")}:00`,
            time_end: `${String((startHour + 2) % 24).padStart(2, "0")}:00`,

            // Capacity & recipe metadata
            qty: 1 + ((n * 37) % 12000),
            doable: 1 + ((n * 13) % 12000),
            doable_status: n % 5 === 0 ? "no_recipe" : "ok",
        };
    });
}

const initialDataRows = generateDataRows(1000);

// ---------------------------------------------------------------------
// Drag handle rendered inside a DATA row's first cell.
// ---------------------------------------------------------------------

function RowDragHandle({ rowId }) {
    const {
        attributes,
        listeners,
        setNodeRef: setDragRef,
        isDragging,
    } = useDraggable({
        id: rowId,
    });
    const { setNodeRef: setDropRef, isOver } = useDroppable({
        id: `row-${rowId}`,
    });

    const setRefs = useCallback(
        (node) => {
            setDragRef(node);
            setDropRef(node);
        },
        [setDragRef, setDropRef],
    );

    return (
        <div
            ref={setRefs}
            {...listeners}
            {...attributes}
            style={{
                /* ...existing styles... */
                outline: isOver ? "2px dashed #7dd3fc" : undefined,
            }}
        >
            ⠿
        </div>
    );
}

// ---------------------------------------------------------------------
// Full-width header cell rendered for a MACHINE header row. This is
// also the drop target: dropping a dragged row's id here reassigns it
// to this machine.
// ---------------------------------------------------------------------

function MachineHeaderCell({ row, rowCount }) {
    // droppable id keyed off machine name (matches row.machine on data rows)
    const { setNodeRef, isOver } = useDroppable({
        id: `machine-${row.machine}`,
    });

    return (
        <div
            ref={setNodeRef}
            style={{
                width: "100%",
                display: "flex",
                zIndex: 10000,
                alignItems: "center",
                gap: 16,
                height: "100%",
                padding: "0 10px",
                fontWeight: 600,
                fontSize: 13,
                background: "#FFC0CB",
                outline: isOver ? "2px dashed #7dd3fc" : "none",
                outlineOffset: -2,
                boxSizing: "border-box",
                transition: "background 100ms ease",
            }}
        >
            <span>{row.machine}</span>
            <span style={{ fontWeight: 400, color: "#9aa1ac" }}>
                Operator: {row.operator} · Shift: {row.shift} · {rowCount} lot
                {rowCount === 1 ? "" : "s"}
            </span>
        </div>
    );
}

// ---------------------------------------------------------------------
// Column definitions
// Field keys line up 1:1 with createPlannedLot()'s return array
// (part_name, lot_id, qty, package_name, lead_count, status,
// sequence_order, time_start, time_end, doable, doable_status) so
// mapping backend entries -> grid rows needs no renaming.
// ---------------------------------------------------------------------

const DATA_COLUMNS = [
    { key: "part_name", name: "PART NAME" },
    { key: "lot_id", name: "LOT ID" },
    { key: "qty", name: "QTY" },
    { key: "package_name", name: "PACKAGE" },
    { key: "lead_count", name: "LC" },
    { key: "status", name: "STATUS" },
    { key: "sequence_order", name: "SEQ" },
    { key: "time_start", name: "START" },
    { key: "time_end", name: "END" },
    { key: "doable", name: "DOABLE" },
    { key: "doable_status", name: "DOABLE STATUS" },
];

// dragHandle + all data columns; used for the header row's colSpan so it
// spans the whole grid width regardless of how many columns are defined.
const NUM_COLUMNS = DATA_COLUMNS.length + 1;

function makeColumns() {
    return [
        {
            key: "dragHandle",
            name: "",
            width: 36,
            resizable: false,
            // This column carries the span for header rows -- it claims
            // the full row width, so the other columns are never asked
            // to render anything for that row at all.
            colSpan(args) {
                if (args.type === "ROW" && args.row.__type === "header") {
                    return NUM_COLUMNS;
                }
                return undefined;
            },
            renderCell({ row }) {
                if (row.__type === "header") {
                    // rowCount is stashed on the row object when we build
                    // displayRows below.
                    return (
                        <MachineHeaderCell
                            row={row}
                            rowCount={row.__rowCount}
                        />
                    );
                }
                return <RowDragHandle rowId={row.entry_id} />;
            },
            // never editable, for either row type
        },
        ...DATA_COLUMNS.map((col) => ({
            ...col,
            renderEditCell: renderTextEditor,
            renderCell({ row }) {
                if (row.__type === "header") {
                    return;
                }
                return row[col.key];
            },
        })),
    ];
}

// ---------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------

export default function Deemo() {
    const [machines] = useState(initialMachines);
    const [dataRows, setDataRows] = useState(initialDataRows);
    const [activeId, setActiveId] = useState(null);

    const columns = useMemo(() => makeColumns(), []);

    // Rebuild the flat row list every render: header row, then its data
    // rows, per machine, in machine order. This is the "grouping" -- no
    // TreeDataGrid, no groupBy, just an array we own. Grouping key is
    // `machine` (a name string), matching createPlannedLot()'s `machine`
    // field, not a synthetic id.
    const displayRows = useMemo(() => {
        return machines.flatMap((m) => {
            const rowsForMachine = dataRows.filter((r) => r.machine === m.name);
            const headerRow = {
                id: `header-${m.name}`,
                __type: "header",
                machine: m.name,
                operator: m.operator,
                shift: m.shift,
                __rowCount: rowsForMachine.length,
            };
            return [
                headerRow,
                ...rowsForMachine.map((r) => ({
                    ...r,
                    id: r.entry_id,
                    __type: "data",
                })),
            ];
        });
    }, [machines, dataRows]);

    const handleRowsChange = useCallback((updatedRows) => {
        // Only real data rows come back through here in editable form;
        // header rows never have an editor so they never change. Strip
        // the __type/id (grid-only) fields back out before writing to
        // state so dataRows stays shaped like createPlannedLot() output.
        setDataRows(
            updatedRows
                .filter((r) => r.__type === "data")
                .map(({ __type, id, ...rest }) => rest),
        );
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            // small threshold so clicking a cell to select it doesn't
            // get misread as a drag
            activationConstraint: { distance: 4 },
        }),
    );

    const handleDragStart = useCallback((event) => {
        setActiveId(event.active.id);
    }, []);

    const handleDragEnd = useCallback((event) => {
        setActiveId(null);
        const { active, over } = event;
        if (!over) return;

        const overId = String(over.id);
        const draggedRowId = active.id;
        if (draggedRowId === overId) return;

        setDataRows((prev) => {
            const fromIndex = prev.findIndex(
                (r) => r.entry_id === draggedRowId,
            );
            if (fromIndex === -1) return prev;
            const draggedRow = prev[fromIndex];

            if (overId.startsWith("machine-")) {
                // dropped on a header -> reassign group, push to the end of that group
                const targetMachine = overId.replace("machine-", "");
                const without = prev.filter((r) => r.entry_id !== draggedRowId);
                const lastIndexOfGroup = without.reduce(
                    (acc, r, i) => (r.machine === targetMachine ? i : acc),
                    -1,
                );
                const insertAt = lastIndexOfGroup + 1;
                const next = [...without];
                next.splice(insertAt, 0, {
                    ...draggedRow,
                    machine: targetMachine,
                });
                return next;
            }

            if (overId.startsWith("row-")) {
                // dropped on another row -> reorder (and possibly reassign group)
                const targetId = overId.replace("row-", "");
                const without = prev.filter((r) => r.entry_id !== draggedRowId);
                const targetIndex = without.findIndex(
                    (r) => r.entry_id === targetId,
                );
                if (targetIndex === -1) return prev;
                const targetRow = without[targetIndex];
                const next = [...without];
                next.splice(targetIndex, 0, {
                    ...draggedRow,
                    machine: targetRow.machine,
                });
                return next;
            }

            return prev;
        });
    }, []);

    const draggedRow = useMemo(
        () => dataRows.find((r) => r.entry_id === activeId),
        [dataRows, activeId],
    );

    const rowClass = useCallback((row) => {
        return row.__type === "header" ? "machine-header-row" : undefined;
    }, []);

    return (
        <div style={{ padding: 24, background: "#14161a", minHeight: "100vh" }}>
            <h2 style={{ color: "#eee", marginBottom: 4 }}>Machine Lots</h2>
            <p style={{ color: "#9aa1ac", marginBottom: 16, fontSize: 13 }}>
                Drag the ⠿ handle on any row onto a different machine's header
                bar to move that lot to that machine.
            </p>

            <DndContext
                sensors={sensors}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <DataGrid
                    columns={columns}
                    rows={displayRows}
                    onRowsChange={handleRowsChange}
                    rowKeyGetter={(row) => row.id}
                    rowClass={rowClass}
                    defaultColumnOptions={{ resizable: true }}
                    className="rdg-dark"
                    style={{ blockSize: "70vh" }}
                />

                <DragOverlay>
                    {draggedRow ? (
                        <div
                            style={{
                                padding: "6px 12px",
                                background: "#2c3a4f",
                                border: "1px solid #7dd3fc",
                                borderRadius: 4,
                                color: "#eee",
                                fontSize: 13,
                                boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                            }}
                        >
                            {draggedRow.part_name || "Lot"}
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* Minimal styling for the header row band. Move this into
                your real stylesheet -- inlined here just so this file is
                drop-in runnable on its own. */}
            <style>{`
                .machine-header-row {
                    cursor: default;
                }
                .machine-header-row .rdg-cell {
                    padding: 0 !important;
                }
            `}</style>
        </div>
    );
}
