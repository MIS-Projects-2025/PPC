import { buildGrid, cellKey, colInfo, colLabel, rowTitle } from '@/Lib/LoadingPlan/capabilityModel';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';

const PROCESS_LABEL = { taping: 'tape', tubing: 'tube', both: 'both', tray: 'tray' };
const SOFT_GROUP_LIMIT = 8;
const AXIS_LABEL = { factory: 'factory', package_group: 'package group', leadcount: 'leadcount', body_size: 'body size', process_type: 'process' };
const linkBtn = 'text-xs text-blue-600 underline hover:text-blue-800';
const dangerBtn = 'text-xs text-red-600 hover:text-red-800';

function Dot({ color }) {
    return <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />;
}

function stateLabel(s) {
    return `${rowTitle(s)} · ${colLabel(colInfo(s))} · ${PROCESS_LABEL[s.process_type] ?? s.process_type}${s.part_rule_count > 0 ? ' (part-routed)' : ''}`;
}

// ---------------------------------------------------------------------
// One row of the "cost between groups" list
// ---------------------------------------------------------------------
function PairRow({ a, b, rule, onSave, onClear }) {
    const [minutes, setMinutes] = useState(rule ? String(rule.est_duration_minutes) : '');
    const [type, setType] = useState(rule?.operation_type ?? 'setup');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        setMinutes(rule ? String(rule.est_duration_minutes) : '');
        setType(rule?.operation_type ?? 'setup');
    }, [rule?.id, rule?.est_duration_minutes, rule?.operation_type]);

    const dirty = rule ? String(rule.est_duration_minutes) !== minutes || rule.operation_type !== type : minutes !== '';
    const valid = minutes !== '' && Number(minutes) >= 0;

    const save = async () => {
        setBusy(true);
        await onSave(a, b, rule, { operation_type: type, est_duration_minutes: Number(minutes) });
        setBusy(false);
    };

    return (
        <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 py-2 text-sm first:border-t-0">
            <span className="flex w-64 items-center gap-2">
                <Dot color={a.color} /> {a.name} <span className="text-gray-400">{rule && !rule.symmetric ? '→' : '↔'}</span> <Dot color={b.color} /> {b.name}
            </span>
            <select value={type} onChange={(e) => setType(e.target.value)} className="rounded border border-gray-300 px-2 py-1 text-sm">
                <option value="setup">setup</option>
                <option value="conversion">conversion</option>
            </select>
            <input
                type="number"
                min="0"
                step="5"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
                aria-label="Minutes"
            />
            <span className="text-xs text-gray-500">min</span>
            {dirty && valid && (
                <button type="button" disabled={busy} onClick={save} className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50">
                    Save
                </button>
            )}
            {rule ? (
                <button type="button" className={dangerBtn} onClick={() => onClear(rule)}>Clear</button>
            ) : (
                <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">not set: other rules / 240 default</span>
            )}
            {rule && !rule.symmetric && <span className="text-xs text-gray-500">one direction only</span>}
        </div>
    );
}

// ---------------------------------------------------------------------
// Tab
// ---------------------------------------------------------------------
export default function MachineGroups({ machine, states, dev = false, onOpenRules }) {
    const [groups, setGroups] = useState([]);
    const [rules, setRules] = useState([]);
    const [active, setActive] = useState(null);
    const [bulkProcess, setBulkProcess] = useState('all');
    const [newName, setNewName] = useState('');
    const [adding, setAdding] = useState(false);
    const [note, setNote] = useState(null);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [pair, setPair] = useState(null);
    const [axisRules, setAxisRules] = useState([]);

    const base = `/rules/machines/${machine.id}`;
    const errorText = (err) => err.response?.data?.message ?? Object.values(err.response?.data?.errors ?? {}).flat().join(' ') ?? 'Something went wrong.';

    const load = () =>
        axios
            .get(`${base}/groups`)
            .then(({ data }) => {
                setGroups(data.groups);
                setRules(data.rules);
                setActive((cur) => (data.groups.some((g) => g.id === cur) ? cur : data.groups[0]?.id ?? null));
            })
            .catch((err) => console.error(err));

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [machine.id]);

    useEffect(() => {
        axios
            .get(`/rules/machines/${machine.id}/transition-rules`)
            .then(({ data }) => setAxisRules(data.axis_rules ?? []))
            .catch((err) => console.error(err));
    }, [machine.id]);

    const grid = useMemo(() => buildGrid(states), [states]);
    const pairRuleCount = states.reduce((n, s) => n + (s.transition_count ?? 0), 0);
    const overrideCount = states.reduce((n, s) => n + (s.exception_count ?? 0), 0);
    const groupById = useMemo(() => Object.fromEntries(groups.map((g) => [g.id, g])), [groups]);
    const activeGroup = groupById[active] ?? null;

    const groupsOfState = useMemo(() => {
        const map = new Map();
        groups.forEach((g) => g.member_ids.forEach((id) => map.set(id, [...(map.get(id) ?? []), g.id])));
        return map;
    }, [groups]);

    const stateIdsKnown = useMemo(() => new Set(states.map((s) => s.setup_state_id)), [states]);

    // -----------------------------------------------------------------
    // Group actions
    // -----------------------------------------------------------------
    const createGroup = async () => {
        const name = newName.trim();
        if (!name) return;
        if (groups.length >= SOFT_GROUP_LIMIT && !confirm(`This machine already has ${groups.length} groups. More than ${SOFT_GROUP_LIMIT} gets hard to read. Add another anyway?`)) return;
        try {
            const { data } = await axios.post(`${base}/groups`, { name });
            setNewName('');
            setAdding(false);
            await load();
            setActive(data.id);
        } catch (err) {
            setNote(errorText(err));
        }
    };

    const renameGroup = async () => {
        const name = prompt('New name for this group', activeGroup.name);
        if (!name || name.trim() === activeGroup.name) return;
        try {
            await axios.patch(`/rules/groups/${activeGroup.id}`, { name: name.trim() });
            await load();
        } catch (err) {
            setNote(errorText(err));
        }
    };

    const deleteGroup = async () => {
        const ruleCount = rules.filter((r) => r.from_group_id === activeGroup.id || r.to_group_id === activeGroup.id).length;
        if (!confirm(`Delete "${activeGroup.name}"?\n\nIts ${activeGroup.member_ids.length} membership(s) and ${ruleCount} cost rule(s) are removed too. The states themselves are not deleted.`)) return;
        try {
            await axios.delete(`/rules/groups/${activeGroup.id}`);
            await load();
        } catch (err) {
            setNote(errorText(err));
        }
    };

    // Add/remove states from the active group; local update first so painting feels instant
    const toggleStates = async (list) => {
        if (!activeGroup) {
            setNote('Create a group first, then paint states into it.');
            return;
        }
        const ids = list.map((s) => s.setup_state_id);
        const members = new Set(activeGroup.member_ids);
        const allIn = ids.every((id) => members.has(id));
        const add = allIn ? [] : ids.filter((id) => !members.has(id));
        const remove = allIn ? ids : [];

        setGroups((cur) =>
            cur.map((g) =>
                g.id !== activeGroup.id
                    ? g
                    : { ...g, member_ids: allIn ? g.member_ids.filter((id) => !remove.includes(id)) : [...g.member_ids, ...add] }
            )
        );
        try {
            await axios.put(`/rules/groups/${activeGroup.id}/members`, { add, remove });
        } catch (err) {
            setNote(errorText(err));
            load();
        }
    };

    const inBulk = (s) => bulkProcess === 'all' || s.process_type === bulkProcess;

    // -----------------------------------------------------------------
    // Cost rules
    // -----------------------------------------------------------------
    const ruleFor = (a, b) =>
        rules.find((r) => (r.from_group_id === a.id && r.to_group_id === b.id) || (r.from_group_id === b.id && r.to_group_id === a.id));

    const saveRule = async (a, b, existing, fields) => {
        try {
            await axios.post(`${base}/group-rules`, {
                from_group_id: existing?.from_group_id ?? a.id,
                to_group_id: existing?.to_group_id ?? b.id,
                symmetric: existing ? existing.symmetric : true,
                ...fields,
            });
            await load();
            runPairTest();
        } catch (err) {
            setNote(errorText(err));
        }
    };

    const clearRule = async (rule) => {
        try {
            await axios.delete(`/rules/group-rules/${rule.id}`);
            await load();
            runPairTest();
        } catch (err) {
            setNote(errorText(err));
        }
    };

    const pairs = useMemo(() => groups.flatMap((a, i) => groups.slice(i + 1).map((b) => [a, b])), [groups]);

    // -----------------------------------------------------------------
    // Pair tester: asks the server, which runs the scheduler's own resolver
    // -----------------------------------------------------------------
    const runPairTest = () => {
        if (!from || !to) {
            setPair(null);
            return;
        }
        axios
            .get(`${base}/pair-cost`, { params: { from, to } })
            .then(({ data }) => setPair(data))
            .catch((err) => setPair({ kind: 'none', message: errorText(err) }));
    };

    useEffect(runPairTest, [from, to, machine.id]); // eslint-disable-line react-hooks/exhaustive-deps

    // -----------------------------------------------------------------
    // Health
    // -----------------------------------------------------------------
    const health = useMemo(() => {
        const live = states.filter((s) => stateIdsKnown.has(s.setup_state_id));
        const orphans = live.filter((s) => !(groupsOfState.get(s.setup_state_id) ?? []).length);
        const shared = live.filter((s) => (groupsOfState.get(s.setup_state_id) ?? []).length > 1);
        const empty = groups.filter((g) => g.member_ids.length === 0);
        const undefinedPairs = pairs.filter(([a, b]) => !ruleFor(a, b));
        return { orphans, shared, empty, undefinedPairs };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [states, groups, rules, groupsOfState]);

    const dotsFor = (s) => (groupsOfState.get(s.setup_state_id) ?? []).map((id) => <Dot key={id} color={groupById[id]?.color} />);

    const stateItem = (s) => {
        const mine = groupsOfState.get(s.setup_state_id) ?? [];
        const inActive = activeGroup && mine.includes(activeGroup.id);
        return (
            <button
                key={s.setup_state_id}
                type="button"
                onClick={() => toggleStates([s])}
                title={`${s.remarks ?? ''} (state #${s.setup_state_id})`}
                style={inActive ? { background: `${activeGroup.color}26` } : undefined}
                className={`flex min-w-[52px] flex-col items-center gap-1 rounded border px-1.5 py-1 text-[11px] ${mine.length ? 'border-gray-200' : 'border-dashed border-amber-400 text-amber-700'}`}
            >
                <span>{PROCESS_LABEL[s.process_type]}{dev && <span className="ml-1 opacity-50">#{s.setup_state_id}</span>}</span>
                <span className="flex min-h-[10px] gap-0.5">{dotsFor(s)}</span>
            </button>
        );
    };

    const allOptions = useMemo(
        () => [...states].sort((a, b) => stateLabel(a).localeCompare(stateLabel(b))).map((s) => <option key={s.setup_state_id} value={s.setup_state_id}>{stateLabel(s)}</option>),
        [states]
    );

    return (
        <div>
            {axisRules.length > 0 && (
                <div className="mb-4 max-w-3xl rounded border border-blue-200 bg-blue-50 px-4 py-3 text-blue-900">
                    <div className="mb-1 text-sm font-semibold">This machine already has axis rules, so you do not have to set up groups</div>
                    <ul className="mb-2 ml-5 list-disc text-xs">
                        {axisRules.map((a) => (
                            <li key={a.id}>
                                Changing {AXIS_LABEL[a.axis] ?? a.axis} costs {a.operation_type}, {a.est_duration_minutes} min
                            </li>
                        ))}
                    </ul>
                    <p className="text-xs">
                        When two states differ on more than one of these, the longest one applies. These rules work out the cost by themselves, including for states you add later.
                        Use groups only for exceptions: sets of states that should move into each other for free even though an axis rule would charge for it.
                        Groups are checked first, so a pair in the same group is free even if an axis rule says otherwise.
                    </p>
                    {axisRules.some((a) => a.combination_rule === 'sum') && (
                        <p className="mt-1 text-xs text-amber-800">An axis rule is set to 'sum', but the scheduler always uses the longest one, so 'sum' has no effect.</p>
                    )}
                    {onOpenRules && (
                        <button type="button" className={`${linkBtn} mt-2`} onClick={onOpenRules}>View or change the axis rules</button>
                    )}
                </div>
            )}

            <p className="mb-3 max-w-3xl text-xs text-gray-600">
                States that share a group move into each other for free. Moving between states that share no group costs whatever the rule between their groups says. A state can be in several groups, which makes it free with all of them.
            </p>

            {note && (
                <div className="mb-3 flex items-center gap-3 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                    <span>{note}</span>
                    <button type="button" className={`${linkBtn} ml-auto`} onClick={() => setNote(null)}>Dismiss</button>
                </div>
            )}

            {/* Palette */}
            <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-600">Paint with</span>
                {groups.map((g) => (
                    <button
                        key={g.id}
                        type="button"
                        onClick={() => setActive(g.id)}
                        className={`flex items-center gap-2 rounded border px-3 py-1.5 text-sm ${g.id === active ? 'border-gray-900 bg-gray-50' : 'border-gray-300 hover:bg-gray-50'}`}
                    >
                        <Dot color={g.color} /> {g.name} <span className="text-gray-400">{g.member_ids.length}</span>
                    </button>
                ))}
                {adding ? (
                    <span className="flex items-center gap-2">
                        <input
                            autoFocus
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => (e.key === 'Enter' ? createGroup() : e.key === 'Escape' && setAdding(false))}
                            placeholder="Group name"
                            className="w-40 rounded border border-gray-300 px-2 py-1.5 text-sm"
                        />
                        <button type="button" className={linkBtn} onClick={createGroup}>Add</button>
                        <button type="button" className={linkBtn} onClick={() => setAdding(false)}>Cancel</button>
                    </span>
                ) : (
                    <button type="button" onClick={() => setAdding(true)} className="rounded border border-dashed border-gray-400 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
                        + New group
                    </button>
                )}
                {activeGroup && (
                    <span className="ml-auto flex items-center gap-3">
                        <button type="button" className={linkBtn} onClick={renameGroup}>Rename</button>
                        <button type="button" className={dangerBtn} onClick={deleteGroup}>Delete group</button>
                    </span>
                )}
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                <span>Click a state to add or remove it. Click a package or a leadcount to do a whole row or column.</span>
                <label className="flex items-center gap-1">
                    Row and column clicks affect
                    <select value={bulkProcess} onChange={(e) => setBulkProcess(e.target.value)} className="rounded border border-gray-300 px-1 py-0.5 text-xs">
                        <option value="all">all processes</option>
                        {Object.entries(PROCESS_LABEL).map(([v, l]) => <option key={v} value={v}>{l} only</option>)}
                    </select>
                </label>
            </div>

            {/* Grid */}
            {groups.length === 0 ? (
                <div className="rounded border border-dashed border-gray-300 px-3 py-10 text-center text-sm text-gray-500">
                    <p>
                        No groups on this machine yet. That does not mean it has no transition costs: its existing rules still decide every changeover
                        ({pairRuleCount} pair rule{pairRuleCount === 1 ? '' : 's'} and {overrideCount} part override{overrideCount === 1 ? '' : 's'} into its capabilities,
                        plus any axis rules and the 240 min default for pairs nothing covers).
                    </p>
                    <p className="mt-2">Groups are optional. Creating one does not replace or delete any of those rules.</p>
                </div>
            ) : (
                <div className="overflow-x-auto rounded border border-gray-200">
                    <table className="border-collapse bg-white text-sm">
                        <thead>
                            <tr>
                                <th className="sticky left-0 z-10 min-w-[220px] bg-gray-100 px-3 py-2 text-left text-xs font-semibold text-gray-600">Package</th>
                                {grid.cols.map((c) => (
                                    <th key={c.key} className="min-w-[84px] bg-gray-100 px-1 py-2 text-xs font-semibold text-gray-600">
                                        <button
                                            type="button"
                                            className="rounded px-2 py-1 hover:bg-gray-200"
                                            onClick={() => toggleStates(grid.rows.flatMap((r) => (grid.cells.get(cellKey(r, c)) ?? []).filter(inBulk)))}
                                        >
                                            {colLabel(c)}
                                        </button>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {grid.rows.map((r) => (
                                <tr key={r.key} className="border-t border-gray-100">
                                    <td className="sticky left-0 z-10 bg-white px-3 py-2 align-top">
                                        <button
                                            type="button"
                                            className="text-left font-medium hover:underline"
                                            onClick={() => toggleStates(grid.cols.flatMap((c) => (grid.cells.get(cellKey(r, c)) ?? []).filter(inBulk)))}
                                        >
                                            <span className="mr-1.5 rounded bg-gray-800 px-1.5 py-0.5 text-[11px] font-normal text-white">{r.factory}</span>
                                            {rowTitle(r)}
                                        </button>
                                    </td>
                                    {grid.cols.map((c) => (
                                        <td key={c.key} className="px-1 py-1.5 align-top">
                                            <div className="flex min-h-[28px] flex-wrap justify-center gap-1">
                                                {(grid.cells.get(cellKey(r, c)) ?? []).map(stateItem)}
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {grid.routed.length > 0 && groups.length > 0 && (
                <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-semibold">Part-routed states ({grid.routed.length})</summary>
                    <p className="mb-2 mt-1 text-xs text-gray-500">These are only reached by their part rules, but they still need a group for changeover costs.</p>
                    <div className="space-y-1">
                        {grid.routed.map((s) => (
                            <div key={s.setup_state_id} className="flex items-center gap-3 text-xs">
                                {stateItem(s)}
                                <span>{stateLabel(s)}</span>
                                <span className="text-gray-400">{s.remarks}</span>
                            </div>
                        ))}
                    </div>
                </details>
            )}

            {/* Costs */}
            {groups.length > 1 && (
                <div className="mt-8">
                    <h2 className="mb-1 text-sm font-semibold">Cost between groups</h2>
                    <p className="mb-2 text-xs text-gray-500">
                        Same both ways. If several rules could apply to a move, the one touching the fewest states wins, and a tie goes to the longer one.
                    </p>
                    <div className="rounded border border-gray-200 bg-white px-3">
                        {pairs.map(([a, b]) => (
                            <PairRow key={`${a.id}-${b.id}`} a={a} b={b} rule={ruleFor(a, b)} onSave={saveRule} onClear={clearRule} />
                        ))}
                    </div>
                </div>
            )}

            {/* Pair tester */}
            <div className="mt-8">
                <h2 className="mb-2 text-sm font-semibold">Pair tester</h2>
                <div className="flex flex-wrap items-center gap-2">
                    <select value={from} onChange={(e) => setFrom(e.target.value)} className="max-w-xs rounded border border-gray-300 px-2 py-1.5 text-sm">
                        <option value="">From state…</option>
                        {allOptions}
                    </select>
                    <span className="text-gray-400">→</span>
                    <select value={to} onChange={(e) => setTo(e.target.value)} className="max-w-xs rounded border border-gray-300 px-2 py-1.5 text-sm">
                        <option value="">To state…</option>
                        {allOptions}
                    </select>
                </div>
                {pair && (
                    <div
                        className={`mt-2 rounded px-3 py-2 text-sm ${
                            pair.kind === 'free' ? 'bg-green-50 text-green-800' : pair.kind === 'none' ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-800'
                        }`}
                    >
                        {pair.message}
                    </div>
                )}
            </div>

            {/* Health */}
            {groups.length > 0 && (
                <div className="mt-8 space-y-1 rounded border border-gray-200 bg-gray-50 px-3 py-3 text-sm">
                    <div className="font-semibold">Check</div>
                    <details>
                        <summary className="cursor-pointer">States in no group ({health.orphans.length}): these are covered by the other rules only</summary>
                        <ul className="ml-5 mt-1 list-disc text-xs text-gray-600">{health.orphans.slice(0, 80).map((s) => <li key={s.setup_state_id}>{stateLabel(s)}</li>)}</ul>
                    </details>
                    <details>
                        <summary className="cursor-pointer">States in several groups ({health.shared.length}): free with every group they are in</summary>
                        <ul className="ml-5 mt-1 space-y-1 text-xs text-gray-600">
                            {health.shared.map((s) => (
                                <li key={s.setup_state_id} className="flex items-center gap-2">{stateLabel(s)} <span className="flex gap-0.5">{dotsFor(s)}</span></li>
                            ))}
                        </ul>
                    </details>
                    {health.empty.length > 0 && <div className="text-amber-800">Groups with no members: {health.empty.map((g) => g.name).join(', ')}</div>}
                    {health.undefinedPairs.length > 0 && (
                        <div className="text-amber-800">
                            Group pairs with no cost ({health.undefinedPairs.length}): {health.undefinedPairs.map(([a, b]) => `${a.name} ↔ ${b.name}`).join(', ')}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}