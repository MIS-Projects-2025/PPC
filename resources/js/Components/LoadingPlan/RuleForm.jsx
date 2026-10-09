import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';

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
        { name: 'leadcount_min', label: 'Leadcount Min', type: 'number', half: true},
        { name: 'leadcount_max', label: 'Leadcount Max', type: 'number', half: true},
        { name: 'leadcount_exclude', label: 'Leadcount Exclude (csv)', type: 'text', half: true},
        { name: 'leadcount_include', label: 'Leadcount Include (csv)', type: 'text', half: true},
        { name: 'process_type', label: 'Process Type', type: 'select', options: ['taping', 'tubing', 'both', 'tray'], required: true },
        { name: 'remarks', label: 'Remarks', type: 'text' },
        { name: 'focus_group', label: 'Focus Group (blank = any)', type: 'text' },
        { name: 'lot_type', label: 'Lot Type (blank = any)', type: 'text' },
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

export const RULE_TYPE_LABELS = {
    setup_state: 'Capability',
    transition_rule: 'Transition Cost',
    part_rule: 'Part Routing',
    axis_rule: 'Transition Axis',
    transition_exception: 'Part-specific Transition Cost',
    auto_part_rule: 'Auto-Part Rule',
    focus_group_rule: 'Focus Group Rule',
    part_exclusion: 'Part Exclusion',
    package_group: 'Package Group Membership',
};

export const ENDPOINTS = {
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

// The backend PATCH endpoints (setup states, transition rules, axis rules) ignore these
// fields, so the form locks them when editing instead of letting a change
// silently do nothing. To change one of these, delete the rule and re-add it.
const LOCKED_ON_EDIT = new Set(['machine_id', 'from_state_id', 'to_state_id', 'axis']);

// Builds the same plain-English label the server uses, so the picker
// never shows a bare numeric ID.
function stateLabel(s) {
    let lead = 'any';
    if (s.leadcount_include) {
        lead = `ONLY [${s.leadcount_include}]`;
    } else if (s.leadcount_min != null || s.leadcount_max != null) {
        lead = `${s.leadcount_min ?? 'any'}-${s.leadcount_max ?? 'any'}`;
        if (s.leadcount_exclude) lead += ` except [${s.leadcount_exclude}]`;
    }
    const thickness = s.thickness != null ? ` (thickness ${s.thickness})` : '';
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
function StateSelectField({ field, states, loading, disabled, locked, value, onChange, error }) {
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
    const selectedLabel = value
        ? Object.keys(optionMap).find((k) => optionMap[k] === Number(value) || optionMap[k] === value) ?? ''
        : '';

    return (
        <>
            <input
                type="text"
                list={datalistId}
                disabled={disabled || locked}
                value={searchText || selectedLabel}
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
            {!locked && (
                <div className="mt-1 text-[11px] text-gray-500">
                    Populates once a machine is chosen above. Pick from the suggestions -- typed text that doesn't match a listed state won't be accepted.
                </div>
            )}
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

/**
 * Props:
 *  - machines:       [{ id, machine_num }]
 *  - type:           key of FIELD_DEFS
 *  - initialValues:  prefill (a raw DB row works for editing)
 *  - editId:         when set, the form PATCHes `${ENDPOINTS[type]}/${editId}`
 *  - onClose():      cancel / close
 *  - onSaved(data):  called with the server response after a successful save
 */
export default function RuleForm({ machines, type, initialValues, editId = null, onClose, onSaved }) {
    const fields = FIELD_DEFS[type];
    const isLocked = (f) => !!editId && LOCKED_ON_EDIT.has(f.name);

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
    const [savedResponse, setSavedResponse] = useState(null); // set once the server accepted the rule
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

    const stateFields = fields.filter((f) => f.type === 'state_select');
    const drivingValues = stateFields.map((f) => values[f.dependsOn]);

    useEffect(() => {
        let cancelled = false;

        stateFields.forEach((field) => {
            const machineId = values[field.dependsOn];
            if (!machineId) {
                setStates((current) => ({ ...current, [field.name]: [] }));
                return;
            }

            setLoadingStates((current) => ({ ...current, [field.name]: true }));
            axios
                .get('/rules/setup-states', { params: { machine_id: machineId } })
                .then(({ data }) => {
                    if (!cancelled) setStates((current) => ({ ...current, [field.name]: data }));
                })
                .catch((err) => !cancelled && console.error(err))
                .finally(() => !cancelled && setLoadingStates((current) => ({ ...current, [field.name]: false })));
        });

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [type, ...drivingValues]);

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
            if (f.submit === false || isLocked(f)) return;
            if (values[f.name] !== '') payload[f.name] = values[f.name];
            else if (editId && !f.required) payload[f.name] = null; // lets a field be cleared on edit
        });

        setSubmitting(true);
        try {
            const { data } = editId
                ? await axios.patch(`${ENDPOINTS[type]}/${editId}`, payload)
                : await axios.post(ENDPOINTS[type], payload);

            const responseWarnings = data.warnings ?? [];
            if (responseWarnings.length) {
                // The rule IS saved at this point. Show the warnings and let the
                // user acknowledge them with Done instead of saving a second copy.
                setWarnings(responseWarnings);
                setSavedResponse(data);
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

    const frozen = !!savedResponse; // after a save-with-warnings the form is read-only

    return (
        <form onSubmit={submit}>
            <div className="grid grid-cols-2 gap-2">
                {fields.map((field) => {
                    const error = errors[field.name];
                    const locked = isLocked(field) || frozen;
                    return (
                        <div key={field.name} className={field.half ? '' : 'col-span-2'}>
                            <div >
                                <label className="mb-1 block text-xs font-semibold">
                                    {field.label}
                                    {field.required && <span className="text-red-500"> *</span>}
                                    {isLocked(field) && <span className="ml-1 font-normal text-gray-500">(can't be changed here -- delete and re-add)</span>}
                                </label>

                                {field.type === 'select' && (
                                    <select
                                        value={values[field.name]}
                                        disabled={locked}
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
                                        disabled={locked}
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
                                        locked={locked}
                                        value={values[field.name]}
                                        error={error}
                                        onChange={(val) => updateValue(field.name, val)}
                                    />
                                )}

                                {['text', 'number'].includes(field.type) && (
                                    <input
                                        type={field.type}
                                        value={values[field.name]}
                                        disabled={frozen}
                                        onChange={(e) => updateValue(field.name, e.target.value)}
                                        className={fieldInputClasses(!!error)}
                                    />
                                )}

                                {field.type !== 'state_select' && error && (
                                    <div className="mt-1 text-xs text-red-600">{error}</div>
                                )}
                            </div>
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
                    <div className="text-xs font-semibold">Saved, with warnings:</div>
                    {warnings.map((w, i) => (
                        <div key={i} className="rounded border border-yellow-400 bg-yellow-50 px-3 py-2 text-xs">
                            ⚠️ {w}
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
                {savedResponse ? (
                    <button
                        type="button"
                        onClick={() => onSaved(savedResponse)}
                        className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
                    >
                        Done
                    </button>
                ) : (
                    <>
                        <button type="button" onClick={onClose} className="rounded border border-gray-300 px-3 py-2 text-sm">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            {submitting ? 'Saving…' : editId ? 'Save changes' : 'Save'}
                        </button>
                    </>
                )}
            </div>
        </form>
    );
}