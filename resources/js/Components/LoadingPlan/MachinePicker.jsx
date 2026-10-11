import axios from "axios";
import { useEffect, useMemo, useRef, useState } from "react";

const PROCESS_STYLE = {
    taping: "bg-sky-100 text-sky-800",
    tubing: "bg-emerald-100 text-emerald-800",
    both: "bg-indigo-100 text-indigo-800",
    tray: "bg-orange-100 text-orange-800",
};

const ctl = "rounded border border-gray-300 px-2 py-1.5 text-sm";
const MAX_LINES = 8;

// Collapse state rows into "F1 · SOIC" lines, each with its process chips.
function summarize(states) {
    const map = new Map();
    states.forEach((s) => {
        const key = `${s.factory}|${s.package_name ?? ""}`;
        if (!map.has(key)) {
            map.set(key, {
                key,
                factory: s.factory,
                package_name: s.package_name,
                processes: [],
            });
        }
        map.get(key).processes.push({ type: s.process_type, count: s.count });
    });
    return [...map.values()];
}

export default function MachinePicker({ current, onSelect }) {
    const [open, setOpen] = useState(false);
    const [platforms, setPlatforms] = useState(null);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const [factory, setFactory] = useState("");
    const [pkg, setPkg] = useState("");
    const [process, setProcess] = useState("");
    const boxRef = useRef(null);
    const searchRef = useRef(null);

    // Load once, the first time the picker is opened.
    useEffect(() => {
        if (!open || platforms) return;
        axios
            .get("/rules/machine-picker")
            .then(({ data }) => setPlatforms(data.platforms))
            .catch(() => setError("Could not load machines."));
    }, [open, platforms]);

    // Close on outside click / Escape; focus the search box on open.
    useEffect(() => {
        if (!open) return;
        requestAnimationFrame(() => searchRef.current?.focus());
        const onDown = (e) => {
            if (boxRef.current && !boxRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        const onKey = (e) => e.key === "Escape" && setOpen(false);
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const factories = useMemo(
        () =>
            [
                ...new Set(
                    (platforms ?? []).flatMap((g) =>
                        g.machines.flatMap((m) => m.states.map((s) => s.factory)),
                    ),
                ),
            ].sort(),
        [platforms],
    );

    const processes = useMemo(
        () =>
            [
                ...new Set(
                    (platforms ?? []).flatMap((g) =>
                        g.machines.flatMap((m) =>
                            m.states.map((s) => s.process_type),
                        ),
                    ),
                ),
            ].sort(),
        [platforms],
    );

    const q = search.trim().toLowerCase();
    const p = pkg.trim().toLowerCase();
    const filtering = !!(factory || p || process);

    const groups = useMemo(
        () =>
            (platforms ?? [])
                .map((g) => ({
                    platform: g.platform,
                    machines: g.machines
                        .map((m) => {
                            if (q && !m.machine_num.toLowerCase().includes(q))
                                return null;
                            if (!filtering) return m;
                            // One state row must satisfy every active filter.
                            const states = m.states.filter(
                                (s) =>
                                    (!factory || s.factory === factory) &&
                                    (!process || s.process_type === process) &&
                                    (!p ||
                                        (s.package_name ?? "")
                                            .toLowerCase()
                                            .includes(p)),
                            );
                            return states.length ? { ...m, states } : null;
                        })
                        .filter(Boolean),
                }))
                .filter((g) => g.machines.length),
        [platforms, q, p, factory, process, filtering],
    );

    const total = groups.reduce((n, g) => n + g.machines.length, 0);
    const clear = () => {
        setSearch("");
        setFactory("");
        setPkg("");
        setProcess("");
    };

    const pick = (m) => {
        setOpen(false);
        onSelect(m.machine_num);
    };

    return (
        <div ref={boxRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-label="Select machine"
                aria-expanded={open}
                className="rounded border border-gray-300 px-3 py-1.5 text-lg font-semibold hover:bg-gray-50"
            >
                {current} <span className="text-sm text-gray-400">▾</span>
            </button>

            {open && (
                <div className="absolute left-0 top-full z-50 mt-1 w-[640px] max-w-[90vw] rounded border border-gray-200 bg-white shadow-xl">
                    <div className="grid grid-cols-2 gap-2 border-b border-gray-100 p-3 sm:grid-cols-4">
                        <input
                            ref={searchRef}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search machine…"
                            className={ctl}
                        />
                        <select
                            value={factory}
                            onChange={(e) => setFactory(e.target.value)}
                            className={ctl}
                            aria-label="Filter by factory"
                        >
                            <option value="">Any factory</option>
                            {factories.map((f) => (
                                <option key={f}>{f}</option>
                            ))}
                        </select>
                        <input
                            value={pkg}
                            onChange={(e) => setPkg(e.target.value)}
                            placeholder="Package contains…"
                            className={ctl}
                        />
                        <select
                            value={process}
                            onChange={(e) => setProcess(e.target.value)}
                            className={ctl}
                            aria-label="Filter by process"
                        >
                            <option value="">Any process</option>
                            {processes.map((x) => (
                                <option key={x}>{x}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center justify-between px-3 py-1.5 text-xs text-gray-500">
                        <span>
                            {platforms
                                ? `${total} machine${total === 1 ? "" : "s"}`
                                : "Loading…"}
                        </span>
                        {(search || filtering) && (
                            <button
                                type="button"
                                onClick={clear}
                                className="text-blue-600 underline hover:text-blue-800"
                            >
                                Clear filters
                            </button>
                        )}
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto pb-2">
                        {error && (
                            <div className="px-3 py-4 text-sm text-red-600">
                                {error}
                            </div>
                        )}
                        {platforms && groups.length === 0 && (
                            <div className="px-3 py-6 text-center text-sm text-gray-500">
                                No machines match.
                            </div>
                        )}
                        {groups.map((g) => (
                            <div key={g.platform}>
                                <div className="sticky top-0 bg-gray-100 px-3 py-1 text-xs font-semibold tracking-wide text-gray-600">
                                    {g.platform} ({g.machines.length})
                                </div>
                                {g.machines.map((m) => {
                                    const lines = summarize(m.states);
                                    return (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => pick(m)}
                                            className={`block w-full border-t border-gray-100 px-3 py-2 text-left hover:bg-gray-50 ${m.machine_num === current ? "bg-blue-50" : ""}`}
                                        >
                                            <div className="text-sm font-medium">
                                                {m.machine_num}
                                                <span className="ml-2 text-xs font-normal text-gray-400">
                                                    {m.states.length === 0
                                                        ? "no capabilities"
                                                        : `${m.states.reduce((n, s) => n + s.count, 0)} capabilities`}
                                                </span>
                                            </div>
                                            {lines.length > 0 && (
                                                <div className="mt-1 space-y-0.5">
                                                    {lines
                                                        .slice(0, MAX_LINES)
                                                        .map((l) => (
                                                            <div
                                                                key={l.key}
                                                                className="flex flex-wrap items-center gap-1 text-[11px] text-gray-600"
                                                            >
                                                                <span className="rounded bg-gray-800 px-1.5 py-0.5 text-white">
                                                                    {l.factory}
                                                                </span>
                                                                <span className="font-medium">
                                                                    {l.package_name ??
                                                                        "ANY pkg"}
                                                                </span>
                                                                {l.processes.map(
                                                                    (pr) => (
                                                                        <span
                                                                            key={
                                                                                pr.type
                                                                            }
                                                                            className={`rounded px-1.5 py-0.5 ${PROCESS_STYLE[pr.type] ?? "bg-gray-100 text-gray-700"}`}
                                                                        >
                                                                            {
                                                                                pr.type
                                                                            }
                                                                            {pr.count >
                                                                                1 &&
                                                                                ` ×${pr.count}`}
                                                                        </span>
                                                                    ),
                                                                )}
                                                            </div>
                                                        ))}
                                                    {lines.length > MAX_LINES && (
                                                        <div className="text-[11px] text-gray-400">
                                                            +
                                                            {lines.length -
                                                                MAX_LINES}{" "}
                                                            more
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}