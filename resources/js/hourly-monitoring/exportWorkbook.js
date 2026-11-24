import ExcelJS from 'exceljs';
import { api } from './api';
import { buildCodeIndex, buildDisplayRows } from './cellUtils';
import { buildColumns } from './columns';
import { buildPickupRows, pickupColumns } from './pickupUtils';

/**
 * One workbook per day: a sheet for every main tab / sub tab (TNR F1 STD ... PICKUP F3 ... FVI PL1 ... BOXING F3)
 * and a single SUMMARY sheet that holds the Day and the Night shift together.
 *
 * The grid sheets are built from the very same column definitions as the screen (buildColumns / pickupColumns), so what
 * is exported is what is shown: calculated columns, TNR subtotal / Grand Total rows, downtime-code colors.
 * Always exports the expanded columns, whatever is collapsed on screen.
 */

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const INT = '#,##0';
const NAVY = '1F3864';
const SHIFT_TITLES = { day: 'Day shift (7am–7pm)', night: 'Night shift (7pm–7am)' };

// Same colors as hourly-monitoring.css
const GROUP_FILL = { 'hm-group-day': 'FFE9A8', 'hm-group-night': 'C9D3E8', 'hm-group-total': 'D9EADB', 'hm-group-action': 'F1DEDE' };
const HEAD_FILL = { 'hm-head-day': 'FFF6DD', 'hm-head-night': 'E4E9F3' };
const NEUTRAL = 'D9DEE7';

const THIN = { style: 'thin', color: { argb: 'FFC9CED6' } };
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };

const argb = (hex) => `FF${String(hex).replace('#', '').toUpperCase()}`;

function pick(map, classes, fallback) {
    const names = String(classes ?? '').split(' ');
    const hit = Object.keys(map).find((key) => names.includes(key));
    return hit ? map[hit] : fallback;
}

function put(ws, r, c, value, { numFmt, fill, color, bold, align } = {}) {
    const cell = ws.getCell(r, c);
    cell.value = value === undefined ? null : value;
    cell.border = BORDER;
    if (numFmt) cell.numFmt = numFmt;
    if (fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(fill) } };
    cell.font = { bold: Boolean(bold), ...(color ? { color: { argb: argb(color) } } : {}) };
    cell.alignment = { vertical: 'middle', horizontal: align ?? (typeof value === 'number' ? 'right' : 'left') };
    return cell;
}

function heading(ws, r, text, size = 13) {
    const cell = ws.getCell(r, 1);
    cell.value = text;
    cell.font = { bold: true, size };
}

function sheetName(wb, wanted) {
    const base = wanted.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31);
    let name = base;
    for (let n = 2; wb.getWorksheet(name); n++) name = `${base.slice(0, 28)} ${n}`;
    return name;
}

/** Calculated columns carry the text they show ("1,500", "85.3%", "3 h"); turn it back into a number with a number format. */
function parseDisplay(display) {
    const text = String(display ?? '').trim();
    if (/^-?\d[\d,]*$/.test(text)) return { value: Number(text.replace(/,/g, '')), numFmt: INT };
    if (/^-?\d+(\.\d+)?%$/.test(text)) return { value: Number(text.slice(0, -1)) / 100, numFmt: '0.0%' };
    const hours = /^(-?\d+) h$/.exec(text);
    if (hours) return { value: Number(hours[1]), numFmt: '0" h"' };
    return { value: text === '' ? null : text };
}

/** Value + style of one body cell. */
function gridCell(col, row, index, codeIdx) {
    if (col.key === 'count') return { value: row.__kind ? null : (row.__n ?? index + 1) };
    if (col.exportValue) return parseDisplay(col.exportValue(row));

    const raw = row[col.key];
    if (raw === null || raw === undefined || raw === '') return { value: null };
    if (typeof raw === 'number') return { value: raw, numFmt: INT };

    const text = String(raw);
    if (/^[hl]\d+$/.test(col.key)) {
        if (/^-?\d+$/.test(text)) return { value: Number(text), numFmt: INT };
        const code = codeIdx.get(text.toUpperCase());
        if (code) return { value: code.code, fill: code.bg_color ?? undefined, color: code.text_color, align: 'center' };
    }

    return { value: text };
}

/** Leaf columns of a column tree, each remembering the group it sits in. */
const leaves = (columns, group = null) => columns.flatMap((c) => (c.children ? leaves(c.children, c) : [{ ...c, group }]));

/** Two header rows: group names on top (merged), column names below. Columns without a group span both rows. */
function writeHeader(ws, r, cols) {
    let i = 0;

    while (i < cols.length) {
        const col = cols[i];

        if (!col.group) {
            put(ws, r, i + 1, col.name, { bold: true, fill: pick(HEAD_FILL, col.headerCellClass, NEUTRAL), align: 'center' });
            put(ws, r + 1, i + 1, null, { fill: pick(HEAD_FILL, col.headerCellClass, NEUTRAL) });
            ws.mergeCells(r, i + 1, r + 1, i + 1);
            i += 1;
            continue;
        }

        let j = i;
        while (j + 1 < cols.length && cols[j + 1].group === col.group) j += 1;

        const groupFill = pick(GROUP_FILL, col.group.headerCellClass, NEUTRAL);
        put(ws, r, i + 1, col.group.name, { bold: true, fill: groupFill, align: 'center' });
        if (j > i) ws.mergeCells(r, i + 1, r, j + 1);
        for (let k = i; k <= j; k++) {
            put(ws, r + 1, k + 1, cols[k].name, { bold: true, fill: pick(HEAD_FILL, cols[k].headerCellClass, groupFill), align: 'center' });
        }

        i = j + 1;
    }
}

/** Writes header + rows starting at row `r`; returns the first free row below the table. */
function writeTable(ws, r, { columns, rows, codeIdx }) {
    const cols = leaves(columns);
    writeHeader(ws, r, cols);

    cols.forEach((col, k) => {
        const column = ws.getColumn(k + 1);
        column.width = Math.max(column.width ?? 0, Math.round((col.width ?? 100) / 7));
    });

    rows.forEach((row, i) => {
        cols.forEach((col, k) => {
            const { value, ...style } = gridCell(col, row, i, codeIdx);

            if (row.__kind === 'grand') Object.assign(style, { fill: NAVY, color: 'FFFFFF', bold: true });
            else if (row.__kind === 'subtotal') Object.assign(style, { fill: 'E6EAF1', bold: true });

            put(ws, r + 2 + i, k + 1, value, style);
        });
    });

    return r + 2 + rows.length;
}

const frozenCount = (columns) => {
    const cols = leaves(columns);
    const first = cols.findIndex((c) => !c.frozen);
    return first === -1 ? cols.length : first;
};

function writeGridSheet(ws, { type, line, date, rows, codeIdx, config }) {
    heading(ws, 1, `${type.toUpperCase()} - ${line} - ${date}`);
    const ctx = (shift) => ({ codeIdx, config, editors: {}, onDelete: () => {}, shift, collapsed: {} });

    if (type === 'boxing') {
        // Two tables on screen (day, night): stacked in the same sheet.
        let r = 3;
        for (const shift of ['day', 'night']) {
            heading(ws, r, SHIFT_TITLES[shift], 11);
            r = writeTable(ws, r + 1, { columns: buildColumns('boxing', ctx(shift)), rows: rows.filter((x) => x.shift === shift), codeIdx }) + 1;
        }
        return;
    }

    const columns = buildColumns(type, ctx());
    const display = type === 'tnr' ? buildDisplayRows(rows, codeIdx, config) : rows;
    writeTable(ws, 3, { columns, rows: display, codeIdx });

    const xSplit = frozenCount(columns);
    ws.views = [{ state: 'frozen', ySplit: 4, ...(xSplit ? { xSplit } : {}) }];
}

function writePickupSheet(ws, { line, date, lots, config }) {
    heading(ws, 1, `PICKUP - ${line} - ${date}`);
    const columns = pickupColumns(config);
    writeTable(ws, 3, { columns, rows: buildPickupRows(lots, config), codeIdx: new Map() });

    const xSplit = frozenCount(columns);
    ws.views = [{ state: 'frozen', ySplit: 4, ...(xSplit ? { xSplit } : {}) }];
}

/* ---------- Summary (Day + Night in one sheet) ---------- */

const headStyle = { bold: true, fill: NAVY, color: 'FFFFFF', align: 'center' };

/** Totals block / hourly block: one column per family + the group's Total. Returns the first free row below. */
function writeGroupTable(ws, r, data, { corner, titleKey, rows, sumRow }) {
    put(ws, r, 1, corner || null, headStyle);
    put(ws, r + 1, 1, null, headStyle);
    ws.mergeCells(r, 1, r + 1, 1);

    let c = 2;
    for (const g of data.groups) {
        const span = g.columns.length + 1;
        put(ws, r, c, g[titleKey], headStyle);
        ws.mergeCells(r, c, r, c + span - 1);
        g.columns.forEach((col, i) => {
            put(ws, r + 1, c + i, col.label, col.color ? { bold: true, fill: col.color, color: '1A1A1A', align: 'center' } : headStyle);
        });
        put(ws, r + 1, c + g.columns.length, 'Total', { ...headStyle, fill: '2F4F88' });
        c += span;
    }

    const body = rows.map((row) => ({ row, label: row.label, sum: false }));
    if (sumRow) body.push({ row: sumRow, label: 'TOTAL', sum: true });

    body.forEach(({ row, label, sum }, i) => {
        const rr = r + 2 + i;
        const strong = sum || label === 'Total';
        put(ws, rr, 1, label, { bold: true, fill: sum ? 'DFE5EF' : 'F1F3F6' });

        let k = 2;
        for (const g of data.groups) {
            for (const col of g.columns) put(ws, rr, k++, Number(row[col.key] ?? 0), { numFmt: INT, bold: strong, fill: sum ? 'DFE5EF' : undefined });
            put(ws, rr, k++, Number(row[g.key] ?? 0), { numFmt: INT, bold: true, fill: sum ? 'DFE5EF' : 'EEF1F5' });
        }
    });

    return r + 2 + body.length + 1;
}

/** Per-line tables with the hours across (TNR per family, Boxing, FVI, Pickup). */
function writeDetail(ws, r, section, hours) {
    heading(ws, r, section.title, 11);
    r += 1;

    for (const block of section.blocks) {
        put(ws, r, 1, null, headStyle);
        hours.forEach((h, i) => put(ws, r, 2 + i, h, headStyle));
        put(ws, r, 2 + hours.length, 'Total', { ...headStyle, fill: '2F4F88' });

        block.rows.forEach((row, i) => {
            const rr = r + 1 + i;
            put(ws, rr, 1, row.label, { bold: true, fill: row.color ?? 'F1F3F6' });
            row.values.forEach((v, j) => put(ws, rr, 2 + j, v, { numFmt: INT }));
            put(ws, rr, 2 + hours.length, row.total, { numFmt: INT, bold: true, fill: 'EEF1F5' });
        });

        const t = r + 1 + block.rows.length;
        put(ws, t, 1, block.total.label, { bold: true, fill: 'DFE5EF' });
        block.total.values.forEach((v, j) => put(ws, t, 2 + j, v, { numFmt: INT, bold: true, fill: 'DFE5EF' }));
        put(ws, t, 2 + hours.length, block.total.total, { numFmt: INT, bold: true, fill: 'DFE5EF' });

        r = t + 2;
    }

    return r;
}

function writeSummarySheet(ws, data) {
    ws.getColumn(1).width = 14;
    for (let c = 2; c <= 20; c++) ws.getColumn(c).width = 12;

    heading(ws, 1, `SUMMARY - ${data.date}`);
    heading(ws, 3, 'Totals', 11);
    let r = writeGroupTable(ws, 4, data, { corner: '', titleKey: 'label', rows: data.totals });

    for (const shift of ['day', 'night']) {
        const block = data.shifts[shift];
        heading(ws, r, SHIFT_TITLES[shift]);
        r = writeGroupTable(ws, r + 1, data, { corner: 'TIME', titleKey: 'hourly_label', rows: block.rows, sumRow: block.total });
        for (const section of block.detail) r = writeDetail(ws, r, section, block.hours);
        r += 1;
    }
}

function download(buffer, filename) {
    const url = URL.createObjectURL(new Blob([buffer], { type: XLSX_MIME }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * @param {{ date: string, sheets: any[], rowsBySheet: Record<string, any[]>, codes: any[], config: any, urls: { pickup: string, summary: string } }} args
 * `rowsBySheet` are the grid rows currently on screen; pickup and summary come from the server.
 */
export async function exportWorkbook({ date, sheets, rowsBySheet, codes, config, urls }) {
    const query = `?date=${encodeURIComponent(date)}`;
    const [pickup, summary] = await Promise.all([api(urls.pickup + query), api(urls.summary + query)]);

    const codeIdx = buildCodeIndex(codes);
    const wb = new ExcelJS.Workbook();
    wb.created = new Date();

    // Same order as the main tabs.
    for (const type of ['tnr', 'pickup', 'fvi', 'boxing']) {
        for (const line of config.lines[type] ?? []) {
            const ws = wb.addWorksheet(sheetName(wb, `${type.toUpperCase()} ${line}`));

            if (type === 'pickup') {
                writePickupSheet(ws, { line, date, lots: pickup.lines?.[line]?.rows ?? [], config });
                continue;
            }

            const sheet = sheets.find((s) => s.type === type && s.line === line);
            writeGridSheet(ws, { type, line, date, rows: sheet ? (rowsBySheet[sheet.id] ?? []) : [], codeIdx, config });
        }
    }

    writeSummarySheet(wb.addWorksheet('SUMMARY'), summary);

    download(await wb.xlsx.writeBuffer(), `hourly-monitoring-${date}.xlsx`);
}
