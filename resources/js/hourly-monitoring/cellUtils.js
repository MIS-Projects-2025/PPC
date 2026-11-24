export const HOUR_KEY = (hour) => `h${hour}`;
export const LOT_KEY = (hour) => `l${hour}`; // boxing: "No of lots" next to each hour
export const hourLabel = (hour) => `${String(hour).padStart(2, '0')}00H`;
export const fmt = (n) => n.toLocaleString('en-US');
export const pct = (n) => `${(n * 100).toFixed(1)}%`;

/** Whole numbers get thousands separators; blanks and non-numeric text (codes, names) pass through unchanged. */
export const fmtCell = (value) => {
    if (value === null || value === undefined || value === '') return '';
    const text = String(value).trim();
    return /^-?\d+$/.test(text) ? fmt(Number(text)) : text;
};

/** "F1 STD" / "F1 TRAY" / "F1" => "F1" (used to pick the tab color). */
export const lineFamily = (line) => String(line).split(' ')[0];

const clock = (h) => [h % 12 === 0 ? 12 : h % 12, h % 24 < 12 ? 'AM' : 'PM'];

/** Slot = hour ending at `hour`: 8 => "7-8 AM", 12 => "11 AM-12 PM", 0 => "11 PM-12 AM". */
export function rangeLabel(hour) {
    const [start, startSuffix] = clock((hour + 23) % 24);
    const [end, endSuffix] = clock(hour);
    return startSuffix === endSuffix ? `${start}-${end} ${endSuffix}` : `${start} ${startSuffix}-${end} ${endSuffix}`;
}

/** Map<string, DowntimeCode> keyed by upper-cased code. */
export const buildCodeIndex = (codes) => new Map(codes.map((c) => [c.code.toUpperCase(), c]));

export function toGridRow(dto) {
    const { cells, hour_lots, ...rest } = dto;
    const row = { ...rest };
    for (let hour = 0; hour < 24; hour++) {
        row[HOUR_KEY(hour)] = cells?.[hour] ?? '';
        if (hour_lots) row[LOT_KEY(hour)] = hour_lots[hour] ?? '';
    }
    return row;
}

/**
 * Cell semantics: an integer (output) or a downtime code.
 * Returns '' for blank, the canonical text for a valid value, or null when invalid.
 */
export function normalizeCell(raw, codeIdx) {
    const text = String(raw ?? '').trim().replace(/\s+/g, ' ');
    if (text === '') return '';
    if (/^\d{1,3}(,\d{3})+$/.test(text)) return text.replace(/,/g, '');
    if (/^\d+$/.test(text)) return text.replace(/^0+(?=\d)/, '');
    return codeIdx.get(text.toUpperCase())?.code ?? null;
}

/** "No of lots": a whole number or blank. Returns '' for blank, the canonical text, or null when invalid. */
export function normalizeLots(raw) {
    const text = String(raw ?? '').trim().replace(/,/g, '');
    if (text === '') return '';
    return /^\d+$/.test(text) ? text.replace(/^0+(?=\d)/, '') : null;
}

/**
 * Excel-like suggestions: prefix matches first, then word-start matches, then contains.
 * Anything starting with a digit is output, so it gets no dropdown.
 */
export function suggestCodes(input, codes, limit = 8) {
    const q = input.trim().toUpperCase().replace(/\s+/g, ' ');
    if (!q || /^\d/.test(q)) return [];

    const ranked = [];
    for (const code of codes) {
        const u = code.code.toUpperCase();
        let rank;
        if (u.startsWith(q)) rank = 0;
        else if ([' ', '_', '/'].some((sep) => u.includes(sep + q))) rank = 1;
        else if (u.includes(q)) rank = 2;
        else continue;
        ranked.push([rank, code]);
    }

    return ranked
        .sort((a, b) => a[0] - b[0] || a[1].code.length - b[1].code.length || a[1].code.localeCompare(b[1].code))
        .slice(0, limit)
        .map(([, code]) => code);
}

const isQty = (value) => /^\d+$/.test(String(value ?? ''));

/**
 * Returns { day, night, all, downtime }.
 * Downtime is in hours: each cell holding a downtime code (is_downtime) counts as exactly 1 hour.
 * Non-downtime codes (I_, P_, NV_, LOT CLOSING, NEW LOT) count as 0 output and 0 downtime.
 * Subtotal / grand-total rows carry their pre-summed stats in __stats.
 */
export function rowStats(row, codeIdx, config) {
    if (row.__stats) return row.__stats;

    let downtime = 0;
    const sum = (hours) => {
        let total = 0;
        for (const hour of hours) {
            const value = row[HOUR_KEY(hour)];
            if (!value) continue;
            if (isQty(value)) total += Number(value);
            else if (codeIdx.get(String(value).toUpperCase())?.is_downtime) downtime++;
        }
        return total;
    };
    const day = sum(config.day_hours);
    const night = sum(config.night_hours);
    return { day, night, all: day + night, downtime };
}

/** Sum of the numeric hour cells of one row for the given slots (boxing TOTAL). */
export const sumOutputs = (row, hours) => hours.reduce((t, h) => (isQty(row[HOUR_KEY(h)]) ? t + Number(row[HOUR_KEY(h)]) : t), 0);

/** Sum of the "No of lots" cells of one row for the given slots (boxing TOTAL # OF LOTS). */
export const sumLots = (row, hours) => hours.reduce((t, h) => t + (Number(row[LOT_KEY(h)]) || 0), 0);

/* ---------- TNR: sort by package type + read-only subtotal / grand-total rows ---------- */

const pkgKey = (row) => String(row.package_type ?? '').trim().toUpperCase();

function byPackage(a, b) {
    const ka = pkgKey(a);
    const kb = pkgKey(b);
    if (ka !== kb) {
        if (ka === '') return 1; // rows without a package type go last
        if (kb === '') return -1;
        return ka.localeCompare(kb, undefined, { numeric: true });
    }
    return a.sort_order - b.sort_order || a.id - b.id;
}

/**
 * Builds a virtual row that totals `rows` column by column. It is never sent to the server
 * and never counted by the summary tab.
 */
function totalRow(rows, codeIdx, config, meta) {
    const total = { ...meta, capacity: 0, plan: 0, day_lots: 0, night_lots: 0 };
    const stats = { day: 0, night: 0, all: 0, downtime: 0 };
    const slots = {};
    let capLoss = 0;

    for (const row of rows) {
        for (const key of ['capacity', 'plan', 'day_lots', 'night_lots']) total[key] += Number(row[key]) || 0;

        const s = rowStats(row, codeIdx, config);
        stats.day += s.day;
        stats.night += s.night;
        stats.all += s.all;
        stats.downtime += s.downtime;
        capLoss += ((Number(row.capacity) || 0) / config.cap_divisor) * s.downtime;

        for (let hour = 0; hour < 24; hour++) {
            const value = row[HOUR_KEY(hour)];
            if (isQty(value)) slots[hour] = (slots[hour] ?? 0) + Number(value);
        }
    }

    for (let hour = 0; hour < 24; hour++) {
        total[HOUR_KEY(hour)] = slots[hour] !== undefined ? String(slots[hour]) : '';
    }

    return { ...total, __stats: stats, __capLoss: capLoss };
}

/**
 * TNR display rows: real rows sorted by package type, a read-only subtotal row after each package-type
 * group (it disappears with its last row), and a "Grand Total" row at the very end.
 * Real rows get __n (their running number); virtual rows get __kind ('subtotal' | 'grand').
 */
export function buildDisplayRows(rows, codeIdx, config) {
    const sorted = [...rows].sort(byPackage);
    const out = [];
    let group = [];
    let key = null;
    let label = '';
    let n = 0;

    const flush = () => {
        if (group.length && key !== '') {
            out.push(totalRow(group, codeIdx, config, { id: `sub:${key}`, __kind: 'subtotal', package_type: label }));
        }
        group = [];
    };

    for (const row of sorted) {
        const k = pkgKey(row);
        if (k !== key) {
            flush();
            key = k;
            label = String(row.package_type ?? '').trim();
        }
        group.push(row);
        out.push({ ...row, __n: ++n });
    }
    flush();

    if (sorted.length) {
        out.push(totalRow(sorted, codeIdx, config, { id: 'grand', __kind: 'grand', machine: 'Grand Total' }));
    }

    return out;
}

export const FIELD_KINDS = {
    tnr: {
        int: ['capacity', 'plan', 'day_lots', 'night_lots'],
        str: ['machine', 'package_type', 'setup', 'night_setup', 'reason', 'action', 'who', 'when_at', 'status'],
        emp: ['day_emp_id', 'night_emp_id'],
    },
    fvi: {
        int: ['day_lots', 'night_lots'],
        str: ['day_designation', 'night_designation'],
        emp: ['day_emp_id', 'night_emp_id'],
    },
    boxing: {
        int: [],
        str: [],
        emp: ['emp_id'],
    },
};

/** The edited grid row without the display-only helpers (__n ...). */
const strip = (row) => Object.fromEntries(Object.entries(row).filter(([key]) => !key.startsWith('__')));

/**
 * Diffs an edited grid row against the previous one, validates it and builds the server payload.
 * Returns { row, fields, cells, lots, error? }; on error `row` is the previous row (revert).
 */
export function reconcile(before, after, type, codeIdx) {
    const kinds = FIELD_KINDS[type];
    const row = strip(after);
    const fields = {};
    const cells = {};
    const lots = {};
    const reject = (error) => ({ row: strip(before), fields: {}, cells: {}, lots: {}, error });

    for (const key of Object.keys(row)) {
        if (before[key] === after[key]) continue;

        const slot = /^h(\d+)$/.exec(key);
        const lot = /^l(\d+)$/.exec(key);

        if (slot) {
            const value = normalizeCell(after[key], codeIdx);
            if (value === null) return reject(`"${after[key]}" is neither a whole number nor a downtime code.`);
            row[key] = value;
            cells[slot[1]] = value;
        } else if (lot) {
            const value = normalizeLots(after[key]);
            if (value === null) return reject('No of lots only accepts whole numbers.');
            row[key] = value;
            lots[lot[1]] = value;
        } else if (kinds.int.includes(key)) {
            const text = String(after[key] ?? '').trim().replace(/,/g, '');
            if (text === '') {
                row[key] = null;
                fields[key] = null;
            } else if (/^\d+$/.test(text)) {
                row[key] = fields[key] = Number(text);
            } else {
                return reject('This column only accepts whole numbers.');
            }
        } else if (kinds.str.includes(key)) {
            const text = String(after[key] ?? '').trim();
            row[key] = text;
            fields[key] = text === '' ? null : text;
        } else if (kinds.emp.includes(key)) {
            const text = String(after[key] ?? '').trim();
            row[key] = text;
            fields[key] = text === '' ? null : text;
            if (text === '') row[key.replace('_id', '_name')] = '';
        }
    }

    return { row, fields, cells, lots };
}
