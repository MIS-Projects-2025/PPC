/**
 * Loading Plan Excel exporter (ExcelJS)
 * Sheets: Unassigned, RES, one per package group, Other.
 * Each sheet is split into per-machine sections; grouped ("parked") lots are
 * written under their group label. Rules mirror Deemo's displayRows/makeColumns.
 */
import { PARTNAME_TO_BAKE_KEYS, PARTNAME_TO_QTY_KEYS } from "@/Components/LoadingPlan/columns";
import ExcelJS from "exceljs";
import { isBlockRow as defaultIsBlockRow, isForBake } from "./helpers";

const DATE_COLUMN_KEY = "__export_date_loaded";
const ITEM_COLUMN_KEY = "__export_item";
const MACHINE_COLUMN_KEY = "__export_machine";
const RES_STATION = "GTTRES_T";

const HEADER_LABEL_OVERRIDES = {
    accu_time: "Accu. Time (hrs)",
    time_start: "Time_start",
    time_end: "Time_end",
};

const COLORS = {
    sectionTitleFont: "FF1F4E78",
    headerFill: "C6E0B4",
    groupFill: "FFDDEBF7",
    blockFill: "FFFDE9D9",
    headerFont: "FF1F1F1F",
    lightYellow: "FFFFFBE0", // cycle_time_exceed_residual
    yellow: "FFFFF2CC",      // cycle_time_exceed
    amber: "FFFFD966",       // is_manual_expedite
    scmFill: "FFFFC7CE",     // is_scm
    redFont: "FFCC0000",     // is_for_bake
    cr3ResFill: "FFFF0000",  // cr3 === "RES"
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

function resolveCellValue(col, row, ctx) {
    if (col.key === DATE_COLUMN_KEY) return toExcelDate(row.date_loaded);

    if (ctx.isBlock(row)) {
        const label = row.block_label ?? "";
        if (col.key === "part_name" || col.key === "package_name" || col.key === "status") return `▨ ${label}`;
        if (col.key === "lot_id") return `${label} ▨`;
        if (col.key === "accu_time") return hoursOf(row.accu_time);
		if (col.key === "doable") {
			if (row.doable_status === "no_recipe" && !row.doable_overridden) return "No Recipe";
			return row.doable > 0 ? Number(row.doable) : "—";
		}
        if (col.key === "time_start" || col.key === "time_end") return toExcelDate(row[`${col.key}_at`]);
        return null;
    }

    if (col.key === MACHINE_COLUMN_KEY) return ctx.getMachineLabel(row.machine);
    if (col.key === "accu_time") return hoursOf(row.accu_time);
    if (col.key === "time_start" || col.key === "time_end") return toExcelDate(row[`${col.key}_at`]);
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

    if (PARTNAME_TO_BAKE_KEYS.has(col.key) && isForBake(row)) {
        cell.font = { ...(cell.font || {}), color: { argb: COLORS.redFont } };
    }

    if (col.key === "cr3" && row.cr3 === "RES") cell.fill = solid(COLORS.cr3ResFill);
}

function writeRows(sheet, rows, ctx) {
    rows.forEach((row, idx) => {
        const values = ctx.exportColumns.map((col) =>
            col.key === ITEM_COLUMN_KEY ? idx + 1 : resolveCellValue(col, row, ctx),
        );
        const dataRow = sheet.addRow(values);

        ctx.exportColumns.forEach((col, i) => {
            const cell = dataRow.getCell(i + 1);
            styleDataCell(cell, col, row, ctx);

            if (col.key === DATE_COLUMN_KEY) cell.numFmt = "mmmm d, yyyy";
            if (col.key === "accu_time") cell.numFmt = "0.00";
            if (col.key === "time_start" || col.key === "time_end") {
				cell.numFmt = timeNumFmt(row, col.key);
			}
            if (ctx.isBlock(row) && ["part_name", "package_name", "status", "lot_id"].includes(col.key)) {
                cell.font = { ...(cell.font || {}), bold: true };
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

    const headerRow = sheet.addRow(exportColumns.map((c) => HEADER_LABEL_OVERRIDES[c.key] ?? c.name));
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
    excludeKeys = ["machine", "id", "entry_id", "sequence_order", "doable_status"],
}) {
    if (!Array.isArray(dataRows)) throw new Error("exportLoadingPlanToExcel: `dataRows` must be an array");
    if (!Array.isArray(machines)) throw new Error("exportLoadingPlanToExcel: `machines` must be an array");
    if (!Array.isArray(groupNames)) throw new Error("exportLoadingPlanToExcel: `groupNames` must be an array");
    if (!Array.isArray(columns) || columns.length === 0) {
        throw new Error("exportLoadingPlanToExcel: `columns` (DATA_COLUMNS) is required");
    }

    const baseColumns = columns.filter((c) => !excludeKeys.includes(c.key));
    const exportColumns = [
        { key: DATE_COLUMN_KEY, name: "Date" },
        { key: ITEM_COLUMN_KEY, name: "Item" },
        { key: MACHINE_COLUMN_KEY, name: "Machine" },
        ...baseColumns,
    ];

    const ctx = {
        exportColumns,
        isBlock,
        getMachineLabel,
        date,
        partNameIdx: exportColumns.findIndex((c) => c.key === "part_name"),
        timeStartIdx: exportColumns.findIndex((c) => c.key === "time_start"),
    };

    const isRes = (r) => r.station === RES_STATION;
    const groupOf = (r) => r.package_group ?? r.package_name;
    const groupSet = new Set(groupNames);
    const bucketIds = new Set(buckets.map((b) => b.id));
    const isParked = (r) => r.bucket_id != null && bucketIds.has(r.bucket_id);
    const isOtherLoc = (r) => !isBlock(r) && selectedLocation != null && r.location != null && r.location !== selectedLocation;
    const bucketsFor = (m) => buckets.filter((b) => (b.machine ?? null) === m);
    const byPosition = (a, b) => (a.bucket_position ?? 0) - (b.bucket_position ?? 0);

    const rows = dataRows.filter((r) => !isOtherLoc(r));

    const known = new Set(machines);
    const orphanMachines = [...new Set(rows.map((r) => r.machine).filter((m) => m != null && !known.has(m)))];
    const allMachines = [...machines, ...orphanMachines];

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

        const sheetRows = rows.filter(def.include);
        let rendered = false;

        for (const m of def.machines) {
            let mine = sheetRows.filter((r) => r.machine === m && !isParked(r));
            if (m === null && sortUnassigned) mine = [...mine].sort(sortUnassigned);

            const groups = m === null ? [] : bucketsFor(m)
                .map((b) => ({
                    label: b.label,
                    rows: sheetRows.filter((r) => r.bucket_id === b.id && !isBlock(r)).sort(byPosition),
                }))
                .filter((g) => g.rows.length > 0);

            const hasLots = mine.some((r) => !isBlock(r));
            if (!hasLots && groups.length === 0) continue; // the table hides machines with nothing on this tab

            renderSection({ sheet, title: getMachineLabel(m), rows: mine, groups, ctx });
            rendered = true;
        }

        // top-level groups (no machine) go at the end, like the table
        for (const b of bucketsFor(null)) {
            const groupRows = sheetRows.filter((r) => r.bucket_id === b.id && !isBlock(r)).sort(byPosition);
            if (groupRows.length === 0) continue;
            renderSection({ sheet, title: `Group: ${b.label}`, rows: groupRows, ctx });
            rendered = true;
        }

        if (!rendered) {
            if (def.optional) workbook.removeWorksheet(sheet.id);
            else sheet.addRow(["No data for this package group."]);
        }
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