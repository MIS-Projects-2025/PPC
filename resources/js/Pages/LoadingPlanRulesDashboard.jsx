import { Head } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState } from 'react';
// RuleForm.jsx = your existing RuleForm and everything it needs, moved out of this page.
// See the notes: add `export default RuleForm;` and `export { RULE_TYPE_LABELS };`.
import RuleForm, { RULE_TYPE_LABELS } from '@/Components/LoadingPlan/RuleForm';
// import RuleForm, { RULE_TYPE_LABELS } from '@/Components/rules/RuleForm';

const EMPTY_FILTERS = { machine: '', package: '', process: '', factory: '', leadcount: '', part: '' };

const MATCH_BADGE = {
    direct: ['Direct match', 'bg-green-100 text-green-800'],
    group: ['Via package group', 'bg-blue-100 text-blue-800'],
    wildcard: ['Wildcard: accepts any package', 'bg-amber-100 text-amber-800'],
    'part rule': ['Part rule', 'bg-purple-100 text-purple-800'],
};

const PROCESS_STYLE = {
    taping: 'bg-sky-100 text-sky-800',
    tubing: 'bg-emerald-100 text-emerald-800',
    both: 'bg-indigo-100 text-indigo-800',
    tray: 'bg-orange-100 text-orange-800',
};

const OP_STYLE = { none: 'text-gray-500', conversion: 'text-amber-700', setup: 'text-red-700' };

const DELETE_URL = {
    setup_state: (id) => `/rules/setup-states/${id}`,
    part_rule: (id) => `/rules/part-rules/${id}`,
    transition_rule: (id) => `/rules/transition-rules/${id}`,
    transition_exception: (id) => `/rules/transition-exceptions/${id}`,
    axis_rule: (id) => `/rules/axis-rules/${id}`,
    auto_part_rule: (id) => `/rules/machine_auto_part_rules/${id}`,
    focus_group_rule: (id) => `/rules/machine_focus_group_rules/${id}`,
    part_exclusion: (id) => `/rules/machine_part_exclusions/${id}`,
};

const MACHINE_ADD_OPTIONS = [
    ['setup_state', 'Capability'],
    ['transition_exception', 'Part-specific transition cost'],
    ['axis_rule', 'Axis rule'],
    ['auto_part_rule', 'Auto-part rule'],
    ['focus_group_rule', 'Focus group rule'],
    ['part_exclusion', 'Part exclusion'],
];

function Chip({ children, className = 'bg-gray-100 text-gray-700', title }) {
    return (
        <span title={title} className={`inline-block rounded px-1.5 py-0.5 text-xs ${className}`}>
            {children}
        </span>
    );
}

const linkBtn = 'text-xs text-blue-600 underline hover:text-blue-800';
const dangerBtn = 'text-xs text-red-600 hover:text-red-800';

// ---------------------------------------------------------------------
// Health strip
// ---------------------------------------------------------------------
function HealthStrip({ health }) {
    if (!health?.length) {
        return (
            <div className="mb-4 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                No rule problems found.
            </div>
        );
    }
    return (
        <div className="mb-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
            <div className="mb-1 font-semibold text-amber-900">Needs attention</div>
            <div className="space-y-1">
                {health.map((h) => (
                    <details key={h.key}>
                        <summary className="cursor-pointer text-amber-900">
                            {h.label} <span className="font-semibold">({h.items.length})</span>
                        </summary>
                        <ul className="ml-5 mt-1 list-disc text-xs text-gray-700">
                            {h.items.map((item, i) => (
                                <li key={i}>{item}</li>
                            ))}
                        </ul>
                    </details>
                ))}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------
// Filter bar + context banner
// ---------------------------------------------------------------------
function FilterBar({ filters, setFilters, packageOptions, count, loading }) {
    const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));
    const input = 'rounded border border-gray-300 px-3 py-2 text-sm';
    const active = Object.values(filters).some((v) => v !== '');

    return (
        <div className="mb-4 flex flex-wrap items-center gap-3">
            <input value={filters.package} onChange={set('package')} list="pkg-options" placeholder="Package or package group" className={`${input} w-56`} />
            <datalist id="pkg-options">
                {(packageOptions?.options ?? []).map((p) => (
                    <option key={p} value={p} />
                ))}
            </datalist>

            <select value={filters.process} onChange={set('process')} className={input}>
                <option value="">Tape + tube + tray</option>
                <option value="taping">Taping</option>
                <option value="tubing">Tubing</option>
                <option value="tray">Tray</option>
            </select>

            <select value={filters.factory} onChange={set('factory')} className={input}>
                <option value="">All factories</option>
                <option value="F1">F1</option>
                <option value="F2">F2</option>
                <option value="F3">F3</option>
            </select>

            <input value={filters.leadcount} onChange={set('leadcount')} type="number" placeholder="Leadcount" className={`${input} w-28`} />
            <input value={filters.part} onChange={set('part')} placeholder="Part name" className={`${input} w-44`} />
            <input value={filters.machine} onChange={set('machine')} placeholder="Machine" className={`${input} w-36`} />

            {active && (
                <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className={linkBtn}>
                    Clear filters
                </button>
            )}
            <span className="text-sm text-gray-500">{loading ? 'Loading…' : `${count} machine${count === 1 ? '' : 's'}`}</span>
        </div>
    );
}

function ContextBanner({ context }) {
    if (!context) return null;
    const notes = [];

    if (context.package) {
        notes.push(
            <div key="pkg">
                Showing capabilities that can take <strong>{context.package}</strong>.{' '}
                {context.groups.length > 0 ? (
                    <>
                        It belongs to{' '}
                        {context.groups.map((g, i) => (
                            <span key={g.group_name}>
                                {i > 0 && ', '}
                                group <strong>{g.group_name}</strong> ({g.members.join(', ')})
                            </span>
                        ))}
                        . Capabilities set up for any member are marked <em>Via package group</em>.
                    </>
                ) : (
                    'It is not in any package group, so only direct matches and wildcards appear.'
                )}
            </div>
        );
    }
    if (context.part) {
        notes.push(
            <div key="part">
                {context.part_override
                    ? `Part "${context.part}" has part rules: only the capabilities those rules name are shown. Package, body size and leadcount are ignored (factory still applies).`
                    : `Part "${context.part}" has no part rule, so it is matched by structure like any other part.`}
            </div>
        );
    }
    if (context.excluded_machines?.length > 0) {
        notes.push(<div key="ex">Excluded for this part: {context.excluded_machines.join(', ')}.</div>);
    }
    if (!notes.length) return null;

    return <div className="mb-4 space-y-1 rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">{notes}</div>;
}

// ---------------------------------------------------------------------
// Capability row
// ---------------------------------------------------------------------
function StateRow({ s, open, onToggle, api }) {
    const wildcard = s.package_name == null && s.body_size == null;
    const badge = MATCH_BADGE[s.match];

    return (
        <div className={`rounded border bg-white ${wildcard ? 'border-amber-300' : 'border-gray-200'}`}>
            <div className="flex flex-wrap items-center gap-2 px-3 py-2">
                <button type="button" onClick={onToggle} className="w-4 text-xs text-gray-500" aria-label="Toggle details">
                    {open ? '▼' : '▶'}
                </button>
                <Chip className="bg-gray-800 text-white">{s.factory}</Chip>
                {s.package_name ? (
                    <Chip className="bg-blue-50 font-medium text-blue-900">{s.package_name}</Chip>
                ) : (
                    <Chip className="bg-amber-100 text-amber-800" title="No package set: accepts any package">ANY package</Chip>
                )}
                <Chip>{s.body_size ?? 'any size'}</Chip>
                {s.thickness != null && <Chip>thickness {s.thickness}</Chip>}
                <Chip>leadcount {s.leadcount_text}</Chip>
                <Chip className={PROCESS_STYLE[s.process_type] ?? undefined}>{s.process_type}</Chip>
                {badge && <Chip className={badge[1]}>{badge[0]}</Chip>}

                <span className="ml-auto flex items-center gap-3 text-xs text-gray-500">
                    <span>
                        {s.part_rules.length} part rule{s.part_rules.length === 1 ? '' : 's'}, {s.transitions_in.length} cost{s.transitions_in.length === 1 ? '' : 's'}
                    </span>
                    <button type="button" className={linkBtn} onClick={() => api.openForm('setup_state', s.raw, s.id)}>Edit</button>
                    <button
                        type="button"
                        className={dangerBtn}
                        onClick={() =>
                            api.remove(
                                'setup_state',
                                s.id,
                                `Delete this capability?\n\nThis also deletes ${s.part_rules.length} part rule(s), ${s.transitions_in.length} transition rule(s) into it and ${s.exceptions_in.length} exception(s).`
                            )
                        }
                    >
                        Delete
                    </button>
                </span>
            </div>

            {open && (
                <div className="space-y-4 border-t border-gray-100 bg-gray-50 px-3 py-3 text-sm">
                    {s.remarks && <div className="text-xs text-gray-600">Remarks: {s.remarks}</div>}

                    <div>
                        <div className="mb-1 text-xs font-semibold text-gray-700">
                            Part routing{' '}
                            <span className="font-normal text-gray-500">(a part named here runs only on the capabilities its rules name)</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                            {s.part_rules.map((r) => (
                                <span key={r.rule_id} className="inline-flex items-center gap-1 rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-900">
                                    {r.match_value}
                                    <em className="text-[10px] opacity-70">{r.match_type}</em>
                                    <button type="button" onClick={() => api.remove('part_rule', r.rule_id)} aria-label="Remove part rule">×</button>
                                </span>
                            ))}
                            <button type="button" className={linkBtn} onClick={() => api.openForm('part_rule', { _machine_filter: s.machine_id, setup_state_id: s.id })}>
                                + part
                            </button>
                        </div>
                    </div>

                    <div>
                        <div className="mb-1 text-xs font-semibold text-gray-700">Cost to change over into this capability</div>
                        {s.transitions_in.length === 0 ? (
                            <div className="text-xs italic text-gray-500">No transition rule into this capability yet.</div>
                        ) : (
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-left text-gray-500">
                                        <th className="py-1 pr-2 font-medium">From</th>
                                        <th className="py-1 pr-2 font-medium">Operation</th>
                                        <th className="py-1 pr-2 font-medium">Minutes</th>
                                        <th className="py-1 pr-2 font-medium">Notes</th>
                                        <th />
                                    </tr>
                                </thead>
                                <tbody>
                                    {s.transitions_in.map((t) => (
                                        <tr key={t.rule_id} className="border-t border-gray-200">
                                            <td className="py-1 pr-2">{t.from_label}</td>
                                            <td className={`py-1 pr-2 font-medium ${OP_STYLE[t.operation_type]}`}>{t.operation_type}</td>
                                            <td className="py-1 pr-2">{t.est_duration_minutes ?? '-'}</td>
                                            <td className="py-1 pr-2 text-gray-500">{t.notes}</td>
                                            <td className="space-x-2 py-1 text-right">
                                                <button type="button" className={linkBtn} onClick={() => api.openForm('transition_rule', t, t.rule_id)}>Edit</button>
                                                <button type="button" className={dangerBtn} onClick={() => api.remove('transition_rule', t.rule_id)}>Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        <button type="button" className={`${linkBtn} mt-1`} onClick={() => api.openForm('transition_rule', { machine_id: s.machine_id, to_state_id: s.id })}>
                            + cost into this capability
                        </button>
                    </div>

                    {s.exceptions_in.length > 0 && (
                        <div>
                            <div className="mb-1 text-xs font-semibold text-gray-700">Part-specific overrides</div>
                            <ul className="space-y-1 text-xs">
                                {s.exceptions_in.map((e) => (
                                    <li key={e.id} className="flex items-center gap-2">
                                        <Chip className="bg-rose-100 text-rose-800">{e.part_name}</Chip>
                                        <span>from {e.from_label}:</span>
                                        <span className={`font-medium ${OP_STYLE[e.operation_type]}`}>{e.operation_type}</span>
                                        <span>{e.est_duration_minutes != null ? `${e.est_duration_minutes} min` : ''}</span>
                                        <button type="button" className={`${dangerBtn} ml-auto`} onClick={() => api.remove('transition_exception', e.id)}>Delete</button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------
// Machine card
// ---------------------------------------------------------------------
function MachineLevelRules({ m, api }) {
    const rows = [
        ...m.axis_rules.map((a) => ({ kind: 'axis_rule', id: a.id, tag: 'Axis', text: `Changing ${a.axis} costs ${a.operation_type}, about ${a.est_duration_minutes} min (combined by ${a.combination_rule})` })),
        ...m.auto_part_rules.map((r) => ({ kind: 'auto_part_rule', id: r.id, tag: 'Auto-part', text: `Auto lots of ${r.package_name ?? 'ANY package'}: ${r.rule_type}${r.notes ? ` (${r.notes})` : ''}` })),
        ...m.focus_group_rules.map((r) => ({ kind: 'focus_group_rule', id: r.id, tag: 'Focus group', text: `Focus group "${r.focus_group}": ${r.rule_type}${r.notes ? ` (${r.notes})` : ''}` })),
        ...m.part_exclusions.map((e) => ({ kind: 'part_exclusion', id: e.id, tag: 'Exclusion', text: `Part "${e.part_name}" is excluded from this machine${e.notes ? ` (${e.notes})` : ''}` })),
    ];
    if (!rows.length) return null;

    return (
        <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-xs font-semibold text-gray-700">Machine-level rules ({rows.length})</summary>
            <ul className="mt-1 space-y-1">
                {rows.map((r) => (
                    <li key={`${r.kind}-${r.id}`} className="flex items-center gap-2 text-xs">
                        <Chip>{r.tag}</Chip>
                        <span>{r.text}</span>
                        <button type="button" className={`${dangerBtn} ml-auto`} onClick={() => api.remove(r.kind, r.id)}>Delete</button>
                    </li>
                ))}
            </ul>
        </details>
    );
}

function MachineCard({ m, expanded, toggle, api }) {
    return (
        <section className="rounded-lg border border-gray-200 bg-white p-4">
            <header className="mb-3 flex items-center gap-3">
                <h2 className="text-base font-semibold">{m.machine_num}</h2>
                {m.factory && <Chip className="bg-gray-100 text-gray-700">{m.factory}</Chip>}
                <span className="text-xs text-gray-500">
                    {m.states.length} capabilit{m.states.length === 1 ? 'y' : 'ies'}
                </span>
                <select
                    value=""
                    onChange={(e) => e.target.value && api.openForm(e.target.value, { machine_id: m.id })}
                    className="ml-auto rounded border border-gray-300 px-2 py-1 text-xs"
                >
                    <option value="">+ Add…</option>
                    {MACHINE_ADD_OPTIONS.map(([v, label]) => (
                        <option key={v} value={v}>{label}</option>
                    ))}
                </select>
            </header>

            {m.states.length === 0 ? (
                <div className="rounded border border-dashed border-gray-300 px-3 py-4 text-center text-sm text-gray-500">
                    No capabilities defined for this machine.{' '}
                    <button type="button" className={linkBtn} onClick={() => api.openForm('setup_state', { machine_id: m.id })}>Add the first one</button>
                </div>
            ) : (
                <div className="space-y-2">
                    {m.states.map((s) => (
                        <StateRow key={s.id} s={s} open={!!expanded[s.id]} onToggle={() => toggle(s.id)} api={api} />
                    ))}
                </div>
            )}

            <MachineLevelRules m={m} api={api} />
        </section>
    );
}

// ---------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------
export default function Index({ machines = [], packageOptions = { options: [] } }) {
    const [filters, setFilters] = useState(EMPTY_FILTERS);
    const [data, setData] = useState({ context: null, health: [], machines: [] });

    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState({});
    const [drawer, setDrawer] = useState(null); // { type, initialValues, editId, chain, nonce }
    
    console.log(data);
    window.myData = data;
    
    const reload = () => {
        setLoading(true);
        const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''));
        return axios
            .get('/rules/view', { params })
            .then(({ data }) => setData(data))
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        const t = setTimeout(reload, 300);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    const toggle = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

    const openForm = (type, initialValues = null, editId = null) =>
        setDrawer({ type, initialValues, editId, chain: null, nonce: Date.now() });

    const closeDrawer = () => {
        setDrawer(null);
        reload();
    };

    const onSaved = (response) => {
        if (drawer.type === 'setup_state' && !drawer.editId) {
            const s = response.state;
            setDrawer({ ...drawer, chain: { machineId: s.machine_id, stateId: s.setup_state_id } });
            reload();
            return;
        }
        closeDrawer();
    };

    const startChained = (type) => {
        const c = drawer.chain;
        setDrawer({
            type,
            editId: null,
            chain: null,
            nonce: Date.now(),
            initialValues:
                type === 'transition_rule'
                    ? { machine_id: c.machineId, to_state_id: c.stateId }
                    : { _machine_filter: c.machineId, setup_state_id: c.stateId },
        });
    };

    const remove = async (kind, id, message = 'Delete this rule?') => {
        if (!confirm(message)) return;
        try {
            await axios.delete(DELETE_URL[kind](id));
            await reload();
        } catch (err) {
            console.error(err);
            alert('Failed to delete this rule.');
        }
    };

    const api = { openForm, remove };

    return (
        <>
            <Head title="Scheduling Rules" />

            <div className="mx-auto max-w-6xl p-8 font-sans">
                <div className="mb-4 flex items-center gap-4">
                    <h1 className="text-xl font-semibold">Scheduling Rules</h1>
                    <button type="button" onClick={() => openForm('package_group')} className="ml-auto rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">
                        + Package group
                    </button>
                </div>

                <HealthStrip health={data.health} />
                <FilterBar filters={filters} setFilters={setFilters} packageOptions={packageOptions} count={data.machines.length} loading={loading} />
                <ContextBanner context={data.context} />

                <div className="space-y-4">
                    {data.machines.length === 0 && !loading && (
                        <div className="rounded border border-dashed border-gray-300 px-3 py-10 text-center text-sm text-gray-500">
                            No machine matches these filters. Clear a filter, or add a capability to a machine to make it eligible.
                        </div>
                    )}
                    {data.machines.map((m) => (
                        <MachineCard key={m.id} m={m} expanded={expanded} toggle={toggle} api={api} />
                    ))}
                </div>
            </div>

            {drawer && (
                <div className="fixed inset-0 z-[60]">
                    <div className="absolute inset-0 bg-black/40" onMouseDown={closeDrawer} />
                    <aside className="absolute right-0 top-0 h-full w-[480px] max-w-full overflow-y-auto bg-white p-6 shadow-xl">
                        {drawer.chain ? (
                            <div className="space-y-3 text-sm">
                                <h3 className="text-lg font-semibold">Capability saved</h3>
                                <p>Add rules now so it does not sit unrouted?</p>
                                <button type="button" onClick={() => startChained('transition_rule')} className="block w-full rounded border border-gray-300 px-3 py-2 text-left hover:bg-gray-50">
                                    + Add a transition cost into this capability
                                </button>
                                <button type="button" onClick={() => startChained('part_rule')} className="block w-full rounded border border-gray-300 px-3 py-2 text-left hover:bg-gray-50">
                                    + Restrict a part name to this capability
                                </button>
                                <div className="flex justify-end pt-2">
                                    <button type="button" onClick={closeDrawer} className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">Done</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h3 className="mb-4 text-lg font-semibold">
                                    {drawer.editId ? 'Edit' : 'Add'} {RULE_TYPE_LABELS[drawer.type]}
                                </h3>
                                <RuleForm
                                    key={drawer.nonce}
                                    machines={machines}
                                    type={drawer.type}
                                    initialValues={drawer.initialValues}
                                    editId={drawer.editId}
                                    onClose={closeDrawer}
                                    onSaved={onSaved}
                                />
                            </>
                        )}
                    </aside>
                </div>
            )}
        </>
    );
}