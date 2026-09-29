import axios from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, errMsg, today } from './Lib';
const API = '/loading-plan/machine-capacities';

export default function CapacitySettings({ machines = [] }) {
    const [search, setSearch] = useState('');
    const [machineId, setMachineId] = useState('');
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState(null);
    const [form, setForm] = useState({ capacity: '', effective_from: today() });
    const [editId, setEditId] = useState(null);
    const [draft, setDraft] = useState({});
    const reqRef = useRef(0);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return q ? machines.filter((m) => String(m.machine_num).toLowerCase().includes(q)) : machines;
    }, [machines, search]);

    const load = useCallback(async (id) => {
        const req = ++reqRef.current;
        if (!id) {
            setRows([]);
            return;
        }
        setLoading(true);
        try {
            const { data } = await axios.get(API, { params: { machine_id: id } });
            if (req === reqRef.current) setRows(data);
        } catch (err) {
            if (req === reqRef.current) setMsg({ type: 'error', text: errMsg(err) });
        } finally {
            if (req === reqRef.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        setEditId(null);
        load(machineId);
    }, [machineId, load]);

    const current = rows.find((r) => !r.effective_to);

    const run = async (fn, okText) => {
        setBusy(true);
        try {
            await fn();
            if (okText) setMsg({ type: 'success', text: okText });
            await load(machineId);
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
                    machine_id: Number(machineId),
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
        const warn = !r.effective_to
            ? 'This is the CURRENT version. Deleting it leaves the machine with no open-ended record.'
            : 'Deleting a historical version can leave a gap in the timeline.';
        if (!window.confirm(`${warn}\n\nDelete this record?`)) return;
        run(() => axios.delete(`${API}/${r.id}`), 'Record deleted.');
    };

    return (
        <div className="space-y-6">
            <Alert msg={msg} onClose={() => setMsg(null)} />

            <div className="card border border-base-300 bg-base-100">
                <div className="card-body gap-3">
                    <h3 className="font-medium">Machine</h3>
                    <div className="flex flex-wrap gap-3">
                        <input
                            className="input input-bordered w-48"
                            placeholder="Filter machines…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <select
                            className="select select-bordered w-72"
                            value={machineId}
                            onChange={(e) => setMachineId(e.target.value)}
                        >
                            <option value="">Select a machine…</option>
                            {filtered.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.machine_num}
                                    {m.factory ? ` (${m.factory})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {machineId && (
                <>
                    <form onSubmit={add} className="card border border-base-300 bg-base-100">
                        <div className="card-body gap-3">
                            <h3 className="font-medium">Add new version</h3>
                            <p className="text-sm opacity-70">
                                Saving closes the current open-ended version the day before the new start date.
                            </p>
                            <div className="flex flex-wrap items-end gap-3">
                                <label className="form-control">
                                    <span className="label-text mb-1">Capacity</span>
                                    <input
                                        type="number"
                                        min="0"
                                        className="input input-bordered w-40"
                                        value={form.capacity}
                                        onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                                    />
                                </label>
                                <label className="form-control">
                                    <span className="label-text mb-1">Effective from</span>
                                    <input
                                        type="date"
                                        required
                                        className="input input-bordered"
                                        value={form.effective_from}
                                        onChange={(e) => setForm({ ...form, effective_from: e.target.value })}
                                    />
                                </label>
                                <button className="btn btn-primary" disabled={busy}>
                                    Save version
                                </button>
                            </div>
                        </div>
                    </form>

                    <div className="card border border-base-300 bg-base-100">
                        <div className="card-body">
                            <h3 className="mb-2 font-medium">History</h3>
                            {loading ? (
                                <span className="loading loading-spinner" />
                            ) : rows.length === 0 ? (
                                <p className="opacity-70">No capacity records for this machine.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="table table-zebra">
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
                                                                onChange={(e) =>
                                                                    setDraft({ ...draft, effective_from: e.target.value })
                                                                }
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="date"
                                                                className="input input-bordered input-sm"
                                                                value={draft.effective_to}
                                                                onChange={(e) =>
                                                                    setDraft({ ...draft, effective_to: e.target.value })
                                                                }
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                className="input input-bordered input-sm w-28"
                                                                value={draft.capacity}
                                                                onChange={(e) =>
                                                                    setDraft({ ...draft, capacity: e.target.value })
                                                                }
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
                                                        <td>{r.capacity ?? '—'}</td>
                                                        <td>
                                                            {!r.effective_to && (
                                                                <span className="badge badge-success badge-sm">Current</span>
                                                            )}
                                                        </td>
                                                        <td className="space-x-2 text-right">
                                                            <button className="btn btn-ghost btn-xs" onClick={() => startEdit(r)}>
                                                                Edit
                                                            </button>
                                                            <button
                                                                className="btn btn-ghost btn-xs text-error"
                                                                disabled={busy}
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
                    </div>
                </>
            )}
        </div>
    );
}