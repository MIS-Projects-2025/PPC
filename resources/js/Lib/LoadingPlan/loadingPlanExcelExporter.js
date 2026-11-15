/**
 * Loading Plan Excel exporter (ExcelJS)
 * Sheets: Unassigned, RES, one per package group, Other.
 * Each sheet is split into per-machine sections; grouped ("parked") lots are
 * written under their group label. Rules mirror Deemo's displayRows/makeColumns.
 */
import {
    aggregateByMachine,
    buildOverviewSections,
    buildStatusCols,
} from "@/Components/LoadingPlan/CapacityOverviewModal.jsx";
import { STATUS_TONE } from "@/Components/LoadingPlan/StatusBadge.jsx";
import { PARTNAME_TO_BAKE_KEYS, PARTNAME_TO_QTY_KEYS } from "@/Components/LoadingPlan/columns";
import ExcelJS from "exceljs";
import { isBlockRow as defaultIsBlockRow, isForBake } from "./helpers";
import { F3_FLAG } from "@/Constants/LoadingPlan/tabs";

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

/** "56G6L" -> "G6L056", "10VITROX" -> "VTRX010", "01HSI250" -> "HSI250001". No leading number: null. */
export function formatF3Machine(name) {
    const m = /^(\d+)(.+)$/.exec(String(name ?? "").trim());
    if (!m) return null;
    return `${m[2].replace(/VITROX/i, "VTRX")}${m[1].padStart(3, "0")}`;
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
            return row.doable > 0 ? Number(row.doable) : "—";
        }
        if (col.key === "time_start" || col.key === "time_end") return toExcelTime(row, col.key);
        return null;
    }

    if (ctx.isF3 && col.key === "be_starttime") return toExcelDate(row.be_starttime);
    if (col.key === MACHINE_COLUMN_KEY) return ctx.getMachineLabel(row.machine);
    if (col.key === "accu_time") return hoursOf(row.accu_time);
    if (col.key === "time_start" || col.key === "time_end") return toExcelTime(row, col.key);
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
    rows.forEach((row, idx) => {
        const values = ctx.exportColumns.map((col) =>
            col.key === ITEM_COLUMN_KEY ? idx + 1 : resolveCellValue(col, row, ctx),
        );
        const dataRow = sheet.addRow(values);

        const dim = !!ctx.isOwn && !ctx.isBlock(row) && !ctx.isOwn(row);

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
}

function renderSection({ sheet, title, rows, groups = [], ctx }) {
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

    writeRows(sheet, rows, ctx);

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

    sheet.addRow([]);
}

const OVERVIEW_SHEET_NAME = "PTP 95%";

const PTP_DATA_SHEET = "PTP Data";
const SUMMARY_START_COL = 11; // 0-based, = column L

// Counted towards "TNR % Completion". Aliases are harmless: each lot has one status.
const TNR_DONE_STATUSES = ["DONE", "FVI", "VISUAL (FVI)", "OQA", "BOXING", "BUY OFF", "BUY-OFF"];
// Lots still before TNR. Every other status counts towards "TNR % Completion".
const PRE_TNR_STATUSES = ["RUNNING", "FOR PROCESS", "HOLD", "(blank)"];
// Display order for the status table. Anything else follows alphabetically.
const STATUS_ORDER = ["DONE", "FVI", "VISUAL (FVI)", "OQA", "BOXING", "BUY OFF", "BUY-OFF", ...PRE_TNR_STATUSES];

function styleHeaderCell(cell) {
    cell.font = { bold: true, color: { argb: COLORS.headerFont } };
    cell.fill = solid(COLORS.headerFill);
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    applyBorder(cell);
}

/**
 * Package totals at `startCol` (0-based) and the status table 5 columns to its right.
 * Everything is a formula over a hidden flat data sheet.
 */
function renderPtpSummaries(workbook, sheet, { summaryRows, location, startCol }) {
    // ---- hidden source data ----
    const data = workbook.addWorksheet(PTP_DATA_SHEET);
    data.state = "hidden";
    data.addRow(["Package", "Status", "Qty", "Doable", "Lot_Id"]);
    summaryRows.forEach((r) => data.addRow([r.pkg, r.status, r.qty, r.doable, r.lotId]));

    const last = Math.max(summaryRows.length + 1, 2);
    const rng = (c) => `'${PTP_DATA_SHEET}'!$${c}$2:$${c}$${last}`;
    const [PKG, STATUS, QTY, DOABLE, LOT] = ["A", "B", "C", "D", "E"].map(rng);

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

    const HEADER_ROW = 2; // same row as the main table's header
    const FIRST = HEADER_ROW + 1;
    const NUM = "#,##0";

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
        put(r, pc + 3, {
            formula: `COUNTIFS(${PKG},${ref},${LOT},"<>")`,
            result: mine.filter((x) => x.lotId !== "").length,
        }, { numFmt: NUM });
    });

    const pkgTotalRow = FIRST + packages.length;
    const totalOpts = { bold: true, fill: COLORS.groupFill, numFmt: NUM };
    put(pkgTotalRow, pc, "Grand Total", { bold: true, fill: COLORS.groupFill });
    [
        ["qty", sum(summaryRows, "qty")],
        ["doable", sum(summaryRows, "doable")],
        ["lots", summaryRows.filter((x) => x.lotId !== "").length],
    ].forEach(([, result], i) => {
        const col = L(i + 1);
        put(
            pkgTotalRow,
            pc + 1 + i,
            packages.length ? { formula: `SUM(${col}${FIRST}:${col}${pkgTotalRow - 1})`, result } : 0,
            totalOpts,
        );
    });

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
    const TOTAL_ROW = STATUS_LAST + 1;
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

    put(TOTAL_ROW, sc, "TOTAL", { bold: true, fill: COLORS.groupFill });
    put(
        TOTAL_ROW,
        sc + 1,
        statuses.length ? { formula: `SUM(${S1}${STATUS_FIRST}:${S1}${STATUS_LAST})`, result: total } : 0,
        { bold: true, fill: COLORS.groupFill, numFmt: NUM },
    );
    put(
        TOTAL_ROW,
        sc + 2,
        statuses.length ? { formula: `SUM(${L(7)}${STATUS_FIRST}:${L(7)}${STATUS_LAST})`, result: total ? 1 : 0 } : 0,
        { bold: true, fill: COLORS.groupFill, numFmt: "0%" },
    );

    // widths: package table, gap, status table
    [[0, 22], [1, 14], [2, 14], [3, 14], [4, 3], [5, 22], [6, 16], [7, 12]].forEach(([off, w]) => {
        sheet.getColumn(startCol + 1 + off).width = w;
    });
}

function renderCapacityOverviewSheet(
    workbook,
    { serverMachines, nonMachines, machineCapacity, dataRows, summaryRows, location },
) {
    const { byMachine, extraStatuses } = aggregateByMachine({ dataRows, serverMachines, nonMachines });
    const { groupedSections, grand } = buildOverviewSections({ byMachine, serverMachines, nonMachines, machineCapacity });
    const statusCols = buildStatusCols({ extraStatuses, grand, hideEmpty: true }); // always hide empty

    const sheet = workbook.addWorksheet(sanitizeSheetName(OVERVIEW_SHEET_NAME));

    const FIRST_STATUS = 4; // 0-based index after Machine, Capacity, Quantity, Planned
    const PCT = FIRST_STATUS + statusCols.length;
    const COMMIT = PCT + 1;
    const n = COMMIT + 1;

    sheet.columns = [
        { width: 24 }, { width: 12 }, { width: 12 }, { width: 10 },
        ...statusCols.map(() => ({ width: 11 })),
        { width: 12 }, { width: 12 },
    ];

    // title
    const titleRow = sheet.addRow(["Commit / Capacity — All Machines (By package)"]);
    titleRow.height = 24;
    for (let i = 1; i <= n; i++) titleRow.getCell(i).fill = solid(COLORS.headerFill);
    titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: COLORS.sectionTitleFont } };

    // header
    const headerRow = sheet.addRow([
        "Machine", "Capacity", "Quantity", "Planned",
        ...statusCols.map((c) => c.status),
        "Percentage", "Commit",
    ]);
    for (let i = 1; i <= n; i++) {
        const cell = headerRow.getCell(i);
        cell.font = { bold: true, color: { argb: COLORS.headerFont } };
        cell.fill = solid(COLORS.headerFill);
        cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
        applyBorder(cell);
    }
    sheet.views = [{ state: "frozen", xSplit: 1, ySplit: 2 }];

    const addAggRow = ({ label, capacity, agg }, { fill = null, bold = false } = {}) => {
        const done = agg.counts.DONE ?? 0;
        const row = sheet.addRow([
            label,
            capacity || "—",
            agg.qty,
            agg.planned,
            ...statusCols.map(({ status }) => agg.counts[status] ?? 0),
            agg.planned > 0 ? done / agg.planned : null,
            agg.commit,
        ]);

        for (let i = 0; i < n; i++) {
            const cell = row.getCell(i + 1);
            applyBorder(cell);
            if (fill) cell.fill = solid(fill);
            if (bold) cell.font = { bold: true };

            const isStatus = i >= FIRST_STATUS && i < PCT;
            if (isStatus) {
                cell.alignment = { horizontal: "center" };
                if (cell.value === 0) cell.font = { ...(cell.font || {}), color: { argb: COLORS.dimFont } };
                if (statusCols[i - FIRST_STATUS].borderLeft) {
                    cell.border = { ...cell.border, left: { style: "medium", color: { argb: "FF7F7F7F" } } };
                }
            } else if (i > 0) {
                cell.alignment = { horizontal: "right" };
            }
        }
        row.getCell(PCT + 1).numFmt = "0%";
        for (const i of [1, 2, COMMIT]) row.getCell(i + 1).numFmt = "#,##0";
        return row;
    };

    for (const section of groupedSections) {
        const labelRow = sheet.addRow([section.label]);
        for (let i = 1; i <= n; i++) labelRow.getCell(i).fill = solid(COLORS.groupFill);
        labelRow.getCell(1).font = { bold: true };

        for (const r of section.rows) {
            const missingCap = machineCapacity !== undefined && r.kind === "machine" && r.capacity == null;
            addAggRow(
                { label: r.kind === "non-machine" ? `${r.label} (non-machine)` : r.label, capacity: r.capacity, agg: r.agg },
                { fill: missingCap ? COLORS.lightYellow : null },
            );
        }
        addAggRow(
            { label: "Total", capacity: section.total.capacity, agg: section.total },
            { fill: COLORS.groupFill, bold: true },
        );
    }

    addAggRow({ label: "Grand total", capacity: grand.capacity, agg: grand }, { fill: COLORS.headerFill, bold: true });

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
        startCol: Math.max(SUMMARY_START_COL, n), // L, unless the main table is already wider
    });
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
    excludeKeys = ["machine", "id", "entry_id", "sequence_order", "doable_status", "plan_date"],
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
    };

    const isRes = (r) => r.station === RES_STATION;
    const groupOf = (r) => r.package_group ?? r.package_name;
    const groupSet = new Set(groupNames);
    const bucketIds = new Set(buckets.map((b) => b.id));
    const isParked = (r) => r.bucket_id != null && bucketIds.has(r.bucket_id);
    const isOtherLoc = (r) => !isBlock(r) && selectedLocation != null && r.location != null && r.location !== selectedLocation;
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

    for (const def of sheetDefs) {
        const sheet = workbook.addWorksheet(sanitizeSheetName(def.name));
        sheet.columns = exportColumns.map((col) => ({ key: col.key, width: widthFromPx(col.width, col.name) }));

        if (isF3) {
            exportColumns.forEach((col, i) => {
                if (F3_HIDDEN_KEYS.has(col.key)) sheet.getColumn(i + 1).hidden = true;
            });
        }

        // "own" = what the table shows on this tab by default. Decides which machines get a section
        // and which rows are dimmed; it never hides a row.
        const own = (r) => def.include(r) && !isOtherLoc(r);
        const sheetCtx = { ...ctx, isOwn: own };
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

            renderSection({ sheet, title: machineLabel(m), rows: mine, groups, ctx: sheetCtx });
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

        const summaryRows = rows
            .filter((r) => !isBlock(r) && !isOtherLoc(r) && isPlanned(r))
            .map((r) => ({
                pkg: String((isF3 ? r.package_type : r.package_name) ?? "").trim() || "(blank)",
                status: String(r.status ?? "").trim().toUpperCase() || "(blank)",
                qty: toNum(r.qty),
                doable: toNum(r.doable),
                lotId: r.lot_id ?? "",
            }));

        renderCapacityOverviewSheet(workbook, {
            ...capacityOverview,
            dataRows,
            summaryRows,
            location: selectedLocation,
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