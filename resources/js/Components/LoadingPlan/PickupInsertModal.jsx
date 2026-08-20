import {
    DndContext,
    PointerSensor,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { forwardRef, useCallback, useMemo, useRef, useState } from "react";
import { DataGrid, renderHeaderCell, renderTextEditor } from "react-data-grid";
import "react-data-grid/lib/styles.css";

// The fields the system actually cares about -- only enforced at submit time.
const REQUIRED_FIELDS = [
    { key: "partname", label: "Partname" },
    { key: "lotId", label: "LotId" },
    { key: "qty", label: "Qty" },
    { key: "package", label: "Package" },
    { key: "lc", label: "LC" },
];

// Header cell that is both draggable (as a source) and droppable (as a
// target). Dropping column A onto column B swaps the underlying row data
// for those two keys -- the `columns` array (and therefore header order)
// is never touched, so labels stay exactly where they are.
function SwapHeaderCell(props) {
    const { column } = props;

    const {
        attributes,
        listeners,
        setNodeRef: setDragRef,
        isDragging,
    } = useDraggable({ id: column.key });

    const { setNodeRef: setDropRef, isOver } = useDroppable({
        id: column.key,
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
                width: "100%",
                height: "100%",
                cursor: "grab",
                opacity: isDragging ? 0.5 : 1,
                backgroundColor: isOver ? "#3a3f4b" : undefined,
                outline: isOver ? "2px dashed #7dd3fc" : undefined,
            }}
        >
            {renderHeaderCell(props)}
        </div>
    );
}

// Turns a 0-based index into an Excel-style column letter: 0 -> A, 25 -> Z, 26 -> AA...
function excelColumnLetter(index) {
    let n = index;
    let letters = "";
    do {
        letters = String.fromCharCode(65 + (n % 26)) + letters;
        n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return letters;
}

function makeColumn(index) {
    const key = `col${index}`;
    return {
        key,
        name: excelColumnLetter(index),
        editable: true,
        renderEditCell: renderTextEditor,
        resizable: true,
    };
}

function emptyRow(id, columnCount) {
    const row = { id };
    for (let i = 0; i < columnCount; i++) row[`col${i}`] = "";
    return row;
}

// Parses an HTML clipboard fragment's <table> into a 2D array, expanding
// colspan/rowspan so every row ends up with the same number of columns.
// Needed because Outlook/Word plain-text paste has no tab separators --
// only the HTML payload preserves real column/row structure.
function parseHtmlTable(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const table = doc.querySelector("table");
    if (!table) return null;

    const trs = Array.from(table.querySelectorAll("tr"));
    const grid = [];
    const rowspanCarry = {}; // colIdx -> { value, remaining }

    trs.forEach((tr) => {
        const rowCells = [];
        let col = 0;
        const cells = Array.from(tr.children).filter((el) =>
            /^(td|th)$/i.test(el.tagName),
        );
        let cellPtr = 0;

        while (cellPtr < cells.length || rowspanCarry[col]) {
            if (rowspanCarry[col]?.remaining > 0) {
                rowCells[col] = rowspanCarry[col].value;
                rowspanCarry[col].remaining -= 1;
                if (rowspanCarry[col].remaining === 0) delete rowspanCarry[col];
                col += 1;
                continue;
            }
            const cell = cells[cellPtr];
            if (!cell) break;
            const text = cell.textContent.replace(/\s+/g, " ").trim();
            const colspan = parseInt(cell.getAttribute("colspan") || "1", 10);
            const rowspan = parseInt(cell.getAttribute("rowspan") || "1", 10);

            for (let c = 0; c < colspan; c++) {
                rowCells[col] = text;
                if (rowspan > 1) {
                    rowspanCarry[col] = { value: text, remaining: rowspan - 1 };
                }
                col += 1;
            }
            cellPtr += 1;
        }
        grid.push(rowCells);
    });

    return grid;
}

const INITIAL_COLUMN_COUNT = 8; // just a comfortable starting width, grows as needed
const INITIAL_ROW_COUNT = 10;

const PickupInsertModal = forwardRef(function PickupInsertModal(
    { onClose },
    ref,
) {
    const [columns, setColumns] = useState(() =>
        Array.from({ length: INITIAL_COLUMN_COUNT }, (_, i) => makeColumn(i)),
    );

    const [rows, setRows] = useState(() =>
        Array.from({ length: INITIAL_ROW_COUNT }, (_, i) =>
            emptyRow(i, INITIAL_COLUMN_COUNT),
        ),
    );

    console.log(
        "LOG ~ PickupInsertModal.jsx:164 ~ PickupInsertModal ~ rows:",
        rows,
    );
    console.log(
        "LOG ~ PickupInsertModal.jsx:156 ~ PickupInsertModal ~ columns:",
        columns,
    );

    const [mapping, setMapping] = useState({}); // colKey -> REQUIRED_FIELDS key
    const [showMapping, setShowMapping] = useState(false);

    const selectedPositionRef = useRef({ rowIdx: 0, colIdx: 0 });
    const nextRowId = useRef(INITIAL_ROW_COUNT);

    // Require a small pointer movement before a drag starts, so clicking a
    // header to sort/select doesn't get eaten by dnd-kit.
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 4 },
        }),
    );

    const updateSelectedPosition = useCallback(
        (args) => {
            const colIdx = columns.findIndex((c) => c.key === args.column.key);
            if (colIdx === -1) return;
            selectedPositionRef.current = { rowIdx: args.rowIdx, colIdx };
        },
        [columns],
    );

    const handlePaste = useCallback((e) => {
        const html = e.clipboardData?.getData("text/html");
        const text = e.clipboardData?.getData("text/plain");
        if (!html && !text) return;
        e.preventDefault();

        let pasteGrid = html ? parseHtmlTable(html) : null;
        if (!pasteGrid) {
            pasteGrid = text
                .replace(/\r\n/g, "\n")
                .replace(/\r/g, "\n")
                .split("\n")
                .filter(
                    (line, idx, arr) =>
                        !(idx === arr.length - 1 && line === ""),
                )
                .map((line) => line.split("\t"));
        }

        const startRow = Math.max(0, selectedPositionRef.current.rowIdx);
        const startCol = Math.max(0, selectedPositionRef.current.colIdx);
        const pasteWidth = Math.max(...pasteGrid.map((line) => line.length));
        const neededColumnCount = startCol + pasteWidth;

        setColumns((prevColumns) => {
            if (neededColumnCount <= prevColumns.length) return prevColumns;
            const extra = Array.from(
                { length: neededColumnCount - prevColumns.length },
                (_, i) => makeColumn(prevColumns.length + i),
            );
            return [...prevColumns, ...extra];
        });

        setRows((prevRows) => {
            const nextRows = prevRows.map((r) => {
                const row = { ...r };
                for (
                    let i = row ? Object.keys(row).length - 1 : 0;
                    i < neededColumnCount;
                    i++
                ) {
                    if (!(`col${i}` in row)) row[`col${i}`] = "";
                }
                return row;
            });

            pasteGrid.forEach((lineCells, r) => {
                const targetRowIdx = startRow + r;
                while (targetRowIdx >= nextRows.length) {
                    nextRows.push(
                        emptyRow(nextRowId.current++, neededColumnCount),
                    );
                }
                lineCells.forEach((cellValue, c) => {
                    const targetColIdx = startCol + c;
                    nextRows[targetRowIdx][`col${targetColIdx}`] = cellValue;
                });
            });

            return nextRows;
        });
    }, []);

    // Swap all row values between two column keys, leaving the columns
    // array (headers, order, widths) completely untouched.
    const swapColumnData = useCallback((keyA, keyB) => {
        if (!keyA || !keyB || keyA === keyB) return;
        setRows((prevRows) =>
            prevRows.map((row) => ({
                ...row,
                [keyA]: row[keyB],
                [keyB]: row[keyA],
            })),
        );
    }, []);

    const handleDragEnd = useCallback(
        (event) => {
            const { active, over } = event;
            if (!over) return;
            swapColumnData(String(active.id), String(over.id));
        },
        [swapColumnData],
    );

    const columnsWithSwap = useMemo(
        () =>
            columns.map((col) => ({
                ...col,
                renderHeaderCell: (props) => <SwapHeaderCell {...props} />,
            })),
        [columns],
    );

    const updateMapping = (colKey, fieldKey) => {
        setMapping((m) => ({ ...m, [colKey]: fieldKey }));
    };

    const handleSubmit = () => {
        const mappedCols = columns.filter(
            (c) => mapping[c.key] && mapping[c.key] !== "ignore",
        );
        const missing = REQUIRED_FIELDS.filter(
            (f) => !mappedCols.some((c) => mapping[c.key] === f.key),
        );
        if (missing.length > 0) {
            alert(`Map a column to: ${missing.map((f) => f.label).join(", ")}`);
            return;
        }

        const payload = rows
            .filter((row) => mappedCols.some((c) => row[c.key]))
            .map((row) => {
                const record = {};
                mappedCols.forEach((c) => {
                    record[mapping[c.key]] = row[c.key];
                });
                return record;
            });

        console.log("Submitting", payload);
        // ... send `payload` to your API here
    };

    return (
        <dialog ref={ref} id="pickup_insert_modal" className="modal">
            <div className="modal-box bg-base-300 w-11/12 max-w-7xl max-h-[80vh] flex flex-col">
                <div style={{ width: "100%" }}>
                    <div
                        onPaste={handlePaste}
                        style={{ width: "100%", overflowX: "auto" }}
                    >
                        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                            <DataGrid
                                columns={columnsWithSwap}
                                rows={rows}
                                onRowsChange={setRows}
                                onSelectedCellChange={updateSelectedPosition}
                                onCellClick={updateSelectedPosition}
                                rowKeyGetter={(row) => row.id}
                                defaultColumnOptions={{ resizable: true }}
                                className="rdg-light"
                                style={{ blockSize: 400 }}
                            />
                        </DndContext>
                    </div>

                    <button
                        onClick={() => setShowMapping(true)}
                        style={{ marginTop: 12 }}
                    >
                        Continue
                    </button>

                    {showMapping && (
                        <div
                            style={{
                                marginTop: 16,
                                border: "1px solid #ddd",
                                borderRadius: 8,
                                padding: 16,
                            }}
                        >
                            <div
                                style={{
                                    fontWeight: 600,
                                    marginBottom: 8,
                                    fontSize: 14,
                                }}
                            >
                                Map your columns to the required fields
                            </div>
                            {columns.map((col) => (
                                <div
                                    key={col.key}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        marginBottom: 6,
                                    }}
                                >
                                    <span
                                        style={{
                                            width: 40,
                                            fontSize: 13,
                                            color: "#666",
                                        }}
                                    >
                                        {col.name}
                                    </span>
                                    <select
                                        value={mapping[col.key] || "ignore"}
                                        onChange={(e) =>
                                            updateMapping(
                                                col.key,
                                                e.target.value,
                                            )
                                        }
                                    >
                                        <option value="ignore">
                                            Ignore column
                                        </option>
                                        {REQUIRED_FIELDS.map((f) => (
                                            <option key={f.key} value={f.key}>
                                                {f.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                            <button
                                onClick={handleSubmit}
                                style={{ marginTop: 12 }}
                            >
                                Submit
                            </button>
                        </div>
                    )}
                </div>

                <div className="modal-action mt-4">
                    <form method="dialog">
                        <button className="btn" onClick={onClose}>
                            Close
                        </button>
                    </form>
                </div>
            </div>

            <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>
        </dialog>
    );
});

export default PickupInsertModal;
