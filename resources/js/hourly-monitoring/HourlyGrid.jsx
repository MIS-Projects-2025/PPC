import { useCallback, useMemo, useRef, useState } from 'react';
import { DataGrid } from 'react-data-grid';
import { ApiError, api } from './api';
import { FIELD_KINDS, buildCodeIndex, buildDisplayRows, reconcile, suggestCodes, toGridRow } from './cellUtils';
import { buildColumns } from './columns';
import { TextEditor, createSuggestEditor } from './SuggestEditor';

/**
 * Props: { sheet, rows, setRows, codes, config, employeesUrl, packageTypes?, shift?, title? }
 *
 * `rows` are the real rows of the table. For TNR the grid shows them sorted by package type with read-only
 * subtotal rows and a Grand Total row (see buildDisplayRows); those virtual rows are never saved.
 * Boxing renders two of these grids per sheet: `shift` ('day' | 'night') is the table, `rows` is already filtered.
 */
export default function HourlyGrid({ sheet, rows, setRows, codes, config, employeesUrl, packageTypes = [], shift, title }) {
    const codeIdx = useMemo(() => buildCodeIndex(codes), [codes]);
    const [error, setError] = useState(null);
    const queue = useRef(Promise.resolve()); // saves run one after another, in order
    const clipboard = useRef('');
    const packageTypesRef = useRef(packageTypes);
    packageTypesRef.current = packageTypes;

    const displayRows = useMemo(
        () => (sheet.type === 'tnr' ? buildDisplayRows(rows, codeIdx, config) : rows),
        [sheet.type, rows, codeIdx, config],
    );
    const displayRef = useRef(displayRows);
    displayRef.current = displayRows;

    // Editors must keep a stable identity, otherwise the cell editor remounts on every render.
    const editors = useMemo(
        () => ({
            text: TextEditor,
            code: createSuggestEditor({
                suggest: (value) =>
                    suggestCodes(value, codes).map((c) => ({
                        value: c.code,
                        label: c.code,
                        bg: c.bg_color,
                        hint: c.is_downtime ? 'downtime' : undefined,
                    })),
                pick: (row, key, s) => ({ ...row, [key]: s.value }),
            }),
            emp: createSuggestEditor({
                debounceMs: 200,
                suggest: async (value, signal) => {
                    if (!value.trim()) return [];
                    const res = await api(`${employeesUrl}?q=${encodeURIComponent(value.trim())}`, { signal });
                    return res.data.map((e) => ({ value: e.EMPLOYID, label: e.EMPLOYID, hint: e.EMPNAME }));
                },
                // Name is shown optimistically; the server stores its own snapshot.
                pick: (row, key, s) => ({ ...row, [key]: s.value, [key.replace('_id', '_name')]: s.hint ?? '' }),
            }),
            // Package type is free text that only *suggests* existing values: Enter keeps what was typed
            // unless an arrow key / the mouse picked a suggestion.
            pkg: createSuggestEditor({
                autoSelect: false,
                suggest: (value) => {
                    const q = value.trim().toUpperCase();
                    if (!q) return [];
                    const all = packageTypesRef.current;
                    const starts = all.filter((p) => p.toUpperCase().startsWith(q));
                    const contains = all.filter((p) => !p.toUpperCase().startsWith(q) && p.toUpperCase().includes(q));
                    return [...starts, ...contains].slice(0, 8).map((p) => ({ value: p, label: p }));
                },
                pick: (row, key, s) => ({ ...row, [key]: s.value }),
            }),
        }),
        [codes, employeesUrl],
    );

    const reload = useCallback(async () => {
        const res = await api(sheet.urls.show);
        setRows(sheet.id, res.data.rows.map(toGridRow));
    }, [sheet.id, sheet.urls.show, setRows]);

    const fail = useCallback(
        async (e) => {
            setError(e instanceof ApiError || e instanceof Error ? e.message : 'Saving failed.');
            try {
                await reload(); // drop optimistic edits that the server did not accept
            } catch {
                /* keep the error message */
            }
        },
        [reload],
    );

    const empKeys = FIELD_KINDS[sheet.type].emp;

    const save = useCallback(
        (changes) => {
            queue.current = queue.current.then(async () => {
                try {
                    const res = await api(sheet.urls.rows, { method: 'PATCH', body: { rows: changes } });
                    // Only adopt the server's name snapshots, so a faster local edit is never overwritten.
                    const names = new Map(res.data.map((r) => [r.id, r]));
                    setRows(sheet.id, (cur) =>
                        cur.map((row) => {
                            const server = names.get(row.id);
                            if (!server) return row;
                            const next = { ...row };
                            for (const idKey of empKeys) {
                                if ((server[idKey] ?? '') === (row[idKey] ?? '')) {
                                    const nameKey = idKey.replace('_id', '_name');
                                    next[nameKey] = server[nameKey] ?? '';
                                }
                            }
                            return next;
                        }),
                    );
                } catch (e) {
                    await fail(e);
                }
            });
        },
        [sheet.id, sheet.urls.rows, setRows, fail, empKeys],
    );

    const onRowsChange = useCallback(
        (next, data) => {
            const previous = displayRef.current;
            const updates = new Map(); // row id => accepted (or reverted) row
            const changes = [];
            let rejected = null;

            for (const index of data.indexes) {
                const before = previous[index];
                if (!before || before.__kind) continue; // subtotal / grand-total rows are read-only

                const result = reconcile(before, next[index], sheet.type, codeIdx);
                updates.set(before.id, result.row);

                if (result.error) {
                    rejected = result.error;
                    continue;
                }

                const hasLots = Object.keys(result.lots).length > 0;
                if (Object.keys(result.fields).length || Object.keys(result.cells).length || hasLots) {
                    changes.push({
                        id: before.id,
                        fields: result.fields,
                        cells: result.cells,
                        ...(hasLots ? { lots: result.lots } : {}),
                    });
                }
            }

            setRows(sheet.id, (cur) => cur.map((r) => updates.get(r.id) ?? r));
            setError(rejected);
            if (changes.length) save(changes);
        },
        [sheet.id, sheet.type, codeIdx, setRows, save],
    );

    const addRow = async () => {
        try {
            const res = await api(sheet.urls.rows, { method: 'POST', body: shift ? { shift } : {} });
            setRows(sheet.id, (cur) => [...cur, toGridRow(res.data)]);
            setError(null);
        } catch (e) {
            await fail(e);
        }
    };

    const deleteRow = useCallback(
        async (row) => {
            if (!window.confirm('Delete this row and all of its hourly cells?')) return;
            try {
                await api(`${sheet.urls.rows}/${row.id}`, { method: 'DELETE' });
                setRows(sheet.id, (cur) => cur.filter((r) => r.id !== row.id));
            } catch (e) {
                await fail(e);
            }
        },
        [sheet.id, sheet.urls.rows, setRows, fail],
    );

    const columns = useMemo(
        () => buildColumns(sheet.type, { codeIdx, config, editors, onDelete: deleteRow, shift }),
        [sheet.type, codeIdx, config, editors, deleteRow, shift],
    );

    return (
        <div className="hm-gridwrap">
            {title && <h2 className="hm-shift-title">{title}</h2>}
            <div className="hm-toolbar">
                <button type="button" className="hm-btn" onClick={addRow}>
                    Add row
                </button>
                {shift !== 'night' && (
                    <span className="hm-hint">
                        Type a number or a downtime code · arrows to move · Enter picks the suggestion · drag the corner handle to fill
                    </span>
                )}
                {error && (
                    <span className="hm-error" role="alert" onClick={() => setError(null)}>
                        {error}
                    </span>
                )}
            </div>
            <DataGrid
                className={`rdg-light hm-grid${shift ? ' is-half' : ''}`}
                columns={columns}
                rows={displayRows}
                rowKeyGetter={(row) => row.id}
                rowClass={(row) => (row.__kind ? `hm-total-row is-${row.__kind}` : undefined)}
                onRowsChange={onRowsChange}
                onFill={({ columnKey, sourceRow, targetRow }) =>
                    sourceRow.__kind || targetRow.__kind
                        ? targetRow
                        : {
                              ...targetRow,
                              [columnKey]: sourceRow[columnKey],
                              // keep the displayed name in step with a filled employee ID
                              ...(columnKey.endsWith('_emp_id')
                                  ? { [columnKey.replace('_id', '_name')]: sourceRow[columnKey.replace('_id', '_name')] }
                                  : {}),
                          }
                }
                onCellCopy={({ row, column }) => {
                    clipboard.current = String(row[column.key] ?? '');
                }}
                onCellPaste={({ row, column }) =>
                    column.renderEditCell && !row.__kind ? { ...row, [column.key]: clipboard.current } : row
                }
                rowHeight={30}
                headerRowHeight={32}
                renderers={{ noRowsFallback: <div className="hm-empty">No rows yet. Use “Add row” to start this table.</div> }}
            />
        </div>
    );
}
