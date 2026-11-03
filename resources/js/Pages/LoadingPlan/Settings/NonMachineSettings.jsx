import { router } from '@inertiajs/react';
import axios from 'axios';
import { useMemo, useState } from 'react';
import { Alert, errMsg } from './Lib';

const API = '/loading-plan/non-machines';
const LOCATIONS = ['PL1', 'PL6', 'F3'];

export default function NonMachineSettings({ nonMachines = [], locations = LOCATIONS }) {
    const [location, setLocation] = useState(locations[0] ?? '');
    const [name, setName] = useState('');
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState(null);

    const rows = useMemo(() => nonMachines.filter((n) => n.location === location), [nonMachines, location]);

    const run = async (fn, okText) => {
        setBusy(true);
        try {
            await fn();
            if (okText) setMsg({ type: 'success', text: okText });
            router.reload({ only: ['nonMachines'], preserveScroll: true });
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
        const n = name.trim();
        if (!n || !location) return;
        if (await run(() => axios.post(API, { name: n, location }), `Added "${n}".`)) setName('');
    };

    const rename = async (n, input) => {
        const v = input.value.trim();
        if (!v || v === n.name) {
            input.value = n.name;
            return;
        }
        if (!(await run(() => axios.patch(`${API}/${n.id}`, { name: v }), 'Renamed.'))) input.value = n.name;
    };

    const remove = (n) => {
        if (!window.confirm(`Delete "${n.name}"? Its lots go back to Unassigned and its time blocks are deleted.`)) return;
        run(() => axios.delete(`${API}/${n.id}`), `Deleted "${n.name}".`);
    };

    return (
        <div className="space-y-4">
            <Alert msg={msg} onClose={() => setMsg(null)} />

            <p className="text-sm opacity-70">
                Names don't have to be unique. Empty non-machines are not shown in the plan table; pick them as a
                target in the transfer list.
            </p>

            <form onSubmit={add} className="flex flex-wrap items-end gap-3 rounded-lg border border-base-300 bg-base-100 p-4">
                <label className="form-control">
                    <span className="label-text mb-1">Location</span>
                    <select
                        className="select select-bordered select-sm w-32"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                    >
                        {locations.map((l) => (
                            <option key={l} value={l}>{l}</option>
                        ))}
                    </select>
                </label>
                <label className="form-control">
                    <span className="label-text mb-1">New non-machine name</span>
                    <input
                        required
                        maxLength={64}
                        className="input input-bordered input-sm w-64"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </label>
                <button className="btn btn-primary btn-sm" disabled={busy || !name.trim() || !location}>
                    Add
                </button>
            </form>

            <div className="space-y-1 rounded-lg border border-base-300 bg-base-100 p-4">
                {rows.length === 0 && <p className="opacity-70">No non-machines for {location || 'this location'}.</p>}
                {rows.map((n) => (
                    <div key={n.id} className="flex items-center gap-2">
                        <input
                            key={`${n.id}-${n.name}`}
                            className="input input-sm input-bordered flex-1"
                            defaultValue={n.name}
                            maxLength={64}
                            disabled={busy}
                            onBlur={(e) => rename(n, e.target)}
                            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                        />
                        <button className="btn btn-xs btn-error btn-outline" disabled={busy} onClick={() => remove(n)}>
                            Delete
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}