import { badgeClass } from '@/Lib/LoadingPlan/badgeStyle';
import axios from 'axios';
import clsx from 'clsx';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, errMsg } from './Lib';

const API = '/loading-plan/bosch-parts';
const NO_BADGE = '__none__';
const SUGGESTIONS_ID = 'badge-suggestions';

/** Chips with a text box. Enter / comma / blur adds a badge, Backspace on empty removes the last. */
function BadgeInput({ value, onChange, disabled, placeholder = 'Add badge…' }) {
    const [text, setText] = useState('');

    const commit = () => {
        const t = text.trim().replace(/\s+/g, ' ');
        setText('');
        if (!t || value.some((b) => b.toUpperCase() === t.toUpperCase())) return;
        onChange([...value, t]);
    };

    const onKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            commit();
        } else if (e.key === 'Backspace' && !text && value.length) {
            onChange(value.slice(0, -1));
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-1">
            {value.map((b) => (
                <span key={b} className={clsx('badge badge-soft gap-1', badgeClass(b))}>
                    {b}
                    <button
                        type="button"
                        className="opacity-60 hover:opacity-100"
                        disabled={disabled}
                        aria-label={`Remove ${b}`}
                        onClick={() => onChange(value.filter((x) => x !== b))}
                    >
                        ×
                    </button>
                </span>
            ))}
            <input
                className="input input-bordered input-xs w-36"
                list={SUGGESTIONS_ID}
                maxLength={24}
                placeholder={placeholder}
                value={text}
                disabled={disabled}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKeyDown}
                onBlur={commit}
            />
        </div>
    );
}

export default function BoschPartSettings() {
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [known, setKnown] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState(null);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('');
    const [bulk, setBulk] = useState('');
    const [bulkBadges, setBulkBadges] = useState([]);
    const [mode, setMode] = useState('add');

    const seq = useRef(0);
    const load = useCallback(async (q, badge) => {
        const id = ++seq.current;

        try {
            const { data } = await axios.get(API, { params: { q, badge } });
            if (id !== seq.current) return;

            setRows(data.data);
            setTotal(data.total);
            setKnown(data.badges ?? []);
        } catch (err) {
            setMsg({ type: 'error', text: errMsg(err) });
        } finally {
            setLoading(false);
        }
    }, []);

    // debounced server-side search / filter
    useEffect(() => {
        const t = setTimeout(() => load(search.trim(), filter), 250);
        return () => clearTimeout(t);
    }, [search, filter, load]);

    const run = async (fn, okText) => {
        setBusy(true);
        try {
            await fn();
            setMsg({ type: 'success', text: okText });
            await load(search.trim(), filter);
            return true;
        } catch (err) {
            setMsg({ type: 'error', text: errMsg(err) });
            return false;
        } finally {
            setBusy(false);
        }
    };

    const submit = async (e) => {
        e.preventDefault();
        const partnames = bulk.split(/[\n,;\t]+/).map((s) => s.trim()).filter(Boolean);
        if (!partnames.length) return;
        const count = new Set(partnames.map((p) => p.toUpperCase())).size;

        const ok = await run(
            () => axios.post(API, { partnames, badges: bulkBadges, mode }),
            mode === 'remove' ? `Removed badges from up to ${count} part name(s).` : `Saved ${count} part name(s).`,
        );
        if (ok) setBulk('');
    };

    const saveBadges = (r, badges) =>
        run(() => axios.patch(`${API}/${r.id}`, { badges }), `${r.partname} updated.`);

    const remove = (r) => {
        if (!window.confirm(`Delete ${r.partname} from this list? (All its badges go with it.)`)) return;
        run(() => axios.delete(`${API}/${r.id}`), `Removed ${r.partname}.`);
    };

    return (
        <div className="space-y-4">
            <Alert msg={msg} onClose={() => setMsg(null)} />

            <datalist id={SUGGESTIONS_ID}>
                {known.map((b) => (
                    <option key={b} value={b} />
                ))}
            </datalist>

            <form onSubmit={submit} className="card border border-base-300 bg-base-100">
                <div className="card-body gap-3">
                    <h3 className="font-medium">Add or remove badges in bulk</h3>
                    <p className="text-sm opacity-70">
                        One part name per line (commas or Excel columns also work). Names are saved upper-cased.
                        Badges are free text. Existing badges on a part are kept when adding.
                    </p>

                    <textarea
                        className="textarea textarea-bordered h-28 w-full max-w-xl font-mono text-sm"
                        value={bulk}
                        onChange={(e) => setBulk(e.target.value)}
                    />

                    <div className="join">
                        <button
                            type="button"
                            className={clsx('btn btn-sm join-item', mode === 'add' && 'btn-primary')}
                            onClick={() => setMode('add')}
                        >
                            Add badges
                        </button>
                        <button
                            type="button"
                            className={clsx('btn btn-sm join-item', mode === 'remove' && 'btn-error')}
                            onClick={() => setMode('remove')}
                        >
                            Remove badges
                        </button>
                    </div>

                    <BadgeInput
                        value={bulkBadges}
                        onChange={setBulkBadges}
                        disabled={busy}
                        placeholder={mode === 'remove' ? 'Badge to remove…' : 'Badge to add…'}
                    />
                    {mode === 'add' && bulkBadges.length === 0 && (
                        <p className="text-xs opacity-60">No badge picked: the part names are saved with no badges.</p>
                    )}

                    <div>
                        <button
                            className={clsx('btn btn-sm', mode === 'remove' ? 'btn-error' : 'btn-primary')}
                            disabled={busy || !bulk.trim() || (mode === 'remove' && bulkBadges.length === 0)}
                        >
                            {mode === 'remove' ? 'Remove badges' : 'Save'}
                        </button>
                    </div>
                </div>
            </form>

            <div className="flex flex-wrap items-center gap-4">
                <input
                    className="input input-bordered w-72"
                    placeholder="Search part names…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <select
                    className="select select-bordered select-sm"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                >
                    <option value="">All badges</option>
                    <option value={NO_BADGE}>No badge</option>
                    {known.map((b) => (
                        <option key={b} value={b}>
                            {b}
                        </option>
                    ))}
                </select>
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
                                <th>Badges</th>
                                <th className="w-20" />
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.id}>
                                    <td className="font-mono align-top">{r.partname}</td>
                                    <td>
                                        <BadgeInput
                                            value={r.badges}
                                            disabled={busy}
                                            onChange={(badges) => saveBadges(r, badges)}
                                        />
                                    </td>
                                    <td className="align-top">
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