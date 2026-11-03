import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, errMsg } from './Lib';

const API = '/loading-plan/bosch-parts';

export default function BoschPartSettings() {
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState(null);
    const [search, setSearch] = useState('');
    const [bulk, setBulk] = useState('');
    const [bulkIsBosch, setBulkIsBosch] = useState(true);

    const seq = useRef(0);
    const load = useCallback(async (q) => {
        const id = ++seq.current;

        try {
            const { data } = await axios.get(API, { params: { q } });
            if (id !== seq.current) return;

            setRows(data.data);
            setTotal(data.total);
        } catch (err) {
            setMsg({ type: 'error', text: errMsg(err) });
        } finally {
            setLoading(false);
        }
    }, []);

    // debounced server-side search
    useEffect(() => {
        const t = setTimeout(() => load(search.trim()), 250);
        return () => clearTimeout(t);
    }, [search, load]);

    const run = async (fn, okText) => {
        setBusy(true);
        try {
            await fn();
            setMsg({ type: 'success', text: okText });
            await load(search.trim());
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
        const partnames = bulk.split(/[\n,;\t]+/).map((s) => s.trim()).filter(Boolean);
        if (!partnames.length) return;
        const ok = await run(
            () => axios.post(API, { partnames, is_bosch: bulkIsBosch }),
            `Saved ${new Set(partnames.map((p) => p.toUpperCase())).size} part name(s).`,
        );
        if (ok) setBulk('');
    };

    const toggle = (r) =>
        run(() => axios.patch(`${API}/${r.id}`, { is_bosch: !r.is_bosch }), `${r.partname} updated.`);

    const remove = (r) => {
        if (!window.confirm(`Remove ${r.partname} from the Bosch list?`)) return;
        run(() => axios.delete(`${API}/${r.id}`), `Removed ${r.partname}.`);
    };

    return (
        <div className="space-y-4">
            <Alert msg={msg} onClose={() => setMsg(null)} />

            <form onSubmit={add} className="card border border-base-300 bg-base-100">
                <div className="card-body gap-3">
                    <h3 className="font-medium">Add part names</h3>
                    <p className="text-sm opacity-70">
                        One per line (commas or Excel columns also work). Names are saved upper-cased; existing ones are updated.
                    </p>
                    <textarea
                        className="textarea textarea-bordered h-28 w-full max-w-xl font-mono text-sm"
                        value={bulk}
                        onChange={(e) => setBulk(e.target.value)}
                    />
                    <div className="flex items-center gap-4">
                        <label className="label cursor-pointer gap-2">
                            <input
                                type="checkbox"
                                className="checkbox checkbox-sm"
                                checked={bulkIsBosch}
                                onChange={(e) => setBulkIsBosch(e.target.checked)}
                            />
                            <span className="label-text">Mark as Bosch</span>
                        </label>
                        <button className="btn btn-primary btn-sm" disabled={busy || !bulk.trim()}>
                            Save
                        </button>
                    </div>
                </div>
            </form>

            <div className="flex items-center gap-4">
                <input
                    className="input input-bordered w-72"
                    placeholder="Search part names…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <span className="text-sm opacity-70">
                    {total.toLocaleString()} match{total === 1 ? '' : 'es'}
                    {total > rows.length && ` · showing first ${rows.length}`}
                </span>
            </div>

            {loading ? (
                <span className="loading loading-spinner" />
            ) : rows.length === 0 ? (
                <p className="opacity-70">No part names found.</p>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-base-300 bg-base-100">
                    <table className="table table-zebra table-sm">
                        <thead className="bg-base-200">
                            <tr>
                                <th>Part name</th>
                                <th className="w-28">Bosch</th>
                                <th className="w-20" />
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.id}>
                                    <td className="font-mono">{r.partname}</td>
                                    <td>
                                        <input
                                            type="checkbox"
                                            className="toggle toggle-sm toggle-primary"
                                            checked={!!r.is_bosch}
                                            disabled={busy}
                                            onChange={() => toggle(r)}
                                        />
                                    </td>
                                    <td>
                                        <button
                                            className="btn btn-ghost btn-xs text-error"
                                            disabled={busy}
                                            onClick={() => remove(r)}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}