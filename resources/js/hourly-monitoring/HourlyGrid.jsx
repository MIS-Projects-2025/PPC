import { useCallback, useMemo, useRef, useState } from 'react';
import { DataGrid } from 'react-data-grid';
import { ApiError, api } from './api';
import { buildCodeIndex, reconcile, suggestCodes, toGridRow } from './cellUtils';
import { buildColumns } from './columns';
import { TextEditor, createSuggestEditor } from './SuggestEditor';

/**
 * Props: { sheet, rows, setRows, codes, config, employeesUrl }
 */
export default function HourlyGrid({ sheet, rows, setRows, codes, config, employeesUrl }) {
    const codeIdx = useMemo(() => buildCodeIndex(codes), [codes]);
    const [error, setError] = useState(null);
    const rowsRef = useRef(rows);
    rowsRef.current = rows;
    const queue = useRef(Promise.resolve()); // saves run one after another, in order
    const clipboard = useRef('');

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
                            for (const shift of ['day', 'night']) {
                                if ((server[`${shift}_emp_id`] ?? '') === (row[`${shift}_emp_id`] ?? '')) {
                                    next[`${shift}_emp_name`] = server[`${shift}_emp_name`] ?? '';
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
        [sheet.id, sheet.urls.rows, setRows, fail],
    );

    const onRowsChange = useCallback(
        (next, data) => {
            const previous = rowsRef.current;
            const accepted = [...next];
            const changes = [];
            let rejected = null;

            for (const index of data.indexes) {
                const result = reconcile(previous[index], next[index], sheet.type, codeIdx);
                if (result.error) {
                    rejected = result.error;
                    accepted[index] = previous[index]; // revert
                    continue;
                }
                accepted[index] = result.row;
                if (Object.keys(result.fields).length || Object.keys(result.cells).length) {
                    changes.push({ id: result.row.id, fields: result.fields, cells: result.cells });
                }
            }

            setRows(sheet.id, accepted);
            setError(rejected);
            if (changes.length) save(changes);
        },
        [sheet.id, sheet.type, codeIdx, setRows, save],
    );

    const addRow = async () => {
        try {
            const res = await api(sheet.urls.rows, { method: 'POST', body: {} });
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
        () => buildColumns(sheet.type, { codeIdx, config, editors, onDelete: deleteRow }),
        [sheet.type, codeIdx, config, editors, deleteRow],
    );

    return (
        <div className="hm-gridwrap">
            <div className="hm-toolbar">
                <button type="button" className="hm-btn" onClick={addRow}>
                    Add row
                </button>
                <span className="hm-hint">
                    Type a number or a downtime code · arrows to move · Enter picks the suggestion · drag the corner handle to fill
                </span>
                {error && (
                    <span className="hm-error" role="alert" onClick={() => setError(null)}>
                        {error}
                    </span>
                )}
            </div>
            <DataGrid
                className="rdg-light hm-grid"
                columns={columns}
                rows={rows}
                rowKeyGetter={(row) => row.id}
                onRowsChange={onRowsChange}
                onFill={({ columnKey, sourceRow, targetRow }) => ({
                    ...targetRow,
                    [columnKey]: sourceRow[columnKey],
                    // keep the displayed name in step with a filled employee ID
                    ...(columnKey.endsWith('_emp_id')
                        ? { [columnKey.replace('_id', '_name')]: sourceRow[columnKey.replace('_id', '_name')] }
                        : {}),
                })}
                onCellCopy={({ row, column }) => {
                    clipboard.current = String(row[column.key] ?? '');
                }}
                onCellPaste={({ row, column }) => (column.renderEditCell ? { ...row, [column.key]: clipboard.current } : row)}
                rowHeight={30}
                headerRowHeight={32}
                renderers={{ noRowsFallback: <div className="hm-empty">No rows yet. Use “Add row” to start this day.</div> }}
            />
        </div>
    );
}
