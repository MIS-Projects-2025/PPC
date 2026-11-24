export const HOUR_KEY = (hour) => `h${hour}`;
export const hourLabel = (hour) => `${String(hour).padStart(2, '0')}00H`;
export const fmt = (n) => n.toLocaleString('en-US');
export const pct = (n) => `${(n * 100).toFixed(1)}%`;

/** Map<string, DowntimeCode> keyed by upper-cased code. */
export const buildCodeIndex = (codes) => new Map(codes.map((c) => [c.code.toUpperCase(), c]));

export function toGridRow(dto) {
    const { cells, ...rest } = dto;
    const row = { ...rest };
    for (let hour = 0; hour < 24; hour++) {
        row[HOUR_KEY(hour)] = cells?.[hour] ?? '';
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

/**
 * Returns { day, night, all, downtime }.
 * Downtime is in hours: each cell holding a downtime code (is_downtime) counts as exactly 1 hour.
 * Non-downtime codes (I_, P_, NV_, LOT CLOSING, NEW LOT) count as 0 output and 0 downtime.
 */
export function rowStats(row, codeIdx, config) {
    let downtime = 0;
    const sum = (hours) => {
        let total = 0;
        for (const hour of hours) {
            const value = row[HOUR_KEY(hour)];
            if (!value) continue;
            if (/^\d+$/.test(value)) total += Number(value);
            else if (codeIdx.get(String(value).toUpperCase())?.is_downtime) downtime++;
        }
        return total;
    };
    const day = sum(config.day_hours);
    const night = sum(config.night_hours);
    return { day, night, all: day + night, downtime };
}

export const FIELD_KINDS = {
    tnr: {
        int: ['capacity', 'plan', 'day_lots', 'night_lots'],
        str: ['machine', 'package_type', 'setup', 'reason', 'action', 'who', 'when_at', 'status'],
        emp: ['day_emp_id', 'night_emp_id'],
    },
    fvi: {
        int: ['day_lots', 'night_lots'],
        str: ['day_designation', 'night_designation'],
        emp: ['day_emp_id', 'night_emp_id'],
    },
};

/**
 * Diffs an edited grid row against the previous one, validates it and builds the server payload.
 * Returns { row, fields, cells, error? }.
 */
export function reconcile(before, after, type, codeIdx) {
    const kinds = FIELD_KINDS[type];
    const row = { ...after };
    const fields = {};
    const cells = {};

    for (const key of Object.keys(after)) {
        if (before[key] === after[key]) continue;

        const slot = /^h(\d+)$/.exec(key);
        if (slot) {
            const value = normalizeCell(after[key], codeIdx);
            if (value === null) {
                return { row: before, fields: {}, cells: {}, error: `"${after[key]}" is neither a whole number nor a downtime code.` };
            }
            row[key] = value;
            cells[slot[1]] = value;
        } else if (kinds.int.includes(key)) {
            const text = String(after[key] ?? '').trim().replace(/,/g, '');
            if (text === '') {
                row[key] = null;
                fields[key] = null;
            } else if (/^\d+$/.test(text)) {
                row[key] = fields[key] = Number(text);
            } else {
                return { row: before, fields: {}, cells: {}, error: 'This column only accepts whole numbers.' };
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

    return { row, fields, cells };
}
