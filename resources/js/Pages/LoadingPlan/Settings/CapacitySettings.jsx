import axios from 'axios';
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { BiCheck, BiHistory } from 'react-icons/bi';
import { Alert, errMsg, today } from './Lib';
const API = '/loading-plan/machine-capacities';

const fmt = (n) => (n === null || n === undefined || n === '' ? '—' : Number(n).toLocaleString());

function MachineHistory({ machine, onCurrent, setMsg }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [form, setForm] = useState({ capacity: '', effective_from: today() });
    const [editId, setEditId] = useState(null);
    const [draft, setDraft] = useState({});

    const load = useCallback(async () => {
        try {
            const { data } = await axios.get(API, { params: { machine_id: machine.id } });
            setRows(data);
            onCurrent(machine.id, data.find((r) => !r.effective_to) ?? null);
        } catch (err) {
            setMsg({ type: 'error', text: errMsg(err) });
        } finally {
            setLoading(false);
        }
    }, [machine.id, onCurrent, setMsg]);

    useEffect(() => {
        load();
    }, [load]);

    const current = rows.find((r) => !r.effective_to);

    const run = async (fn, okText) => {
        setBusy(true);
        try {
            await fn();
            if (okText) setMsg({ type: 'success', text: okText });
            await load();
            return true;
        } catch (err) {
            setMsg({ type: 'error', text: errMsg(err) });
            return false;
        } finally {
            setBusy(false);
        }
    };

    const add = async (e) => {
        e.preventDefault();
        if (current && form.effective_from <= current.effective_from) {
            setMsg({
                type: 'error',
                text: `Start date must be after the current version's start (${current.effective_from}).`,
            });
            return;
        }
        const ok = await run(
            () =>
                axios.post(API, {
                    machine_id: machine.id,
                    capacity: form.capacity === '' ? null : Number(form.capacity),
                    effective_from: form.effective_from,
                }),
            'New capacity version saved. The previous version was closed.'
        );
        if (ok) setForm({ capacity: '', effective_from: today() });
    };

    const startEdit = (r) => {
        setEditId(r.id);
        setDraft({
            capacity: r.capacity ?? '',
            effective_from: r.effective_from ?? '',
            effective_to: r.effective_to ?? '',
        });
    };

    const saveEdit = async (id) => {
        const ok = await run(
            () =>
                axios.put(`${API}/${id}`, {
                    capacity: draft.capacity === '' ? null : Number(draft.capacity),
                    effective_from: draft.effective_from,
                    effective_to: draft.effective_to || null,
                }),
            'Record updated.'
        );
        if (ok) setEditId(null);
    };

    const remove = (r) => {
        if (!window.confirm('Deleting a historical version can leave a gap in the timeline.\n\nDelete this record?')) return;
        run(() => axios.delete(`${API}/${r.id}`), 'Record deleted.');
    };

    return (
        <div className="space-y-4 border-t border-base-300 bg-base-100 p-4">
            <form onSubmit={add} className="space-y-2">
                <p className="text-sm opacity-70">
                    Add new version — saving closes the current open-ended version the day before the new start date.
                </p>
                <div className="flex flex-wrap items-end gap-3">
                    <label className="form-control">
                        <span className="label-text mb-1">Capacity</span>
                        <input
                            type="number"
                            min="0"
                            className="input input-bordered input-sm w-40"
                            value={form.capacity}
                            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                        />
                    </label>
                    <label className="form-control">
                        <span className="label-text mb-1">Effective from</span>
                        <input
                            type="date"
                            required
                            className="input input-bordered input-sm"
                            value={form.effective_from}
                            onChange={(e) => setForm({ ...form, effective_from: e.target.value })}
                        />
                    </label>
                    <button className="btn btn-primary btn-sm" disabled={busy}>
                        Save version
                    </button>
                </div>
            </form>

            {loading ? (
                <span className="loading loading-spinner" />
            ) : rows.length === 0 ? (
                <p className="opacity-70">No capacity records for this machine.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="table table-zebra table-sm">
                        <thead>
                            <tr>
                                <th>Effective from</th>
                                <th>Effective to</th>
                                <th>Capacity</th>
                                <th />
                                <th className="text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) =>
                                editId === r.id ? (
                                    <tr key={r.id}>
                                        <td>
                                            <input
                                                type="date"
                                                className="input input-bordered input-sm"
                                                value={draft.effective_from}
                                                onChange={(e) => setDraft({ ...draft, effective_from: e.target.value })}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="date"
                                                className="input input-bordered input-sm"
                                                value={draft.effective_to}
                                                onChange={(e) => setDraft({ ...draft, effective_to: e.target.value })}
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="number"
                                                min="0"
                                                className="input input-bordered input-sm w-32"
                                                value={draft.capacity}
                                                onChange={(e) => setDraft({ ...draft, capacity: e.target.value })}
                                            />
                                        </td>
                                        <td />
                                        <td className="space-x-2 text-right">
                                            <button
                                                className="btn btn-primary btn-xs"
                                                disabled={busy}
                                                onClick={() => saveEdit(r.id)}
                                            >
                                                Save
                                            </button>
                                            <button className="btn btn-ghost btn-xs" onClick={() => setEditId(null)}>
                                                Cancel
                                            </button>
                                        </td>
                                    </tr>
                                ) : (
                                    <tr key={r.id}>
                                        <td>{r.effective_from}</td>
                                        <td>{r.effective_to ?? '—'}</td>
                                        <td>{fmt(r.capacity)}</td>
                                        <td>
                                            {!r.effective_to && <span className="badge badge-success badge-sm">Current</span>}
                                        </td>
                                        <td className="space-x-2 text-right">
                                            <button className="btn btn-ghost btn-xs" onClick={() => startEdit(r)}>
                                                Edit
                                            </button>
                                            <button
                                                className="btn btn-ghost btn-xs text-error"
                                                disabled={busy || !r.effective_to}
                                                title={!r.effective_to ? 'Add a new version instead' : undefined}
                                                onClick={() => remove(r)}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default function CapacitySettings({ machines = [] }) {
    const [search, setSearch] = useState('');
    const [openId, setOpenId] = useState(null);
    const [msg, setMsg] = useState(null);
    const [date, setDate] = useState(today());
    const [drafts, setDrafts] = useState({});
    const [status, setStatus] = useState({}); // id -> 'saving' | 'saved' | 'error'
    const [cur, setCur] = useState(() => Object.fromEntries(machines.map((m) => [m.id, m.current_capacity ?? null])));

    const onCurrent = useCallback((id, rec) => setCur((p) => ({ ...p, [id]: rec })), []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return q ? machines.filter((m) => String(m.machine_num).toLowerCase().includes(q)) : machines;
    }, [machines, search]);

    const missing = machines.filter((m) => cur[m.id]?.capacity == null).length;

    const flag = (id, s) => setStatus((p) => ({ ...p, [id]: s }));
    const clearDraft = (id) =>
        setDrafts((p) => {
            const { [id]: _, ...rest } = p;
            return rest;
        });

    const commit = async (m, raw) => {
        const c = cur[m.id];
        const val = String(raw).replace(/,/g, '').trim();
        if (val === '' || Number.isNaN(Number(val)) || Number(val) === (c?.capacity ?? null)) {
            clearDraft(m.id);
            return;
        }
        flag(m.id, 'saving');
        try {
            if (c && date < c.effective_from) {
                throw new Error(`Effective date is before the current version's start (${c.effective_from}).`);
            }
            if (c && c.effective_from === date) {
                await axios.put(`${API}/${c.id}`, { capacity: Number(val), effective_from: c.effective_from, effective_to: null });
            } else {
                await axios.post(API, { machine_id: m.id, capacity: Number(val), effective_from: date });
            }
            const { data } = await axios.get(API, { params: { machine_id: m.id } });
            onCurrent(m.id, data.find((r) => !r.effective_to) ?? null);
            clearDraft(m.id);
            flag(m.id, 'saved');
        } catch (err) {
            flag(m.id, 'error');
            setMsg({ type: 'error', text: `${m.machine_num}: ${errMsg(err)}` });
        }
    };

    const focusRow = (i) => document.getElementById(`cap-${filtered[i]?.id}`)?.focus();

    const onKeyDown = (e, i) => {
        if (e.key === 'Enter' || e.key === 'ArrowDown') {
            e.preventDefault();
            focusRow(i + 1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            focusRow(i - 1);
        }
    };

    // Paste a column from Excel: fills downward from the focused row.
    const onPaste = async (e, i) => {
        const lines = e.clipboardData.getData('text').split(/\r?\n/).filter((l) => l.trim() !== '');
        if (lines.length < 2) return;
        e.preventDefault();
        for (let k = 0; k < lines.length && filtered[i + k]; k++) {
            await commit(filtered[i + k], lines[k].split('\t')[0]);
        }
    };

    return (
        <div className="space-y-4">
            <Alert msg={msg} onClose={() => setMsg(null)} />

            <div className="flex flex-wrap items-end gap-4">
                <input
                    className="input input-bordered w-64"
                    placeholder="Search machines…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <label className="form-control">
                    <span className="label-text mb-1 text-xs">Effective from (applies to edits)</span>
                    <input
                        type="date"
                        className="input input-bordered input-sm"
                        value={date}
                        onChange={(e) => setDate(e.target.value || today())}
                    />
                </label>
                <span className="text-sm opacity-70">
                    {filtered.length} machines · {missing} without capacity
                </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-base-300 bg-base-100">
                <table className="table table-sm">
                    <thead className="sticky top-0 z-10 bg-base-200">
                        <tr>
                            <th>Machine</th>
                            <th>Factory</th>
                            <th className="w-48">Capacity</th>
                            <th>Since</th>
                            <th className="w-10" />
                            <th className="w-10" />
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((m, i) => {
                            const c = cur[m.id];
                            console.log("c", c);                            
                            const none = c?.capacity == null;
                            const st = status[m.id];
                            const open = openId === m.id;
                            return (
                                <Fragment key={m.id}>
                                    <tr className={none ? 'bg-warning/10' : ''}>
                                        <td className="font-medium">{m.machine_num}</td>
                                        <td className="opacity-70">{m.factory ?? '—'}</td>
                                        <td>
                                            <input
                                                id={`cap-${m.id}`}
                                                type="text"
                                                inputMode="numeric"
                                                autoComplete="off"
                                                placeholder={none ? 'No capacity' : ''}
                                                className={`input input-bordered input-sm w-40 text-right font-mono ${
                                                    st === 'error' ? 'input-error' : ''
                                                } ${drafts[m.id] !== undefined ? 'input-warning' : ''}`}
                                                value={drafts[m.id] ?? c?.capacity ?? ''}
                                                onFocus={(e) => e.target.select()}
                                                onChange={(e) => {
                                                    setDrafts({ ...drafts, [m.id]: e.target.value });
                                                    flag(m.id, null);
                                                }}
                                                onBlur={(e) => drafts[m.id] !== undefined && commit(m, e.target.value)}
                                                onKeyDown={(e) => onKeyDown(e, i)}
                                                onPaste={(e) => onPaste(e, i)}
                                            />
                                        </td>
                                        <td className="text-sm opacity-60">{c?.effective_from ?? '—'}</td>
                                        <td>
                                            {st === 'saving' && <span className="loading loading-spinner loading-xs" />}
                                            {st === 'saved' && <BiCheck className="text-success" size={18} />}
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-xs btn-square"
                                                title="History"
                                                tabIndex={-1}
                                                onClick={() => setOpenId(open ? null : m.id)}
                                            >
                                                <BiHistory size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                    {open && (
                                        <tr>
                                            <td colSpan={6} className="p-0">
                                                <MachineHistory machine={m} onCurrent={onCurrent} setMsg={setMsg} />
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
                {filtered.length === 0 && <p className="p-4 opacity-70">No machines found.</p>}
            </div>
        </div>
    );
}