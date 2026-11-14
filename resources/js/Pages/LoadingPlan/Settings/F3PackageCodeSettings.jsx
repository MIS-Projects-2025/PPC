import axios from 'axios';
import clsx from 'clsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, errMsg } from './Lib';

const API = '/loading-plan/f3-package-codes';
const TYPES_ID = 'f3-package-types';

/** Excel paste (tab-separated) or "code,type" lines -> [{ package_code, package_type }] */
function parseRows(text) {
    return text
        .split(/\r?\n/)
        .map((line) => {
            let cols = line.split('\t');
            if (cols.length < 2) cols = line.split(/[,;]/);
            return { package_code: (cols[0] ?? '').trim(), package_type: (cols[1] ?? '').trim() };
        })
        .filter((r) => r.package_code && r.package_type)
        .filter((r) => !/^package[\s_]?code$/i.test(r.package_code)); // skip a pasted header row
}

/** Click-to-edit text cell: saves on blur / Enter, Escape reverts. */
function EditCell({ value, disabled, onSave, mono }) {
    const [text, setText] = useState(value);
    useEffect(() => setText(value), [value]);

    const commit = async () => {
        const t = text.trim();
        if (t === value) return;
        if (!t) return setText(value);
        if (!(await onSave(t))) setText(value);
    };

    return (
        <input
            className={clsx('input input-ghost input-xs w-full max-w-xs', mono && 'font-mono')}
            list={mono ? undefined : TYPES_ID}
            maxLength={100}
            value={text}
            disabled={disabled}
            onChange={(e) => setText(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
                if (e.key === 'Escape') {
                    setText(value);
                    e.currentTarget.blur();
                }
            }}
        />
    );
}

export default function F3PackageCodeSettings() {
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [types, setTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState(null);
    const [search, setSearch] = useState('');
    const [bulk, setBulk] = useState('');

    const seq = useRef(0);
    const load = useCallback(async (q) => {
        const id = ++seq.current;
        try {
            const { data } = await axios.get(API, { params: { q } });
            if (id !== seq.current) return;
            setRows(data.data);
            setTotal(data.total);
            setTypes(data.types ?? []);
        } catch (err) {
            setMsg({ type: 'error', text: errMsg(err) });
        } finally {
            setLoading(false);
        }
    }, []);

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

    const parsed = parseRows(bulk);

    const submit = async (e) => {
        e.preventDefault();
        if (!parsed.length) return;
        const ok = await run(
            () => axios.post(API, { rows: parsed }),
            `Saved ${parsed.length} package code(s).`,
        );
        if (ok) setBulk('');
    };

    const save = (r, patch) =>
        run(() => axios.patch(`${API}/${r.id}`, { ...r, ...patch }), `${patch.package_code ?? r.package_code} updated.`);

    const remove = (r) => {
        if (!window.confirm(`Delete ${r.package_code}?`)) return;
        run(() => axios.delete(`${API}/${r.id}`), `Removed ${r.package_code}.`);
    };

    return (
        <div className="space-y-4">
            <Alert msg={msg} onClose={() => setMsg(null)} />

            <datalist id={TYPES_ID}>
                {types.map((t) => (
                    <option key={t} value={t} />
                ))}
            </datalist>

            <form onSubmit={submit} className="card border border-base-300 bg-base-100">
                <div className="card-body gap-3">
                    <h3 className="font-medium">Add or update package codes</h3>
                    <p className="text-sm opacity-70">
                        One per line: <span className="font-mono">package code</span>, then{' '}
                        <span className="font-mono">package type</span>. Paste two columns straight from Excel, or use a
                        comma. Codes are saved upper-cased; a code that already exists gets its type replaced.
                    </p>
                    <textarea
                        className="textarea textarea-bordered h-28 w-full max-w-xl font-mono text-sm"
                        value={bulk}
                        onChange={(e) => setBulk(e.target.value)}
                    />
                    <div className="flex items-center gap-3">
                        <button className="btn btn-sm btn-primary" disabled={busy || parsed.length === 0}>
                            Save{parsed.length > 0 && ` ${parsed.length}`}
                        </button>
                        {bulk.trim() && parsed.length === 0 && (
                            <span className="text-xs text-warning">No valid "code, type" pairs found.</span>
                        )}
                    </div>
                </div>
            </form>

            <div className="flex flex-wrap items-center gap-4">
                <input
                    className="input input-bordered w-72"
                    placeholder="Search code or type…"
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
                <p className="opacity-70">No package codes yet.</p>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-base-300 bg-base-100">
                    <table className="table table-zebra table-sm">
                        <thead className="bg-base-200">
                            <tr>
                                <th>Package code</th>
                                <th>Package type</th>
                                <th className="w-20" />
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.id}>
                                    <td>
                                        <EditCell mono value={r.package_code} disabled={busy} onSave={(v) => save(r, { package_code: v })} />
                                    </td>
                                    <td>
                                        <EditCell value={r.package_type} disabled={busy} onSave={(v) => save(r, { package_type: v })} />
                                    </td>
                                    <td>
                                        <button className="btn btn-ghost btn-xs text-error" disabled={busy} onClick={() => remove(r)}>
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