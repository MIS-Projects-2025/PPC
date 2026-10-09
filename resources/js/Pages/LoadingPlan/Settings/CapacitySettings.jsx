import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BiChevronDown, BiChevronRight } from 'react-icons/bi';
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
            onCurrent(machine.id, data.find((r) => !r.effective_to)?.capacity ?? null);
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
    const [caps, setCaps] = useState(() =>
        Object.fromEntries(machines.map((m) => [m.id, m.current_capacity?.capacity ?? null]))
    );

    const onCurrent = useCallback(
        (id, cap) => setCaps((p) => (p[id] === cap ? p : { ...p, [id]: cap })),
        []
    );

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return q ? machines.filter((m) => String(m.machine_num).toLowerCase().includes(q)) : machines;
    }, [machines, search]);

    const missing = machines.filter((m) => caps[m.id] == null).length;

    return (
        <div className="space-y-4">
            <Alert msg={msg} onClose={() => setMsg(null)} />

            <div className="flex flex-wrap items-center gap-3">
                <input
                    className="input input-bordered w-64"
                    placeholder="Search machines…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <span className="text-sm opacity-70">
                    {filtered.length} machines · {missing} without capacity
                </span>
            </div>

            <div className="space-y-2">
                {filtered.map((m) => {
                    const open = openId === m.id;
                    const none = caps[m.id] == null;
                    return (
                        <div
                            key={m.id}
                            className={`overflow-hidden rounded-lg border ${
                                none ? 'border-warning bg-warning/10' : 'border-base-300 bg-base-100'
                            }`}
                        >
                            <button
                                type="button"
                                className="flex w-full items-center gap-3 px-4 py-3 text-left"
                                onClick={() => setOpenId(open ? null : m.id)}
                            >
                                {open ? <BiChevronDown size={18} /> : <BiChevronRight size={18} />}
                                <span className="font-medium">{m.machine_num}</span>
                                {m.factory && <span className="text-sm opacity-60">({m.factory})</span>}
                                <span className="ml-auto">
                                    {none ? (
                                        <span className="badge badge-warning">No capacity</span>
                                    ) : (
                                        <span className="font-mono">{fmt(caps[m.id])}</span>
                                    )}
                                </span>
                            </button>
                            {open && <MachineHistory machine={m} onCurrent={onCurrent} setMsg={setMsg} />}
                        </div>
                    );
                })}
                {filtered.length === 0 && <p className="opacity-70">No machines found.</p>}
            </div>
        </div>
    );
}