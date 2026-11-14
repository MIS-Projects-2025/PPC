import { DATA_COLUMN_KEYS, fmtHours } from "./columnConfig";
import { isBlockRow } from "./helpers";

// A column can't go below MIN_COLUMN_WIDTH (a thin coloured sliver stays as a hint).
// Anything at/under COLLAPSE_HINT_THRESHOLD counts as "hidden".
export const MIN_COLUMN_WIDTH = 6;
export const COLLAPSE_HINT_THRESHOLD = 28;

const STORAGE_KEY = "loadingPlan:columnWidths";           // PL1/PL6: unchanged, nobody loses their settings
const F3_STORAGE_KEY = "loadingPlan:columnWidths:f3";

const AUTO_MIN_WIDTH = 60;
const AUTO_MAX_WIDTH = 420;
const GRID_FONT_SIZE = 14; // react-data-grid's --rdg-font-size
const CELL_PADDING_X = 18;
const HEADER_EXTRA_X = 12; // resize handle / sort arrows
const FIT_CANDIDATES = 4; // longest N strings per column that actually get measured

// Extra px for badges/icons rendered next to the text. Tune by eye.
const COLUMN_EXTRA_PX = { lot_id: 64, status: 40, doable: 44, time_start: 30, time_end: 30, part_name: 24 };

const F3_DEFAULT_HIDDEN = [
    "lot_type", "prod_area", "lot_status", "lot_entry_time_days", "cr3", "be_osl_days", "osl",
    "body_size", "end_customer", "bake", "bake_count", "test_lot_id", "backend_leadtime",
    "date_loaded", "start_time", "part_type", "auto_part", "part_class", "date_code",
    "focus_group", "process_group", "bulk", "required_time", "lot_entry_time", "stage",
    "stage_start_time", "ccd", "stage_run_days", "tray", "osl_days", "be_group",
    "strategy_code", "assy_site", "stock_position", "bake_time_temp",
];

// ── persistence ──────────────────────────────────────────────────────────
const isF3 = (location) => location === "F3";
const storageKeyFor = (location) => (isF3(location) ? F3_STORAGE_KEY : STORAGE_KEY);

export function defaultColumnWidths(location) {
    return isF3(location)
        ? Object.fromEntries(F3_DEFAULT_HIDDEN.map((k) => [k, MIN_COLUMN_WIDTH]))
        : {};
}

export function loadColumnWidths(location) {
    if (typeof window === "undefined") return defaultColumnWidths(location);
    try {
        const raw = window.localStorage.getItem(storageKeyFor(location));
        if (raw === null) return defaultColumnWidths(location); // never customized: use defaults
        const out = {};
        for (const [k, w] of Object.entries(JSON.parse(raw) ?? {})) {
            if (DATA_COLUMN_KEYS.has(k) && Number.isFinite(w) && w >= MIN_COLUMN_WIDTH) out[k] = w;
        }
        return out;
    } catch {
        return defaultColumnWidths(location);
    }
}

export function saveColumnWidths(widths, location) {
    try {
        const key = storageKeyFor(location);
        if (sameRecord(widths, defaultColumnWidths(location))) {
            window.localStorage.removeItem(key);
        } else {
            window.localStorage.setItem(key, JSON.stringify(widths));
        }
    } catch {
        // storage unavailable: widths just won't persist
    }
}

// ── equality helpers (keep state updates from looping) ───────────────────
export function sameRecord(a, b) {
    const ak = Object.keys(a);
    return ak.length === Object.keys(b).length && ak.every((k) => a[k] === b[k]);
}

export function sameWidthMap(a, b) {
    if (a.size !== b.size) return false;
    for (const [k, v] of a) {
        const o = b.get(k);
        if (!o || o.type !== v.type || o.width !== v.width) return false;
    }
    return true;
}

// ── auto-fit ─────────────────────────────────────────────────────────────
function keepLongest(arr, text, k) {
    if (arr.length === k && text.length <= arr[k - 1].length) return;
    if (arr.includes(text)) return;
    arr.push(text);
    arr.sort((a, b) => b.length - a.length);
    if (arr.length > k) arr.pop();
}

/** What the cell actually displays (mirrors the renderers in columns.jsx). */
function cellTextForFit(row, key, getMachineLabel) {
    if (isBlockRow(row)) {
        if (["part_name", "package_name", "status", "lot_id"].includes(key)) return row.block_label ?? "";
        if (key === "accu_time") return fmtHours(row.accu_time);
        if (key === "time_start" || key === "time_end") return row[key] ?? "";
        return "";
    }
    if (key === "accu_time") return fmtHours(row.accu_time);
    if (key === "machine") return getMachineLabel(row.machine ?? null);
    if (key === "part_name" && row.badges?.length) return `${row.part_name ?? ""}    ${row.badges.join("    ")}`;
    const v = row[key];
    return v == null ? "" : String(v);
}

let measureCtx = null;

/** { [columnKey]: widthPx } based on the widest content in `rows`. */
export function computeAutoWidths(rows, columns, getMachineLabel) {
    if (typeof document === "undefined") return {};
    measureCtx ??= document.createElement("canvas").getContext("2d");
    if (!measureCtx) return {};

    const family = getComputedStyle(document.body).fontFamily || "sans-serif";
    const bodyFont = `${GRID_FONT_SIZE}px ${family}`;
    const headFont = `700 ${GRID_FONT_SIZE}px ${family}`;
    const widthOf = (text, font) => {
        measureCtx.font = font;
        return measureCtx.measureText(text).width;
    };

    // Pass 1: longest few strings per column (by char count).
    const candidates = columns.map(() => []);
    for (const row of rows) {
        for (let i = 0; i < columns.length; i++) {
            const text = cellTextForFit(row, columns[i].key, getMachineLabel);
            if (text) keepLongest(candidates[i], text, FIT_CANDIDATES);
        }
    }

    // Pass 2: measure only those (proportional fonts: longest != widest).
    const out = {};
    columns.forEach((col, i) => {
        let body = 0;
        for (const t of candidates[i]) body = Math.max(body, widthOf(t, bodyFont));
        if (body) body += COLUMN_EXTRA_PX[col.key] ?? 0;
        const header = widthOf(col.name ?? col.key, headFont) + HEADER_EXTRA_X;
        const fit = Math.ceil(Math.max(body, header) + CELL_PADDING_X);
        out[col.key] = Math.min(AUTO_MAX_WIDTH, Math.max(AUTO_MIN_WIDTH, fit));
    });
    return out;
}