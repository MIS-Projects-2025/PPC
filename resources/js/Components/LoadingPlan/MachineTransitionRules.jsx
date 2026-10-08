import RuleForm from '@/components/rules/RuleForm';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';

const linkBtn = 'text-xs text-blue-600 underline hover:text-blue-800';
const dangerBtn = 'text-xs text-red-600 hover:text-red-800';
const OP_STYLE = { none: 'text-gray-500', conversion: 'text-amber-700', setup: 'text-red-700' };
const SHOW_LIMIT = 150;

const DELETE_URL = {
    transition_rule: (id) => `/rules/transition-rules/${id}`,
    transition_exception: (id) => `/rules/transition-exceptions/${id}`,
    axis_rule: (id) => `/rules/axis-rules/${id}`,
};

const TITLE = {
    transition_rule: 'pair cost',
    transition_exception: 'part-specific cost',
    axis_rule: 'axis rule',
};

function Section({ title, hint, onAdd, children }) {
    return (
        <section className="mb-8">
            <div className="mb-1 flex items-center gap-3">
                <h2 className="text-sm font-semibold">{title}</h2>
                <button type="button" onClick={onAdd} className="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-50">+ Add</button>
            </div>
            <p className="mb-2 max-w-3xl text-xs text-gray-500">{hint}</p>
            {children}
        </section>
    );
}

export default function MachineTransitionRules({ machine, machines }) {
    const [data, setData] = useState({ pair_rules: [], exceptions: [], axis_rules: [] });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showAll, setShowAll] = useState(false);
    const [note, setNote] = useState(null);
    const [drawer, setDrawer] = useState(null); // { type, initialValues, editId }

    const load = () =>
        axios
            .get(`/rules/machines/${machine.id}/transition-rules`)
            .then(({ data }) => setData(data))
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [machine.id]);

    const remove = async (type, id) => {
        if (!confirm(`Delete this ${TITLE[type]}?`)) return;
        try {
            await axios.delete(DELETE_URL[type](id));
            await load();
        } catch (err) {
            console.error(err);
            setNote('Failed to delete.');
        }
    };

    const closeDrawer = () => {
        setDrawer(null);
        load();
    };

    const q = search.trim().toLowerCase();
    const pairRows = useMemo(
        () => data.pair_rules.filter((r) => !q || `${r.from_label} ${r.to_label} ${r.notes ?? ''}`.toLowerCase().includes(q)),
        [data.pair_rules, q]
    );
    const visiblePairs = showAll ? pairRows : pairRows.slice(0, SHOW_LIMIT);
    const hasSum = data.axis_rules.some((a) => a.combination_rule === 'sum');

    const openAdd = (type) => setDrawer({ type, initialValues: { machine_id: machine.id }, editId: null });

    if (loading) return <div className="py-10 text-center text-sm text-gray-500">Loading…</div>;

    return (
        <div>
            <p className="mb-4 max-w-3xl text-xs text-gray-600">
                These are the cost rules that existed before groups. They are still in use. On a machine with groups, the scheduler applies them in this order:
                part-specific costs, then exact pair costs, then groups, then axis rules, then costs from "any state", then the 240 min default.
                A machine without groups skips the group step.
            </p>

            {note && (
                <div className="mb-3 flex items-center gap-3 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                    <span>{note}</span>
                    <button type="button" className={`${linkBtn} ml-auto`} onClick={() => setNote(null)}>Dismiss</button>
                </div>
            )}

            <Section
                title={`Pair costs (${data.pair_rules.length})`}
                hint="Cost of changing from one capability to another. 'ANY state' as the from-state means the cost applies whatever the machine ran before."
                onAdd={() => openAdd('transition_rule')}
            >
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter by package, leadcount, process or notes…" className="mb-2 w-80 rounded border border-gray-300 px-3 py-1.5 text-sm" />
                {pairRows.length === 0 ? (
                    <div className="rounded border border-dashed border-gray-300 px-3 py-6 text-center text-sm text-gray-500">No pair costs{q ? ' match this filter' : ' on this machine'}.</div>
                ) : (
                    <div className="overflow-x-auto rounded border border-gray-200">
                        <table className="w-full border-collapse bg-white text-xs">
                            <thead>
                                <tr className="bg-gray-100 text-left text-gray-600">
                                    <th className="px-3 py-2 font-semibold">From</th>
                                    <th className="px-3 py-2 font-semibold">To</th>
                                    <th className="px-3 py-2 font-semibold">Operation</th>
                                    <th className="px-3 py-2 font-semibold">Minutes</th>
                                    <th className="px-3 py-2 font-semibold">Notes</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody>
                                {visiblePairs.map((r) => (
                                    <tr key={r.rule_id} className="border-t border-gray-100">
                                        <td className="px-3 py-1.5">{r.from_label}</td>
                                        <td className="px-3 py-1.5">{r.to_label}</td>
                                        <td className={`px-3 py-1.5 font-medium ${OP_STYLE[r.operation_type]}`}>{r.operation_type}</td>
                                        <td className="px-3 py-1.5">{r.est_duration_minutes ?? '-'}</td>
                                        <td className="px-3 py-1.5 text-gray-500">{r.notes}</td>
                                        <td className="space-x-3 px-3 py-1.5 text-right">
                                            <button type="button" className={linkBtn} onClick={() => setDrawer({ type: 'transition_rule', initialValues: r, editId: r.rule_id })}>Edit</button>
                                            <button type="button" className={dangerBtn} onClick={() => remove('transition_rule', r.rule_id)}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {!showAll && pairRows.length > SHOW_LIMIT && (
                    <button type="button" className={`${linkBtn} mt-2`} onClick={() => setShowAll(true)}>Show all {pairRows.length}</button>
                )}
            </Section>

            <Section
                title={`Part-specific costs (${data.exceptions.length})`}
                hint="Overrides for one part name. They beat every other rule for that part."
                onAdd={() => openAdd('transition_exception')}
            >
                {data.exceptions.length === 0 ? (
                    <div className="text-xs italic text-gray-500">None.</div>
                ) : (
                    <div className="overflow-x-auto rounded border border-gray-200">
                        <table className="w-full border-collapse bg-white text-xs">
                            <tbody>
                                {data.exceptions.map((e) => (
                                    <tr key={e.id} className="border-t border-gray-100 first:border-t-0">
                                        <td className="px-3 py-1.5 font-medium">{e.part_name}</td>
                                        <td className="px-3 py-1.5">{e.from_label}</td>
                                        <td className="px-3 py-1.5">{e.to_label}</td>
                                        <td className={`px-3 py-1.5 font-medium ${OP_STYLE[e.operation_type]}`}>{e.operation_type}</td>
                                        <td className="px-3 py-1.5">{e.est_duration_minutes ?? '-'} min</td>
                                        <td className="px-3 py-1.5 text-right">
                                            <button type="button" className={dangerBtn} onClick={() => remove('transition_exception', e.id)}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Section>

            <Section
                title={`Axis rules (${data.axis_rules.length})`}
                hint="Cost worked out from what differs between two capabilities, such as factory, package group or leadcount. If several axes differ, the scheduler uses the longest one."
                onAdd={() => openAdd('axis_rule')}
            >
                {data.axis_rules.length === 0 ? (
                    <div className="text-xs italic text-gray-500">None, so this machine's costs come from pair rows and the 240 min default.</div>
                ) : (
                    <div className="overflow-x-auto rounded border border-gray-200">
                        <table className="w-full border-collapse bg-white text-xs">
                            <tbody>
                                {data.axis_rules.map((a) => (
                                    <tr key={a.id} className="border-t border-gray-100 first:border-t-0">
                                        <td className="px-3 py-1.5 font-medium">{a.axis}</td>
                                        <td className={`px-3 py-1.5 font-medium ${OP_STYLE[a.operation_type]}`}>{a.operation_type}</td>
                                        <td className="px-3 py-1.5">{a.est_duration_minutes} min</td>
                                        <td className="px-3 py-1.5 text-gray-500">combined by {a.combination_rule}</td>
                                        <td className="px-3 py-1.5 text-right">
                                            <button type="button" className={dangerBtn} onClick={() => remove('axis_rule', a.id)}>Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {hasSum && (
                    <p className="mt-2 text-xs text-amber-800">
                        An axis rule is set to 'sum', but the scheduler always takes the longest differing axis, so 'sum' has no effect.
                    </p>
                )}
            </Section>

            {drawer && (
                <div className="fixed inset-0 z-[60]">
                    <div className="absolute inset-0 bg-black/40" onMouseDown={closeDrawer} />
                    <aside className="absolute right-0 top-0 h-full w-[480px] max-w-full overflow-y-auto bg-white p-6 shadow-xl">
                        <h3 className="mb-4 text-lg font-semibold">
                            {drawer.editId ? 'Edit' : 'Add'} {TITLE[drawer.type]}
                        </h3>
                        <RuleForm
                            key={`${drawer.type}-${drawer.editId ?? 'new'}`}
                            machines={machines}
                            type={drawer.type}
                            initialValues={drawer.initialValues}
                            editId={drawer.editId}
                            onClose={closeDrawer}
                            onSaved={closeDrawer}
                        />
                    </aside>
                </div>
            )}
        </div>
    );
}