import MachineGroups from '@/Components/LoadingPlan/MachineGroups';
import MachineTransitionRules from '@/Components/LoadingPlan/MachineTransitionRules';
import RuleForm from '@/Components/LoadingPlan/RuleForm';
import { blank, buildGrid, canPaint, colLabel, dependents, rowKey, rowTitle } from '@/Lib/LoadingPlan/capabilityModel';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useMemo, useRef, useState } from 'react';

const PROCESSES = ['taping', 'tubing', 'both', 'tray'];

const PROCESS_STYLE = {
    taping: 'bg-sky-100 text-sky-800',
    tubing: 'bg-emerald-100 text-emerald-800',
    both: 'bg-indigo-100 text-indigo-800',
    tray: 'bg-orange-100 text-orange-800',
};

const PROCESS_FILL = {
    taping: 'bg-sky-500 text-white',
    tubing: 'bg-emerald-500 text-white',
    both: 'bg-indigo-500 text-white',
    tray: 'bg-orange-500 text-white',
};

const linkBtn = 'text-xs text-blue-600 underline hover:text-blue-800';
const input = 'w-full rounded border border-gray-300 px-3 py-2 text-sm';

function Chip({ children, className = 'bg-gray-100 text-gray-700', title }) {
    return (
        <span title={title} className={`inline-block rounded px-1.5 py-0.5 text-[11px] ${className}`}>
            {children}
        </span>
    );
}

// ---------------------------------------------------------------------
// Row form: identity fields shared by every state in a row
// ---------------------------------------------------------------------
function RowForm({ row, onSubmit, onClose }) {
    const [v, setV] = useState({
        factory: row?.factory ?? '',
        package_name: row?.package_name ?? '',
        body_size: row?.body_size ?? '',
        thickness: row?.thickness ?? '',
        focus_group: row?.focus_group ?? '',
        lot_type: row?.lot_type ?? '',
    });
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const set = (k) => (e) => setV((cur) => ({ ...cur, [k]: e.target.value }));

    const submit = async (e) => {
        e.preventDefault();
        if (!v.factory) {
            setError('Factory is required.');
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await onSubmit({
                factory: v.factory,
                package_name: v.package_name.trim() || null,
                body_size: v.body_size.trim() || null,
                thickness: v.thickness === '' ? null : v.thickness,
                focus_group: v.focus_group.trim() || null,
                lot_type: v.lot_type.trim() || null,
            });
        } catch (err) {
            setError(err.response?.data?.message ?? 'Something went wrong. Please try again.');
            setBusy(false);
        }
    };

    const field = (label, k, props = {}) => (
        <div>
            <label className="mb-1 block text-xs font-semibold">{label}</label>
            <input value={v[k]} onChange={set(k)} className={input} {...props} />
        </div>
    );

    return (
        <form onSubmit={submit} className="space-y-3">
            <div>
                <label className="mb-1 block text-xs font-semibold">Factory <span className="text-red-500">*</span></label>
                <select value={v.factory} onChange={set('factory')} className={input}>
                    <option value="">-- select --</option>
                    {['F1', 'F2', 'F3'].map((f) => <option key={f}>{f}</option>)}
                </select>
            </div>
            {field('Package name (blank = any)', 'package_name')}
            {field('Body size (blank = any)', 'body_size')}
            {field('Thickness', 'thickness', { type: 'number', step: 'any' })}
            {field('Focus group (blank = any)', 'focus_group')}
            {field('Lot type (blank = any)', 'lot_type')}
            {error && <div className="rounded border border-red-500 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
            <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onClose} className="rounded border border-gray-300 px-3 py-2 text-sm">Cancel</button>
                <button type="submit" disabled={busy} className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
                    {busy ? 'Saving…' : 'Save'}
                </button>
            </div>
        </form>
    );
}

// ---------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------
export default function MachineCapabilities({ machine, machines = [] }) {
    const [states, setStates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [layer, setLayer] = useState('all'); // all | taping | tubing | both | tray
    const [dev, setDev] = useState(false);
    const [note, setNote] = useState(null);
    const [draftRows, setDraftRows] = useState([]);
    const [draftCols, setDraftCols] = useState([]);
    const [newCol, setNewCol] = useState('');
    const [drawer, setDrawer] = useState(null); // { kind: 'state' | 'row', ... }
    const [tab, setTab] = useState('capabilities'); // capabilities | groups | rules
    const deleteButtonRef = useRef(null);

    useEffect(() => {
        if (drawer) {
            requestAnimationFrame(() => {
                deleteButtonRef.current?.focus();
            });
        }
    }, [drawer]);

    const load = () =>
        axios
            .get(`/rules/machines/${machine.id}/capabilities`)
            .then(({ data }) => setStates(data.states))
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [machine.id]);

    // -----------------------------------------------------------------
    // Model: rows x columns, with part-routed states kept separate
    // -----------------------------------------------------------------
    const model = useMemo(() => buildGrid(states, draftRows, draftCols), [states, draftRows, draftCols]);

    const cellStates = (row, col) => model.cells.get(`${row.key}#${col.key}`) ?? [];
    const rowStates = (row) => model.cols.flatMap((c) => cellStates(row, c));

    // -----------------------------------------------------------------
    // API actions
    // -----------------------------------------------------------------
    const describeError = (err) => err.response?.data?.message ?? Object.values(err.response?.data?.errors ?? {}).flat().join(' ') ?? 'Something went wrong.';

    const buildState = (row, col, process) => {
        const single = col.kind === 'single';
        return {
            factory: row.factory,
            package_name: blank(row.package_name) ? null : row.package_name,
            body_size: blank(row.body_size) ? null : row.body_size,
            thickness: blank(row.thickness) ? null : row.thickness,
            focus_group: blank(row.focus_group) ? null : row.focus_group,
            lot_type: blank(row.lot_type) ? null : row.lot_type,
            ...(single ? { leadcount_min: col.n, leadcount_max: col.n } : {}),
            process_type: process,
            remarks: `${machine.machine_num}: ${row.factory} ${row.package_name ?? 'ANY pkg'}${row.body_size ? ` ${row.body_size}` : ''}${single ? `, ${col.n}L` : ''}, ${process}`,
        };
    };

    const createStates = async (list) => {
        if (!list.length) return;
        try {
            const { data } = await axios.post('/rules/setup-states/bulk', { machine_id: machine.id, states: list });
            setNote(`Created ${data.created}${data.skipped ? `, skipped ${data.skipped} that already existed` : ''}.`);
            await load();
        } catch (err) {
            setNote(describeError(err));
        }
    };

    const confirmDelete = (list, what) => {
        const deps = list.reduce((n, s) => n + dependents(s), 0);
        return confirm(
            `Delete ${what} (${list.length} capabilit${list.length === 1 ? 'y' : 'ies'})?` +
                (deps ? `\n\nThis also deletes ${deps} part rule(s), transition rule(s) and override(s) attached to them.` : '') +
                '\n\nA snapshot is kept in the audit log.'
        );
    };

    const deleteStates = async (list, what) => {
        if (!list.length || !confirmDelete(list, what)) return;
        try {
            const { data } = await axios.delete('/rules/setup-states/bulk', {
                data: { machine_id: machine.id, ids: list.map((s) => s.setup_state_id) },
            });
            setNote(`Deleted ${data.deleted}.`);
            await load();
        } catch (err) {
            setNote(describeError(err));
        }
    };

    // Paint one cell for the active layer
    const toggleCell = (row, col) => {
        const existing = cellStates(row, col).filter((s) => s.process_type === layer);
        if (existing.length) return deleteStates(existing, `${layer} for ${rowTitle(row)} ${colLabel(col)}`);
        if (canPaint(col)) return createStates([buildState(row, col, layer)]);
    };

    // Paint a whole row or column: fills what's missing, or clears when already full
    const toggleGroup = (pairs, what) => {
        const paintable = pairs.filter(([, c]) => canPaint(c));
        const missing = paintable.filter(([r, c]) => !cellStates(r, c).some((s) => s.process_type === layer));
        if (missing.length) return createStates(missing.map(([r, c]) => buildState(r, c, layer)));
        const existing = paintable.flatMap(([r, c]) => cellStates(r, c).filter((s) => s.process_type === layer));
        return deleteStates(existing, `${layer} for ${what}`);
    };

    const deleteRow = (row) => {
        const list = rowStates(row);
        if (!list.length) {
            setDraftRows((d) => d.filter((r) => rowKey(r) !== row.key));
            return;
        }
        return deleteStates(list, `the row ${rowTitle(row)}`);
    };

    const saveRow = async (row, fields) => {
        if (!row) {
            setDraftRows((d) => [...d, fields]);
            setDrawer(null);
            return;
        }
        const list = rowStates(row);
        if (!list.length) {
            setDraftRows((d) => d.map((r) => (rowKey(r) === row.key ? fields : r)));
        } else {
            await axios.patch('/rules/setup-states/bulk', { machine_id: machine.id, ids: list.map((s) => s.setup_state_id), fields });
            setNote(`Updated ${list.length} capabilit${list.length === 1 ? 'y' : 'ies'}.`);
            await load();
        }
        setDrawer(null);
    };

    const addColumn = () => {
        const n = parseInt(newCol, 10);
        if (Number.isNaN(n) || n < 0) return;
        setDraftCols((d) => (d.includes(n) ? d : [...d, n]));
        setNewCol('');
    };

    const closeDrawer = () => {
        setDrawer(null);
        load();
    };

    const openAdd = (row, col) =>
        setDrawer({
            kind: 'state',
            editId: null,
            initialValues: {
                machine_id: machine.id,
                factory: row.factory,
                package_name: row.package_name,
                body_size: row.body_size,
                thickness: row.thickness,
                focus_group: row.focus_group,
                lot_type: row.lot_type,
                ...(col.kind === 'single' ? { leadcount_min: col.n, leadcount_max: col.n } : {}),
            },
        });

    const openEdit = (s) => setDrawer({ kind: 'state', editId: s.setup_state_id, initialValues: s });

    // -----------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------
    const layerBtn = (value, label) => (
        <button
            key={value}
            type="button"
            onClick={() => setLayer(value)}
            className={`rounded border px-3 py-1.5 text-sm ${layer === value ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-300 hover:bg-gray-50'}`}
        >
            {label}
        </button>
    );

    return (
        <>
            <Head title={`${machine.machine_num} capabilities`} />

            <div className="mx-auto max-w-7xl p-8 font-sans">
                <div className="mb-1 text-sm">
                    <Link href="/rules" className={linkBtn}>← All rules</Link>
                </div>
                <div className="mb-4 flex flex-wrap items-center gap-4">
                    <h1 className="text-xl font-semibold">{machine.machine_num} capabilities</h1>
                    <span className="text-sm text-gray-500">
                        {states.length} total, {model.rows.length} rows{model.routed.length ? `, ${model.routed.length} part-routed` : ''}
                    </span>
                    <label className="ml-auto flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={dev} onChange={(e) => setDev(e.target.checked)} />
                        Show IDs and details
                    </label>
                </div>

                <div className="mb-4 flex gap-1 border-b border-gray-200">
                    {[['capabilities', 'Capabilities'], ['groups', 'Groups'], ['rules', 'Pair and axis rules']].map(([v, label]) => (
                        <button
                            key={v}
                            type="button"
                            onClick={() => setTab(v)}
                            className={`-mb-px border-b-2 px-4 py-2 text-sm ${tab === v ? 'border-gray-900 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {tab === 'groups' && !loading && <MachineGroups machine={machine} states={states} dev={dev} onOpenRules={() => setTab('rules')} />}
                {tab === 'rules' && !loading && <MachineTransitionRules machine={machine} machines={machines} />}

                {tab === 'capabilities' && (
                <>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="text-sm text-gray-600">Mode</span>
                    {layerBtn('all', 'View and edit')}
                    {PROCESSES.map((p) => layerBtn(p, `Paint ${p}`))}
                </div>
                <p className="mb-4 text-xs text-gray-500">
                    {layer === 'all'
                        ? 'Click a process chip to edit it, or + to add a capability with the full form. Switch to a Paint mode to add or remove one process quickly.'
                        : `Click a cell to add or remove ${layer}. Click a package or a leadcount to fill or clear the whole row or column.`}
                </p>

                {note && (
                    <div className="mb-3 flex items-center gap-3 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                        <span>{note}</span>
                        <button type="button" className={`${linkBtn} ml-auto`} onClick={() => setNote(null)}>Dismiss</button>
                    </div>
                )}

                {loading ? (
                    <div className="py-10 text-center text-sm text-gray-500">Loading…</div>
                ) : (
                    <div className="overflow-x-auto rounded border border-gray-200">
                        <table className="border-collapse bg-white text-sm">
                            <thead>
                                <tr>
                                    <th className="sticky left-0 z-10 min-w-[260px] bg-gray-100 px-3 py-2 text-left text-xs font-semibold text-gray-600">Package</th>
                                    {model.cols.map((c) => (
                                        <th key={c.key} className="min-w-[76px] bg-gray-100 px-1 py-2 text-xs font-semibold text-gray-600">
                                            {layer !== 'all' && canPaint(c) ? (
                                                <button type="button" className="rounded px-2 py-1 hover:bg-gray-200" onClick={() => toggleGroup(model.rows.map((r) => [r, c]), colLabel(c))}>
                                                    {colLabel(c)}
                                                </button>
                                            ) : (
                                                colLabel(c)
                                            )}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {model.rows.length === 0 && (
                                    <tr><td colSpan={model.cols.length + 1} className="px-3 py-8 text-center text-gray-500">No capabilities yet. Add a row below, then add a leadcount column and paint cells.</td></tr>
                                )}
                                {model.rows.map((r) => (
                                    <tr key={r.key} className="border-t border-gray-100">
                                        <td className="sticky left-0 z-10 bg-white px-3 py-2 align-top">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <Chip className="bg-gray-800 text-white">{r.factory}</Chip>
                                                {layer !== 'all' ? (
                                                    <button type="button" className="font-medium hover:underline" onClick={() => toggleGroup(model.cols.map((c) => [r, c]), rowTitle(r))}>
                                                        {rowTitle(r)}
                                                    </button>
                                                ) : (
                                                    <span className="font-medium">{rowTitle(r)}</span>
                                                )}
                                                {!blank(r.thickness) && <Chip>thickness {r.thickness}</Chip>}
                                                {r.focus_group && <Chip className="bg-teal-50 text-teal-800">focus {r.focus_group}</Chip>}
                                                {r.lot_type && <Chip className="bg-teal-50 text-teal-800">lot {r.lot_type}</Chip>}
                                            </div>
                                            <div className="mt-1 flex gap-3">
                                                <button type="button" className={linkBtn} onClick={() => setDrawer({ kind: 'row', row: r })}>Edit row</button>
                                                <button type="button" className="text-xs text-red-600 hover:text-red-800" onClick={() => deleteRow(r)}>Delete row</button>
                                            </div>
                                        </td>
                                        {model.cols.map((c) => {
                                            const here = cellStates(r, c);
                                            if (layer === 'all') {
                                                return (
                                                    <td key={c.key} className="px-1 py-1.5 align-top">
                                                        <div className="flex min-h-[28px] flex-wrap items-center justify-center gap-1">
                                                            {here.map((s) => (
                                                                <button
                                                                    key={s.setup_state_id}
                                                                    type="button"
                                                                    onClick={() => openEdit(s)}
                                                                    title={`${s.remarks ?? ''} (state #${s.setup_state_id})`}
                                                                    className={`rounded px-1.5 py-0.5 text-[11px] ${PROCESS_STYLE[s.process_type]} hover:opacity-80`}
                                                                >
                                                                    {s.process_type}
                                                                    {dev && <span className="ml-1 opacity-60">#{s.setup_state_id}</span>}
                                                                </button>
                                                            ))}
                                                            <button type="button" onClick={() => openAdd(r, c)} aria-label="Add capability" className="px-1 text-gray-300 hover:text-gray-700">+</button>
                                                        </div>
                                                    </td>
                                                );
                                            }
                                            const hit = here.filter((s) => s.process_type === layer);
                                            const disabled = !hit.length && !canPaint(c);
                                            return (
                                                <td key={c.key} className="px-1 py-1.5 text-center">
                                                    <button
                                                        type="button"
                                                        disabled={disabled}
                                                        onClick={() => toggleCell(r, c)}
                                                        className={`h-8 w-full rounded text-xs ${hit.length ? PROCESS_FILL[layer] : disabled ? 'cursor-not-allowed bg-gray-50 text-gray-300' : 'border border-dashed border-gray-300 text-gray-300 hover:border-gray-500 hover:text-gray-600'}`}
                                                    >
                                                        {hit.length ? (hit.length > 1 ? `✓ ×${hit.length}` : dev ? `#${hit[0].setup_state_id}` : '✓') : disabled ? '–' : '+'}
                                                    </button>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => setDrawer({ kind: 'row', row: null })} className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">
                        + Add row
                    </button>
                    <div className="flex items-center gap-2">
                        <input
                            value={newCol}
                            onChange={(e) => setNewCol(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addColumn()}
                            type="number"
                            min="0"
                            placeholder="Leadcount"
                            className="w-28 rounded border border-gray-300 px-3 py-1.5 text-sm"
                        />
                        <button type="button" onClick={addColumn} className="rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">+ Add column</button>
                    </div>
                    <span className="text-xs text-gray-500">New rows and columns appear empty until you paint a cell.</span>
                </div>

                {model.routed.length > 0 && (
                    <details className="mt-8">
                        <summary className="cursor-pointer text-sm font-semibold">Part-routed capabilities ({model.routed.length})</summary>
                        <p className="mb-2 mt-1 text-xs text-gray-500">
                            These are the destination of a part rule, so only the parts named in those rules can use them. They are kept out of the matrix on purpose.
                        </p>
                        <div className="overflow-x-auto rounded border border-gray-200">
                            <table className="w-full border-collapse bg-white text-xs">
                                <thead>
                                    <tr className="bg-gray-100 text-left text-gray-600">
                                        <th className="px-3 py-2 font-semibold">Factory</th>
                                        <th className="px-3 py-2 font-semibold">Package</th>
                                        <th className="px-3 py-2 font-semibold">Process</th>
                                        <th className="px-3 py-2 font-semibold">Remarks</th>
                                        <th className="px-3 py-2 font-semibold">Part rules</th>
                                        <th />
                                    </tr>
                                </thead>
                                <tbody>
                                    {model.routed.map((s) => (
                                        <tr key={s.setup_state_id} className="border-t border-gray-100">
                                            <td className="px-3 py-2">{s.factory}</td>
                                            <td className="px-3 py-2">{rowTitle(s)}</td>
                                            <td className="px-3 py-2"><Chip className={PROCESS_STYLE[s.process_type]}>{s.process_type}</Chip></td>
                                            <td className="px-3 py-2 text-gray-600">{s.remarks}{dev && <span className="ml-2 text-gray-400">#{s.setup_state_id}</span>}</td>
                                            <td className="px-3 py-2">{s.part_rule_count}</td>
                                            <td className="space-x-3 px-3 py-2 text-right">
                                                <button type="button" className={linkBtn} onClick={() => openEdit(s)}>Edit</button>
                                                <button type="button" className="text-xs text-red-600 hover:text-red-800" onClick={() => deleteStates([s], 'this part-routed capability')}>Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </details>
                )}
                </>
                )}
            </div>

            {drawer && (
                <div className="fixed inset-0 z-[60]">
                    <div className="absolute inset-0 bg-black/40" onMouseDown={drawer.kind === 'state' ? closeDrawer : () => setDrawer(null)} />
                    <aside className="absolute right-0 top-0 h-full w-[480px] max-w-full overflow-y-auto bg-white p-6 shadow-xl">
                        {drawer.kind === 'row' ? (
                            <>
                                <h3 className="mb-1 text-lg font-semibold">{drawer.row ? 'Edit row' : 'Add row'}</h3>
                                <p className="mb-4 text-xs text-gray-500">
                                    {drawer.row ? 'Changes apply to every capability in this row.' : 'The row stays empty until you paint a cell in it.'}
                                </p>
                                <RowForm row={drawer.row} onSubmit={(fields) => saveRow(drawer.row, fields)} onClose={() => setDrawer(null)} />
                            </>
                        ) : (
                            <>
                                <h3 className="mb-4 text-lg font-semibold">{drawer.editId ? `Edit capability #${drawer.editId}` : 'Add capability'}</h3>
                                <RuleForm
                                    key={drawer.editId ?? 'new'}
                                    machines={machines}
                                    type="setup_state"
                                    initialValues={drawer.initialValues}
                                    editId={drawer.editId}
                                    onClose={closeDrawer}
                                    onSaved={closeDrawer}
                                />
                                {drawer.editId && (
                                    <div className="mt-6 border-t border-gray-100 pt-4">
                                        <button
                                            ref={deleteButtonRef}
                                            type="button"
                                            className="text-sm text-red-600 hover:text-red-800"
                                            onClick={async () => {
                                                const s = states.find((x) => x.setup_state_id === drawer.editId);
                                                if (s) {
                                                    await deleteStates([s], 'this capability');
                                                    setDrawer(null);
                                                }
                                            }}
                                            onKeyDown={async (e) => {
                                                if (e.key === 'Delete') {
                                                    e.preventDefault();
                                                    const s = states.find((x) => x.setup_state_id === drawer.editId);
                                                    if (s) {
                                                        await deleteStates([s], 'this capability');
                                                        setDrawer(null);
                                                    }
                                                }
                                            }}
                                        >
                                            Delete this capability
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </aside>
                </div>
            )}
        </>
    );
}