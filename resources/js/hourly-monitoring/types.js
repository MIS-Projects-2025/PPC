// Optional: JSDoc typedefs that replace types.ts. Nothing imports this at runtime;
// reference them from other files with e.g. /** @param {import('./types').GridRow} row */
// to keep editor IntelliSense.

/** @typedef {'tnr' | 'fvi'} SheetType */

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
 * @property {number[]} day_hours
 * @property {number[]} night_hours
 */

/**
 * Row as sent by the server: cells keyed by hour slot.
 * @typedef {{ id: number, sort_order: number, cells: Record<string, string>, [field: string]: unknown }} RowDto
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
 * Row as used by the grid: server fields + one flat `h{hour}` string per slot ("1500", "E_CHIPOUT" or "").
 * @typedef {{ id: number, [key: string]: any }} GridRow
 */

/**
 * @typedef {{ label: string, [key: string]: number | string }} SummaryRow
 */

/**
 * @typedef {Object} SummaryDto
 * @property {string} date
 * @property {Record<SheetType, string[]>} columns
 * @property {Record<'day' | 'night', { label: string, rows: SummaryRow[], total: SummaryRow }>} shifts
 * @property {SummaryRow[]} totals
 */

export {};
