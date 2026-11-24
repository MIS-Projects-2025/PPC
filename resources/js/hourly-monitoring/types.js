// Optional: JSDoc typedefs that replace types.ts. Nothing imports this at runtime;
// reference them from other files with e.g. /** @param {import('./types').GridRow} row */
// to keep editor IntelliSense.

/** @typedef {'tnr' | 'fvi' | 'boxing'} SheetType */

/**
 * @typedef {Object} DowntimeCode
 * @property {number} id
 * @property {string} code
 * @property {string | null} bg_color
 * @property {string} text_color
 * @property {boolean} is_downtime
 */

/**
 * @typedef {Object} HmConfig
 * @property {number} cap_divisor
 * @property {Record<SheetType, string[]>} lines
 * @property {Record<string, string>} line_colors  family (F1, F2, F3) => pale hex color
 * @property {number[]} day_hours
 * @property {number[]} night_hours
 */

/**
 * Row as sent by the server: cells keyed by hour slot. Boxing rows also have `shift` and `hour_lots`.
 * @typedef {{ id: number, sort_order: number, cells: Record<string, string>, hour_lots?: Record<string, string>, [field: string]: unknown }} RowDto
 */

/**
 * @typedef {Object} SheetDto
 * @property {number} id
 * @property {SheetType} type
 * @property {string} line
 * @property {string} date
 * @property {{ show: string, rows: string }} urls
 * @property {RowDto[]} rows
 */

/**
 * Row as used by the grid: server fields + one flat `h{hour}` string per slot ("1500", "E_CHIPOUT" or "")
 * (+ `l{hour}` for boxing lots). Virtual TNR rows add __kind ('subtotal' | 'grand'), __stats and __capLoss;
 * real rows add __n. Fields starting with "__" are never sent to the server.
 * @typedef {{ id: number | string, [key: string]: any }} GridRow
 */

/**
 * @typedef {{ key: string, label: string, color: string | null, lines: string[] }} SummaryColumn
 * @typedef {{ key: SheetType, label: string, hourly_label: string, columns: SummaryColumn[] }} SummaryGroup
 * @typedef {{ label: string, [columnKey: string]: number | string }} SummaryRow
 * @typedef {{ label: string, color?: string | null, values: number[], total: number }} DetailRow
 * @typedef {{ key: SheetType, title: string, blocks: { rows: DetailRow[], total: DetailRow }[] }} DetailSection
 */

/**
 * Summary column keys: "<type>:<family>" per column ("tnr:F1", "boxing:F1", "fvi:PL1") and "<type>" for the group total.
 * @typedef {Object} SummaryDto
 * @property {string} date
 * @property {SummaryGroup[]} groups
 * @property {Record<'day' | 'night', { label: string, hours: string[], rows: SummaryRow[], total: SummaryRow, detail: DetailSection[] }>} shifts
 * @property {SummaryRow[]} totals
 */

export {};
