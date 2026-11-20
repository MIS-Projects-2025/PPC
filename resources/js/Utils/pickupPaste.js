import { renderTextEditor } from "react-data-grid";

// ---------------------------------------------------------------------------
// Fields
//
// `boxes` is special: it is NOT validated per row. A non-blank cell starts a
// new box group; a blank cell means "same boxes as the row above" -- exactly
// what a merged cell looks like once it's copied out of Excel / an email.
// ---------------------------------------------------------------------------
export const FIELDS = [
    { key: "partname", label: "Partname", required: true },
    { key: "lotId", label: "LotId", required: true },
    { key: "qty", label: "Qty", required: true },
    { key: "package", label: "Package", required: true },
    { key: "lc", label: "LC", required: false },
    { key: "boxes", label: "No. of boxes", required: true },
];

// Required on every row (boxes is validated per group instead).
const ROW_REQUIRED_FIELDS = FIELDS.filter((f) => f.required && f.key !== "boxes");

// Normalised to upper case on submit so lots match the Excel-imported data.
// Remove a key here if you want the pasted casing preserved.
const UPPERCASE_FIELDS = new Set(["partname", "lotId", "package"]);

// Fields the backend PartName lookup can fill in automatically.
export const API_FILLABLE_FIELDS = ["package"];

// How many leading pasted lines to scan for a header row. The email slip has
// a title, a blank line and a date above the real headers.
const HEADER_SCAN_LIMIT = 15;

export const INITIAL_COLUMN_COUNT = 8;
export const INITIAL_ROW_COUNT = 10;

export const clean = (v) => String(v ?? "").replace(/\u00a0/g, " ").trim();

// ---------------------------------------------------------------------------
// Grid helpers
// ---------------------------------------------------------------------------

// 0 -> A, 25 -> Z, 26 -> AA...
function excelColumnLetter(index) {
    let n = index;
    let letters = "";
    do {
        letters = String.fromCharCode(65 + (n % 26)) + letters;
        n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    return letters;
}

export function makeColumn(index) {
    return {
        key: `col${index}`,
        name: excelColumnLetter(index),
        editable: true,
        renderEditCell: renderTextEditor,
        resizable: true,
    };
}

// columnKeys must be an ARRAY of column key strings (e.g. ["col0", "col1"]).
export function emptyRow(id, columnKeys) {
    const row = { id };
    columnKeys.forEach((key) => {
        row[key] = "";
    });
    return row;
}

export const makeInitialColumns = () =>
    Array.from({ length: INITIAL_COLUMN_COUNT }, (_, i) => makeColumn(i));

export const makeInitialRows = () => {
    const keys = Array.from({ length: INITIAL_COLUMN_COUNT }, (_, i) => `col${i}`);
    return Array.from({ length: INITIAL_ROW_COUNT }, (_, i) => emptyRow(i, keys));
};

// ---------------------------------------------------------------------------
// Header-row detection
// ---------------------------------------------------------------------------

export const HEADER_SYNONYMS = {
    partname: ["partname", "part name", "part no", "partno", "device", "devicename", "device name"],
    lotId: ["lotid", "lot id", "lot no", "lot number", "lot"],
    qty: ["qty", "quantity", "pcs", "qtypcs"],
    package: ["package", "pkg", "package type", "packagetype"],
    lc: ["lc", "lead count", "leadcount", "leads"],
    boxes: [
        "no. of boxes",
        "no of boxes",
        "no.of boxes",
        "number of boxes",
        "no of box",
        "boxes",
        "box count",
        "qty of boxes",
    ],
};

// Case, whitespace, underscores, dashes and dots are all ignored, so
// "no.of boxes", "No. Of Boxes" and "NO_OF_BOXES" are the same thing.
function normalizeHeader(s) {
    return String(s || "")
        .trim()
        .toLowerCase()
        .replace(/[\s_\-.]+/g, "");
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
// cells), otherwise null.
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

// Looks for the header row anywhere in the first few lines.
function findHeaderRow(grid) {
    const limit = Math.min(grid.length, HEADER_SCAN_LIMIT);
    for (let i = 0; i < limit; i++) {
        const mapping = detectHeaderRow(grid[i]);
        if (mapping) return { index: i, mapping };
    }
    return null;
}

function fieldIndex(mappingByIdx, field) {
    const k = Object.keys(mappingByIdx).find((i) => mappingByIdx[i] === field);
    return k === undefined ? -1 : Number(k);
}

// ---------------------------------------------------------------------------
// Column-type prediction (used when there is no header row)
// ---------------------------------------------------------------------------

const PACKAGE_KEYWORDS = [
    "MINI_SO", "SOIC_N", "LFCSP", "TSSOP", "WLCSP", "UTQFN", "TDFN", "PDFN",
    "MSOP", "SSOP", "LQFN", "QSOP", "TQFP", "TSOT", "DFN", "QFN", "SOT",
    "SOIC", "BGA", "QFP", "LGA", "DD",
];

function nonEmptyValues(values) {
    return values.filter((v) => v !== null && v !== undefined && String(v).trim() !== "");
}

// Allows thousands separators ("43,026") as well as plain numbers.
const NUMERIC_RE = /^-?(\d+|\d{1,3}(,\d{3})+)(\.\d+)?$/;

function isNumericColumn(values) {
    const vals = nonEmptyValues(values);
    if (!vals.length) return false;
    return vals.every((v) => NUMERIC_RE.test(String(v).trim()));
}

// Flags a running row index (1,2,3,4...) so it never gets mistaken for a
// data column.
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
    // Messy part codes: may start with a digit or period, contain '^' (e.g.
    // "lt1764aeq-3^3#pbf"), and end in '#', '+', or a plain letter/digit.
    const re = /^[A-Za-z0-9.][A-Za-z0-9\-.#+^]{2,}[A-Za-z0-9#+]$/;
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

// Returns { [columnKey]: fieldKey } for the columns it's confident about.
// `manualMapping` ({ colKey: field | "ignore" }) are columns the user (or a
// header row) already pinned: they're left alone, and their fields aren't
// handed to a second column.
export function predictColumnMapping(columns, rows, manualMapping = {}) {
    const colValues = {};
    columns.forEach((col) => {
        colValues[col.key] = rows.map((r) => r[col.key] ?? "");
    });

    const indexCols = new Set(
        columns
            .filter((c) => isNumericColumn(colValues[c.key]) && isSequentialIndex(colValues[c.key]))
            .map((c) => c.key),
    );

    const used = new Set(Object.keys(manualMapping));
    const takenFields = new Set(
        Object.values(manualMapping).filter((f) => f && f !== "ignore"),
    );
    const manualKeyFor = (field) =>
        Object.keys(manualMapping).find((k) => manualMapping[k] === field) || null;
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

    // Returns the column that holds `field` (pinned or newly predicted).
    const claim = (field, scorer, minScore) => {
        if (takenFields.has(field)) return manualKeyFor(field);
        const key = pickBest(scorer, minScore);
        if (key) mapping[key] = field;
        return key;
    };

    // lotId's pattern is tight, so claim it before partname's looser one.
    const lotIdKey = claim("lotId", scoreLotId, 0.6);
    claim("partname", scorePartname, 0.5);
    claim("package", scorePackage, 0.5);

    // Qty: numeric column right after LotId, else the numeric column with
    // the biggest average.
    let qtyKey = manualKeyFor("qty");
    if (!qtyKey) {
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
                const nums = nonEmptyValues(colValues[col.key]).map((v) =>
                    Number(String(v).replace(/,/g, "")),
                );
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
    }

    // LC and No. of boxes: whatever numeric columns are left. With two, the
    // left one is LC and the right one is boxes (slip layout). With one, the
    // sparse one (has blanks = merged cells) is boxes, the dense one is LC.
    const leftovers = columns.filter(
        (c) => !used.has(c.key) && !indexCols.has(c.key) && isNumericColumn(colValues[c.key]),
    );
    const needLc = !takenFields.has("lc");
    const needBoxes = !takenFields.has("boxes");
    if (leftovers.length && (needLc || needBoxes)) {
        if (needLc && needBoxes && leftovers.length >= 2) {
            mapping[leftovers[0].key] = "lc";
            mapping[leftovers[1].key] = "boxes";
        } else if (needLc && needBoxes) {
            const denom = Math.max(
                ...[qtyKey, ...leftovers.map((c) => c.key)]
                    .filter(Boolean)
                    .map((k) => nonEmptyValues(colValues[k]).length),
                1,
            );
            const fill = nonEmptyValues(colValues[leftovers[0].key]).length / denom;
            mapping[leftovers[0].key] = fill < 0.95 ? "boxes" : "lc";
        } else {
            mapping[leftovers[0].key] = needLc ? "lc" : "boxes";
        }
    }

    return mapping;
}

// ---------------------------------------------------------------------------
// Clipboard parsing
// ---------------------------------------------------------------------------

// Parses an HTML clipboard fragment's <table> into a 2D array.
//
// colspan/rowspan are expanded so every row has the same number of columns,
// BUT cells that were filled in only because of a rowspan are also reported
// in `spanned` (an array of Sets of column indexes, one per row). That lets
// the caller turn a merged "No. of boxes" cell back into "value on the first
// row, blank below" instead of repeating the value on every row.
function parseHtmlTable(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const table = doc.querySelector("table");
    if (!table) return null;

    const trs = Array.from(table.querySelectorAll("tr"));
    const grid = [];
    const spanned = [];
    const rowspanCarry = {}; // colIdx -> { value, remaining }

    trs.forEach((tr) => {
        const rowCells = [];
        const rowSpanned = new Set();
        let col = 0;
        const cells = Array.from(tr.children).filter((el) =>
            /^(td|th)$/i.test(el.tagName),
        );
        let cellPtr = 0;

        while (cellPtr < cells.length || rowspanCarry[col]) {
            if (rowspanCarry[col]?.remaining > 0) {
                rowCells[col] = rowspanCarry[col].value;
                rowSpanned.add(col);
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
        spanned.push(rowSpanned);
    });

    return { grid, spanned };
}

// Which detected columns survive a full-table paste. Everything else (the
// numbering column, stray notes...) is dropped. Remove "lc" here to drop the
// LC column too.
const PASTE_KEEP_FIELDS = new Set(FIELDS.map((f) => f.key));

// Turns clipboard html/text into what should land in the grid.
//
// Returns null when nothing usable is left, otherwise
//   { isFullTable: false, grid }                  -> paste at the selected cell
//   { isFullTable: true, grid, fieldsByIndex }    -> replace the whole grid
//
// A full table is one with a recognised header row or, without a header, one
// where partname, lot id and qty are all recognised from the data. For a full
// table the junk is already gone:
//   - title/date lines above the header, footer lines (totals, "Prepared by",
//     TS#, ESRF#) after the data
//   - columns that aren't a known field (e.g. the numbering column)
//   - merged "No. of boxes" cells are turned into "value, then blanks"
// fieldsByIndex is { [columnIndexInReturnedGrid]: fieldKey }.
export function preparePaste(html, text) {
    let grid = null;
    let spanned = null;

    const parsed = html ? parseHtmlTable(html) : null;
    if (parsed) {
        grid = parsed.grid;
        spanned = parsed.spanned;
    } else {
        grid = (text || "")
            .replace(/\r\n/g, "\n")
            .replace(/\r/g, "\n")
            .split("\n")
            .filter((line, idx, arr) => !(idx === arr.length - 1 && line === ""))
            .map((line) => line.split("\t"));
        spanned = grid.map(() => new Set());
    }
    if (!grid.length) return null;

    // Header row (may sit below a title/date block): everything above it goes.
    const header = findHeaderRow(grid);
    const headerFieldsByIndex = header ? header.mapping : null;
    if (header) {
        grid = grid.slice(header.index + 1);
        spanned = spanned.slice(header.index + 1);
    }
    if (!grid.length) return null;

    // Merged cells: put "value on the first row, blank below" back, so a
    // merged "1" doesn't become two separate 1-box groups. Plain-text pastes
    // already look like this.
    const collapseCols = new Set();
    if (headerFieldsByIndex) {
        const b = fieldIndex(headerFieldsByIndex, "boxes");
        if (b >= 0) collapseCols.add(b);
    } else {
        // No header to say which column is boxes: any merged numeric column
        // is almost certainly it.
        const spanCols = new Set();
        spanned.forEach((s) => s.forEach((c) => spanCols.add(c)));
        spanCols.forEach((c) => {
            if (isNumericColumn(grid.map((r) => r[c] ?? ""))) collapseCols.add(c);
        });
    }
    if (collapseCols.size) {
        grid = grid.map((r, ri) => {
            if (!spanned[ri]?.size) return r;
            const copy = [...r];
            spanned[ri].forEach((c) => {
                if (collapseCols.has(c)) copy[c] = "";
            });
            return copy;
        });
    }

    // Which field is each column? The header says so; otherwise guess from
    // the data.
    let fieldsByIndex = headerFieldsByIndex;
    if (!fieldsByIndex) {
        const width = grid.reduce((m, r) => Math.max(m, r.length), 0);
        const cols = Array.from({ length: width }, (_, i) => makeColumn(i));
        // Guess from the "dense" rows only, so title/date/signature lines
        // (e.g. a date sitting in the boxes column) can't confuse the guess.
        const counts = grid.map((r) => r.filter((v) => clean(v) !== "").length);
        const sorted = counts.filter((n) => n > 0).sort((a, b) => a - b);
        const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
        const minFilled = Math.max(2, Math.ceil(median * 0.6));
        const denseRows = grid.filter((_, i) => counts[i] >= minFilled);
        const tmpRows = (denseRows.length ? denseRows : grid).map((r, ri) => {
            const row = { id: ri };
            cols.forEach((c, ci) => {
                row[c.key] = r[ci] ?? "";
            });
            return row;
        });
        const predicted = predictColumnMapping(cols, tmpRows);
        fieldsByIndex = {};
        cols.forEach((c, ci) => {
            if (predicted[c.key]) fieldsByIndex[ci] = predicted[c.key];
        });
    }

    const idIdxs = ["partname", "lotId", "qty"].map((f) => fieldIndex(fieldsByIndex, f));
    const hasIdentity = idIdxs.every((i) => i >= 0);

    if (!headerFieldsByIndex && !hasIdentity) {
        // Not recognisably a whole table: treat it as plain cell values.
        return { isFullTable: false, grid };
    }

    // Drop junk rows. Rows after the last complete row (totals, signatures)
    // always go; with no header, rows before the first complete row (title
    // lines) go too. Incomplete rows in between stay so they can be fixed.
    if (hasIdentity) {
        let first = -1;
        let last = -1;
        grid.forEach((r, i) => {
            if (idIdxs.every((c) => clean(r[c]) !== "")) {
                if (first < 0) first = i;
                last = i;
            }
        });
        grid = grid.slice(headerFieldsByIndex ? 0 : Math.max(first, 0), last + 1);
    }

    // Drop columns that aren't a known field.
    const keepIdx = Object.keys(fieldsByIndex)
        .map(Number)
        .filter((i) => PASTE_KEEP_FIELDS.has(fieldsByIndex[i]))
        .sort((a, b) => a - b);

    if (!grid.length || !keepIdx.length) return null;

    return {
        isFullTable: true,
        grid: grid.map((r) => keepIdx.map((i) => r[i] ?? "")),
        fieldsByIndex: Object.fromEntries(keepIdx.map((orig, n) => [n, fieldsByIndex[orig]])),
    };
}

// ---------------------------------------------------------------------------
// Box-group analysis
//
// Walks the rows top to bottom:
//   - non-blank boxes cell  -> starts a new box group (the "top-left" cell of
//                              a merged range)
//   - blank boxes cell      -> joins the group above (rest of the range)
//   - completely empty row  -> breaks the chain
// Also decides which rows are valid, so the grid and the submit payload can't
// disagree.
// ---------------------------------------------------------------------------
export function analyzeRows(rows, mapping) {
    const colFor = {};
    FIELDS.forEach((f) => {
        colFor[f.key] = Object.keys(mapping).find((k) => mapping[k] === f.key) || null;
    });
    const mappedCols = Object.values(colFor).filter(Boolean);

    const meta = new Map(); // rowId -> info
    const countedGroups = new Set();
    let groupSeq = 0;
    let current = null; // { id, boxes } -- boxes is null when the value is bad
    let prevInfo = null; // previous row's info, if the previous row had data
    let boxTotal = 0;
    let validRows = 0;
    let ignoredRows = 0;

    rows.forEach((row) => {
        const hasAnyValue = mappedCols.some((k) => clean(row[k]) !== "");
        if (!hasAnyValue) {
            current = null;
            prevInfo = null;
            return;
        }

        const info = {
            groupId: null,
            boxes: null,
            isHead: false,
            isContinuation: false,
            continuesBelow: false, // the next row is a continuation of this group
            reason: null,
        };

        if (colFor.boxes) {
            const raw = clean(row[colFor.boxes]);
            if (raw !== "") {
                const n = /^\d+$/.test(raw) ? Number(raw) : 0;
                current = { id: ++groupSeq, boxes: n > 0 ? n : null };
                info.isHead = true;
            } else if (current) {
                info.isContinuation = true;
            }
            if (current) {
                info.groupId = current.id;
                info.boxes = current.boxes;
            }
        }

        const missing = ROW_REQUIRED_FIELDS.filter(
            (f) => colFor[f.key] && clean(row[colFor[f.key]]) === "",
        );
        if (missing.length) {
            info.reason = `Missing ${missing.map((f) => f.label).join(", ")}`;
        } else if (colFor.qty && !/^\d+$/.test(clean(row[colFor.qty]).replace(/[,\s]/g, ""))) {
            info.reason = "Qty must be a whole number";
        } else if (colFor.lc && clean(row[colFor.lc]) !== "" && !/^\d+$/.test(clean(row[colFor.lc]))) {
            info.reason = "LC must be a whole number";
        } else if (colFor.boxes && !current) {
            info.reason = "No box count, and no row above to share boxes with";
        } else if (colFor.boxes && current.boxes === null) {
            info.reason = "No. of boxes must be a whole number above 0";
        }

        if (info.reason) {
            ignoredRows++;
        } else {
            validRows++;
            if (info.groupId != null && !countedGroups.has(info.groupId)) {
                countedGroups.add(info.groupId);
                boxTotal += info.boxes;
            }
        }
        meta.set(row.id, info);
        if (info.isContinuation && prevInfo) prevInfo.continuesBelow = true;
        prevInfo = info;
    });

    return {
        colFor,
        meta,
        validRows,
        ignoredRows,
        groupCount: countedGroups.size,
        boxTotal,
    };
}

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------

// Returns an error message, or null if the mapping is submittable.
export function validateForSubmit(mapping, analysis) {
    const missing = FIELDS.filter((f) => f.required && !analysis.colFor[f.key]);
    if (missing.length) {
        return `Map a column to: ${missing.map((f) => f.label).join(", ")}`;
    }

    const counts = {};
    Object.values(mapping).forEach((f) => {
        if (f && f !== "ignore") counts[f] = (counts[f] || 0) + 1;
    });
    const dupes = FIELDS.filter((f) => counts[f.key] > 1);
    if (dupes.length) {
        return `More than one column is mapped to: ${dupes.map((f) => f.label).join(", ")}`;
    }

    if (analysis.validRows === 0) return "There are no complete rows to submit.";
    return null;
}

// Valid rows only. `boxGroup` is a local label for "these rows share boxes";
// the server assigns the real box_group_id.
export function buildPayload(rows, analysis) {
    const { colFor, meta } = analysis;
    const payload = [];

    rows.forEach((row) => {
        const m = meta.get(row.id);
        if (!m || m.reason) return;

        const record = { boxGroup: m.groupId, noOfBox: m.boxes };
        FIELDS.forEach((f) => {
            if (f.key === "boxes") return;
            let raw = colFor[f.key] ? clean(row[colFor[f.key]]) : "";
            if (f.key === "qty") raw = raw.replace(/[,\s]/g, "");
            if (UPPERCASE_FIELDS.has(f.key)) raw = raw.toUpperCase();
            record[f.key] = f.key === "lc" ? (raw === "" ? null : Number(raw)) : raw;
        });
        payload.push(record);
    });

    return payload;
}