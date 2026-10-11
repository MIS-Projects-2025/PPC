import { useMemo, useState } from "react";

const FACTORIES = ["F1", "F2", "F3"];
const PROCESSES = ["taping", "tubing", "both", "tray"];
export const MAX_BULK_STATES = 2000;

// Mirrors the server's max lengths in CapabilityMatrixController@bulkStore
const LIMITS = { packages: 50, bodySizes: 20, focusGroups: 50, lotTypes: 20 };

const tokens = (s) => [
    ...new Set(
        s
            .split(/[\s,;]+/)
            .map((t) => t.trim())
            .filter(Boolean),
    ),
];

const input = "w-full rounded border border-gray-300 px-3 py-2 text-sm";

function Checks({ options, value, onChange }) {
    const toggle = (o) =>
        onChange(
            value.includes(o) ? value.filter((x) => x !== o) : [...value, o],
        );
    return (
        <div className="flex flex-wrap gap-3">
            {options.map((o) => (
                <label key={o} className="flex items-center gap-1.5 text-sm">
                    <input
                        type="checkbox"
                        checked={value.includes(o)}
                        onChange={() => toggle(o)}
                    />
                    {o}
                </label>
            ))}
        </div>
    );
}

export default function BulkGenerator({ onGenerate, onClose }) {
    const [factories, setFactories] = useState([]);
    const [processes, setProcesses] = useState([]);
    const [text, setText] = useState({
        packages: "",
        bodySizes: "",
        thicknesses: "",
        focusGroups: "",
        lotTypes: "",
        leadcounts: "",
    });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    const set = (k) => (e) => setText((c) => ({ ...c, [k]: e.target.value }));

    const parsed = useMemo(() => {
        const orNull = (list) => (list.length ? list : [null]);
        const leadRaw = tokens(text.leadcounts);
        const thickRaw = tokens(text.thicknesses);
        const badLead = leadRaw.filter((t) => !/^\d+$/.test(t));
        const badThick = thickRaw.filter((t) => Number.isNaN(Number(t)));
        const tooLong = Object.entries(LIMITS).flatMap(([k, max]) =>
            tokens(text[k])
                .filter((t) => t.length > max)
                .map((t) => `"${t}" is over ${max} characters`),
        );
        return {
            packages: orNull(tokens(text.packages)),
            bodySizes: orNull(tokens(text.bodySizes)),
            thicknesses: orNull(thickRaw.filter((t) => !badThick.includes(t))),
            focusGroups: orNull(tokens(text.focusGroups)),
            lotTypes: orNull(tokens(text.lotTypes)),
            leadcounts: orNull(
                leadRaw
                    .filter((t) => !badLead.includes(t))
                    .map(Number)
                    .sort((a, b) => a - b),
            ),
            bad: [
                ...badLead.map((t) => `leadcount "${t}"`),
                ...badThick.map((t) => `thickness "${t}"`),
                ...tooLong,
            ],
        };
    }, [text]);

    const rowCount =
        factories.length *
        parsed.packages.length *
        parsed.bodySizes.length *
        parsed.thicknesses.length *
        parsed.focusGroups.length *
        parsed.lotTypes.length;
    const colCount = parsed.leadcounts.length;
    const total = rowCount * colCount * processes.length;

    const problem = !factories.length
        ? "Pick at least one factory."
        : !processes.length
          ? "Pick at least one process."
          : parsed.bad.length
            ? `Invalid: ${parsed.bad.join(", ")}`
            : total > MAX_BULK_STATES
              ? `That's ${total} records; the cap is ${MAX_BULK_STATES}. Split it up.`
              : null;

    const submit = async (e) => {
        e.preventDefault();
        if (problem) return;
        if (
            !confirm(
                `Create up to ${total} capabilities (${rowCount} rows × ${colCount} columns × ${processes.length} processes)?\n\nExisting ones are skipped by the server.`,
            )
        )
            return;

        const rows = [];
        for (const factory of factories)
            for (const package_name of parsed.packages)
                for (const body_size of parsed.bodySizes)
                    for (const thickness of parsed.thicknesses)
                        for (const focus_group of parsed.focusGroups)
                            for (const lot_type of parsed.lotTypes)
                                rows.push({
                                    factory,
                                    package_name,
                                    body_size,
                                    thickness,
                                    focus_group,
                                    lot_type,
                                });

        const cols = parsed.leadcounts.map((n) =>
            n === null ? { kind: "any" } : { kind: "single", n },
        );

        setBusy(true);
        setError(null);
        try {
            await onGenerate({ rows, cols, processes });
        } catch (err) {
            setError(err.message ?? "Something went wrong.");
            setBusy(false);
        }
    };

    const field = (label, k, placeholder) => (
        <div>
            <label className="mb-1 block text-xs font-semibold">{label}</label>
            <input
                value={text[k]}
                onChange={set(k)}
                placeholder={placeholder}
                className={input}
            />
        </div>
    );

    return (
        <form onSubmit={submit} className="space-y-3">
            <div>
                <label className="mb-1 block text-xs font-semibold">
                    Factories <span className="text-red-500">*</span>
                </label>
                <Checks
                    options={FACTORIES}
                    value={factories}
                    onChange={setFactories}
                />
            </div>
            {field(
                "Packages (blank = any)",
                "packages",
                "LFCSP, LFCSP_SS, LFCSP_CAV",
            )}
            {field("Body sizes (blank = any)", "bodySizes", "5x5, 7x7")}
            {field("Thickness (blank = any)", "thicknesses", "0.75, 0.85")}
            {field("Focus groups (blank = any)", "focusGroups")}
            {field("Lot types (blank = any)", "lotTypes")}
            {field("Leadcounts (blank = any)", "leadcounts", "10, 32")}
            <div>
                <label className="mb-1 block text-xs font-semibold">
                    Processes <span className="text-red-500">*</span>
                </label>
                <Checks
                    options={PROCESSES}
                    value={processes}
                    onChange={setProcesses}
                />
                {processes.includes("both") && processes.length > 1 && (
                    <div className="mt-1 text-[11px] text-amber-700">
                        "both" is a separate process type. Combined with the
                        others it creates overlapping capabilities for the same
                        cell.
                    </div>
                )}
            </div>

            <div className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
                {rowCount} rows × {colCount} columns × {processes.length}{" "}
                processes ={" "}
                <span
                    className={
                        total > MAX_BULK_STATES
                            ? "font-semibold text-red-600"
                            : "font-semibold"
                    }
                >
                    {total}
                </span>{" "}
                capabilities
            </div>

            {problem && factories.length + processes.length > 0 && (
                <div className="text-xs text-red-600">{problem}</div>
            )}
            {error && (
                <div className="rounded border border-red-500 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {error}
                </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded border border-gray-300 px-3 py-2 text-sm"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={busy || !!problem}
                    className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                >
                    {busy ? "Creating…" : `Create ${total || ""}`}
                </button>
            </div>
        </form>
    );
}