import axios from 'axios';
import { Fragment, useMemo, useState } from 'react';
import { BiCheck, BiTrash } from 'react-icons/bi';
import { Alert, errMsg } from './Lib';

const API = '/loading-plan/capacity-bands';
const FIELDS = ['qty_min', 'qty_max', 'capacity_uph'];
const EMPTY = { platform: '', qty_min: '', qty_max: '', capacity_uph: '' };
const fmt = (n) => (n === null || n === undefined || n === '' ? '—' : Number(n).toLocaleString());
const sortRows = (a, b) => a.platform.localeCompare(b.platform) || a.qty_min - b.qty_min;

export default function CapacityBandSettings({ initial = [] }) {
    const [rows, setRows] = useState(initial);
    const [msg, setMsg] = useState(null);
    const [busy, setBusy] = useState(false);
    const [form, setForm] = useState(EMPTY);
    const [drafts, setDrafts] = useState({}); // `${id}:${field}` -> string
    const [status, setStatus] = useState({}); // id -> 'saving' | 'saved' | 'error'

    const groups = useMemo(() => {
        const g = {};
        rows.forEach((r) => (g[r.platform] ??= []).push(r));
        return g;
    }, [rows]);

    // Flat render order, used for keyboard navigation between rows.
    const order = useMemo(() => Object.values(groups).flat(), [groups]);

    const flag = (id, s) => setStatus((p) => ({ ...p, [id]: s }));
    const clearDraft = (key) =>
        setDrafts((p) => {
            const { [key]: _, ...rest } = p;
            return rest;
        });

    const commit = async (r, field, raw) => {
        const key = `${r.id}:${field}`;
        const val = String(raw).replace(/,/g, '').trim();
        if (val === '' || Number.isNaN(Number(val)) || Number(val) === r[field]) {
            clearDraft(key);
            return;
        }
        flag(r.id, 'saving');
        try {
            const { data } = await axios.put(`${API}/${r.id}`, {
                platform: r.platform,
                qty_min: r.qty_min,
                qty_max: r.qty_max,
                capacity_uph: r.capacity_uph,
                [field]: Number(val),
            });
            setRows((p) => p.map((x) => (x.id === r.id ? data : x)).sort(sortRows));
            clearDraft(key);
            flag(r.id, 'saved');
        } catch (err) {
            flag(r.id, 'error');
            setMsg({ type: 'error', text: `${r.platform} ${fmt(r.qty_min)}–${fmt(r.qty_max)}: ${errMsg(err)}` });
        }
    };

    const add = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            const { data } = await axios.post(API, {
                platform: form.platform,
                qty_min: Number(form.qty_min),
                qty_max: Number(form.qty_max),
                capacity_uph: Number(form.capacity_uph),
            });
            setRows((p) => [...p, data].sort(sortRows));
            setMsg({ type: 'success', text: 'Band added.' });
            setForm({ ...EMPTY, platform: data.platform });
        } catch (err) {
            setMsg({ type: 'error', text: errMsg(err) });
        } finally {
            setBusy(false);
        }
    };

    const remove = async (r) => {
        if (!window.confirm(`Delete ${r.platform} band ${fmt(r.qty_min)}–${fmt(r.qty_max)}?`)) return;
        try {
            await axios.delete(`${API}/${r.id}`);
            setRows((p) => p.filter((x) => x.id !== r.id));
        } catch (err) {
            setMsg({ type: 'error', text: errMsg(err) });
        }
    };

    const focusCell = (i, field) => {
        const r = order[i];
        if (r) document.getElementById(`band-${r.id}-${field}`)?.focus();
    };

    const onKeyDown = (e, i, field) => {
        if (e.key === 'Enter' || e.key === 'ArrowDown') {
            e.preventDefault();
            focusCell(i + 1, field);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            focusCell(i - 1, field);
        }
    };

    const addField = (name, label, props = {}) => (
        <label className="form-control">
            <span className="label-text mb-1">{label}</span>
            <input
                required
                className={`input input-bordered input-sm ${props.className ?? 'w-28 text-right font-mono'}`}
                value={form[name]}
                onChange={(e) => setForm({ ...form, [name]: e.target.value })}
                {...props.input}
            />
        </label>
    );

    return (
        <div className="space-y-4">
            <Alert msg={msg} onClose={() => setMsg(null)} />

            <form onSubmit={add} className="space-y-2 rounded-lg border border-base-300 bg-base-100 p-4">
                <p className="text-sm opacity-70">Add band — ranges must not overlap within a platform.</p>
                <div className="flex flex-wrap items-end gap-3">
                    {addField('platform', 'Platform', {
                        className: 'w-36 uppercase',
                        input: { maxLength: 20, list: 'band-platforms' },
                    })}
                    <datalist id="band-platforms">
                        {Object.keys(groups).map((p) => (
                            <option key={p} value={p} />
                        ))}
                    </datalist>
                    {addField('qty_min', 'Qty min', { input: { type: 'number', min: 0 } })}
                    {addField('qty_max', 'Qty max', { input: { type: 'number', min: 0 } })}
                    {addField('capacity_uph', 'Capacity (UPH)', { input: { type: 'number', min: 0 } })}
                    <button className="btn btn-primary btn-sm" disabled={busy}>
                        Add band
                    </button>
                </div>
            </form>

            {order.length === 0 && <p className="opacity-70">No capacity bands.</p>}

            {Object.entries(groups).map(([platform, list]) => (
                <div key={platform} className="overflow-x-auto rounded-lg border border-base-300 bg-base-100">
                    <h3 className="border-b border-base-300 bg-base-200 px-4 py-2 font-semibold">{platform}</h3>
                    <table className="table table-sm">
                        <thead>
                            <tr>
                                <th>Qty min</th>
                                <th>Qty max</th>
                                <th>Capacity (UPH)</th>
                                <th className="w-10" />
                                <th className="w-10" />
                            </tr>
                        </thead>
                        <tbody>
                            {list.map((r) => {
                                const i = order.indexOf(r);
                                const st = status[r.id];
                                return (
                                    <tr key={r.id}>
                                        {FIELDS.map((f) => {
                                            const key = `${r.id}:${f}`;
                                            return (
                                                <td key={f}>
                                                    <input
                                                        id={`band-${r.id}-${f}`}
                                                        type="text"
                                                        inputMode="numeric"
                                                        autoComplete="off"
                                                        className={`input input-bordered input-sm w-32 text-right font-mono ${
                                                            st === 'error' ? 'input-error' : ''
                                                        } ${drafts[key] !== undefined ? 'input-warning' : ''}`}
                                                        value={drafts[key] ?? r[f]}
                                                        onFocus={(e) => e.target.select()}
                                                        onChange={(e) => {
                                                            setDrafts({ ...drafts, [key]: e.target.value });
                                                            flag(r.id, null);
                                                        }}
                                                        onBlur={(e) => drafts[key] !== undefined && commit(r, f, e.target.value)}
                                                        onKeyDown={(e) => onKeyDown(e, i, f)}
                                                    />
                                                </td>
                                            );
                                        })}
                                        <td>
                                            {st === 'saving' && <span className="loading loading-spinner loading-xs" />}
                                            {st === 'saved' && <BiCheck className="text-success" size={18} />}
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className="btn btn-ghost btn-xs btn-square text-error"
                                                title="Delete"
                                                tabIndex={-1}
                                                onClick={() => remove(r)}
                                            >
                                                <BiTrash size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ))}
        </div>
    );
}