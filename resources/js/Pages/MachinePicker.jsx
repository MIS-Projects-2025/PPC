import { Link } from "@inertiajs/react";
import { useMemo, useState } from "react";

export default function MachinePicker({ machines, requested, date }) {
    const [query, setQuery] = useState("");

    const groups = useMemo(() => {
        const q = query.trim().toLowerCase();
        const tree = new Map(); // location -> platform -> machines (server order is kept)
        machines
            .filter((m) => !q || m.name.toLowerCase().includes(q))
            .forEach((m) => {
                const loc = m.location ?? "—";
                if (!tree.has(loc)) tree.set(loc, new Map());
                const byPlatform = tree.get(loc);
                if (!byPlatform.has(m.platform)) byPlatform.set(m.platform, []);
                byPlatform.get(m.platform).push(m);
            });
        return [...tree];
    }, [machines, query]);

    return (
        <div className="max-w-5xl mx-auto">
            <h1 className="text-xl font-semibold">Select a machine</h1>

            {requested && (
                <div role="alert" className="alert alert-warning alert-soft my-3">
                    No active machine matches “{requested}”. Pick one below.
                </div>
            )}

            <input
                autoFocus
                className="input input-sm w-full max-w-xs my-3"
                placeholder="Filter machines…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />

            {groups.length === 0 && <p className="text-sm opacity-60">No machines found.</p>}

            {groups.map(([location, byPlatform]) => (
                <section key={location} className="mb-4">
                    <h2 className="font-semibold mb-1">{location}</h2>
                    {[...byPlatform].map(([platform, list]) => (
                        <div key={platform} className="mb-2">
                            <div className="text-xs opacity-60 mb-1">{platform}</div>
                            <div className="flex flex-wrap gap-2">
                                {list.map((m) => (
                                    <Link
                                        key={m.name}
                                        href={route("loading-plan.machine-view", { machine: m.name, ...(date ? { date } : {}) })}
                                        className="btn btn-sm"
                                    >
                                        {m.name}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    ))}
                </section>
            ))}
        </div>
    );
}

MachinePicker.layout = (page) => <div className="p-4">{page}</div>;