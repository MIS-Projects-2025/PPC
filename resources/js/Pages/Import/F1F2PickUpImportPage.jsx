import Collapse from "@/Components/Collapse";
import Modal from "@/Components/Modal";
import DataTable from "@/Components/Table";
import { useImportTraceStore } from "@/Store/importTraceStore";
import {
    API_FILLABLE_FIELDS,
    FIELDS,
    HEADER_SYNONYMS,
    INITIAL_COLUMN_COUNT,
    INITIAL_ROW_COUNT,
    analyzeRows,
    buildPayload,
    clean,
    emptyRow,
    makeColumn,
    makeInitialColumns,
    makeInitialRows,
    predictColumnMapping,
    preparePaste,
    validateForSubmit,
} from "@/Utils/pickupPaste";
import { runAsyncToast } from "@/Utils/runAsyncToast";
import {
    DndContext,
    PointerSensor,
    useDraggable,
    useDroppable,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { router } from "@inertiajs/react";
import axios from "axios";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DataGrid, renderHeaderCell } from "react-data-grid";
import "react-data-grid/lib/styles.css";
import { FaExternalLinkAlt } from "react-icons/fa";
import { MdWarning } from "react-icons/md";
import ImportLabel from "../../Components/lastImportLabel";
import ImportPageLayout from "../../Layouts/ImportPageLayout";

// Header cell that is draggable (swap source), droppable (swap target),
// carries a delete button, and a live field-mapping dropdown. Dropping column
// A onto column B swaps the row data for those two keys; the `columns` array
// (header order) is never touched, so labels stay put.
function SwapHeaderCell(props) {
    const { column, onDeleteColumn, mappingValue, onMappingChange, fields } = props;

    const {
        attributes,
        listeners,
        setNodeRef: setDragRef,
        isDragging,
    } = useDraggable({ id: column.key });

    const { setNodeRef: setDropRef, isOver } = useDroppable({ id: column.key });

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
                {fields.map((f) => (
                    <option key={f.key} value={f.key}>
                        {f.label}
                    </option>
                ))}
            </select>
        </div>
    );
}

// Leading pinned column: "Ignored" badge (reason on hover) for rows that
// won't be submitted, plus a delete button for every row.
function RowActionsCell({ row, reason, onDeleteRow }) {
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
            {reason && (
                <span className="badge badge-error badge-xs" title={reason}>
                    Ignored
                </span>
            )}
        </div>
    );
}

const F1F2PickUpImportPage = () => {
    const { data: importTraceData, isLoading: isImportTraceLoading, fetchAllImports } =
        useImportTraceStore();

    const pickUpLabel = "PickUPs";

    // ---- grid state ------------------------------------------------------
    const nextRowIndex = useRef(INITIAL_ROW_COUNT);
    const nextColIndex = useRef(INITIAL_COLUMN_COUNT);

    const [columns, setColumns] = useState(makeInitialColumns);
    const [rows, setRows] = useState(makeInitialRows);
    const [mapping, setMapping] = useState({}); // colKey -> FIELDS key | "ignore"
    const [apiFilledCells, setApiFilledCells] = useState(() => new Set()); // "rowId:colKey"

    const selectedPositionRef = useRef({ rowIdx: 0, colIdx: 0 });
    const manualOverridesRef = useRef(new Set()); // colKeys pinned by hand / by a header row
    const prevPartnamesRef = useRef({}); // rowId -> last-seen partname value
    const lookupCacheRef = useRef({}); // partname -> details | null
    const inFlightRef = useRef(new Set());

    const rowsRef = useRef(rows);
    rowsRef.current = rows;

    // ---- page state ------------------------------------------------------
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [result, setResult] = useState(null); // last successful response
    const clearConfirmRef = useRef(null);
    const submitConfirmRef = useRef(null);

    const handleAddRowAtBottom = () => {
        const newId = nextRowIndex.current++;
        setRows((prev) => [...prev, emptyRow(newId, columns.map((c) => c.key))]);
    };

    // Small pointer movement before a drag starts, so clicking a header isn't
    // eaten by dnd-kit.
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    );

    // Re-run column prediction, never touching a pinned column, and never
    // giving a pinned column's field to a second column.
    const applyPrediction = useCallback((cols, rws) => {
        setMapping((prev) => {
            const manual = {};
            cols.forEach((c) => {
                if (manualOverridesRef.current.has(c.key)) {
                    manual[c.key] = prev[c.key] || "ignore";
                }
            });
            const predicted = predictColumnMapping(cols, rws, manual);
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

    const handleRowsChange = useCallback(
        (newRows) => {
            setRows(newRows);
            applyPrediction(columns, newRows);
        },
        [columns, applyPrediction],
    );

    // ---- paste -----------------------------------------------------------

    const handlePaste = useCallback(
        (e) => {
            // A cell editor / dropdown is focused: let it paste normally.
            if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) {
                return;
            }
            // A confirm dialog is open, or a submit is in flight.
            if (isSubmitting || document.querySelector("dialog[open]")) return;

            const html = e.clipboardData?.getData("text/html");
            const text = e.clipboardData?.getData("text/plain");
            if (!html && !text) return;
            e.preventDefault();

            const prepared = preparePaste(html, text);
            if (!prepared) return;

            // A whole table (header row found, or partname + lot id + qty all
            // recognised): replace the grid and start at the very first cell.
            // Title/footer rows and unneeded columns are already gone, and
            // every remaining column is pinned to its detected field.
            if (prepared.isFullTable) {
                const { grid, fieldsByIndex } = prepared;
                const width = grid[0].length;
                const newColumns = Array.from({ length: width }, (_, i) => makeColumn(i));
                const newRows = grid.map((line, r) => {
                    const row = { id: r };
                    newColumns.forEach((c, i) => {
                        row[c.key] = line[i] ?? "";
                    });
                    return row;
                });

                const pinned = {};
                manualOverridesRef.current = new Set();
                Object.entries(fieldsByIndex).forEach(([idx, field]) => {
                    const colKey = newColumns[Number(idx)]?.key;
                    if (!colKey) return;
                    pinned[colKey] = field;
                    manualOverridesRef.current.add(colKey);
                });

                nextColIndex.current = width;
                nextRowIndex.current = newRows.length;
                prevPartnamesRef.current = {};
                selectedPositionRef.current = { rowIdx: 0, colIdx: 0 };
                setColumns(newColumns);
                setRows(newRows);
                setMapping(pinned);
                setApiFilledCells(new Set());
                return;
            }

            // Anything else (a single value, a few cells): paste at the
            // selected cell, growing the grid if needed.
            const pasteGrid = prepared.grid;
            const startRow = Math.max(0, selectedPositionRef.current.rowIdx);
            const startCol = Math.max(0, selectedPositionRef.current.colIdx);
            const pasteWidth = pasteGrid.reduce((m, line) => Math.max(m, line.length), 0);
            const neededColumnCount = startCol + pasteWidth;

            const newColumns =
                neededColumnCount <= columns.length
                    ? columns
                    : [
                          ...columns,
                          ...Array.from(
                              { length: neededColumnCount - columns.length },
                              () => makeColumn(nextColIndex.current++),
                          ),
                      ];

            const paddedRows = rows.map((r) => {
                const row = { ...r };
                newColumns.forEach((c) => {
                    if (!(c.key in row)) row[c.key] = "";
                });
                return row;
            });

            pasteGrid.forEach((lineCells, r) => {
                const targetRowIdx = startRow + r;
                while (targetRowIdx >= paddedRows.length) {
                    paddedRows.push(
                        emptyRow(nextRowIndex.current++, newColumns.map((c) => c.key)),
                    );
                }
                // Write the full width (blank when the line is short) so a
                // stale value can't survive in a cell that should be blank.
                for (let c = 0; c < pasteWidth; c++) {
                    paddedRows[targetRowIdx][newColumns[startCol + c].key] = lineCells[c] ?? "";
                }
            });

            setColumns(newColumns);
            setRows(paddedRows);
            applyPrediction(newColumns, paddedRows);
        },
        [columns, rows, isSubmitting, applyPrediction],
    );

    // It's a page, not a modal: Ctrl+V should work without first clicking
    // into the grid.
    useEffect(() => {
        document.addEventListener("paste", handlePaste);
        return () => document.removeEventListener("paste", handlePaste);
    }, [handlePaste]);

    // ---- column / row editing ---------------------------------------------

    const swapColumnData = useCallback((keyA, keyB) => {
        if (!keyA || !keyB || keyA === keyB) return;
        setRows((prevRows) =>
            prevRows.map((row) => ({
                ...row,
                [keyA]: row[keyB],
                [keyB]: row[keyA],
            })),
        );

        setApiFilledCells((prev) => {
            const next = new Set();
            prev.forEach((entry) => {
                const i = entry.lastIndexOf(":");
                const rowId = entry.slice(0, i);
                const col = entry.slice(i + 1);
                next.add(col === keyA ? `${rowId}:${keyB}` : col === keyB ? `${rowId}:${keyA}` : entry);
            });
            return next;
        });
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

    const deleteRow = useCallback(
        (rowId) => {
            setRows((prev) => {
                const filtered = prev.filter((r) => r.id !== rowId);
                if (filtered.length === 0) {
                    return [emptyRow(nextRowIndex.current++, columns.map((c) => c.key))];
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
        },
        [columns],
    );

    const updateMapping = useCallback((colKey, fieldKey) => {
        manualOverridesRef.current.add(colKey);
        setMapping((m) => ({ ...m, [colKey]: fieldKey }));
    }, []);

    const resetGrid = useCallback(() => {
        setColumns(makeInitialColumns());
        setRows(makeInitialRows());
        setMapping({});
        setApiFilledCells(new Set());
        manualOverridesRef.current = new Set();
        prevPartnamesRef.current = {};
        lookupCacheRef.current = {};
        nextColIndex.current = INITIAL_COLUMN_COUNT;
        nextRowIndex.current = INITIAL_ROW_COUNT;
        selectedPositionRef.current = { rowIdx: 0, colIdx: 0 };
    }, []);

    // ---- PartName lookup (Package auto-fill) --------------------------------

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
            const fieldColKeys = API_FILLABLE_FIELDS
                .map((field) => [field, findColKeyForField(field)])
                .filter(([, colKey]) => colKey);
            if (!fieldColKeys.length) return;

            const filled = [];
            const nextRows = rowsRef.current.map((row) => {
                if (!rowIds.includes(row.id)) return row;
                const details = lookupCacheRef.current[String(row[partnameColKey] || "").trim()];
                if (!details) return row;
                const updated = { ...row };
                fieldColKeys.forEach(([field, colKey]) => {
                    if (String(updated[colKey] ?? "").trim() === "" && details[field]) {
                        updated[colKey] = String(details[field]);
                        filled.push(`${row.id}:${colKey}`);
                    }
                });
                return updated;
            });
            if (!filled.length) return;
            setRows(nextRows);
            setApiFilledCells((prev) => new Set([...prev, ...filled]));
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

    // ---- derived grid data ---------------------------------------------------

    // One pass over the rows decides box groups AND which rows are valid.
    const analysis = useMemo(() => analyzeRows(rows, mapping), [rows, mapping]);

    const hasData = useMemo(
        () => rows.some((r) => columns.some((c) => clean(r[c.key]) !== "")),
        [rows, columns],
    );

    // Live validity: updates on every paste/edit, no need to press submit.
    const submitError = useMemo(
        () => (hasData ? validateForSubmit(mapping, analysis) : null),
        [hasData, mapping, analysis],
    );
    const status = !hasData
        ? { badge: "badge-ghost", text: "Paste a table to begin" }
        : submitError
          ? { badge: "badge-error", text: submitError }
          : analysis.ignoredRows > 0
            ? {
                  badge: "badge-warning",
                  text: `Valid, but ${analysis.ignoredRows} row(s) will be skipped (hover their red badge for why)`,
              }
            : { badge: "badge-success", text: "✓ Valid" };

    // Pasted data only lives in the page, so don't lose it to a stray reload.
    useEffect(() => {
        if (!hasData) return;
        const warn = (e) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [hasData]);

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
                    reason={analysis.meta.get(props.row.id)?.reason}
                    onDeleteRow={deleteRow}
                />
            ),
        }),
        [analysis.meta, deleteRow],
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
                        fields={FIELDS}
                    />
                ),
                cellClass: (row) => {
                    const classes = [];
                    const field = mapping[col.key];
                    if (!field || field === "ignore") classes.push("cell-ignored");
                    if (apiFilledCells.has(`${row.id}:${col.key}`)) classes.push("cell-api-filled");
                    if (field === "boxes") {
                        const m = analysis.meta.get(row.id);
                        if (m?.isHead) classes.push("cell-box-head");
                        else if (m?.isContinuation) classes.push("cell-box-cont");
                        if (m?.continuesBelow) classes.push("cell-box-open");
                    }
                    return classes.join(" ") || undefined;
                },
            })),
        [columns, deleteColumn, updateMapping, mapping, apiFilledCells, analysis.meta],
    );

    const gridColumns = useMemo(
        () => [rowActionsColumn, ...columnsWithSwap],
        [rowActionsColumn, columnsWithSwap],
    );

    // ---- submit --------------------------------------------------------------

    const requestSubmit = () => {
        if (isSubmitting) return;
        if (validateForSubmit(mapping, analysis)) return;
        submitConfirmRef.current?.open();
    };

    const handleSubmit = async () => {
        submitConfirmRef.current?.close();

        const payload = buildPayload(rows, analysis);
        if (payload.length === 0) return;

        setIsSubmitting(true);
        let succeeded = false;

        try {
            await runAsyncToast({
                action: async () => {
                    try {
                        const { data } = await axios.post(route("api.pickup.paste"), {
                            rows: payload,
                        });
                        succeeded = true;
                        setResult(data);
                        return data;
                    } catch (err) {
                        throw new Error(
                            err?.response?.data?.message || err?.message || "Failed to add pickups.",
                        );
                    }
                },
                loadingMessage: "Adding PickUp data...",
                renderSuccess: (res) => (
                    <>
                        <div className="mb-2 font-bold text-success">
                            <span>PickUps: </span> {res?.message || "Successfully added!"}
                        </div>

                        <div className="flex justify-between">
                            <span className="font-light">new PickUp entries:</span>
                            <span className="font-bold">
                                {Number(res?.data?.total ?? 0).toLocaleString()}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-light">box groups:</span>
                            <span className="font-bold">
                                {Number(res?.data?.box_groups ?? 0).toLocaleString()}
                            </span>
                        </div>
                    </>
                ),
                errorMessage: "Failed to add pickups.",
            });
        } catch {
            // runAsyncToast already surfaced the error; the grid stays as-is
            // so nothing typed is lost.
        } finally {
            setIsSubmitting(false);
        }

        if (succeeded) {
            resetGrid();
            try {
                await fetchAllImports(); // refreshes the "last import" label
            } catch {
                /* label will refresh on next load */
            }
        }
    };

    // ---- unknown partnames (from the last successful submit) ------------------

    const unknownPartnames = result?.data?.ignored_unknown_partname ?? [];

    const uniquePartnames = useMemo(() => {
        const map = new Map();
        for (const item of unknownPartnames) {
            if (!map.has(item.devicename)) map.set(item.devicename, { ...item });
        }
        return [...map.values()];
    }, [unknownPartnames]);

    const handlePartnameNavigate = () => {
        router.visit(route("partname.createManyPrefill"), {
            method: "post",
            data: { parts: uniquePartnames },
        });
    };

    return (
        <ImportPageLayout pageName="F1/F2 PickUp" showExcelInstructions={false}>
            {/* ImportPageLayout calls React.cloneElement(children, ...), so it
                must receive exactly ONE element, not several siblings. */}
            <div>
            <style>{`
                .cell-ignored { background-color: rgba(239, 68, 68, 0.5) !important; }
                .cell-api-filled { background-color: rgba(250, 204, 21, 0.5) !important; }
                .row-invalid .rdg-cell { background-color: rgba(239, 68, 68, 0.35); }

                /* Box groups: a heavy black rule above the first lot of each group... */
                .row-group-start .rdg-cell { border-block-start: 2px solid #000; }

                /* ...and the No. of boxes column reads as one merged cell per
                   group: same fill, bold count on the first row, and no
                   horizontal border between the rows of a group (this
                   overrides react-data-grid's default cell border). */
                .rdg-cell.cell-box-head,
                .rdg-cell.cell-box-cont { background-color: #e5e7eb; }
                .rdg-cell.cell-box-head { font-weight: 700; }
                .rdg-cell.cell-box-open { border-block-end: none; }
            `}</style>

            <div className="grid grid-cols-1 w-full gap-4">
                <div className="card flex-1 bg-base-100 border border-base-content/20">
                    <div className="card-body">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="card-title">Add Daily {pickUpLabel}</h2>
                                <p className="text-sm opacity-70 mt-1">
                                    Copy the whole transfer slip table from the email and paste it
                                    here (Ctrl+V). It replaces the grid, starting at the first
                                    cell, and the title, header, footer and unneeded columns are
                                    dropped automatically. Pasting just a value or a few cells
                                    puts them at the selected cell instead. A blank{" "}
                                    <b>No. of boxes</b> cell shares the boxes of the row above,
                                    like a merged cell: type a number to start a new box group,
                                    clear a number to merge it into the group above.
                                </p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline btn-primary"
                                    onClick={handleAddRowAtBottom}
                                    disabled={isSubmitting}
                                >
                                    Add Row
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline btn-error"
                                    onClick={() => clearConfirmRef.current?.open()}
                                    disabled={isSubmitting || !hasData}
                                >
                                    Clear All
                                </button>
                            </div>
                        </div>

                        {unknownPartnames.length > 0 && (
                            <div className="flex gap-2 items-center justify-between border text-base-content p-2 rounded-lg">
                                <span>
                                    <MdWarning className="inline w-4 h-4 mr-2" />
                                    {uniquePartnames.length} partname/s were not recognized.
                                </span>
                                <button
                                    type="button"
                                    onClick={handlePartnameNavigate}
                                    className="btn btn-outline btn-primary"
                                >
                                    <div className="inline-grid *:[grid-area:1/1]">
                                        <div className="status status-secondary animate-ping"></div>
                                        <div className="status status-secondary"></div>
                                    </div>
                                    Add the unknown partnames now
                                    <FaExternalLinkAlt className="inline w-4 h-4 ml-1" />
                                </button>
                            </div>
                        )}

                        <ImportLabel
                            data={importTraceData?.pickup}
                            loading={isImportTraceLoading}
                        />

                        <div style={{ width: "100%", overflowX: "auto" }}>
                            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                                <DataGrid
                                    columns={gridColumns}
                                    rows={rows}
                                    onRowsChange={handleRowsChange}
                                    onSelectedCellChange={updateSelectedPosition}
                                    onCellClick={updateSelectedPosition}
                                    rowKeyGetter={(row) => row.id}
                                    rowClass={(row) => {
                                        const m = analysis.meta.get(row.id);
                                        return (
                                            [m?.reason ? "row-invalid" : "", m?.isHead ? "row-group-start" : ""]
                                                .filter(Boolean)
                                                .join(" ") || undefined
                                        );
                                    }}
                                    defaultColumnOptions={{ resizable: true }}
                                    headerRowHeight={56}
                                    className="rdg-light"
                                    style={{ blockSize: "max(420px, calc(100vh - 480px))" }}
                                />
                            </DndContext>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                                <span className={`badge ${status.badge}`}>{status.text}</span>
                                <span>{analysis.validRows} lots ready</span>
                                <span>{analysis.groupCount} box groups</span>
                                <span>{analysis.boxTotal} boxes total</span>
                            </div>

                            <button
                                type="button"
                                className="btn btn-primary w-54"
                                onClick={requestSubmit}
                                disabled={isSubmitting || !hasData || !!submitError}
                            >
                                {isSubmitting && <span className="loading loading-spinner"></span>}
                                Add {pickUpLabel}
                            </button>
                        </div>

                    </div>

                    {unknownPartnames.length > 0 && (
                        <Collapse
                            title="Unknown Partname: Click to see details."
                            className="w-full border border-warning text-base-content"
                            contentClassName="overflow-x-auto text-base-content"
                        >
                            <div className="mb-2">
                                showing {unknownPartnames.length} out of{" "}
                                {result?.data?.ignored_unknown_partname_count ?? unknownPartnames.length}
                            </div>
                            <div className="overflow-x-auto w-full max-h-96">
                                <DataTable
                                    columns={Object.keys(unknownPartnames[0])}
                                    rows={unknownPartnames}
                                    className="w-full"
                                />
                            </div>
                        </Collapse>
                    )}

                    <Collapse title="Accepted column headers (when your paste includes a header row)">
                        <div className="text-secondary">
                            Case, spaces, dots, dashes and underscores are ignored. Without a
                            header row, columns are guessed from their contents; you can always
                            change a column with its dropdown.
                        </div>
                        <ul className="list">
                            {FIELDS.map((f) => (
                                <li className="list-row h-8 leading-none" key={f.key}>
                                    <b>{f.label}</b>: {HEADER_SYNONYMS[f.key].join(", ")}
                                </li>
                            ))}
                        </ul>
                    </Collapse>
                </div>
            </div>

            <Modal
                ref={submitConfirmRef}
                id="pickUpPasteConfirmModal"
                title={`Confirm adding ${pickUpLabel}`}
                onClose={() => submitConfirmRef.current?.close()}
                className="max-w-lg"
            >
                <p className="py-4">
                    Add <b>{analysis.validRows}</b> lots in <b>{analysis.groupCount}</b> box
                    groups (<b>{analysis.boxTotal}</b> boxes total)? Compare the box total with
                    the slip.
                    {analysis.ignoredRows > 0 && (
                        <>
                            {" "}
                            <span className="text-error">
                                {analysis.ignoredRows} ignored row(s) will be skipped.
                            </span>
                        </>
                    )}
                </p>
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        className="btn btn-soft btn-warning"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                    >
                        Proceed
                    </button>
                    <button
                        type="button"
                        className="btn"
                        onClick={() => submitConfirmRef.current?.close()}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </button>
                </div>
            </Modal>

            <Modal
                ref={clearConfirmRef}
                id="pickUpPasteClearModal"
                title="Clear all data?"
                onClose={() => clearConfirmRef.current?.close()}
                className="max-w-lg"
            >
                <p className="py-4">
                    This removes every row, column, and mapping you've entered. This can't be
                    undone.
                </p>
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        className="btn btn-error"
                        onClick={() => {
                            resetGrid();
                            clearConfirmRef.current?.close();
                        }}
                    >
                        Clear All
                    </button>
                    <button
                        type="button"
                        className="btn"
                        onClick={() => clearConfirmRef.current?.close()}
                    >
                        Cancel
                    </button>
                </div>
            </Modal>
            </div>
        </ImportPageLayout>
    );
};

export default F1F2PickUpImportPage;