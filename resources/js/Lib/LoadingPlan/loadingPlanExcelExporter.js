/**
 * Loading Plan Excel exporter (ExcelJS)
 * ---------------------------------------------------------------------------
 * One workbook, one sheet PER package group (from `packageGroups`, e.g. the
 * backend's GROUPS constant), plus a trailing "Unassigned" sheet for rows
 * whose package_name doesn't match any group. Inside each sheet, rows are
 * split into per-machine sections (title row + own header row + data rows +
 * blank separator), mirroring the reference workbook's layout.
 *
 * Cell styling mirrors makeColumns()'s cellClass rules:
 *  	- part_name -> qty: amber if (cycle_time_exceed_residual || is_manual_expedite),
 *  	  	else yellow if cycle_time_exceed.
 *  	- part_name -> bake_time_temp: red font when row.is_for_bake.
 *  	- cr3 cell: red fill when row.cr3 === "RES".
 *  	- block rows: part_name shows "▨ {block_label}", lot_id shows
 *  	  	"{block_label} ▨", accu_time/time_start/time_end keep their real
 *  	  	values, every other cell is blank — same as the grid's renderCell.
 *
 * Assumptions / things to double check against your app:
 *  	- `isBlockRow` is passed in from the caller (same predicate the grid
 *  	  	uses) — a default guess is provided but you likely already have the
 *  	  	real one in your Deemo component.
 *  	- Block rows are treated as "always visible" context and are included
 *  	  	in every package-group sheet's machine sections (mirrors the grid,
 *  	  	where isBlockRow bypasses the active package filter). They're
 *  	  	excluded from the Unassigned sheet since they already appear
 *  	  	everywhere else.
 *  	- When both the yellow and amber conditions are true on the same row,
 *  	  	amber wins (matches the amber class being pushed after yellow in
 *  	  	makeColumns — adjust `styleDataCell` if your CSS cascade resolves
 *  	  	it the other way).
 *  	- `row.machine` is the field used to match rows to `machines` entries,
 *  	  	same as displayRows' `r.machine !== m` check.
 *  	- `row.date_loaded` fills the new leading "Date" column; only its date
 *  	  	portion is shown (numFmt hides the time, the underlying value can
 *  	  	still carry a time component).
 */
import ExcelJS from "exceljs";
import { isBlockRow, isForBake } from "./helpers";

// ---- Config ---------------------------------------------------------------

const DATE_COLUMN_KEY = "__export_date_loaded";
const ITEM_COLUMN_KEY = "__export_item";
const MACHINE_COLUMN_KEY = "__export_machine";

/** Export-only header label overrides (source DATA_COLUMNS names differ). */
const HEADER_LABEL_OVERRIDES = {
  	accu_time: "Accu. Time",
  	time_start: "Time_start",
  	time_end: "Time_end",
};

const TIME_ONLY_COLUMNS = new Set(["time_start", "time_end"]);

const COLORS = {
  	sectionTitleFont: "FF1F4E78", // dark blue
  	headerFill: "C6E0B4", // pale green
  	headerFont: "FF1F1F1F",
  	yellowHighlight: "FFFFF2CC", // Rule 8: cycle_time_exceed
  	amberHighlight: "FFFFD966", // Rule 12: cycle_time_exceed_residual / is_manual_expedite
  	redFont: "FFCC0000", // Rule 11: is_for_bake
  	cr3ResFill: "FFFF0000", // cr3 === "RES"
  	border: { style: "thin", color: { argb: "FFB7B7B7" } },
};

// ---- Helpers ----------------------------------------------------------------

/** Rough px -> Excel character-width conversion (Excel's default font). */
function widthFromPx(px, fallbackHeader) {
  	if (px) return Math.round(((px - 5) / 7) * 100) / 100;
  	const headerLen = (fallbackHeader || "").length;
  	return Math.max(10, Math.min(headerLen + 4, 24));
}

function applyBorder(cell) {
  	cell.border = {
  	  	top: COLORS.border,
  	  	left: COLORS.border,
  	  	bottom: COLORS.border,
  	  	right: COLORS.border,
  	};
}

/** Excel sheet names: <=31 chars, no \ / ? * [ ] : */
function sanitizeSheetName(name) {
  	const cleaned = String(name ?? "Sheet").replace(/[\\/*?:[\]]/g, " ").trim();
  	return cleaned.slice(0, 31) || "Sheet";
}

/** Inclusive set of column keys between fromKey and toKey, in `columns` order. */
function keyRange(columns, fromKey, toKey) {
  	const startIdx = columns.findIndex((c) => c.key === fromKey);
  	const endIdx = columns.findIndex((c) => c.key === toKey);
  	if (startIdx === -1 || endIdx === -1) return new Set();
  	return new Set(columns.slice(startIdx, endIdx + 1).map((c) => c.key));
}

/** Mirrors the renderCell branch for block rows in makeColumns(). */
function resolveCellValue(col, row, isBlockRow) {
  	if (col.key === DATE_COLUMN_KEY) {
  	  	return row.date_loaded ? new Date(row.date_loaded) : null;
  	}
  	if (isBlockRow(row)) {
  	  	if (col.key === "part_name") return `▨ ${row.block_label ?? ""}`;
  	  	if (col.key === "lot_id") return `${row.block_label ?? ""} ▨`;
  	  	if (["accu_time", "time_start", "time_end"].includes(col.key)) {
  	  	  	return row[col.key] ?? null;
  	  	}
  	  	return null; // blank every other cell for a block row
  	}
  	return row[col.key] ?? null;
}

/** Mirrors getDynamicCellClass()'s highlight rules in makeColumns(). */
function styleDataCell(cell, col, row, ranges) {
  	applyBorder(cell);

  	if (ranges.partNameToQty.has(col.key)) {
  	  	if (row.cycle_time_exceed_residual || row.is_manual_expedite) {
  	  	  	cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.amberHighlight } };
  	  	} else if (row.cycle_time_exceed) {
  	  	  	cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.yellowHighlight } };
  	  	}
  	}

  	if (ranges.partNameToBake.has(col.key) && isForBake(row)) {
  	  	cell.font = { ...(cell.font || {}), color: { argb: COLORS.redFont } };
  	}

  	if (col.key === "cr3" && row.cr3 === "RES") {
  	  	cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.cr3ResFill } };
  	}
}

/** One machine's title row + header row + data rows + trailing blank row. */
function renderMachineSection({
  	sheet,
  	machineLabel,
  	rowsForMachine,
  	exportColumns,
  	ranges,
  	isBlockRow,
  	partNameIdx,
  	timeStartIdx,
}) {
  	const columnCount = exportColumns.length;

  	// Section title: machine name above the part_name column, "PPC" above time_start.
  	const titleRow = sheet.addRow([]);
  	titleRow.height = 24;

	for (let i = 1; i <= columnCount; i++) {
		titleRow.getCell(i).fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.headerFill } };
	}

  	if (partNameIdx !== -1) {
  	  	const machineCell = titleRow.getCell(partNameIdx + 1);
  	  	machineCell.value = machineLabel;
  	  	machineCell.font = { bold: true, size: 18, color: { argb: COLORS.sectionTitleFont } };
  	}
  	if (timeStartIdx !== -1) {
  	  	const ppcCell = titleRow.getCell(timeStartIdx + 1);
  	  	ppcCell.value = "PPC";
  	  	ppcCell.font = { bold: true, size: 18, color: { argb: COLORS.sectionTitleFont } };
  	}

  	// Section header row — taller than data rows.
  	const headerRow = sheet.addRow(
  	  	exportColumns.map((c) => HEADER_LABEL_OVERRIDES[c.key] ?? c.name)
  	);
  	headerRow.height = 15;
  	for (let i = 1; i <= columnCount; i++) {
  	  	const cell = headerRow.getCell(i);
  	  	cell.font = { bold: true, color: { argb: COLORS.headerFont } };
  	  	cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLORS.headerFill } };
  	  	cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  	  	applyBorder(cell);
  	}

  	// Data rows.
  	rowsForMachine.forEach((row, idx) => {
		const values = exportColumns.map((col) => {
			if (col.key === ITEM_COLUMN_KEY) return idx + 1;
			if (col.key === MACHINE_COLUMN_KEY) return row.machine ?? null;
			return resolveCellValue(col, row, isBlockRow);
		});
		const dataRow = sheet.addRow(values);
		exportColumns.forEach((col, colIdx) => {
			const cell = dataRow.getCell(colIdx + 1);
			styleDataCell(cell, col, row, ranges);
			if (col.key === DATE_COLUMN_KEY) cell.numFmt = "mmmm d, yyyy";
			if (TIME_ONLY_COLUMNS.has(col.key)) cell.numFmt = "h:mm AM/PM";

			if (isBlockRow(row) && (col.key === "part_name" || col.key === "lot_id")) {
				cell.font = { ...(cell.font || {}), bold: true };
			}
		});
	});

  	sheet.addRow([]); // blank separator row after this machine section
}

// ---- Main export ------------------------------------------------------------

/**
 * @param {Object} params
 * @param {Array<Object>} params.dataRows  	 Flat, unfiltered rows (all machines, all packages).
 * @param {Array<any>} params.machines  	  	  	Machine identifiers in display order (may include null).
 * @param {Object<string, string[]>} params.packageGroups
 *  	  	  	  	e.g. { RN: ['QSOP', 'QSOP_EP', ...], SOT: [...], ... } — sheet name -> package_name list.
 * @param {Array<{ key: string, name: string, width?: number }>} params.columns  	Your DATA_COLUMNS.
 * @param {(row: Object) => boolean} [params.isBlockRow]  	Same predicate the grid uses.
 * @param {(machine: any) => string} [params.getMachineLabel]  	Defaults null -> "Unassigned".
 * @param {string[]} [params.excludeKeys]  	Column keys to drop entirely. Defaults to ["entry_id"].
 * @returns {Promise<ExcelJS.Buffer>}
 */
export async function exportLoadingPlanToExcel({
  	dataRows,
  	machines,
  	packageGroups,
  	columns,
  	isBlockRow: isBlockRowParam = isBlockRow,
  	getMachineLabel = (m) => (m === null || m === undefined ? "Unassigned" : String(m)),
  	excludeKeys = ["id", "entry_id", "sequence_order", "doable_status"],
}) {
  	if (!Array.isArray(dataRows)) throw new Error("exportLoadingPlanToExcel: `dataRows` must be an array");
  	if (!Array.isArray(machines)) throw new Error("exportLoadingPlanToExcel: `machines` must be an array");
  	if (!packageGroups || typeof packageGroups !== "object") {
  	  	throw new Error("exportLoadingPlanToExcel: `packageGroups` is required");
  	}
  	if (!Array.isArray(columns) || columns.length === 0) {
  	  	throw new Error("exportLoadingPlanToExcel: `columns` (DATA_COLUMNS) is required");
  	}

  	const baseColumns = columns.filter((c) => !excludeKeys.includes(c.key));
  	const exportColumns = [
		{ key: DATE_COLUMN_KEY, name: "Date" },
		{ key: ITEM_COLUMN_KEY, name: "Item" },
		{ key: MACHINE_COLUMN_KEY, name: "Machine" },
		...baseColumns
	];

  	const partNameIdx = exportColumns.findIndex((c) => c.key === "part_name");
  	const timeStartIdx = exportColumns.findIndex((c) => c.key === "time_start");

  	const ranges = {
  	  	partNameToQty: keyRange(exportColumns, "part_name", "qty"),
  	  	partNameToBake: keyRange(exportColumns, "part_name", "bake_time_temp"),
  	};

  	const workbook = new ExcelJS.Workbook();
  	workbook.creator = "PPC";
  	workbook.created = new Date();

  	function addSheetForRows(sheetName, rowsForThisSheet) {
  	  	const sheet = workbook.addWorksheet(sanitizeSheetName(sheetName));
  	  	sheet.columns = exportColumns.map((col) => ({
  	  	  	key: col.key,
  	  	  	width: widthFromPx(col.width, col.name),
  	  	}));

  	  	let anyMachineRendered = false;
  	  	machines.forEach((m) => {
  	  	  	const rowsForMachine = rowsForThisSheet.filter((r) => r.machine === m);
  	  	  	if (rowsForMachine.length === 0) return;
  	  	  	anyMachineRendered = true;
  	  	  	renderMachineSection({
  	  	  	  	sheet,
  	  	  	  	machineLabel: getMachineLabel(m),
  	  	  	  	rowsForMachine,
  	  	  	  	exportColumns,
  	  	  	  	ranges,
  	  	  	  	isBlockRow,
  	  	  	  	partNameIdx,
  	  	  	  	timeStartIdx,
  	  	  	});
  	  	});

  	  	if (!anyMachineRendered) {
  	  	  	sheet.addRow(["No data for this package group."]);
  	  	}
  	}

  	const assignedPackageNames = new Set(Object.values(packageGroups).flat());

  	for (const [groupName, packageList] of Object.entries(packageGroups)) {
  	  	const rowsForGroup = dataRows.filter(
  	  	  	(r) => isBlockRow(r) || packageList.includes(r.package_name)
  	  	);
  	  	addSheetForRows(groupName, rowsForGroup);
  	}

  	// Rows whose package_name matched nothing above (block rows already
  	// appear in every group sheet, so they're left out here).
  	const unassignedRows = dataRows.filter(
  	  	(r) => !isBlockRow(r) && !assignedPackageNames.has(r.package_name)
  	);
  	addSheetForRows("Unassigned", unassignedRows);

  	return workbook.xlsx.writeBuffer();
}

/**
 * Browser helper: trigger a file download from the buffer returned above.
 * (Node/SSR environments should write the buffer to disk instead.)
 */
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

/**
 * Example usage:
 *
 * import { DATA_COLUMNS } from "./dataColumns";
 * import { exportLoadingPlanToExcel, downloadExcelBuffer } from "./loadingPlanExcelExporter";
 *
 * const PACKAGE_GROUPS = {
 *  	 RN: ["QSOP", "QSOP_EP", "SOIC_N", "SOIC_N_EP"],
 *  	 SOT: ["SOT-223", "SOT_23", "SOT_23_3", "SOT_89", "SOT-23"],
 *  	 // ...rest of the backend's GROUPS constant, passed down as a prop
 * };
 *
 * async function handleExport() {
 *  	 setIsExporting(true);
 *  	 try {
 *  	  	 const buffer = await exportLoadingPlanToExcel({
 *  	  	  	 dataRows,  	  	  	  	  	  	  	  	 // flat, unfiltered rows — NOT displayRows
 *  	  	  	 machines,
 *  	  	  	 packageGroups: PACKAGE_GROUPS, // from the backend prop
 *  	  	  	 columns: DATA_COLUMNS,
 *  	  	  	 isBlockRow,  	  	  	  	  	  	  	  	// your existing predicate
 *  	  	  	 getMachineLabel: (m) => (m === null ? "Unassigned" : m === MACHINE_MANUAL ? "MANUAL" : m),
 *  	  	 });
 *  	  	 downloadExcelBuffer(buffer, `loading_plan_${new Date().toISOString().slice(0, 10)}.xlsx`);
 *  	 } finally {
 *  	  	 setIsExporting(false);
 *  	 }
 * }
 */