import { useDialogOpen } from "@/Hooks/LoadingPlan/useDialogOpen";
import { closeModal } from "@/Lib/LoadingPlan/modal";
import clsx from "clsx";
import { useEffect, useMemo, useRef, useState } from "react";

export const JUMP_TO_MACHINE_MODAL_ID = "jump_to_machine_modal";

/** Lines big enough for their own column. Every other group is stacked in one shared column. */
const MAIN_LINES = new Set(["PL1", "PL6"]);

const NON_MACHINE_GROUP = "Non-machines";
const OTHER_GROUP = "Other";

const groupOf = (e) => (e.kind === "non-machine" ? NON_MACHINE_GROUP : e.location || OTHER_GROUP);

/** Current line first, other lines A-Z (numeric aware), then "Other", then "Non-machines". */
function groupRank(label, currentLocation) {
    if (label === NON_MACHINE_GROUP) return 3;
    if (label === OTHER_GROUP) return 2;
    return label === currentLocation ? 0 : 1;
}

/**
 * Empty query: only entries that have rows.
 * Query: every entry that matches (name, platform or line), including "no rows yet" ones.
 *
 * Result: columns -> sections -> items. A main line is a column with one section;
 * all other groups are sections of the last, shared column.
 * `flat` is column-major (column 1 top to bottom, then column 2, ...), `positions[idx]` = { col, row }
 * where `row` counts across all sections of that column.
 */
function buildList(entries, query, currentLocation) {
    const q = query.trim().toLowerCase();

    const visible = entries.filter((e) => {
        if (!q) return e.rowCount > 0;
        return [e.label, e.platform, e.location].some((v) => (v ?? "").toLowerCase().includes(q));
    });

    const byGroup = new Map();
    visible.forEach((e) => {
        const g = groupOf(e);
        if (!byGroup.has(g)) byGroup.set(g, []);
        byGroup.get(g).push(e);
    });

    const sortedGroups = [...byGroup.entries()]
        .sort(
            ([a], [b]) =>
                groupRank(a, currentLocation) - groupRank(b, currentLocation) ||
                a.localeCompare(b, undefined, { numeric: true }),
        )
        .map(([label, items]) => ({ label, items }));

    const rawColumns = [];
    const shared = { key: "__shared", sections: [] };
    sortedGroups.forEach((g) => {
        if (MAIN_LINES.has(g.label)) rawColumns.push({ key: g.label, sections: [g] });
        else shared.sections.push(g);
    });
    if (shared.sections.length) rawColumns.push(shared);

    const flat = [];
    const positions = [];
    const columns = rawColumns.map((column, col) => {
        let row = 0;
        const sections = column.sections.map((section) => ({
            label: section.label,
            items: section.items.map((entry) => {
                const item = { entry, idx: flat.length };
                flat.push(entry);
                positions.push({ col, row: row++ });
                return item;
            }),
        }));
        return { key: column.key, sections, items: sections.flatMap((s) => s.items) };
    });

    return { columns, flat, positions };
}

function SectionLabel({ label, count }) {
    return (
        <div className="sticky top-0 z-[1] flex items-center gap-2 bg-base-300 py-1 text-xs border-b border-base-content/10 mb-1">
            {label === NON_MACHINE_GROUP || label === OTHER_GROUP ? (
                <span className="font-semibold uppercase tracking-wide opacity-60">{label}</span>
            ) : (
                <span className="font-mono opacity-50">{label}</span>
            )}
            <span className="text-[10px] opacity-40 tabular-nums">{count}</span>
        </div>
    );
}

/**
 * entries: [{ key, label, kind: "machine" | "non-machine", platform?, location?, rowCount }]
 * onJump(key) scrolls the grid to that machine.
 */
function JumpBody({ entries, currentLocation, onJump }) {
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(0);
    const inputRef = useRef(null);
    const listRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const { columns, flat, positions } = useMemo(
        () => buildList(entries, query, currentLocation),
        [entries, query, currentLocation],
    );

    const hiddenEmptyCount = useMemo(
        () => (query.trim() ? 0 : entries.filter((e) => e.rowCount === 0).length),
        [entries, query],
    );

    useEffect(() => setActive(0), [query]);
    useEffect(() => {
        listRef.current
            ?.querySelector('[data-active="true"]')
            ?.scrollIntoView({ block: "nearest", inline: "nearest" });
    }, [active]);

    const jump = (entry) => {
        if (!entry) return;
        closeModal(JUMP_TO_MACHINE_MODAL_ID);
        onJump(entry.key);
    };

    /** Same row in the neighbouring column (or its last row if that column is shorter). */
    const moveColumn = (dir) => {
        const pos = positions[active];
        if (!pos) return;
        const col = Math.min(Math.max(pos.col + dir, 0), columns.length - 1);
        if (col === pos.col) return;
        const items = columns[col].items;
        setActive(items[Math.min(pos.row, items.length - 1)].idx);
    };

    const onKeyDown = (e) => {
        const input = e.currentTarget;
        // ← / → only switch column when the caret is at the edge, so editing the query still works
        const caretAtStart = input.selectionStart === 0 && input.selectionEnd === 0;
        const caretAtEnd = input.selectionStart === input.value.length && input.selectionEnd === input.value.length;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.max(0, Math.min(i + 1, flat.length - 1)));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
        } else if (e.key === "ArrowRight" && caretAtEnd) {
            e.preventDefault();
            moveColumn(1);
        } else if (e.key === "ArrowLeft" && caretAtStart) {
            e.preventDefault();
            moveColumn(-1);
        } else if (e.key === "Enter") {
            e.preventDefault();
            jump(flat[active]);
        }
    };

    return (
        <>
            <h3 className="font-bold text-lg mb-3">Jump to a machine</h3>
            <input
                ref={inputRef}
                type="text"
                autoComplete="off"
                placeholder="Search machine or line…"
                className="input input-sm input-bordered w-full mb-3"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
            />

            <div ref={listRef} className="overflow-auto flex-1 min-h-0">
                {flat.length === 0 ? (
                    <div className="text-center text-xs text-base-content/40 py-8">
                        {query.trim() ? `No machine matches "${query}"` : "No machines with rows yet."}
                    </div>
                ) : (
                    <div className="grid grid-flow-col auto-cols-[minmax(11rem,1fr)] gap-3 items-start">
                        {columns.map((column) => (
                            <div key={column.key} className="min-w-0 flex flex-col gap-3">
                                {column.sections.map((section) => (
                                    <section key={section.label}>
                                        <SectionLabel label={section.label} count={section.items.length} />

                                        <ul className="flex flex-col gap-0.5">
                                            {section.items.map(({ entry: e, idx }) => (
                                                <li key={e.key}>
                                                    <button
                                                        type="button"
                                                        data-active={idx === active}
                                                        onClick={() => jump(e)}
                                                        onMouseEnter={() => setActive(idx)}
                                                        className={clsx(
                                                            "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                                                            idx === active ? "bg-primary/15" : "hover:bg-base-200",
                                                            e.rowCount === 0 && "opacity-60",
                                                        )}
                                                    >
                                                        <span className="flex items-baseline gap-1.5 min-w-0">
                                                            <span className="truncate font-medium">{e.label}</span>
                                                            {e.platform && (
                                                                <span className="text-[10px] opacity-50 shrink-0">{e.platform}</span>
                                                            )}
                                                        </span>
                                                        {e.rowCount === 0 ? (
                                                            <span className="badge badge-ghost badge-xs shrink-0">no rows yet</span>
                                                        ) : (
                                                            <span className="text-xs tabular-nums opacity-60 shrink-0">{e.rowCount}</span>
                                                        )}
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {hiddenEmptyCount > 0 && (
                <p className="text-[11px] text-base-content/40 mt-2">
                    {hiddenEmptyCount} machine{hiddenEmptyCount !== 1 ? "s" : ""} with no rows yet, search by name to find
                    {hiddenEmptyCount !== 1 ? " them" : " it"}.
                </p>
            )}

            <p className="text-[11px] text-base-content/40 mt-1">
                <kbd className="kbd kbd-xs">↑</kbd> <kbd className="kbd kbd-xs">↓</kbd> move,{" "}
                <kbd className="kbd kbd-xs">←</kbd> <kbd className="kbd kbd-xs">→</kbd> switch column,{" "}
                <kbd className="kbd kbd-xs">Enter</kbd> jump
            </p>
        </>
    );
}

export default function JumpToMachineModal({ entries, currentLocation, onJump }) {
    const ref = useRef(null);
    const open = useDialogOpen(ref);

    return (
        <dialog ref={ref} id={JUMP_TO_MACHINE_MODAL_ID} className="modal">
            <div className="modal-box bg-base-300 w-11/12 max-w-4xl max-h-[80vh] flex flex-col">
                {open && <JumpBody entries={entries} currentLocation={currentLocation} onJump={onJump} />}
                <div className="modal-action">
                    <form method="dialog">
                        <button className="btn btn-ghost btn-sm">Close</button>
                    </form>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop">
                <button>close</button>
            </form>
        </dialog>
    );
}