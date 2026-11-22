/**
 * Loading Plan Excel exporter (ExcelJS)
 * Sheets: Unassigned, RES, one per package group, Other, then "PTP 95%" (capacity overview).
 * Each sheet is split into per-machine sections; grouped ("parked") lots are
 * written under their group label. Rules mirror Deemo's displayRows/makeColumns.
 *
 * The PTP sheets are live: hidden data sheets link back to each lot's own row on the
 * main sheets, and every PTP number is a formula over those data sheets.
 */
import {
    PACKAGE_SUMMARY_GROUPS,
    aggregateByMachine,
    buildOverviewSections,
    buildStatusCols,
    COMPLETED_STATUSES,
    completedCount,
    resolveSummaryGroup,
} from "@/Lib/LoadingPlan/capacityOverview";
import { PRE_TNR_STATUSES, STATUS_ORDER } from "@/Lib/LoadingPlan/ptpOverview";
import { STATUS_TONE } from "@/Components/LoadingPlan/StatusBadge.jsx";
import { PARTNAME_TO_BAKE_KEYS, PARTNAME_TO_QTY_KEYS } from "@/Components/LoadingPlan/columns";
import { F3_FLAG } from "@/Constants/LoadingPlan/tabs";
import ExcelJS from "exceljs";
import { isBlockRow as defaultIsBlockRow, isForBake } from "./helpers";

import { formatF3Machine } from "./f3";
export { formatF3Machine };

const DATE_COLUMN_KEY = "__export_date_loaded";
const ITEM_COLUMN_KEY = "__export_item";
const MACHINE_COLUMN_KEY = "__export_machine";
const RES_STATION = "GTTRES_T";

const EXPEDITE_COLUMN_KEY = "__export_expedite_scm";
const EXPECTED_PT_COLUMN_KEY = "__export_expected_pt";
const ISSUE_COLUMN_KEY = "__export_issue";

const TIME_FMT = "h:mm AM/PM"; // time only, whatever the location

// For F3 only
const SYNTHETIC_COLUMNS = {
    [DATE_COLUMN_KEY]: { key: DATE_COLUMN_KEY, name: "Date" },
    [ITEM_COLUMN_KEY]: { key: ITEM_COLUMN_KEY, name: "Item" },
    [MACHINE_COLUMN_KEY]: { key: MACHINE_COLUMN_KEY, name: "Machine" },
    [EXPEDITE_COLUMN_KEY]: { key: EXPEDITE_COLUMN_KEY, name: "EXPEDITE Y/N AND SCM" },
    [EXPECTED_PT_COLUMN_KEY]: { key: EXPECTED_PT_COLUMN_KEY, name: "Expected PT" },
    [ISSUE_COLUMN_KEY]: { key: ISSUE_COLUMN_KEY, name: "ISSUE" },
};

// Hex stand-ins for the Tailwind/daisyUI tones. Excel can't read theme colours,
// so these are pastel approximations of the "/50" fills; tweak to taste.
// fill = cell background, edge = the thick left border (like border-l-8 in the grid)
const TONE_EXCEL = {
    neutral:  { fill: "FFE5E7EB", edge: "FF9CA3AF" },
    progress: { fill: "FFBFDBFE", edge: "FF3B82F6" },
    queued:   { fill: "FFFDE68A", edge: "FFF59E0B" },
    done:     { fill: "FFBBF7D0", edge: "FF22C55E" },
    shipped:  { fill: "FF22C55E", edge: "FF22C55E" },
    qa:       { fill: "FFE9D5FF", edge: "FFA855F7" },
    handling: { fill: "FFFBCFE8", edge: "FFEC4899" },
    hold:     { fill: "FFFECACA", edge: "FFEF4444" },
    rework:   { fill: "FFFED7AA", edge: "FFF97316" },
};

// Excel-only overrides (win over the tone above)
const STATUS_EXCEL_OVERRIDES = {
    "FINAL SHIP":      "FFFFFF00",
    "VISUAL (FVI)":    "FFFFFF00",
    "PACK LABEL":      "FFFFC7CE",
    "PACK LABEL HOLD": "FFFFC7CE",
    "HANDLER":         "FF00B0F0",
    "SHIPPED":         "FF00B050",
    "FOR SHIPBACK":    "FFFFC000",
};

function statusStyle(status) {
    const key = String(status ?? "").trim().toUpperCase();
    if (!key) return null;
    const override = STATUS_EXCEL_OVERRIDES[key];
    if (override) return { fill: override, edge: override };
    return TONE_EXCEL[STATUS_TONE[key] ?? "neutral"];
}

// F3 export, in order. Synthetic keys come from SYNTHETIC_COLUMNS, the rest from DATA_COLUMNS.
const F3_COLUMN_ORDER = [
    DATE_COLUMN_KEY, ITEM_COLUMN_KEY, EXPEDITE_COLUMN_KEY, MACHINE_COLUMN_KEY,
    "ramp_time", // exported as "Input"
    "part_name", "lead_count", "package_type", "package_name", "lot_id",
    "status", // exported as "Update"
    "station", "qty", "doable", "capacity_uph", "accu_time", "time_start", "time_end",
    EXPECTED_PT_COLUMN_KEY,
    "lot_type", "prod_area", "lot_status", "lot_entry_time_days", "cr3", "be_osl_days", "osl", "body_size",
    "end_customer", "bake", "bake_count", "test_lot_id", "backend_leadtime", "date_loaded",
    "be_starttime", "ct",
    "start_time", "part_type", "auto_part", "part_class", "date_code", "focus_group", "process_group",
    "bulk", "required_time", "lot_entry_time", "stage", "stage_start_time", "ccd", "stage_run_days",
    "tray", "osl_days", "be_group", "strategy_code", "assy_site", "stock_position", "bake_time_temp",
    ISSUE_COLUMN_KEY,
    "remarks",
];

const F3_HIDDEN_KEYS = new Set([
    "lot_type", "prod_area", "lot_status", "lot_entry_time_days", "cr3", "be_osl_days", "osl", "body_size",
    "end_customer", "bake", "bake_count", "test_lot_id", "backend_leadtime", "date_loaded",
    "start_time", "part_type", "auto_part", "part_class", "date_code", "focus_group", "process_group",
    "bulk", "required_time", "lot_entry_time", "stage", "stage_start_time", "ccd", "stage_run_days",
    "tray", "osl_days", "be_group", "strategy_code", "assy_site", "stock_position", "bake_time_temp",
]);

const F3_EMPTY_KEYS = new Set(["ct"]);
const F3_HEADER_LABELS = { status: "Update", ramp_time: "Input" };

const colLetter = (i) => {
    let s = "";
    for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
    return s;
};

const cfFill = (argb) => ({ fill: { type: "pattern", pattern: "solid", bgColor: { argb } } });

/** Time of day only, as an Excel day fraction (no date, no Yest/Tmrw). */
function toExcelTime(row, field) {
    const src = row[`${field}_at`] ?? row[field];
    const m = /(\d{1,2}):(\d{2})(?::(\d{2}))?\s*$/.exec(String(src ?? ""));
    if (!m) return null;
    return (Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3] ?? 0)) / 86400;
}

const HEADER_LABEL_OVERRIDES = {
    accu_time: "Accu. Time (hrs)",
    time_start: "Time_start",
    time_end: "Time_end",
};

const COLORS = {
    sectionTitleFont: "FF1F4E78",
    headerFill: "C6E0B4",
    groupFill: "FFDDEBF7",

    // for F3 CT coloring
    ctMid:  "FF00B0F0",
    ctHigh: "FFDE83D0",

    blockFill: "FFFDE9D9",
    replannedFill: "FFFFC7CE",
    replannedFont: "FF9C0006",
    headerFont: "FF1F1F1F",
    lightYellow: "FFFFFBE0", // cycle_time_exceed_residual
    yellow: "FFFFF2CC",      // cycle_time_exceed
    amber: "FFFFD966",       // is_manual_expedite
    scmFill: "FFFFC7CE",     // is_scm
    redFont: "FFCC0000",     // is_for_bake
    cr3ResFill: "FFFF0000",  // cr3 === "RES"
    dimFont: "FF7F7F7F", // row belongs to another package/location (shown for context)
    border: { style: "thin", color: { argb: "FFB7B7B7" } },
};

const MIN_COL_WIDTH = {
    [DATE_COLUMN_KEY]: 20,   // "September 30, 2026" is 18 chars
    be_starttime: 22,        // "12/31/2026 12:00 PM" is 19 chars
};

// ---- helpers ----------------------------------------------------------------

function widthFromPx(px, fallbackHeader) {
    if (px) return Math.round(((px - 5) / 7) * 100) / 100;
    const headerLen = (fallbackHeader || "").length;
    return Math.max(10, Math.min(headerLen + 4, 24));
}

function applyBorder(cell) {
    cell.border = { top: COLORS.border, left: COLORS.border, bottom: COLORS.border, right: COLORS.border };
}

function sanitizeSheetName(name) {
    const cleaned = String(name ?? "Sheet").replace(/[\\/*?:[\]]/g, " ").trim();
    return cleaned.slice(0, 31) || "Sheet";
}

const solid = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

/** ExcelJS writes Dates as UTC, so shift local wall-clock values to show the same digits. */
function toExcelDate(v) {
    if (!v) return null;
    const s = String(v);
    const d = v instanceof Date ? v : new Date(/^\d{4}-\d\d-\d\d \d/.test(s) ? s.replace(" ", "T") : s);
    if (Number.isNaN(d.getTime())) return s;
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()));
}

const hoursOf = (m) => (m == null || m === "" ? null : Math.round((Number(m) / 60) * 100) / 100);

function timeNumFmt(row, field) {
    const base = "h:mm AM/PM";
    const off = row[`${field}_day_offset`] ?? 0;
    if (off === 0) return base;
    if (off === -1) return `${base} "Yest"`;
    if (off === 1) return `${base} "Tmrw"`;
    return `${base} "·" mmm d`;
}

const planDateToExcel = (ymd) => {
    const [y, m, d] = ymd.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
};

// ---- formula helpers (live PTP sheets) ---------------------------------------

const quoteSheet = (name) => `'${String(name).replace(/'/g, "''")}'`;

/** Reference to a lot's own cell on the main sheets, or null when it wasn't written / column not exported. */
const srcRef = (r, k, sourceCols) =>
    r.ref && sourceCols?.[k] ? `${quoteSheet(r.ref.sheet)}!${sourceCols[k]}${r.ref.rowNumber}` : null;

/** Trimmed text of a cell, `blank` when empty or on error; optional wrapper fn such as UPPER. */
const cleanText = (ref, blank, fn = "") =>
    `IFERROR(IF(TRIM(${ref}&"")="","${blank}",${fn}(TRIM(${ref}&""))),"${blank}")`;

/** Number, or text that looks like one, else 0 (avoids VALUE() locale problems on real numbers). */
const numOf = (ref) => `IFERROR(IF(ISNUMBER(${ref}),${ref},VALUE(${ref}&"")),0)`;

const xlText = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;

/** "=" + text so COUNTIFS/SUMIFS match exactly; ~ escapes wildcards. */
const critText = (s) => `"=${String(s).replace(/[~*?]/g, "~$&").replace(/"/g, '""')}"`;

/** SUM() takes at most 255 arguments. */
const sumRefs = (refs) => {
    const parts = [];
    for (let i = 0; i < refs.length; i += 200) parts.push(`SUM(${refs.slice(i, i + 200).join(",")})`);
    return parts.join("+") || "0";
};

// ---- main-sheet rows ----------------------------------------------------------

function resolveCellValue(col, row, ctx) {
    if (col.key === DATE_COLUMN_KEY) {
        return ctx.isF3 && ctx.date ? planDateToExcel(ctx.date) : toExcelDate(row.date_loaded);
    }
    if (ctx.emptyKeys.has(col.key)) return null;
    if (col.key === EXPECTED_PT_COLUMN_KEY) return hoursOf(row.accu_time);
    if (col.key === EXPEDITE_COLUMN_KEY) return !ctx.isBlock(row) && row.is_replanned ? "REPLANNED" : null;
    if (col.key === ISSUE_COLUMN_KEY) return null;

    if (ctx.isBlock(row)) {
        const label = row.block_label ?? "";
        if (col.key === "part_name" || col.key === "package_name" || col.key === "status") return `▨ ${label}`;
        if (col.key === "lot_id") return `${label} ▨`;
        if (col.key === "accu_time") return hoursOf(row.accu_time);
        if (col.key === "doable") {
            if (row.doable_status === "no_recipe" && !row.doable_overridden) return "No Recipe";
            return row.doable > 0 ? Number(row.doable) : null;
        }
        if (col.key === "time_start" || col.key === "time_end") return toExcelTime(row, col.key);
        return null;
    }

    if (ctx.isF3 && col.key === "be_starttime") return toExcelDate(row.be_starttime);
    if (col.key === MACHINE_COLUMN_KEY) return ctx.getMachineLabel(row.machine);
    if (col.key === "accu_time") return hoursOf(row.accu_time);
    if (col.key === "time_start" || col.key === "time_end") return toExcelTime(row, col.key);
    // a 0 doable is left blank
    if (col.key === "doable") return Number(row.doable) === 0 ? null : (row.doable ?? null);
    return row[col.key] ?? null;
}

function styleDataCell(cell, col, row, ctx) {
    applyBorder(cell);

    if (ctx.isBlock(row)) {
        cell.fill = solid(COLORS.blockFill);
        return;
    }

    const scm = row.is_scm === true;

    if (PARTNAME_TO_QTY_KEYS.has(col.key) && !scm) {
        if (row.cycle_time_exceed_residual) cell.fill = solid(COLORS.lightYellow);
        else if (row.cycle_time_exceed) cell.fill = solid(COLORS.yellow);
        if (row.is_manual_expedite) cell.fill = solid(COLORS.amber);
    }

    if (scm) cell.fill = solid(COLORS.scmFill);

    if (col.key === EXPEDITE_COLUMN_KEY && row.is_replanned) {
        cell.fill = solid(COLORS.replannedFill);
        cell.font = { ...(cell.font || {}), color: { argb: COLORS.replannedFont } };
    }

    if (PARTNAME_TO_BAKE_KEYS.has(col.key) && isForBake(row)) {
        cell.font = { ...(cell.font || {}), color: { argb: COLORS.redFont } };
    }

    if (col.key === "cr3" && row.cr3 === "RES") cell.fill = solid(COLORS.cr3ResFill);

    if (col.key === "status") {
        const s = statusStyle(row.status);
        if (s) {
            cell.fill = solid(s.fill);
            cell.border = { ...cell.border, left: { style: "thick", color: { argb: s.edge } } };
        }
    }
}

function writeRows(sheet, rows, ctx) {
    const written = [];
    rows.forEach((row, idx) => {
        const values = ctx.exportColumns.map((col) =>
            col.key === ITEM_COLUMN_KEY ? idx + 1 : resolveCellValue(col, row, ctx),
        );
        const dataRow = sheet.addRow(values);

        // Remember where each lot's own (non-dimmed) copy lives, so the PTP sheets can link to it.
        if (ctx.cellRefs && !ctx.isBlock(row) && (!ctx.isOwn || ctx.isOwn(row)) && !ctx.cellRefs.has(row)) {
            ctx.cellRefs.set(row, { sheet: sheet.name, rowNumber: dataRow.number });
        }

        const dim = !!ctx.isOwn && !ctx.isBlock(row) && !ctx.isOwn(row);
        written.push({ row, number: dataRow.number, dim });

        ctx.exportColumns.forEach((col, i) => {
            const cell = dataRow.getCell(i + 1);
            styleDataCell(cell, col, row, ctx);

            if (col.key === DATE_COLUMN_KEY) cell.numFmt = "mmmm d, yyyy";
            if (col.key === "accu_time" || col.key === EXPECTED_PT_COLUMN_KEY) cell.numFmt = "0.00";
            if (col.key === "time_start" || col.key === "time_end") cell.numFmt = TIME_FMT;
            if (ctx.isBlock(row) && ["part_name", "package_name", "status", "lot_id"].includes(col.key)) {
                cell.font = { ...(cell.font || {}), bold: true };
            }
            if (dim) {
                cell.font = { ...(cell.font || {}), italic: true, color: { argb: COLORS.dimFont } };
            }

            if (ctx.isF3 && col.key === "be_starttime") cell.numFmt = "m/d/yyyy h:mm AM/PM";
            if (ctx.isF3 && col.key === "ct" && !ctx.isBlock(row)) {
                const d = `${ctx.dateCol}${dataRow.number}`;
                const b = `${ctx.beCol}${dataRow.number}`;
                cell.value = { formula: `IF(OR(${d}="",${b}=""),"",ROUND(${d}-${b},2))` };
                cell.numFmt = "0.00";
            }
        });
    });
    return written;
}

/** [5, 6, 7, 9] + "N" -> ["N5:N7", "N9"] */
function toRanges(nums, col) {
    const out = [];
    let start = nums[0];
    let prev = nums[0];
    for (let i = 1; i <= nums.length; i++) {
        if (nums[i] === prev + 1) {
            prev = nums[i];
            continue;
        }
        out.push(start === prev ? `${col}${start}` : `${col}${start}:${col}${prev}`);
        start = prev = nums[i];
    }
    return out;
}

/**
 * Last row of a machine section: overall Qty and Doable as live SUM formulas, on the section's
 * header colour. Only the machine's own rows count: rows drawn dimmed (another package / location)
 * are left out. Doable skips rework rows, same as the machine header in the app.
 */
function addSectionTotals(sheet, written, ctx) {
    const { qtyCol, doableCol, exportColumns, partNameIdx } = ctx;
    if (!qtyCol || !doableCol) return;

    const own = written.filter((w) => !w.dim);
    if (own.length === 0) return;

    const lots = own.filter((w) => !ctx.isBlock(w.row));
    const lotsForDoable = lots.filter((w) => !w.row.is_rework);
    const sumOf = (list, key) => list.reduce((s, w) => s + (Number(w.row[key]) || 0), 0);

    const row = sheet.addRow([]);
    for (let i = 1; i <= exportColumns.length; i++) {
        const cell = row.getCell(i);
        cell.fill = solid(COLORS.headerFill);
        applyBorder(cell);
    }

    const label = row.getCell((partNameIdx === -1 ? 0 : partNameIdx) + 1);
    label.value = "Total";
    label.font = { bold: true };

    const put = (col, nums, result) => {
        const cell = sheet.getCell(`${col}${row.number}`);
        cell.value = { formula: sumRefs(toRanges(nums, col)), result };
        cell.numFmt = "#,##0";
        cell.font = { bold: true };
    };
    put(qtyCol, own.map((w) => w.number), sumOf(lots, "qty"));
    put(
        doableCol,
        own.filter((w) => !w.row.is_rework).map((w) => w.number),
        sumOf(lotsForDoable, "doable"),
    );
}

function renderSection({ sheet, title, rows, groups = [], totals = false, ctx }) {
    const { exportColumns, partNameIdx, timeStartIdx } = ctx;
    const n = exportColumns.length;

    const titleRow = sheet.addRow([]);
    titleRow.height = 24;
    for (let i = 1; i <= n; i++) titleRow.getCell(i).fill = solid(COLORS.headerFill);
    if (partNameIdx !== -1) {
        const c = titleRow.getCell(partNameIdx + 1);
        c.value = title;
        c.font = { bold: true, size: 18, color: { argb: COLORS.sectionTitleFont } };
    }
    if (timeStartIdx !== -1) {
        const c = titleRow.getCell(timeStartIdx + 1);
        c.value = "PPC";
        c.font = { bold: true, size: 18, color: { argb: COLORS.sectionTitleFont } };
    }

    const headerRow = sheet.addRow(exportColumns.map((c) => ctx.headerLabels[c.key] ?? c.name));
    headerRow.height = 15;
    for (let i = 1; i <= n; i++) {
        const cell = headerRow.getCell(i);
        cell.font = { bold: true, color: { argb: COLORS.headerFont } };
        cell.fill = solid(COLORS.headerFill);
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        applyBorder(cell);
    }

    const laneRows = writeRows(sheet, rows, ctx);

    groups.forEach((g) => {
        const labelRow = sheet.addRow([]);
        for (let i = 1; i <= n; i++) labelRow.getCell(i).fill = solid(COLORS.groupFill);
        if (partNameIdx !== -1) {
            const c = labelRow.getCell(partNameIdx + 1);
            c.value = `▸ Group: ${g.label}`;
            c.font = { bold: true };
        }
        writeRows(sheet, g.rows, ctx);
    });

    if (totals) addSectionTotals(sheet, laneRows, ctx);

    sheet.addRow([]);
}

// ---- PTP sheets ----------------------------------------------------------------

const OVERVIEW_SHEET_NAME = "PTP 95%";

const PTP_DATA_SHEET = "PTP Data";
const MACHINE_DATA_SHEET = "PTP Machine Data";
const GROUP_MAP_SHEET = "PTP Groups";
const GROUP_MAP_LAST_ROW = 300; // range reaches past the written rows, so rows the user adds are picked up

// Counted towards "TNR % Completion". Aliases are harmless: each lot has one status.
const TNR_DONE_STATUSES = ["DONE", "FVI", "VISUAL (FVI)", "OQA", "BOXING", "BUY OFF", "BUY-OFF"];
// PRE_TNR_STATUSES / STATUS_ORDER live in Lib/LoadingPlan/ptpOverview (shared with the PTP 95% tab).

function styleHeaderCell(cell) {
    cell.font = { bold: true, color: { argb: COLORS.headerFont } };
    cell.fill = solid(COLORS.headerFill);
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    applyBorder(cell);
}

/**
 * Package totals at `startCol` (0-based) and the status table 5 columns to its right.
 * Everything is a formula over a hidden flat data sheet, whose cells link to each lot's own row
 * on the main sheets (lots without a link keep their exported value).
 */
function renderPtpSummaries(workbook, sheet, { summaryRows, location, startCol, sourceCols }) {
    // ---- hidden source data ----
    const data = workbook.addWorksheet(PTP_DATA_SHEET);
    data.state = "hidden";
    data.addRow(["Package", "Status", "Qty", "Doable", "Lot_Id"]);

    summaryRows.forEach((r) => {
        const [p, s, q, d, l] = ["pkg", "status", "qty", "doable", "lotId"].map((k) => srcRef(r, k, sourceCols));
        data.addRow([
            p ? { formula: cleanText(p, "(blank)"), result: r.pkg } : r.pkg,
            s ? { formula: cleanText(s, "(blank)", "UPPER"), result: r.status } : r.status,
            q ? { formula: numOf(q), result: r.qty } : r.qty,
            d ? { formula: numOf(d), result: r.doable } : r.doable,
            l ? { formula: `IFERROR(${l}&"","")`, result: r.lotId } : r.lotId,
        ]);
    });

    const last = Math.max(summaryRows.length + 1, 2);
    const rng = (c) => `'${PTP_DATA_SHEET}'!$${c}$2:$${c}$${last}`;
    const [PKG, STATUS, QTY, DOABLE, LOT] = ["A", "B", "C", "D", "E"].map(rng);

    const HEADER_ROW = 2; // same row as the main table's header
    const FIRST = HEADER_ROW + 1;
    const NUM = "#,##0";

    const cellAt = (row, col) => sheet.getRow(row).getCell(col);
    const put = (row, col, value, { numFmt, bold, fill } = {}) => {
        const cell = cellAt(row, col);
        cell.value = value;
        applyBorder(cell);
        if (numFmt) cell.numFmt = numFmt;
        if (bold) cell.font = { bold: true };
        if (fill) cell.fill = solid(fill);
        return cell;
    };
    const header = (col, text) => {
        const cell = cellAt(HEADER_ROW, col);
        cell.value = text;
        styleHeaderCell(cell);
    };
    const sum = (list, k) => list.reduce((s, r) => s + r[k], 0);

    // ---- 1) PACKAGE | Sum of QTY | Sum of Doable | Count of Lot_Id ----
    const pc = startCol + 1; // 1-based column number
    const L = (offset) => colLetter(startCol + offset);

    ["PACKAGE", "Sum of QTY", "Sum of Doable", "Count of Lot_Id"].forEach((t, i) => header(pc + i, t));

    const packages = [...new Set(summaryRows.map((r) => r.pkg))].sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
    );

    packages.forEach((pkg, i) => {
        const r = FIRST + i;
        const ref = `${L(0)}${r}`;
        const mine = summaryRows.filter((x) => x.pkg === pkg);

        put(r, pc, pkg);
        put(r, pc + 1, { formula: `SUMIFS(${QTY},${PKG},${ref})`, result: sum(mine, "qty") }, { numFmt: NUM });
        put(r, pc + 2, { formula: `SUMIFS(${DOABLE},${PKG},${ref})`, result: sum(mine, "doable") }, { numFmt: NUM });
        // SUMPRODUCT, not COUNTIFS "<>": linked cells return "" which COUNTIFS "<>" would count
        put(r, pc + 3, {
            formula: `SUMPRODUCT((${PKG}=${ref})*(LEN(${LOT})>0))`,
            result: mine.filter((x) => x.lotId !== "").length,
        }, { numFmt: NUM });
    });

    // Grand totals cover the whole data range, so a package typed in later is still counted.
    const pkgTotalRow = FIRST + packages.length;
    const totalOpts = { bold: true, fill: COLORS.groupFill, numFmt: NUM };
    put(pkgTotalRow, pc, "Grand Total", { bold: true, fill: COLORS.groupFill });
    [
        [`SUM(${QTY})`, sum(summaryRows, "qty")],
        [`SUM(${DOABLE})`, sum(summaryRows, "doable")],
        [`SUMPRODUCT(--(LEN(${LOT})>0))`, summaryRows.filter((x) => x.lotId !== "").length],
    ].forEach(([formula, result], i) => put(pkgTotalRow, pc + 1 + i, { formula, result }, totalOpts));

    // ---- 2) <location> | Number of Lots | Percentage ----
    const sc = pc + 5; // 1-based, like pc: column Q when the package table starts at L
    const [S0, S1] = [L(5), L(6)];

    header(sc, location ?? "All");
    header(sc + 1, "Number of Lots");
    header(sc + 2, "Percentage");

    const counts = new Map();
    summaryRows.forEach((r) => counts.set(r.status, (counts.get(r.status) ?? 0) + 1));
    const rank = (s) => {
        const i = STATUS_ORDER.indexOf(s);
        return i === -1 ? STATUS_ORDER.length : i;
    };
    const statuses = [...counts.keys()].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));

    const TNR_ROW = FIRST;
    const REMARKS_ROW = FIRST + 1;
    const STATUS_FIRST = FIRST + 2;
    const STATUS_LAST = STATUS_FIRST + statuses.length - 1;
    const OTHER_ROW = STATUS_LAST + 1;
    const TOTAL_ROW = OTHER_ROW + 1;
    const total = summaryRows.length;
    const totalRef = `$${S1}$${TOTAL_ROW}`;
    const pct = (ref) => `IF(${totalRef}=0,0,${ref}/${totalRef})`;

    // TNR % Completion = total planned lots minus those still before TNR
    const preCount = PRE_TNR_STATUSES.reduce((s, k) => s + (counts.get(k) ?? 0), 0);
    const preList = `{${PRE_TNR_STATUSES.map((s) => `"${s}"`).join(",")}}`;
    put(TNR_ROW, sc, "TNR % Completion", { bold: true });
    put(TNR_ROW, sc + 1, {
        formula: `${totalRef}-SUMPRODUCT(COUNTIFS(${STATUS},${preList}))`,
        result: total - preCount,
    }, { numFmt: NUM, bold: true });
    put(TNR_ROW, sc + 2, {
        formula: pct(`${S1}${TNR_ROW}`),
        result: total ? (total - preCount) / total : 0,
    }, { numFmt: "0%", bold: true });

    put(REMARKS_ROW, sc, "REMARKS", { bold: true, fill: COLORS.groupFill });
    put(REMARKS_ROW, sc + 1, null, { fill: COLORS.groupFill });
    put(REMARKS_ROW, sc + 2, null, { fill: COLORS.groupFill });

    statuses.forEach((st, i) => {
        const r = STATUS_FIRST + i;
        const n = counts.get(st);
        put(r, sc, st);
        put(r, sc + 1, { formula: `COUNTIFS(${STATUS},${S0}${r})`, result: n }, { numFmt: NUM });
        put(r, sc + 2, { formula: pct(`${S1}${r}`), result: total ? n / total : 0 }, { numFmt: "0%" });
    });

    // Catches any status the user types in later that has no row above.
    put(OTHER_ROW, sc, "Other (not listed)");
    put(OTHER_ROW, sc + 1, {
        formula: statuses.length ? `${totalRef}-SUM(${S1}${STATUS_FIRST}:${S1}${STATUS_LAST})` : totalRef,
        result: statuses.length ? 0 : total,
    }, { numFmt: NUM });
    put(OTHER_ROW, sc + 2, { formula: pct(`${S1}${OTHER_ROW}`), result: statuses.length ? 0 : total ? 1 : 0 }, { numFmt: "0%" });

    // TOTAL counts every lot; the percentage sums through the Other row.
    put(TOTAL_ROW, sc, "TOTAL", { bold: true, fill: COLORS.groupFill });
    put(TOTAL_ROW, sc + 1, { formula: `SUMPRODUCT(--(LEN(${STATUS})>0))`, result: total },
        { bold: true, fill: COLORS.groupFill, numFmt: NUM });
    put(TOTAL_ROW, sc + 2, { formula: `SUM(${L(7)}${STATUS_FIRST}:${L(7)}${OTHER_ROW})`, result: total ? 1 : 0 },
        { bold: true, fill: COLORS.groupFill, numFmt: "0%" });

    // widths: package table, gap, status table
    [[0, 22], [1, 14], [2, 14], [3, 14], [4, 3], [5, 22], [6, 16], [7, 12]].forEach(([off, w]) => {
        sheet.getColumn(startCol + 1 + off).width = w;
    });
}

// ---- package group lookup (visible, editable) ----------------------------------

function renderGroupMap(workbook) {
    const sheet = workbook.addWorksheet(GROUP_MAP_SHEET);
    sheet.columns = [{ width: 28 }, { width: 28 }, { width: 3 }, { width: 70 }];

    const head = sheet.addRow(["Package", "Group"]);
    head.eachCell((cell) => styleHeaderCell(cell));
    sheet.getCell("D1").value = "Add a row for any package that should roll up into a group. Lookup is not case-sensitive.";
    sheet.getCell("D1").font = { italic: true, color: { argb: COLORS.dimFont } };

    // same keys as LOOKUP in CapacityOverviewModal: every label and every member -> its label
    const seen = new Set();
    PACKAGE_SUMMARY_GROUPS.forEach((g) =>
        [g.label, ...g.members].forEach((m) => {
            const text = String(m).trim();
            const key = text.toUpperCase();
            if (!key || seen.has(key)) return;
            seen.add(key);
            sheet.addRow([text, g.label]);
        }),
    );

    return `'${GROUP_MAP_SHEET}'!$A$2:$B$${GROUP_MAP_LAST_ROW}`;
}

// Mirrors resolveSummaryGroup(package_group, package_name):
// first name found in the map, else the first non-empty name, else "Other".
const groupFormula = (pg, pn, map) => {
    const hit = (x) => `IF(TRIM(${x}&"")="",NA(),VLOOKUP(TRIM(${x}&""),${map},2,FALSE))`;
    return (
        `IFERROR(${hit(pg)},IFERROR(${hit(pn)},` +
        `IF(TRIM(${pg}&"")<>"",TRIM(${pg}&""),IF(TRIM(${pn}&"")<>"",TRIM(${pn}&""),"Other"))))`
    );
};

// ---- hidden per-lot data for the machine table ---------------------------------

function renderMachineData(workbook, machineRows, { sourceCols, machineLabel }) {
    const data = workbook.addWorksheet(MACHINE_DATA_SHEET);
    data.state = "hidden";
    data.addRow(["Machine", "Group", "Status", "Qty", "Doable"]);

    const groupMap = renderGroupMap(workbook);

    machineRows.forEach((r) => {
        const [m, s, q, d] = ["machine", "status", "qty", "doable"].map((k) => srcRef(r, k, sourceCols));
        // linked to the main sheet when that column is exported, otherwise the current value is baked in
        const pg = srcRef(r, "pkgGroup", sourceCols) ?? xlText(r.pkgGroup);
        const pn = srcRef(r, "pkgName", sourceCols) ?? xlText(r.pkgName);
        const label = machineLabel(r.machine);

        data.addRow([
            m ? { formula: cleanText(m, "(blank)"), result: label } : label,
            r.ref ? { formula: groupFormula(pg, pn, groupMap), result: r.group } : r.group,
            s ? { formula: cleanText(s, "NONE", "UPPER"), result: r.status } : r.status,
            q ? { formula: numOf(q), result: r.qty } : r.qty,
            d ? { formula: numOf(d), result: r.doable } : r.doable,
        ]);
    });

    const last = Math.max(machineRows.length + 1, 2);
    const rng = (c) => `'${MACHINE_DATA_SHEET}'!$${c}$2:$${c}$${last}`;
    return { machine: rng("A"), group: rng("B"), status: rng("C"), qty: rng("D"), doable: rng("E") };
}

// ---- capacity overview ("PTP 95%") ---------------------------------------------

function renderCapacityOverviewSheet(
    workbook,
    {
        serverMachines, nonMachines, machineCapacity, dataRows, summaryRows,
        machineRows, sourceCols, location, machineLabel = (m) => m,
    },
) {
    const { byMachine, extraStatuses, orphanMachines } = aggregateByMachine({ dataRows, serverMachines, nonMachines });
    const { groupedSections, grand } = buildOverviewSections({ byMachine, serverMachines, nonMachines, machineCapacity, orphanMachines });
    const statusCols = buildStatusCols({ extraStatuses, grand, hideEmpty: true }); // always hide empty

    // Overview first so it comes before the data sheets in the tab order.
    const sheet = workbook.addWorksheet(sanitizeSheetName(OVERVIEW_SHEET_NAME));
    const M = renderMachineData(workbook, machineRows, { sourceCols, machineLabel });

    const HEADER_ROW = 2;
    const FIRST_STATUS = 4; // 0-based index after Machine, Capacity, Quantity, Planned
    const REMARKS = FIRST_STATUS + statusCols.length; // left blank for people to write in
    const PCT = REMARKS + 1;
    const COMMIT = PCT + 1;
    const n = COMMIT + 1;
    const statusLetter = (i) => colLetter(FIRST_STATUS + i);
    // Percentage = (DONE + post-TNR) / Planned
    const doneIdxs = statusCols.flatMap((c, i) => (COMPLETED_STATUSES.includes(c.status) ? [i] : []));

    sheet.columns = [
        { width: 24 }, { width: 12 }, { width: 12 }, { width: 10 },
        ...statusCols.map(() => ({ width: 11 })),
        { width: 18 }, { width: 12 }, { width: 12 },
    ];

    // title
    const titleRow = sheet.addRow(["Commit / Capacity — All Machines (By package)"]);
    titleRow.height = 24;
    for (let i = 1; i <= n; i++) titleRow.getCell(i).fill = solid(COLORS.headerFill);
    titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: COLORS.sectionTitleFont } };

    // header (status criteria below read these cells, so keep them as the plain status text)
    const headerRow = sheet.addRow([
        "Machine", "Capacity", "Quantity", "Planned",
        ...statusCols.map((c) => c.status),
        "Remarks", "Percentage", "Commit",
    ]);
    for (let i = 1; i <= n; i++) {
        const cell = headerRow.getCell(i);
        cell.font = { bold: true, color: { argb: COLORS.headerFont } };
        cell.fill = solid(COLORS.headerFill);
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        applyBorder(cell);
    }
    sheet.views = [{ state: "frozen", xSplit: 1, ySplit: 2 }];

    // ---- live formulas -------------------------------------------------------
    // live = { kind: "match", key, group } | { kind: "sum", from, to } | { kind: "all" }
    const liveFormulas = (live) => {
        const statusCrit = (i) => `"="&${statusLetter(i)}$${HEADER_ROW}`;

        if (live.kind === "match") {
            const c = `${M.machine},${critText(machineLabel(live.key))}` +
                (live.group ? `,${M.group},${critText(live.group)}` : "");
            return {
                qty: `SUMIFS(${M.qty},${c})`,
                planned: `COUNTIFS(${c})`,
                status: (i) => `COUNTIFS(${c},${M.status},${statusCrit(i)})`,
                commit: `SUMIFS(${M.doable},${c})`,
            };
        }
        if (live.kind === "sum") {
            const col = (L) => `SUM(${L}${live.from}:${L}${live.to})`;
            return {
                capacity: col("B"),
                qty: col("C"),
                planned: col("D"),
                status: (i) => col(statusLetter(i)),
                commit: col(colLetter(COMMIT)),
            };
        }
        // "all": every lot in the data sheet, even ones on machines that have no row here
        return {
            qty: `SUM(${M.qty})`,
            planned: `SUMPRODUCT(--(LEN(${M.machine})>0))`,
            status: (i) => `COUNTIFS(${M.status},${statusCrit(i)})`,
            commit: `SUM(${M.doable})`,
        };
    };

    const addAggRow = ({ label, capacity, agg, live }, { fill = null, bold = false } = {}) => {
        const done = completedCount(agg.counts);
        const row = sheet.addRow([
            label,
            capacity || "—",
            agg.qty,
            agg.planned,
            ...statusCols.map(({ status }) => agg.counts[status] ?? 0),
            null, // Remarks
            null, // Percentage (formula below)
            agg.commit,
        ]);

        const f = liveFormulas(live);
        const setF = (i, formula, result) => { row.getCell(i + 1).value = { formula, result }; };
        const r = row.number;
        if (f.capacity) setF(1, f.capacity, capacity || 0);
        setF(2, f.qty, agg.qty);
        setF(3, f.planned, agg.planned);
        statusCols.forEach(({ status }, i) => setF(FIRST_STATUS + i, f.status(i), agg.counts[status] ?? 0));
        setF(COMMIT, f.commit, agg.commit);
        const doneRef = doneIdxs.length ? doneIdxs.map((i) => `${statusLetter(i)}${r}`).join("+") : "0";
        setF(PCT, `IF(D${r}=0,"",(${doneRef})/D${r})`, agg.planned > 0 ? done / agg.planned : "");

        for (let i = 0; i < n; i++) {
            const cell = row.getCell(i + 1);
            applyBorder(cell);
            if (fill) cell.fill = solid(fill);
            if (bold) cell.font = { bold: true };

            const isStatus = i >= FIRST_STATUS && i < REMARKS;
            if (isStatus) {
                cell.alignment = { horizontal: "center" };
                if (statusCols[i - FIRST_STATUS].borderLeft) {
                    cell.border = { ...cell.border, left: { style: "medium", color: { argb: "FF7F7F7F" } } };
                }
            } else if (i > 0 && i !== REMARKS) {
                cell.alignment = { horizontal: "right" };
            }
        }
        row.getCell(PCT + 1).numFmt = "0%";
        row.getCell(2).numFmt = '#,##0;-#,##0;"—"';
        for (const i of [2, COMMIT]) row.getCell(i + 1).numFmt = "#,##0";
        return row;
    };

    const capRefs = []; // first row of each machine, so the grand capacity counts it once
    const seenMachines = new Set();

    for (const section of groupedSections) {
        const labelRow = sheet.addRow([section.label]);
        for (let i = 1; i <= n; i++) labelRow.getCell(i).fill = solid(COLORS.groupFill);
        labelRow.getCell(1).font = { bold: true };

        const added = [];
        for (const r of section.rows) {
            const missingCap = machineCapacity !== undefined && r.kind === "machine" && r.capacity == null;
            const row = addAggRow(
                {
                    label:
                        r.kind === "non-machine" ? `${r.label} (non-machine)`
                        : r.kind === "orphan" ? `${machineLabel(r.label)} (not active)`
                        : r.kind === "machine" ? machineLabel(r.label)
                        : r.label,
                    capacity: r.capacity,
                    agg: r.agg,
                    live: { kind: "match", key: r.key, group: section.label },
                },
                { fill: missingCap ? COLORS.lightYellow : null },
            );
            added.push(row);
            if (!seenMachines.has(r.key)) {
                seenMachines.add(r.key);
                capRefs.push(`B${row.number}`);
            }
        }
        addAggRow(
            {
                label: "Total",
                capacity: section.total.capacity,
                agg: section.total,
                live: { kind: "sum", from: added[0].number, to: added[added.length - 1].number },
            },
            { fill: COLORS.groupFill, bold: true },
        );
    }

    const grandRow = addAggRow(
        { label: "Grand total", capacity: grand.capacity, agg: grand, live: { kind: "all" } },
        { fill: COLORS.headerFill, bold: true },
    );
    grandRow.getCell(2).value = { formula: sumRefs(capRefs), result: grand.capacity };

    // grey out zero counts live
    if (statusCols.length) {
        sheet.addConditionalFormatting({
            ref: `${colLetter(FIRST_STATUS)}3:${colLetter(REMARKS - 1)}${grandRow.number}`,
            rules: [{
                type: "cellIs", operator: "equal", formulae: [0], priority: 1,
                style: { font: { color: { argb: COLORS.dimFont } } },
            }],
        });
    }

    sheet.addRow([]);
    const note = sheet.addRow([
        machineCapacity === undefined
            ? "Capacity was not loaded when this file was exported."
            : "A machine running several package groups appears under each one (lot counts are split per group; capacity is the full machine capacity). The grand total counts each machine once.",
    ]);
    note.getCell(1).font = { italic: true, color: { argb: COLORS.dimFont } };

    renderPtpSummaries(workbook, sheet, {
        summaryRows,
        location,
        startCol: n + 1,
        sourceCols,
    });

    sheet.getColumn(n + 1).width = 3; // spacer column (1-based = n + 1)
}

// ---- main -------------------------------------------------------------------

/**
 * @param {Object} p
 * @param {Array<Object>} p.dataRows            flat, unfiltered rows (NOT displayRows)
 * @param {Array<any>} p.machines               display order, may include null / "MANUAL" / non-machine keys
 * @param {string[]} p.groupNames               the package tab names (packageGroupNames prop)
 * @param {Array<{id:number,label:string,machine:string|null}>} [p.buckets]
 * @param {string} [p.selectedLocation]         rows from other locations are left out, like the table
 * @param {string} [p.date]                     plan date (Y-m-d), decides the time format
 * @param {Array<{key:string,name:string,width?:number}>} p.columns   DATA_COLUMNS
 * @param {(a:Object,b:Object)=>number} [p.sortUnassigned]            compareUnassigned from Deemo
 */
export async function exportLoadingPlanToExcel({
    dataRows,
    machines,
    groupNames,
    buckets = [],
    selectedLocation = null,
    date = null,
    columns,
    isBlockRow: isBlock = defaultIsBlockRow,
    getMachineLabel = (m) => (m === null || m === undefined ? "Unassigned" : String(m)),
    sortUnassigned = null,
    capacityOverview = null, // { serverMachines, nonMachines, machineCapacity }
    excludeKeys = ["machine", "id", "entry_id", "sequence_order", "doable_status", "plan_date", "scheduled_date", "machine_status"],
}) {
    if (!Array.isArray(dataRows)) throw new Error("exportLoadingPlanToExcel: `dataRows` must be an array");
    if (!Array.isArray(machines)) throw new Error("exportLoadingPlanToExcel: `machines` must be an array");
    if (!Array.isArray(groupNames)) throw new Error("exportLoadingPlanToExcel: `groupNames` must be an array");
    if (!Array.isArray(columns) || columns.length === 0) {
        throw new Error("exportLoadingPlanToExcel: `columns` (DATA_COLUMNS) is required");
    }

    const isF3 = selectedLocation === F3_FLAG;
    const byKey = new Map(columns.map((c) => [c.key, c]));

    const exportColumns = isF3
        ? F3_COLUMN_ORDER.map((k) => SYNTHETIC_COLUMNS[k] ?? byKey.get(k)).filter(Boolean)
        : [
            SYNTHETIC_COLUMNS[DATE_COLUMN_KEY],
            SYNTHETIC_COLUMNS[ITEM_COLUMN_KEY],
            SYNTHETIC_COLUMNS[MACHINE_COLUMN_KEY],
            // the Package column only exists in F3
            ...columns.filter((c) => !excludeKeys.includes(c.key) && c.key !== "package_type"),
        ];

    const machineLabel = isF3 ? (m) => formatF3Machine(m) ?? getMachineLabel(m) : getMachineLabel;

    const ctIdx = exportColumns.findIndex((c) => c.key === "ct");
    const ctx = {
        exportColumns,
        isBlock,
        getMachineLabel: machineLabel,
        date,
        headerLabels: isF3 ? { ...HEADER_LABEL_OVERRIDES, ...F3_HEADER_LABELS } : HEADER_LABEL_OVERRIDES,
        emptyKeys: isF3 ? F3_EMPTY_KEYS : new Set(),
        partNameIdx: exportColumns.findIndex((c) => c.key === "part_name"),
        timeStartIdx: exportColumns.findIndex((c) => c.key === "time_start"),
        isF3,
        dateCol: colLetter(exportColumns.findIndex((c) => c.key === DATE_COLUMN_KEY)),
        beCol: colLetter(exportColumns.findIndex((c) => c.key === "be_starttime")),
        ctCol: ctIdx === -1 ? null : colLetter(ctIdx),
        qtyCol: colLetter(exportColumns.findIndex((c) => c.key === "qty")) || null,
        doableCol: colLetter(exportColumns.findIndex((c) => c.key === "doable")) || null,
        cellRefs: new Map(), // row object -> { sheet, rowNumber } of its own (non-dimmed) copy
    };

    const isRes = (r) => r.station === RES_STATION;
    const groupOf = (r) => r.package_group ?? r.package_name;
    const groupSet = new Set(groupNames);
    const bucketIds = new Set(buckets.map((b) => b.id));
    const isParked = (r) => r.bucket_id != null && bucketIds.has(r.bucket_id);
    const isOtherLoc = (r) => {
        if (isBlock(r) || selectedLocation == null) return false;
        if (r.source != null && (r.source === "f3") !== isF3) return true;
        return r.location != null && r.location !== selectedLocation;
    };
    const bucketsFor = (m) => buckets.filter((b) => (b.machine ?? null) === m);
    const byPosition = (a, b) => (a.bucket_position ?? 0) - (b.bucket_position ?? 0);

    // Unassigned lots from another location aren't visible under this location, so they stay out.
    // Everything else is exported: other packages, other locations, RES, all of it.
    const rows = dataRows.filter((r) => !(r.machine === null && isOtherLoc(r)));

    const known = new Set(machines);
    const orphanMachines = [...new Set(rows.map((r) => r.machine).filter((m) => m != null && !known.has(m)))];

    // Planned machines first, the Unassigned section (machine === null) last.
    // Only moved if the caller included it, so tabs that never had it don't gain one.
    const allMachines = [
        ...machines.filter((m) => m !== null),
        ...orphanMachines,
        ...(machines.includes(null) ? [null] : []),
    ];

    const sheetDefs = [
        { name: "Unassigned", machines: [null], include: (r) => r.machine === null && !isRes(r), optional: true },
        { name: "RES", machines: allMachines, include: (r) => isBlock(r) || isRes(r), optional: true },
        ...groupNames.map((g) => ({
            name: g,
            machines: allMachines,
            include: (r) => isBlock(r) || (!isRes(r) && groupOf(r) === g),
        })),
        {
            name: "Other",
            machines: allMachines,
            include: (r) => isBlock(r) || (!isRes(r) && !groupSet.has(groupOf(r))),
            optional: true,
        },
    ];

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "PPC";
    workbook.created = new Date();
    // Recompute every formula on open, so cached results can never show stale numbers.
    workbook.calcProperties = { fullCalcOnLoad: true };

    for (const def of sheetDefs) {
        const sheet = workbook.addWorksheet(sanitizeSheetName(def.name));
        sheet.columns = exportColumns.map((col) => ({
            key: col.key,
            width: Math.max(widthFromPx(col.width, col.name), MIN_COL_WIDTH[col.key] ?? 0),
        }));

        if (isF3) {
            exportColumns.forEach((col, i) => {
                if (F3_HIDDEN_KEYS.has(col.key)) sheet.getColumn(i + 1).hidden = true;
            });
        }

        // "own" = what the table shows on this tab by default. Decides which machines get a section
        // and which rows are dimmed; it never hides a row.
        const own = (r) => def.include(r) && !isOtherLoc(r);
        const sheetCtx = { ...ctx, isOwn: own }; // shares ctx.cellRefs
        let rendered = false;

        for (const m of def.machines) {
            const onMachine = rows.filter((r) => r.machine === m && !isParked(r));

            let mine;
            let groups = [];

            if (m === null) {
                // Unassigned keeps the tab's own filter, like the table
                mine = onMachine.filter(own);
                if (sortUnassigned) mine = [...mine].sort(sortUnassigned);
            } else {
                mine = onMachine; // every row on the machine, in timeline order
                groups = bucketsFor(m)
                    .map((b) => ({
                        label: b.label,
                        rows: rows.filter((r) => r.bucket_id === b.id && !isBlock(r)).sort(byPosition),
                    }))
                    .filter((g) => g.rows.length > 0);
            }

            const hasOwnLots = onMachine.some((r) => !isBlock(r) && own(r));
            const hasOwnParked = groups.some((g) => g.rows.some(own));
            if (!hasOwnLots && !hasOwnParked) continue; // same rule as the table: nothing for this tab, no section

            renderSection({ sheet, title: machineLabel(m), rows: mine, groups, totals: m !== null, ctx: sheetCtx });
            rendered = true;
        }

        // top-level groups (no machine) go at the end, like the table
        for (const b of bucketsFor(null)) {
            const groupRows = rows
                .filter((r) => r.bucket_id === b.id && !isBlock(r) && own(r))
                .sort(byPosition);
            if (groupRows.length === 0) continue;
            renderSection({ sheet, title: `Group: ${b.label}`, rows: groupRows, ctx: sheetCtx });
            rendered = true;
        }

        if (isF3 && rendered && ctx.ctCol) {
            const c = ctx.ctCol;
            sheet.addConditionalFormatting({
                ref: `${c}1:${c}${sheet.rowCount}`,
                rules: [
                    { type: "expression", priority: 1, formulae: [`AND(ISNUMBER(${c}1),${c}1>=2)`],          style: cfFill(COLORS.ctHigh) },
                    { type: "expression", priority: 2, formulae: [`AND(ISNUMBER(${c}1),${c}1>1.3,${c}1<2)`], style: cfFill(COLORS.ctMid) },
                ],
            });
        }

        if (!rendered) {
            if (def.optional) workbook.removeWorksheet(sheet.id);
            else sheet.addRow(["No data for this package group."]);
        }
    }

    if (capacityOverview) {
        const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
        const bucketMachine = new Map(buckets.map((b) => [b.id, b.machine ?? null]));
        const isPlanned = (r) =>
            r.machine != null || (isParked(r) && bucketMachine.get(r.bucket_id) != null);

        // Column letters on the main sheets, so the PTP data sheets can link to a lot's cells.
        const colOf = (key) => {
            const i = exportColumns.findIndex((c) => c.key === key);
            return i === -1 ? null : colLetter(i);
        };
        const sourceCols = {
            machine: colOf(MACHINE_COLUMN_KEY),
            pkg: colOf(isF3 ? "package_type" : "package_name"),
            pkgName: colOf("package_name"),
            pkgGroup: colOf("package_group"), // null if that column isn't exported
            status: colOf("status"),
            qty: colOf("qty"),
            doable: colOf("doable"),
            lotId: colOf("lot_id"),
        };

        const summaryRows = rows
            .filter((r) => !isBlock(r) && !isOtherLoc(r) && isPlanned(r))
            .map((r) => ({
                pkg: String((isF3 ? r.package_type : r.package_name) ?? "").trim() || "(blank)",
                status: String(r.status ?? "").trim().toUpperCase() || "(blank)",
                qty: toNum(r.qty),
                doable: toNum(r.doable),
                lotId: r.lot_id ?? "",
                ref: ctx.cellRefs.get(r) ?? null,
            }));

        // Every lot that has a machine, same filter as aggregateByMachine.
        const machineRows = dataRows
            .filter((r) => r.machine != null && !isBlock(r) && !r.is_block)
            .map((r) => ({
                machine: r.machine,
                group: resolveSummaryGroup(r.package_group, r.package_name),
                pkgGroup: r.package_group ?? "",
                pkgName: r.package_name ?? "",
                status: String(r.status ?? "").trim().toUpperCase() || "NONE",
                qty: toNum(r.qty),
                doable: toNum(r.doable),
                ref: ctx.cellRefs.get(r) ?? null,
            }));

        renderCapacityOverviewSheet(workbook, {
            ...capacityOverview,
            dataRows,
            summaryRows,
            machineRows,
            sourceCols,
            location: selectedLocation,
            machineLabel,
        });
    }

    return workbook.xlsx.writeBuffer();
}

export function downloadExcelBuffer(buffer, fileName = "loading_plan.xlsx") {
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}