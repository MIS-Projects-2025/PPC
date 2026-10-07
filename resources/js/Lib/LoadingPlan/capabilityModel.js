export const blank = (v) => v === null || v === undefined || v === '';

export const rowKey = (s) =>
    [s.factory, s.package_name ?? '', s.body_size ?? '', blank(s.thickness) ? '' : Number(s.thickness).toFixed(2), s.focus_group ?? '', s.lot_type ?? ''].join('|');

// Which column a state lands in. Single leadcounts get their own column; "any",
// ranges and include lists each get a labelled column so no state is hidden.
export function colInfo(s) {
    const noExclude = blank(s.leadcount_exclude);
    if (!blank(s.leadcount_include)) return { key: `only ${s.leadcount_include}`, kind: 'custom', sort: 1e6 };
    if (blank(s.leadcount_min) && blank(s.leadcount_max) && noExclude) return { key: 'any', kind: 'any', sort: -1 };
    if (!blank(s.leadcount_min) && Number(s.leadcount_min) === Number(s.leadcount_max) && noExclude) {
        return { key: String(Number(s.leadcount_min)), kind: 'single', n: Number(s.leadcount_min), sort: Number(s.leadcount_min) };
    }
    return {
        key: `${s.leadcount_min ?? 'any'}–${s.leadcount_max ?? 'any'}${noExclude ? '' : ` except ${s.leadcount_exclude}`}`,
        kind: 'custom',
        sort: 1e6 + Number(s.leadcount_min ?? 0),
    };
}

export const colLabel = (c) => (c.kind === 'single' ? `${c.n}L` : c.kind === 'any' ? 'any' : c.key);
export const canPaint = (c) => c.kind === 'any' || c.kind === 'single';
export const rowTitle = (r) => `${r.package_name ?? 'ANY package'}${r.body_size ? ` · ${r.body_size}` : ''}`;
export const dependents = (s) => (s.part_rule_count ?? 0) + (s.transition_count ?? 0) + (s.exception_count ?? 0);

/**
 * Splits states into the matrix (rows x columns) and the part-routed list.
 * Part-routed states are the destination of a part rule: the scheduler only
 * reaches them through that rule, so they stay out of the matrix.
 */
export function buildGrid(states, draftRows = [], draftCols = []) {
    const routed = states.filter((s) => (s.part_rule_count ?? 0) > 0);
    const regular = states.filter((s) => !((s.part_rule_count ?? 0) > 0));

    const rowMap = new Map();
    const colMap = new Map();
    const cells = new Map();

    regular.forEach((s) => {
        const rk = rowKey(s);
        const c = colInfo(s);
        if (!rowMap.has(rk)) {
            rowMap.set(rk, { key: rk, factory: s.factory, package_name: s.package_name, body_size: s.body_size, thickness: s.thickness, focus_group: s.focus_group, lot_type: s.lot_type });
        }
        if (!colMap.has(c.key)) colMap.set(c.key, c);
        const ck = `${rk}#${c.key}`;
        cells.set(ck, [...(cells.get(ck) ?? []), s]);
    });

    draftRows.forEach((r) => {
        const rk = rowKey(r);
        if (!rowMap.has(rk)) rowMap.set(rk, { key: rk, ...r });
    });
    draftCols.forEach((n) => {
        if (!colMap.has(String(n))) colMap.set(String(n), { key: String(n), kind: 'single', n, sort: n });
    });

    const rows = [...rowMap.values()].sort((a, b) =>
        `${a.factory}${a.package_name ?? ''}${a.body_size ?? ''}`.localeCompare(`${b.factory}${b.package_name ?? ''}${b.body_size ?? ''}`)
    );
    const cols = [...colMap.values()].sort((a, b) => a.sort - b.sort || a.key.localeCompare(b.key));

    return { rows, cols, cells, routed };
}

export const cellKey = (row, col) => `${row.key}#${col.key}`;