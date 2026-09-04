import {
    DndContext,
    PointerSensor,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import axios from "axios";
import {
    forwardRef,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { DataGrid, renderHeaderCell, renderTextEditor, SelectColumn } from "react-data-grid";
import "react-data-grid/lib/styles.css";

// The fields the system actually cares about -- only enforced at submit time.
const REQUIRED_FIELDS = [
    { key: "partname", label: "Partname" },
    { key: "lotId", label: "LotId" },
    { key: "qty", label: "Qty" },
    { key: "package", label: "Package" },
    { key: "lc", label: "LC" },
    { key: "bodySize", label: "Body Size" },
];

// Fields the backend PartName lookup can fill in automatically.
const API_FILLABLE_FIELDS = ["lc", "package", "bodySize"];

// ---------------------------------------------------------------------------
// Header-row detection
//
// If the first pasted line looks like column labels (e.g. "PARTNAME",
// "Lot Id", "qty_pcs"), pull it out and use it to pin the mapping directly
// instead of treating it as a data row. Matching is fuzzy: case, spaces,
// underscores, and dashes are all ignored.
// ---------------------------------------------------------------------------

const HEADER_SYNONYMS = {
    partname: ["partname", "part name", "part no", "partno", "device", "devicename", "device name"],
    lotId: ["lotid", "lot id", "lot no", "lot number", "lot"],
    qty: ["qty", "quantity", "pcs", "qtypcs"],
    package: ["package", "pkg", "package type", "packagetype"],
    lc: ["lc", "lead count", "leadcount", "pin count", "pincount"],
    bodySize: ["bodysize", "body size", "dimensions", "dimension", "size"],
};

function normalizeHeader(s) {
    return String(s || "")
        .trim()
        .toLowerCase()
        .replace(/[\s_\-]+/g, "");
}

const NORMALIZED_HEADER_SYNONYMS = Object.fromEntries(
    Object.entries(HEADER_SYNONYMS).map(([field, synonyms]) => [
        field,
        synonyms.map(normalizeHeader),
    ]),
);

function matchHeaderField(value) {
    const norm = normalizeHeader(value);
    if (!norm) return null;
    for (const [field, synonyms] of Object.entries(NORMALIZED_HEADER_SYNONYMS)) {
        if (synonyms.includes(norm)) return field;
    }
    return null;
}

// Returns { [columnIndexInPasteGrid]: fieldKey } if the row is confidently a
// header row (at least 2 matches, covering at least half the populated
// cells), otherwise null so the row is treated as ordinary data.
function detectHeaderRow(rowCells) {
    const mapping = {};
    let matches = 0;
    let nonEmpty = 0;
    rowCells.forEach((cell, idx) => {
        if (cell && String(cell).trim() !== "") {
            nonEmpty++;
            const field = matchHeaderField(cell);
            if (field) {
                matches++;
                mapping[idx] = field;
            }
        }
    });
    if (nonEmpty === 0) return null;
    if (matches >= 2 && matches / nonEmpty >= 0.5) return mapping;
    return null;
}

// ---------------------------------------------------------------------------
// Column-type prediction
//
// Best-effort pattern matching so pasted data (which never has a header row)
// gets pre-mapped to the right required field automatically. Users can still
// override anything through the mapping dropdowns -- once they do, that
// column is excluded from future auto-prediction.
// ---------------------------------------------------------------------------

const PACKAGE_KEYWORDS = [
    "MINI_SO",
    "SOIC_N",
    "LFCSP",
    "TSSOP",
    "WLCSP",
    "UTQFN",
    "TDFN",
    "PDFN",
    "MSOP",
    "SSOP",
    "LQFN",
    "QSOP",
    "TQFP",
    "TSOT",
    "DFN",
    "QFN",
    "SOT",
    "SOIC",
    "BGA",
    "QFP",
    "LGA",
    "DD",
];

function nonEmptyValues(values) {
    return values.filter((v) => v !== null && v !== undefined && String(v).trim() !== "");
}

function isNumericColumn(values) {
    const vals = nonEmptyValues(values);
    if (!vals.length) return false;
    return vals.every((v) => /^-?\d+(\.\d+)?$/.test(String(v).trim()));
}

// Flags columns like a running row index (1,2,3,4...) so they never get
// mistaken for LC / Qty / "number of boxes" style columns.
function isSequentialIndex(values) {
    const nums = nonEmptyValues(values).map((v) => parseInt(v, 10));
    if (nums.length < 3) return false;
    let seqSteps = 0;
    for (let i = 1; i < nums.length; i++) {
        if (nums[i] - nums[i - 1] === 1) seqSteps++;
    }
    return seqSteps / (nums.length - 1) > 0.8;
}

function scoreLotId(values) {
    const vals = nonEmptyValues(values);
    if (!vals.length) return 0;
    const re = /^[A-Za-z]{1,4}\d+(\.\d+)?$/;
    const matches = vals.filter((v) => re.test(String(v).trim()));
    return matches.length / vals.length;
}

function scorePartname(values) {
    const vals = nonEmptyValues(values);
    if (!vals.length) return 0;
    // Compliance/tape-reel part codes are messy: they can start with a
    // digit or a period, and end in '#', '+', or a plain letter/digit
    // (e.g. "AD8032ARZ-REEL7", "MAX16001BTE+", ".AX14853GWE+T", "7-1921G+SOP").
    const re = /^[A-Za-z0-9.][A-Za-z0-9\-.#+]{2,}[A-Za-z0-9#+]$/;
    const shapeMatches = vals.filter((v) => {
        const s = String(v).trim();
        return re.test(s) && /[A-Za-z]/.test(s) && /\d/.test(s);
    });
    const suffixMatches = vals.filter((v) => /[#+]/.test(String(v)));
    return (shapeMatches.length / vals.length) * 0.8 + (suffixMatches.length / vals.length) * 0.2;
}

function scorePackage(values) {
    const vals = nonEmptyValues(values);
    if (!vals.length) return 0;
    const matches = vals.filter((v) => {
        const up = String(v).trim().toUpperCase();
        return PACKAGE_KEYWORDS.some((k) => up.includes(k));
    });
    return matches.length / vals.length;
}

function scoreBodySize(values) {
    const vals = nonEmptyValues(values);
    if (!vals.length) return 0;
    const re = /^\d+(\.\d+)?\s*[xX]\s*\d+(\.\d+)?$/;
    const matches = vals.filter((v) => re.test(String(v).trim()));
    return matches.length / vals.length;
}

// Returns { [columnKey]: fieldKey } for the columns it's confident about.
// Columns not present in the result should be treated as "ignore".
function predictColumnMapping(columns, rows) {
    const colValues = {};
    columns.forEach((col) => {
        colValues[col.key] = rows.map((r) => r[col.key] ?? "");
    });

    const indexCols = new Set(
        columns
            .filter((c) => isNumericColumn(colValues[c.key]) && isSequentialIndex(colValues[c.key]))
            .map((c) => c.key),
    );

    const used = new Set();
    const mapping = {};

    const pickBest = (scorer, minScore) => {
        let bestKey = null;
        let bestScore = 0;
        columns.forEach((col) => {
            if (used.has(col.key) || indexCols.has(col.key)) return;
            const score = scorer(colValues[col.key]);
            if (score > bestScore) {
                bestScore = score;
                bestKey = col.key;
            }
        });
        if (bestKey && bestScore >= minScore) {
            used.add(bestKey);
            return bestKey;
        }
        return null;
    };

    // Order matters: lotId's pattern is tight and unambiguous, so claim it
    // first before partname's looser pattern can accidentally grab it.
    const lotIdKey = pickBest(scoreLotId, 0.6);
    if (lotIdKey) mapping[lotIdKey] = "lotId";

    const partnameKey = pickBest(scorePartname, 0.5);
    if (partnameKey) mapping[partnameKey] = "partname";

    const packageKey = pickBest(scorePackage, 0.5);
    if (packageKey) mapping[packageKey] = "package";

    const bodySizeKey = pickBest(scoreBodySize, 0.3);
    if (bodySizeKey) mapping[bodySizeKey] = "bodySize";

    // Qty: the numeric column immediately to the right of LotId, in both
    // sample layouts qty always trails the lot id directly.
    let qtyKey = null;
    if (lotIdKey) {
        const idx = columns.findIndex((c) => c.key === lotIdKey);
        const next = columns[idx + 1];
        if (next && !used.has(next.key) && !indexCols.has(next.key) && isNumericColumn(colValues[next.key])) {
            qtyKey = next.key;
        }
    }
    if (!qtyKey) {
        let bestAvg = -1;
        columns.forEach((col) => {
            if (used.has(col.key) || indexCols.has(col.key)) return;
            if (!isNumericColumn(colValues[col.key])) return;
            const nums = nonEmptyValues(colValues[col.key]).map(Number);
            const avg = nums.reduce((a, b) => a + b, 0) / (nums.length || 1);
            if (avg > bestAvg) {
                bestAvg = avg;
                qtyKey = col.key;
            }
        });
    }
    if (qtyKey) {
        used.add(qtyKey);
        mapping[qtyKey] = "qty";
    }

    // LC: the numeric column immediately to the right of Package. Anything
    // further right (e.g. a "number of boxes" column) is left unmapped.
    let lcKey = null;
    if (packageKey) {
        const idx = columns.findIndex((c) => c.key === packageKey);
        const next = columns[idx + 1];
        if (next && !used.has(next.key) && !indexCols.has(next.key) && isNumericColumn(colValues[next.key])) {
            lcKey = next.key;
        }
    }
    if (lcKey) {
        used.add(lcKey);
        mapping[lcKey] = "lc";
    }

    return mapping;
}

// ---------------------------------------------------------------------------

// Header cell that is draggable (as a swap source), droppable (as a swap
// target), carries a delete button, and a live field-mapping dropdown.
// Dropping column A onto column B swaps the underlying row data for those
// two keys -- the `columns` array (and therefore header order) is never
// touched, so labels stay put.
function SwapHeaderCell(props) {
    const { column, onDeleteColumn, mappingValue, onMappingChange, requiredFields } = props;

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
            style={{
                width: "100%",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 2,
                padding: "2px 0",
                opacity: isDragging ? 0.5 : 1,
                backgroundColor: isOver
                    ? "#3a3f4b"
                    : mappingValue === "ignore"
                      ? "rgba(239, 68, 68, 0.35)"
                      : undefined,
                outline: isOver ? "2px dashed #7dd3fc" : undefined,
            }}
        >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                <span
                    {...listeners}
                    {...attributes}
                    style={{ flex: 1, minWidth: 0, cursor: "grab" }}
                >
                    {renderHeaderCell(props)}
                </span>
                <button
                    type="button"
                    className="btn btn-xs btn-circle btn-ghost"
                    title="Delete column"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                        e.stopPropagation();
                        onDeleteColumn?.(column.key);
                    }}
                >
                    ✕
                </button>
            </div>
            <select
                className="select select-xs w-full"
                value={mappingValue || "ignore"}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onMappingChange?.(column.key, e.target.value)}
            >
                <option value="ignore">Ignore</option>
                {requiredFields.map((f) => (
                    <option key={f.key} value={f.key}>
                        {f.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

// Leading pinned column: shows an "Ignored" badge for incomplete rows and a
// delete button for every row.
function RowActionsCell({ row, isInvalid, onDeleteRow }) {
    return (
        <div className="flex items-center gap-1.5 h-full pl-1">
            <button
                type="button"
                className="btn btn-xs btn-circle btn-ghost"
                title="Delete row"
                onClick={() => onDeleteRow(row.id)}
            >
                ✕
            </button>
            {isInvalid && <span className="badge badge-error badge-xs">Ignored</span>}
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
    const nextRowIndex = useRef(INITIAL_ROW_COUNT);

    const [columns, setColumns] = useState(() =>
        Array.from({ length: INITIAL_COLUMN_COUNT }, (_, i) => makeColumn(i)),
    );

    const [rows, setRows] = useState(() =>
        Array.from({ length: INITIAL_ROW_COUNT }, (_, i) =>
            emptyRow(i, INITIAL_COLUMN_COUNT),
        ),
    );

    const handleAddRowAtBottom = () => {
        // Get current ID and increment the ref for the next addition
        const newId = nextRowIndex.current;
        nextRowIndex.current += 1;

        const newRow = emptyRow(newId, INITIAL_COLUMN_COUNT);

        setRows((prevRows) => [...prevRows, newRow]);
    };

    const [expediteRows, setExpediteRows] = useState(() => new Set());

    console.log("LOG ~ PickupInsertModal.jsx:492 ~ PickupInsertModal ~ expediteRows:", expediteRows);

    const toggleExpediteRow = useCallback((rowId, checked) => {
        setExpediteRows((prev) => {
            const next = new Set(prev);
            if (checked) next.add(rowId);
            else next.delete(rowId);
            return next;
        });
    }, []); // Empty deps because functional state updater setExpediteRows is used

    const toggleExpediteAll = useCallback((checked) => {
        if (checked) {
            setExpediteRows(new Set(rows.map((r) => r.id)));
        } else {
            setExpediteRows(new Set());
        }
    }, [rows]);

    const isAllExpedite = rows.length > 0 && expediteRows.size === rows.length;

    const [mapping, setMapping] = useState({}); // colKey -> REQUIRED_FIELDS key | "ignore"
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [apiFilledCells, setApiFilledCells] = useState(() => new Set()); // "rowId:colKey"

    const selectedPositionRef = useRef({ rowIdx: 0, colIdx: 0 });
    const nextRowId = useRef(INITIAL_ROW_COUNT);
    const manualOverridesRef = useRef(new Set()); // colKeys the user has mapped by hand
    const prevPartnamesRef = useRef({}); // rowId -> last-seen partname value
    const lookupCacheRef = useRef({}); // partname -> details | null
    const inFlightRef = useRef(new Set());

    // Require a small pointer movement before a drag starts, so clicking a
    // header to sort/select doesn't get eaten by dnd-kit.
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 4 },
        }),
    );

    // Re-run column prediction, but never touch a column the user has
    // explicitly mapped themselves.
    const applyPrediction = useCallback((cols, rws) => {
        const predicted = predictColumnMapping(cols, rws);
        setMapping((prev) => {
            const next = { ...prev };
            cols.forEach((col) => {
                if (manualOverridesRef.current.has(col.key)) return;
                next[col.key] = predicted[col.key] || "ignore";
            });
            return next;
        });
    }, []);

    const updateSelectedPosition = useCallback(
        (args) => {
            const colIdx = columns.findIndex((c) => c.key === args.column.key);
            if (colIdx === -1) return;
            selectedPositionRef.current = { rowIdx: args.rowIdx, colIdx };
        },
        [columns],
    );

    // Wrap the grid's onRowsChange so every edit (paste, manual typing, or a
    // freshly-added partname) keeps the auto-mapping up to date.
    const handleRowsChange = useCallback(
        (newRows) => {
            setRows(newRows);
            applyPrediction(columns, newRows);
        },
        [columns, applyPrediction],
    );

    const handlePaste = useCallback(
        (e) => {
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
            if (!pasteGrid.length) return;

            // If the first pasted line looks like column labels, pull it
            // out and use it to pin the mapping directly instead of
            // inserting it as a data row.
            const headerFieldsByIndex = detectHeaderRow(pasteGrid[0]);
            if (headerFieldsByIndex) {
                pasteGrid = pasteGrid.slice(1);
            }
            if (!pasteGrid.length) return;

            const startRow = Math.max(0, selectedPositionRef.current.rowIdx);
            const startCol = Math.max(0, selectedPositionRef.current.colIdx);
            const pasteWidth = Math.max(...pasteGrid.map((line) => line.length));
            const neededColumnCount = startCol + pasteWidth;

            const newColumns =
                neededColumnCount <= columns.length
                    ? columns
                    : [
                          ...columns,
                          ...Array.from(
                              { length: neededColumnCount - columns.length },
                              (_, i) => makeColumn(columns.length + i),
                          ),
                      ];

            const paddedRows = rows.map((r) => {
                const row = { ...r };
                for (let i = 0; i < neededColumnCount; i++) {
                    if (!(`col${i}` in row)) row[`col${i}`] = "";
                }
                return row;
            });

            pasteGrid.forEach((lineCells, r) => {
                const targetRowIdx = startRow + r;
                while (targetRowIdx >= paddedRows.length) {
                    paddedRows.push(emptyRow(nextRowId.current++, neededColumnCount));
                }
                lineCells.forEach((cellValue, c) => {
                    const targetColIdx = startCol + c;
                    paddedRows[targetRowIdx][`col${targetColIdx}`] = cellValue;
                });
            });

            setColumns(newColumns);
            setRows(paddedRows);

            if (headerFieldsByIndex) {
                // Explicit headers are the most reliable signal available --
                // pin them (like a manual mapping) and let prediction fill
                // in any columns the header row didn't cover.
                setMapping((prev) => {
                    const next = { ...prev };
                    Object.entries(headerFieldsByIndex).forEach(([idx, field]) => {
                        const colKey = `col${startCol + Number(idx)}`;
                        next[colKey] = field;
                        manualOverridesRef.current.add(colKey);
                    });
                    return next;
                });
            }
            applyPrediction(newColumns, paddedRows);
        },
        [columns, rows, applyPrediction],
    );

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

    const deleteColumn = useCallback((colKey) => {
        setColumns((prev) => prev.filter((c) => c.key !== colKey));
        setMapping((prev) => {
            const next = { ...prev };
            delete next[colKey];
            return next;
        });
        manualOverridesRef.current.delete(colKey);
        setApiFilledCells((prev) => {
            const next = new Set(prev);
            [...next].forEach((entry) => {
                if (entry.endsWith(`:${colKey}`)) next.delete(entry);
            });
            return next;
        });
    }, []);

    const deleteRow = useCallback((rowId) => {
        setRows((prev) => {
            const filtered = prev.filter((r) => r.id !== rowId);

            // If no rows remain after deletion, generate a new empty row
            if (filtered.length === 0) {
                const newId = nextRowIndex.current;
                nextRowIndex.current += 1;
                return [emptyRow(newId, INITIAL_COLUMN_COUNT)];
            }

            return filtered;
        });

        setApiFilledCells((prev) => {
            const next = new Set(prev);
            [...next].forEach((entry) => {
                if (entry.startsWith(`${rowId}:`)) next.delete(entry);
            });
            return next;
        });

        delete prevPartnamesRef.current[rowId];
    }, [INITIAL_COLUMN_COUNT]);

    const updateMapping = (colKey, fieldKey) => {
        manualOverridesRef.current.add(colKey);
        setMapping((m) => ({ ...m, [colKey]: fieldKey }));
    };

    const clearAll = useCallback(() => {
        const freshColumns = Array.from({ length: INITIAL_COLUMN_COUNT }, (_, i) => makeColumn(i));
        setColumns(freshColumns);
        setRows(Array.from({ length: INITIAL_ROW_COUNT }, (_, i) => emptyRow(i, INITIAL_COLUMN_COUNT)));
        setMapping({});
        setApiFilledCells(new Set());
        manualOverridesRef.current = new Set();
        prevPartnamesRef.current = {};
        lookupCacheRef.current = {};
        nextRowId.current = INITIAL_ROW_COUNT;
        setShowClearConfirm(false);
    }, []);

    // ---- PartName lookup (LC / Package / Body Size auto-fill) ----------

    const partnameColKey = useMemo(
        () => Object.keys(mapping).find((k) => mapping[k] === "partname") || null,
        [mapping],
    );

    const findColKeyForField = useCallback(
        (field) => Object.keys(mapping).find((k) => mapping[k] === field) || null,
        [mapping],
    );

    const applyLookupResults = useCallback(
        (rowIds) => {
            if (!partnameColKey) return;
            const fieldColKeys = API_FILLABLE_FIELDS.map((field) => [
                field,
                findColKeyForField(field),
            ]).filter(([, colKey]) => colKey);

            if (!fieldColKeys.length) return;

            setRows((prevRows) =>
                prevRows.map((row) => {
                    if (!rowIds.includes(row.id)) return row;
                    const pn = String(row[partnameColKey] || "").trim();
                    const details = lookupCacheRef.current[pn];
                    if (!details) return row;

                    const updated = { ...row };
                    const filledKeys = [];
                    fieldColKeys.forEach(([field, colKey]) => {
                        const current = String(updated[colKey] ?? "").trim();
                        if (current === "" && details[field]) {
                            updated[colKey] = String(details[field]);
                            filledKeys.push(colKey);
                        }
                    });

                    if (filledKeys.length) {
                        setApiFilledCells((prevSet) => {
                            const next = new Set(prevSet);
                            filledKeys.forEach((colKey) => next.add(`${row.id}:${colKey}`));
                            return next;
                        });
                    }
                    return updated;
                }),
            );
        },
        [partnameColKey, findColKeyForField],
    );

    const lookupPartNames = useCallback(
        async (partNames, rowIds) => {
            const toFetch = [...new Set(partNames)].filter(
                (pn) => !(pn in lookupCacheRef.current) && !inFlightRef.current.has(pn),
            );

            if (toFetch.length) {
                toFetch.forEach((pn) => inFlightRef.current.add(pn));
                try {
                    const { data } = await axios.post(route("api.partname.lookup"), {
                        partNames: toFetch,
                    });
                    toFetch.forEach((pn) => {
                        lookupCacheRef.current[pn] = data[pn] || null;
                    });
                } catch (err) {
                    console.error("Part name lookup failed", err);
                } finally {
                    toFetch.forEach((pn) => inFlightRef.current.delete(pn));
                }
            }

            applyLookupResults(rowIds);
        },
        [applyLookupResults],
    );

    // Detect newly-entered or newly-pasted partnames (any row whose value in
    // the mapped partname column changed) and kick off a lookup for them.
    useEffect(() => {
        if (!partnameColKey) return;
        const changedRowIds = [];
        const changedValues = [];
        rows.forEach((row) => {
            const val = String(row[partnameColKey] || "").trim();
            const prevVal = prevPartnamesRef.current[row.id];
            if (val && val !== prevVal) {
                changedRowIds.push(row.id);
                changedValues.push(val);
            }
            prevPartnamesRef.current[row.id] = val;
        });
        if (!changedRowIds.length) return;
        lookupPartNames(changedValues, changedRowIds);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rows, partnameColKey]);

    // ---------------------------------------------------------------------

    // Rows that have at least one value but are missing a value in one of
    // the currently-mapped required fields. These get flagged red, labeled
    // "Ignored", and dropped from the submit payload.
    const invalidRowIds = useMemo(() => {
        const mappedFieldCols = {};
        REQUIRED_FIELDS.forEach((f) => {
            const colKey = Object.keys(mapping).find((k) => mapping[k] === f.key);
            if (colKey) mappedFieldCols[f.key] = colKey;
        });

        const ids = new Set();
        rows.forEach((row) => {
            const hasAnyValue = Object.values(mappedFieldCols).some(
                (colKey) => String(row[colKey] ?? "").trim() !== "",
            );
            if (!hasAnyValue) return; // untouched row, not "invalid" -- just empty

            const isComplete = REQUIRED_FIELDS.every((f) => {
                const colKey = mappedFieldCols[f.key];
                if (!colKey) return true; // field isn't mapped to any column yet
                return String(row[colKey] ?? "").trim() !== "";
            });
            if (!isComplete) ids.add(row.id);
        });
        return ids;
    }, [rows, mapping]);

    const rowActionsColumn = useMemo(
        () => ({
            key: "__rowActions",
            name: "",
            width: 84,
            minWidth: 84,
            frozen: true,
            resizable: false,
            renderCell: (props) => (
                <RowActionsCell
                    row={props.row}
                    isInvalid={invalidRowIds.has(props.row.id)}
                    onDeleteRow={deleteRow}
                />
            ),
        }),
        [invalidRowIds, deleteRow],
    );

    const columnsWithSwap = useMemo(
        () =>
            columns.map((col) => ({
                ...col,
                renderHeaderCell: (props) => (
                    <SwapHeaderCell
                        {...props}
                        onDeleteColumn={deleteColumn}
                        mappingValue={mapping[col.key]}
                        onMappingChange={updateMapping}
                        requiredFields={REQUIRED_FIELDS}
                    />
                ),
                cellClass: (row) => {
                    const classes = [];
                    if (mapping[col.key] === "ignore" || !mapping[col.key]) classes.push("cell-ignored");
                    if (apiFilledCells.has(`${row.id}:${col.key}`)) classes.push("cell-api-filled");
                    return classes.join(" ") || undefined;
                },
            })),
        [columns, deleteColumn, mapping, apiFilledCells],
    );

    const gridColumns = useMemo(
        () => [
            rowActionsColumn,
            {
                key: 'expedite',
                name: 'Expedite',
                width: 80,
                renderHeaderCell: () => (
                    <div className="flex items-center justify-center h-5 w-5 gap-2">
                        <input
                            type="checkbox"
                            /* Added shrink-0 and aspect-square to lock the dimensions */
                            className="checkbox checkbox-sm shrink-0 aspect-square"
                            checked={isAllExpedite}
                            onChange={(e) => toggleExpediteAll(e.target.checked)}
                        />
                        <span>Expedite</span>
                    </div>
                ),
                renderCell: ({ row }) => (
                    <div className="flex items-center justify-center h-5 w-5">
                        <input
                            type="checkbox"
                            /* Added shrink-0 and aspect-square here as well */
                            className="checkbox checkbox-sm shrink-0 aspect-square"
                            checked={expediteRows.has(row.id)}
                            onChange={(e) => toggleExpediteRow(row.id, e.target.checked)}
                        />
                    </div>
                ),
            },
            ...columnsWithSwap
        ],
        [rowActionsColumn, columnsWithSwap, expediteRows, isAllExpedite, toggleExpediteRow, toggleExpediteAll],
    );

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
            .filter((row) => !invalidRowIds.has(row.id))
            .filter((row) => mappedCols.some((c) => row[c.key]))
            .map((row, index) => {
                const record = {
                    isExpedite: expediteRows.has(index),
                };
                mappedCols.forEach((c) => {
                    record[mapping[c.key]] = row[c.key];
                });
                return record;
            });
        
        // console.log("expedite", expediteRows);
        console.log("Submitting", payload);
        // ... send `payload` to your API here
    };

    return (
        <dialog ref={ref} id="pickup_insert_modal" className="modal">
            <style>{`
                .cell-ignored { background-color: rgba(239, 68, 68, 0.5) !important; }
                .cell-api-filled { background-color: rgba(250, 204, 21, 0.5) !important; }
                .row-invalid .rdg-cell { background-color: rgba(239, 68, 68, 0.35); }
            `}</style>
            <div className="modal-box bg-base-300 w-11/12 max-w-7xl max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg">ADD PICKUP</h3>
                    <div className="gap-2 flex">
                        <button
                            className="btn btn-sm btn-outline btn-primary"
                            onClick={() => handleAddRowAtBottom()}
                        >
                            Add Row
                        </button>
                        <button
                            className="btn btn-sm btn-outline btn-error"
                            onClick={() => setShowClearConfirm(true)}
                        >
                            Clear All
                        </button>
                    </div>
                </div>

                <div style={{ width: "100%" }}>
                    <div
                        onPaste={handlePaste}
                        style={{ width: "100%", overflowX: "auto" }}
                    >
                        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                            <DataGrid
                                columns={gridColumns}
                                rows={rows}
                                onRowsChange={handleRowsChange}
                                onSelectedCellChange={updateSelectedPosition}
                                onCellClick={updateSelectedPosition}
                                rowKeyGetter={(row) => row.id}
                                rowClass={(row) => (invalidRowIds.has(row.id) ? "row-invalid" : undefined)}
                                defaultColumnOptions={{ resizable: true }}
                                headerRowHeight={56}
                                className="rdg-light"
                                style={{ blockSize: 400 }}
                            />
                        </DndContext>
                    </div>
                </div>

                <div className="modal-action mt-4">
                    <form method="dialog">
                        <button className="btn" onClick={onClose}>
                            Cancel
                        </button>
                    </form>
                    <button className="btn btn-primary" onClick={handleSubmit}>
                        Submit
                    </button>
                </div>
            </div>

            <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>

            {showClearConfirm && (
                <div className="modal modal-open">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg">Clear all data?</h3>
                        <p className="py-4">
                            This removes every row, column, and mapping you've entered.
                            This can't be undone.
                        </p>
                        <div className="modal-action">
                            <button
                                className="btn"
                                onClick={() => setShowClearConfirm(false)}
                            >
                                Cancel
                            </button>
                            <button className="btn btn-error" onClick={clearAll}>
                                Clear All
                            </button>
                        </div>
                    </div>
                    <div
                        className="modal-backdrop"
                        onClick={() => setShowClearConfirm(false)}
                    />
                </div>
            )}
        </dialog>
    );
});

export default PickupInsertModal;