import { Head } from '@inertiajs/react';
import axios from 'axios';
import { Fragment, useEffect, useMemo, useState } from 'react';

// Tag colors are keyed on the exact `rule_type` strings the backend
// returns (space-separated, matching RuleExplorerService / the
// blade.php prototype) -- NOT the underscore-style keys used in the
// older JSX reference. If your controller still emits underscore
// keys, change these (and DELETE_ENDPOINTS below) to match.
const TAG_CLASSES = {
    'CAPABILITY': 'bg-[#e0f0ff] text-[#0056a3]',
    'PART ROUTING': 'bg-[#fff0d9] text-[#a35c00]',
    'TRANSITION COST': 'bg-[#e8e0ff] text-[#4a2f9e]',
    'TRANSITION EXCEPTION': 'bg-[#ffe0e8] text-[#a3003e]',
    'TRANSITION AXIS': 'bg-[#d9f0e8] text-[#007a55]',
    'AUTO-PART RULE': 'bg-[#f0e0ff] text-[#6a00a3]',
    'FOCUS GROUP RULE': 'bg-[#e0fff0] text-[#007a3e]',
    'PART EXCLUSION': 'bg-[#ffe8e0] text-[#a33e00]',
    'PACKAGE GROUP': 'bg-[#e0e8ff] text-[#304a9e]',
};

// 'state_select' fields render as a searchable text input (backed by a
// <datalist>) until the field named in dependsOn (a machine_select on
// the SAME form) is chosen -- then they're populated with that
// machine's real states, labeled in plain English. The actual
// setup_state_id only ever gets set when the typed text matches a
// listed label exactly, so a raw ID can never be hand-typed in.
// Fields with submit:false exist only to drive a dependent picker and
// are excluded from the payload.
const FIELD_DEFS = {
    setup_state: [
        { name: 'machine_id', label: 'Machine', type: 'machine_select', required: true },
        { name: 'factory', label: 'Factory', type: 'select', options: ['F1', 'F2', 'F3'], required: true },
        { name: 'package_name', label: 'Package Name (blank = any)', type: 'text' },
        { name: 'body_size', label: 'Body Size (blank = any)', type: 'text' },
        { name: 'thickness', label: 'Thickness', type: 'number' },
        { name: 'leadcount_min', label: 'Leadcount Min', type: 'number' },
        { name: 'leadcount_max', label: 'Leadcount Max', type: 'number' },
        { name: 'leadcount_exclude', label: 'Leadcount Exclude (csv)', type: 'text' },
        { name: 'leadcount_include', label: 'Leadcount Include (csv)', type: 'text' },
        { name: 'process_type', label: 'Process Type', type: 'select', options: ['taping', 'tubing', 'both', 'tray'], required: true },
        { name: 'remarks', label: 'Remarks', type: 'text' },
    ],
    transition_rule: [
        { name: 'machine_id', label: 'Machine', type: 'machine_select', required: true },
        { name: 'from_state_id', label: 'From State (blank = ANY current state)', type: 'state_select', dependsOn: 'machine_id', allowBlank: true },
        { name: 'to_state_id', label: 'To State', type: 'state_select', dependsOn: 'machine_id', required: true },
        { name: 'operation_type', label: 'Operation Type', type: 'select', options: ['none', 'conversion', 'setup'], required: true },
        { name: 'est_duration_minutes', label: 'Duration (minutes)', type: 'number' },
        { name: 'notes', label: 'Notes', type: 'text' },
    ],
    part_rule: [
        { name: '_machine_filter', label: 'Machine (to find the state)', type: 'machine_select', submit: false },
        { name: 'setup_state_id', label: 'Setup State', type: 'state_select', dependsOn: '_machine_filter', required: true },
        { name: 'match_type', label: 'Match Type', type: 'select', options: ['exact', 'contains', 'suffix'], required: true },
        { name: 'match_value', label: 'Part Name / Pattern', type: 'text', required: true },
    ],
    axis_rule: [
        { name: 'machine_id', label: 'Machine', type: 'machine_select', required: true },
        { name: 'axis', label: 'Axis', type: 'select', options: ['factory', 'package_group', 'leadcount'], required: true },
        { name: 'operation_type', label: 'Operation Type', type: 'select', options: ['setup', 'conversion'], required: true },
        { name: 'est_duration_minutes', label: 'Duration (minutes)', type: 'number', required: true },
        { name: 'combination_rule', label: 'Combination Rule', type: 'select', options: ['max', 'sum'], required: true },
    ],
    transition_exception: [
        { name: 'machine_id', label: 'Machine', type: 'machine_select', required: true },
        { name: 'part_name', label: 'Part Name', type: 'text', required: true },
        { name: 'from_state_id', label: 'From State (blank = ANY current state)', type: 'state_select', dependsOn: 'machine_id', allowBlank: true },
        { name: 'to_state_id', label: 'To State', type: 'state_select', dependsOn: 'machine_id', required: true },
        { name: 'operation_type', label: 'Operation Type', type: 'select', options: ['none', 'conversion', 'setup'], required: true },
        { name: 'est_duration_minutes', label: 'Duration (minutes)', type: 'number' },
        { name: 'notes', label: 'Notes', type: 'text' },
    ],
    auto_part_rule: [
        { name: 'machine_id', label: 'Machine', type: 'machine_select', required: true },
        { name: 'package_name', label: 'Package Name (blank = any)', type: 'text' },
        { name: 'rule_type', label: 'Rule Type', type: 'select', options: ['exclude', 'include_only'], required: true },
        { name: 'notes', label: 'Notes', type: 'text' },
    ],
    focus_group_rule: [
        { name: 'machine_id', label: 'Machine', type: 'machine_select', required: true },
        { name: 'focus_group', label: 'Focus Group', type: 'text', required: true },
        { name: 'rule_type', label: 'Rule Type', type: 'select', options: ['exclude', 'include_only'], required: true },
        { name: 'notes', label: 'Notes', type: 'text' },
    ],
    part_exclusion: [
        { name: 'machine_id', label: 'Machine', type: 'machine_select', required: true },
        { name: 'part_name', label: 'Part Name', type: 'text', required: true },
        { name: 'notes', label: 'Notes', type: 'text' },
    ],
    package_group: [
        { name: 'group_name', label: 'Group Name', type: 'text', required: true },
        { name: 'package_name', label: 'Package Name', type: 'text', required: true },
    ],
};

const RULE_TYPE_LABELS = {
    setup_state: 'Capability (machine_setup_states)',
    transition_rule: 'Transition Cost (machine_transition_rules)',
    part_rule: 'Part Routing (machine_capability_part_rules)',
    axis_rule: 'Transition Axis (machine_transition_axis_rules)',
    transition_exception: 'Transition Exception (per-part override)',
    auto_part_rule: 'Auto-Part Rule',
    focus_group_rule: 'Focus Group Rule',
    part_exclusion: 'Part Exclusion',
    package_group: 'Package Group Membership',
};

const ENDPOINTS = {
    setup_state: '/rules/setup-states',
    transition_rule: '/rules/transition-rules',
    part_rule: '/rules/part-rules',
    axis_rule: '/rules/axis-rules',
    transition_exception: '/rules/transition-exceptions',
    auto_part_rule: '/rules/auto-part-rules',
    focus_group_rule: '/rules/focus-group-rules',
    part_exclusion: '/rules/part-exclusions',
    package_group: '/rules/package-groups',
};

// Maps the rule_type string returned by the list query to the DELETE
// endpoint for that row's actual underlying table. Package groups
// have no delete endpoint here (same as the prototype), so no
// Delete button renders for that row type.
const DELETE_ENDPOINTS = {
    'CAPABILITY': (id) => `/rules/setup-states/${id}`,
    'PART ROUTING': (id) => `/rules/part-rules/${id}`,
    'TRANSITION COST': (id) => `/rules/transition-rules/${id}`,
    'TRANSITION EXCEPTION': (id) => `/rules/transition-exceptions/${id}`,
    'TRANSITION AXIS': (id) => `/rules/axis-rules/${id}`,
    'AUTO-PART RULE': (id) => `/rules/machine_auto_part_rules/${id}`,
    'FOCUS GROUP RULE': (id) => `/rules/machine_focus_group_rules/${id}`,
    'PART EXCLUSION': (id) => `/rules/machine_part_exclusions/${id}`,
};

// Builds the same plain-English label RuleExplorerService uses server
// side (state_desc), just built client-side so the picker never shows
// a bare numeric ID.
function stateLabel(s) {
    let lead = 'any';
    if (s.leadcount_include) {
        lead = `ONLY [${s.leadcount_include}]`;
    } else if (s.leadcount_min || s.leadcount_max) {
        lead = `${s.leadcount_min ?? 'any'}-${s.leadcount_max ?? 'any'}`;
        if (s.leadcount_exclude) lead += ` except [${s.leadcount_exclude}]`;
    }
    const thickness = s.thickness ? ` (thickness ${s.thickness})` : '';
    return `#${s.setup_state_id} — ${s.factory}, ${s.package_name ?? 'ANY pkg'}, ${s.body_size ?? 'any size'}${thickness}, leadcount ${lead}, ${s.process_type}`;
}

function fieldInputClasses(hasError) {
    return `w-full rounded border px-3 py-2 text-sm ${hasError ? 'border-red-500' : 'border-gray-300'}`;
}

// Searchable state_select: a text input with a <datalist> for
// autocomplete. The resolved setup_state_id only ever gets committed
// when the typed text matches one of the listed labels exactly --
// otherwise the value is cleared, so a rule can never be saved
// against a state the user didn't actually pick from the list.
function StateSelectField({ field, states, loading, disabled, value, onChange, error }) {
    const [searchText, setSearchText] = useState('');
    const optionMap = useMemo(() => {
        const map = {};
        (states ?? []).forEach((s) => {
            map[stateLabel(s)] = s.setup_state_id;
        });
        return map;
    }, [states]);

    // Keep the visible search text in sync if the field gets reset
    // (e.g. the driving machine_select changes) or a value is picked.
    useEffect(() => {
        if (!value) setSearchText('');
    }, [value]);

    const datalistId = `dl_${field.name}`;

    return (
        <>
            <input
                type="text"
                list={datalistId}
                disabled={disabled}
                value={searchText || (value ? Object.keys(optionMap).find((k) => optionMap[k] === Number(value) || optionMap[k] === value) ?? '' : '')}
                onChange={(e) => {
                    const text = e.target.value;
                    setSearchText(text);
                    const match = optionMap[text];
                    onChange(match ?? '');
                }}
                placeholder={
                    disabled
                        ? '-- select a machine first --'
                        : loading
                          ? 'Loading...'
                          : field.allowBlank
                            ? 'Type to search... (leave blank = any)'
                            : 'Type to search...'
                }
                className={fieldInputClasses(!!error)}
            />
            <datalist id={datalistId}>
                {(states ?? []).map((s) => (
                    <option key={s.setup_state_id} value={stateLabel(s)} />
                ))}
            </datalist>
            <div className="mt-1 text-[11px] text-gray-500">
                Populates once a machine is chosen above. Pick from the suggestions -- typed text that doesn't match a listed state won't be accepted.
            </div>
            {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
        </>
    );
}

function validateFields(fields, values, searchTexts) {
    const errors = {};
    fields.forEach((f) => {
        if (f.submit === false) return;

        if (f.type === 'state_select') {
            const hasValue = values[f.name] !== '' && values[f.name] != null;
            const typedSomething = (searchTexts[f.name] ?? '').trim() !== '';
            if (!hasValue && f.required && !f.allowBlank) {
                errors[f.name] = 'Required -- select a state from the suggestions.';
            } else if (!hasValue && typedSomething) {
                errors[f.name] = "Doesn't match a real state -- pick one from the suggestions.";
            }
            return;
        }

        if (f.required && (values[f.name] ?? '').toString().trim() === '') {
            errors[f.name] = 'Required.';
        }
    });
    return errors;
}

function RuleForm({ machines, type, initialValues, onClose, onSaved }) {
    const fields = FIELD_DEFS[type];

    const [values, setValues] = useState(() => {
        const initial = {};
        fields.forEach((f) => (initial[f.name] = initialValues?.[f.name] ?? ''));
        return initial;
    });

    const [searchTexts, setSearchTexts] = useState({});
    const [states, setStates] = useState({});
    const [loadingStates, setLoadingStates] = useState({});
    const [errors, setErrors] = useState({});
    const [errorSummary, setErrorSummary] = useState(null);
    const [warnings, setWarnings] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    const updateValue = (name, value) => {
        setValues((current) => ({ ...current, [name]: value }));
        setErrors((current) => ({ ...current, [name]: undefined }));

        // Reset dependent state selections when their driving
        // machine_select changes.
        fields
            .filter((f) => f.type === 'state_select' && f.dependsOn === name)
            .forEach((f) => {
                setValues((current) => ({ ...current, [f.name]: '' }));
                setSearchTexts((current) => ({ ...current, [f.name]: '' }));
            });
    };

    useEffect(() => {
        const stateFields = fields.filter((f) => f.type === 'state_select');

        stateFields.forEach((field) => {
            const machineId = values[field.dependsOn];
            if (!machineId) {
                setStates((current) => ({ ...current, [field.name]: [] }));
                return;
            }

            let cancelled = false;
            setLoadingStates((current) => ({ ...current, [field.name]: true }));

            axios
                .get('/rules/setup-states', { params: { machine_id: machineId } })
                .then(({ data }) => {
                    if (!cancelled) setStates((current) => ({ ...current, [field.name]: data }));
                })
                .catch((err) => !cancelled && console.error(err))
                .finally(() => !cancelled && setLoadingStates((current) => ({ ...current, [field.name]: false })));

            // eslint-disable-next-line no-loop-func
            return () => {
                cancelled = true;
            };
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type, ...fields.filter((f) => f.type === 'state_select').map((f) => values[f.dependsOn])]);

    const submit = async (e) => {
        e.preventDefault();
        setErrorSummary(null);
        setWarnings([]);

        const clientErrors = validateFields(fields, values, searchTexts);
        if (Object.keys(clientErrors).length > 0) {
            setErrors(clientErrors);
            setErrorSummary('Fix the highlighted fields before saving.');
            return;
        }

        const payload = {};
        fields.forEach((f) => {
            if (f.submit === false) return;
            if (values[f.name] !== '') payload[f.name] = values[f.name];
        });

        setSubmitting(true);
        try {
            const { data } = await axios.post(ENDPOINTS[type], payload);
            const responseWarnings = data.warnings ?? [];
            if (responseWarnings.length) {
                setWarnings(responseWarnings);
                return;
            }
            onSaved(data);
        } catch (err) {
            if (err.response?.status === 422) {
                const serverErrors = err.response.data.errors ?? {};
                const flattened = {};
                Object.entries(serverErrors).forEach(([key, msgs]) => {
                    flattened[key] = Array.isArray(msgs) ? msgs.join(', ') : msgs;
                });
                setErrors(flattened);
                setErrorSummary('The server rejected this rule -- see the highlighted fields.');
            } else {
                setErrorSummary('Something went wrong saving this rule. Please try again.');
                console.error(err);
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={submit}>
            <div className="space-y-3">
                {fields.map((field) => {
                    const error = errors[field.name];
                    return (
                        <div key={field.name}>
                            <label className="mb-1 block text-xs font-semibold">
                                {field.label}
                                {field.required && <span className="text-red-500"> *</span>}
                            </label>

                            {field.type === 'select' && (
                                <select
                                    value={values[field.name]}
                                    onChange={(e) => updateValue(field.name, e.target.value)}
                                    className={fieldInputClasses(!!error)}
                                >
                                    <option value="">-- select --</option>
                                    {field.options.map((o) => (
                                        <option key={o} value={o}>{o}</option>
                                    ))}
                                </select>
                            )}

                            {field.type === 'machine_select' && (
                                <select
                                    value={values[field.name]}
                                    onChange={(e) => updateValue(field.name, e.target.value)}
                                    className={fieldInputClasses(!!error)}
                                >
                                    <option value="">-- select machine --</option>
                                    {machines.map((m) => (
                                        <option key={m.id} value={m.id}>{m.machine_num}</option>
                                    ))}
                                </select>
                            )}

                            {field.type === 'state_select' && (
                                <StateSelectField
                                    field={field}
                                    states={states[field.name]}
                                    loading={!!loadingStates[field.name]}
                                    disabled={!values[field.dependsOn]}
                                    value={values[field.name]}
                                    error={error}
                                    onChange={(val) => updateValue(field.name, val)}
                                />
                            )}

                            {['text', 'number'].includes(field.type) && (
                                <input
                                    type={field.type}
                                    value={values[field.name]}
                                    onChange={(e) => updateValue(field.name, e.target.value)}
                                    className={fieldInputClasses(!!error)}
                                />
                            )}

                            {field.type !== 'state_select' && error && (
                                <div className="mt-1 text-xs text-red-600">{error}</div>
                            )}
                        </div>
                    );
                })}
            </div>

            {errorSummary && (
                <div className="mt-4 rounded border border-red-500 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {errorSummary}
                </div>
            )}

            {warnings.length > 0 && (
                <div className="mt-4 space-y-2">
                    {warnings.map((w, i) => (
                        <div key={i} className="rounded border border-yellow-400 bg-yellow-50 px-3 py-2 text-xs">
                            ⚠️ {w}
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
                <button type="button" onClick={onClose} className="rounded border border-gray-300 px-3 py-2 text-sm">
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={submitting}
                    className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                >
                    {submitting ? 'Saving…' : 'Save'}
                </button>
            </div>
        </form>
    );
}

export default function Index({ rules: initialRules = [], machines: initialMachines = [] }) {
    const [machineFilter, setMachineFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [rules, setRules] = useState(initialRules);
    const [machines, setMachines] = useState(initialMachines);
    const [loading, setLoading] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [collapsed, setCollapsed] = useState({});

    const [modalOpen, setModalOpen] = useState(false);
    const [ruleType, setRuleType] = useState('setup_state');
    const [prefill, setPrefill] = useState(null);      // seeds the next RuleForm
    const [chainPrompt, setChainPrompt] = useState(null); // { machineId, stateId, label }

    const machineIdByNum = useMemo(
        () => Object.fromEntries(machines.map((m) => [m.machine_num, m.id])),
        [machines]
    );

    // Grouped view: capabilities with their linked costs/part rules nested underneath.
    const { groups, loose } = useMemo(() => {
        const capabilities = rules.filter((r) => r.rule_type === 'CAPABILITY');
        const capIds = new Set(capabilities.map((r) => Number(r.rule_id)));
        const groups = capabilities.map((cap) => ({
            capability: cap,
            related: rules.filter(
                (r) => r.rule_type !== 'CAPABILITY' && r.state_id != null && Number(r.state_id) === Number(cap.rule_id)
            ),
        }));
        const loose = rules.filter(
            (r) => r.rule_type !== 'CAPABILITY' && !(r.state_id != null && capIds.has(Number(r.state_id)))
        );
        return { groups, loose };
    }, [rules]);

    const types = useMemo(() => [...new Set(rules.map((r) => r.rule_type))].sort(), [rules]);
    const filtered = useMemo(
        () => (typeFilter ? rules.filter((r) => r.rule_type === typeFilter) : rules),
        [rules, typeFilter]
    );

    const toggleCollapsed = (id) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));

    const openModal = () => {
        setRuleType('setup_state');
        setPrefill(null);
        setChainPrompt(null);
        setModalOpen(true);
    };

    const quickAdd = (cap, nextType) => {
        const machineId = machineIdByNum[cap.machine_num];
        setPrefill(
            nextType === 'transition_rule'
                ? { machine_id: machineId, to_state_id: cap.rule_id }
                : { _machine_filter: machineId, setup_state_id: cap.rule_id }
        );
        setRuleType(nextType);
        setChainPrompt(null);
        setModalOpen(true);
    };

    const handleSaved = (type, response) => {
        if (type === 'setup_state') {
            const state = response.state;
            const machine = machines.find((m) => m.id === state.machine_id);
            setChainPrompt({
                machineId: state.machine_id,
                stateId: state.setup_state_id,
                label: `${machine?.machine_num ?? state.machine_id} — ${state.package_name ?? 'ANY pkg'} / ${state.body_size ?? 'any size'}`,
            });
            loadRules();
            return;
        }
        setModalOpen(false);
        setChainPrompt(null);
        setPrefill(null);
        loadRules();
    };

    const startChained = (nextType) => {
        if (!chainPrompt) return;
        setPrefill(
            nextType === 'transition_rule'
                ? { machine_id: chainPrompt.machineId, to_state_id: chainPrompt.stateId }
                : { _machine_filter: chainPrompt.machineId, setup_state_id: chainPrompt.stateId }
        );
        setRuleType(nextType);
        setChainPrompt(null);
    };

    const finishChain = () => {
        setModalOpen(false);
        setChainPrompt(null);
        setPrefill(null);
        loadRules();
    };

    const loadRules = () => {
        setLoading(true);
        const params = machineFilter ? { machine: machineFilter } : {};
        return axios
            .get('/rules/data', { params })
            .then(({ data }) => setRules(data))
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        axios.get('/rules/machines').then(({ data }) => setMachines(data)).catch((err) => console.error(err));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const timer = setTimeout(loadRules, 300);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [machineFilter]);

    const handleDelete = async (rule) => {
        const endpoint = DELETE_ENDPOINTS[rule.rule_type];
        if (!endpoint) {
            alert(`No delete endpoint mapped for type "${rule.rule_type}"`);
            return;
        }

        const extraWarning =
            rule.rule_type === 'CAPABILITY'
                ? '\n\nThis is a CAPABILITY row -- deleting it also cascades to any transition rules and part rules that reference it.'
                : '';
        if (!confirm(`Delete this rule?${extraWarning}`)) return;

        setDeletingId(rule.rule_id);
        try {
            await axios.delete(endpoint(rule.rule_id));
            await loadRules();
        } catch (err) {
            console.error(err);
            alert('Failed to delete this rule.');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <>
            <Head title="Scheduling Rules Explorer" />

            <div className="m-8 font-sans">
                <h1 className="mb-4 text-xl font-semibold">Scheduling Rules Explorer</h1>

                <div className="mb-4 flex items-center gap-4">
                    <input
                        type="text"
                        value={machineFilter}
                        onChange={(e) => setMachineFilter(e.target.value)}
                        placeholder="Filter by machine number..."
                        className="rounded border border-gray-300 px-3 py-2 text-sm"
                    />

                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="rounded border border-gray-300 px-3 py-2 text-sm"
                    >
                        <option value="">All rule types</option>
                        {types.map((t) => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>

                    {/* <button
                        type="button"
                        onClick={openModal}
                        className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                    >
                        + Add Rule
                    </button> */}

                    <span className="text-sm text-gray-500">{loading ? 'Loading…' : `${filtered.length} rules`}</span>
                </div>

                <div className="overflow-x-auto rounded border border-gray-200">
                    <table className="w-full border-collapse bg-white">
                        <thead>
                            <tr>
                                <th className="sticky top-0 w-[170px] bg-gray-100 px-3 py-2 text-left text-sm font-semibold">Type</th>
                                <th className="sticky top-0 w-[110px] bg-gray-100 px-3 py-2 text-left text-sm font-semibold">Machine</th>
                                <th className="sticky top-0 bg-gray-100 px-3 py-2 text-left text-sm font-semibold">Rule</th>
                                <th className="sticky top-0 w-[70px] bg-gray-100 px-3 py-2 text-left text-sm font-semibold" />
                            </tr>
                        </thead>
                        <tbody>
                            {typeFilter === '' ? (
                                groups.length === 0 && loose.length === 0 ? (
                                    <tr><td colSpan={4} className="px-3 py-8 text-center text-sm text-gray-500">No rules found.</td></tr>
                                ) : (
                                    <>
                                        {groups.map(({ capability: cap, related }) => (
                                            <Fragment key={`cap-${cap.rule_id}`}>
                                                <tr className="border-b border-gray-100 bg-blue-50/40">
                                                    <td className="px-3 py-2 text-sm">
                                                        <button type="button" onClick={() => toggleCollapsed(cap.rule_id)} className="mr-1 text-xs text-gray-500">
                                                            {collapsed[cap.rule_id] ? '▶' : '▼'}
                                                        </button>
                                                        <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${TAG_CLASSES.CAPABILITY}`}>CAPABILITY</span>
                                                    </td>
                                                    <td className="px-3 py-2 text-sm">{cap.machine_num}</td>
                                                    <td className="px-3 py-2 text-sm">{cap.rule_in_plain_english}</td>
                                                    <td className="px-3 py-2 text-sm">
                                                        <button type="button" onClick={() => handleDelete(cap)} disabled={deletingId === cap.rule_id}
                                                            className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50">
                                                            {deletingId === cap.rule_id ? '…' : 'Delete'}
                                                        </button>
                                                    </td>
                                                </tr>

                                                {!collapsed[cap.rule_id] && (
                                                    related.length === 0 ? (
                                                        <tr className="border-b border-gray-100">
                                                            <td />
                                                            <td colSpan={3} className="px-3 py-2 text-xs italic text-gray-400">
                                                                No transition costs or part-name rules linked to this state yet —{' '}
                                                                <button type="button" onClick={() => quickAdd(cap, 'transition_rule')} className="text-blue-600 underline">add a cost</button>
                                                                {' or '}
                                                                <button type="button" onClick={() => quickAdd(cap, 'part_rule')} className="text-blue-600 underline">restrict a part</button>.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        related.map((rule) => (
                                                            <tr key={`${rule.rule_type}-${rule.rule_id}`} className="border-b border-gray-100">
                                                                <td className="px-3 py-2 pl-8 text-sm">
                                                                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${TAG_CLASSES[rule.rule_type] ?? 'bg-gray-100 text-gray-700'}`}>
                                                                        {rule.rule_type}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3 py-2 text-sm">{rule.machine_num ?? '-'}</td>
                                                                <td className="px-3 py-2 text-sm">{rule.rule_in_plain_english}</td>
                                                                <td className="px-3 py-2 text-sm">
                                                                    {DELETE_ENDPOINTS[rule.rule_type] && (
                                                                        <button type="button" onClick={() => handleDelete(rule)} disabled={deletingId === rule.rule_id}
                                                                            className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50">
                                                                            {deletingId === rule.rule_id ? '…' : 'Delete'}
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )
                                                )}
                                            </Fragment>
                                        ))}

                                        {loose.length > 0 && (
                                            <tr>
                                                <td colSpan={4} className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500">
                                                    Machine-level rules (not tied to a specific capability state)
                                                </td>
                                            </tr>
                                        )}
                                        {loose.map((rule) => (
                                            <tr key={`${rule.rule_type}-${rule.rule_id}`} className="border-b border-gray-100">
                                                <td className="px-3 py-2 text-sm">
                                                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${TAG_CLASSES[rule.rule_type] ?? 'bg-gray-100 text-gray-700'}`}>
                                                        {rule.rule_type}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-sm">{rule.machine_num ?? '-'}</td>
                                                <td className="px-3 py-2 text-sm">{rule.rule_in_plain_english}</td>
                                                <td className="px-3 py-2 text-sm">
                                                    {DELETE_ENDPOINTS[rule.rule_type] && (
                                                        <button type="button" onClick={() => handleDelete(rule)} disabled={deletingId === rule.rule_id}
                                                            className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50">
                                                            {deletingId === rule.rule_id ? '…' : 'Delete'}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </>
                                )
                            ) : (
                                // unchanged flat/filtered rendering from the original file
                                filtered.length === 0 ? (
                                    <tr><td colSpan={4} className="px-3 py-8 text-center text-sm text-gray-500">No rules found.</td></tr>
                                ) : (
                                    filtered.map((rule) => (
                                        <tr key={`${rule.rule_type}-${rule.rule_id}`} className="border-b border-gray-100 last:border-0">
                                            <td className="px-3 py-2 text-sm">
                                                <span
                                                    className={`inline-block rounded px-2 py-0.5 text-xs font-semibold ${
                                                        TAG_CLASSES[rule.rule_type] ?? 'bg-gray-100 text-gray-700'
                                                    }`}
                                                >
                                                    {rule.rule_type}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-sm">{rule.machine_num ?? '-'}</td>
                                            <td className="px-3 py-2 text-sm">{rule.rule_in_plain_english}</td>
                                            <td className="px-3 py-2 text-sm">
                                                {DELETE_ENDPOINTS[rule.rule_type] && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(rule)}
                                                        disabled={deletingId === rule.rule_id}
                                                        className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
                                                    >
                                                        {deletingId === rule.rule_id ? '…' : 'Delete'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {modalOpen && (
                <div>
                    <div className="fixed inset-0 z-[60] bg-black/40" onMouseDown={(e) => e.target === e.currentTarget && (chainPrompt ? finishChain() : setModalOpen(false))} />
                    <div className="fixed inset-0 z-[70] flex items-center justify-center">
                        <div className="max-h-[80vh] w-[520px] overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
                            {chainPrompt ? (
                                <div className="space-y-3 text-sm">
                                    <h3 className="text-lg font-semibold">Saved</h3>
                                    <p>Add rules for <strong>{chainPrompt.label}</strong> now, so it doesn't sit unrouted?</p>
                                    <div className="flex flex-col gap-2 pt-1">
                                        <button type="button" onClick={() => startChained('transition_rule')}
                                            className="rounded border border-gray-300 px-3 py-2 text-left hover:bg-gray-50">
                                            + Add a transition cost into this state
                                        </button>
                                        <button type="button" onClick={() => startChained('part_rule')}
                                            className="rounded border border-gray-300 px-3 py-2 text-left hover:bg-gray-50">
                                            + Restrict a part name to this state
                                        </button>
                                    </div>
                                    <div className="flex justify-end pt-3">
                                        <button type="button" onClick={finishChain} className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">
                                            Done
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h3 className="mb-4 text-lg font-semibold">Add Rule</h3>
                                    <label className="mb-1 block text-xs font-semibold">Rule Type</label>
                                    <select
                                        value={ruleType}
                                        onChange={(e) => { setRuleType(e.target.value); setPrefill(null); }}
                                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                                    >
                                        {Object.entries(RULE_TYPE_LABELS).map(([value, label]) => (
                                            <option key={value} value={value}>{label}</option>
                                        ))}
                                    </select>

                                    <div className="mt-4">
                                        <RuleForm
                                            key={ruleType + (prefill ? '-chained' : '')}
                                            machines={machines}
                                            type={ruleType}
                                            initialValues={prefill}
                                            onClose={() => { setModalOpen(false); setPrefill(null); }}
                                            onSaved={(response) => handleSaved(ruleType, response)}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}