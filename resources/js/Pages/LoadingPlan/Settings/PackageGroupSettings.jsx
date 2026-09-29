import axios from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, errMsg } from './Lib';

const API = '/loading-plan/package-groups';

export default function PackageGroupSettings() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState(null);
    const [search, setSearch] = useState('');
    const [form, setForm] = useState({ group_name: '', package_name: '' });
    const [editing, setEditing] = useState(null);

    const load = useCallback(async () => {
        try {
            const { data } = await axios.get(API);
            setRows(data);
        } catch (err) {
            setMsg({ type: 'error', text: errMsg(err) });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const groupNames = useMemo(() => [...new Set(rows.map((r) => r.group_name))], [rows]);

    const groups = useMemo(() => {
        const q = search.trim().toLowerCase();
        const map = new Map();
        rows.forEach((r) => {
            if (q && !r.group_name.toLowerCase().includes(q) && !r.package_name.toLowerCase().includes(q)) return;
            if (!map.has(r.group_name)) map.set(r.group_name, []);
            map.get(r.group_name).push(r);
        });
        return [...map.entries()];
    }, [rows, search]);

    const run = async (fn, okText) => {
        setBusy(true);
        try {
            await fn();
            setMsg({ type: 'success', text: okText });
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
        const payload = { group_name: form.group_name.trim(), package_name: form.package_name.trim() };
        const ok = await run(() => axios.post(API, payload), `Added ${payload.package_name} to ${payload.group_name}.`);
        if (ok) setForm({ ...form, package_name: '' }); // keep the group for fast repeated entry
    };

    const saveEdit = async (e) => {
        e.preventDefault();
        const ok = await run(
            () =>
                axios.put(`${API}/${editing.id}`, {
                    group_name: editing.group_name.trim(),
                    package_name: editing.package_name.trim(),
                }),
            'Package updated.'
        );
        if (ok) setEditing(null);
    };

    const remove = (r) => {
        if (!window.confirm(`Remove ${r.package_name} from ${r.group_name}?`)) return;
        run(() => axios.delete(`${API}/${r.id}`), `Removed ${r.package_name}.`);
    };

    return (
        <div className="space-y-6">
            <Alert msg={msg} onClose={() => setMsg(null)} />

            <form onSubmit={add} className="card border border-base-300 bg-base-100">
                <div className="card-body gap-3">
                    <h3 className="font-medium">Add package</h3>
                    <p className="text-sm opacity-70">
                        Pick an existing group or type a new name to create one. A package can belong to one group only.
                    </p>
                    <div className="flex flex-wrap items-end gap-3">
                        <label className="form-control">
                            <span className="label-text mb-1">Group</span>
                            <input
                                list="pg-groups"
                                required
                                maxLength={30}
                                className="input input-bordered w-48"
                                value={form.group_name}
                                onChange={(e) => setForm({ ...form, group_name: e.target.value })}
                            />
                            <datalist id="pg-groups">
                                {groupNames.map((g) => (
                                    <option key={g} value={g} />
                                ))}
                            </datalist>
                        </label>
                        <label className="form-control">
                            <span className="label-text mb-1">Package name</span>
                            <input
                                required
                                maxLength={50}
                                className="input input-bordered w-56"
                                value={form.package_name}
                                onChange={(e) => setForm({ ...form, package_name: e.target.value })}
                            />
                        </label>
                        <button className="btn btn-primary" disabled={busy}>
                            Add
                        </button>
                    </div>
                </div>
            </form>

            <input
                className="input input-bordered w-72"
                placeholder="Search groups or packages…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />

            {loading ? (
                <span className="loading loading-spinner" />
            ) : groups.length === 0 ? (
                <p className="opacity-70">No package groups found.</p>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {groups.map(([name, items]) => (
                        <div key={name} className="card border border-base-300 bg-base-100">
                            <div className="card-body gap-2 p-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold">{name}</h3>
                                    <span className="badge badge-neutral">{items.length}</span>
                                </div>
                                <ul className="divide-y divide-base-200">
                                    {items.map((r) => (
                                        <li key={r.id} className="flex items-center justify-between py-1">
                                            <span className="font-mono text-sm">{r.package_name}</span>
                                            <span className="space-x-1">
                                                <button className="btn btn-ghost btn-xs" onClick={() => setEditing({ ...r })}>
                                                    Edit
                                                </button>
                                                <button
                                                    className="btn btn-ghost btn-xs text-error"
                                                    disabled={busy}
                                                    onClick={() => remove(r)}
                                                >
                                                    Delete
                                                </button>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {editing && (
                <dialog className="modal modal-open">
                    <form onSubmit={saveEdit} className="modal-box space-y-3">
                        <h3 className="text-lg font-semibold">Edit package</h3>
                        <label className="form-control">
                            <span className="label-text mb-1">Group</span>
                            <input
                                list="pg-groups"
                                required
                                maxLength={30}
                                className="input input-bordered"
                                value={editing.group_name}
                                onChange={(e) => setEditing({ ...editing, group_name: e.target.value })}
                            />
                        </label>
                        <label className="form-control">
                            <span className="label-text mb-1">Package name</span>
                            <input
                                required
                                maxLength={50}
                                className="input input-bordered"
                                value={editing.package_name}
                                onChange={(e) => setEditing({ ...editing, package_name: e.target.value })}
                            />
                        </label>
                        <div className="modal-action">
                            <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
                                Cancel
                            </button>
                            <button className="btn btn-primary" disabled={busy}>
                                Save
                            </button>
                        </div>
                    </form>
                    <div className="modal-backdrop" onClick={() => setEditing(null)} />
                </dialog>
            )}
        </div>
    );
}