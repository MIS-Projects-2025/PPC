import { STATUS_GROUPS } from "@/Components/LoadingPlan/StatusMenu.jsx";
import { MACHINE_MANUAL } from "@/Constants/machines.js";
import { isBlockRow } from "@/Lib/LoadingPlan/helpers";
import clsx from "clsx";
import { Fragment, useMemo, memo, useRef, useDeferredValue, useState } from "react";
import { useDialogOpen } from "@/Hooks/LoadingPlan/useDialogOpen";
import { closeModal } from "@/Lib/LoadingPlan/modal";
export const CAPACITY_OVERVIEW_MODAL_ID = "capacity_overview_modal";

// @/Constants/LoadingPlan/packageSummaryGroups.js

/**
 * Groups used by the "By package" tab of the Capacity Overview.
 * `members` are matched (case-insensitive) against a lot's `package_group`, then its `package_name`.
 * Unmapped packages appear under their own name, after these groups.
 * Display order = order of this array.
 */
export const PACKAGE_SUMMARY_GROUPS = [
    // { label: "TSOT", members: ["TSOT"] },
    // { label: "SOT", members: ["SOT", "SC70"] },
    // { label: "DFN", members: ["DFN", "QDN"] },
    // { label: "LGA / LQFP", members: ["LGA", "LQFP"] },
    // { label: "LFCSP TRAY", members: ["LFCSP TRAY"] },
    // { label: "LFCSP MPD", members: ["LFCSP MPD"] },
    // { label: "LFCSP CAN", members: ["LFCSP CAN"] },
    // { label: "LCC", members: ["LCC"] },
    // { label: "TO5", members: ["TO5"] },
    // { label: "TO-46", members: ["TO-46", "TO46"] },
    // { label: "TO220", members: ["TO220"] },
    // { label: "TO92", members: ["TO92"] },
];

/** Machines with no lots (and no mappable platform) are listed here. */
export const IDLE_GROUP_LABEL = "No lots";

const norm = (v) => String(v ?? "").trim().toUpperCase();

const LOOKUP = new Map(
    PACKAGE_SUMMARY_GROUPS.flatMap((g) => [g.label, ...g.members].map((m) => [norm(m), g.label])),
);

export const SUMMARY_GROUP_ORDER = PACKAGE_SUMMARY_GROUPS.map((g) => g.label);

/** Group label for the first name that is mapped, or null. */
export function findSummaryGroup(...names) {
    for (const n of names) {
        const hit = LOOKUP.get(norm(n));
        if (hit) return hit;
    }
    return null;
}

/** Like findSummaryGroup, but unmapped packages fall back to their own name. */
export function resolveSummaryGroup(...names) {
    const fallback = names.map((n) => String(n ?? "").trim()).find(Boolean);
    return findSummaryGroup(...names) ?? fallback ?? "Other";
}

const KNOWN_SET = new Set(STATUS_GROUPS.flatMap((g) => g.statuses));
const IDLE_RANK = 1e9;
const UNMAPPED_RANK = 1e6;

const statusOf = (row) => String(row.status ?? "").trim().toUpperCase() || "NONE";
const fmtPct = (n, d, digits = 0) => (d > 0 ? `${((n / d) * 100).toFixed(digits)}%` : "—");

// ── aggregation helpers ──────────────────────────────────────────────────
const emptyAgg = () => ({ planned: 0, qty: 0, commit: 0, counts: {} });

function addRow(agg, row, status) {
    agg.planned += 1; // PLANNED = number of lots
    agg.qty += Number(row.qty) || 0;
    agg.commit += Number(row.doable) || 0;
    agg.counts[status] = (agg.counts[status] ?? 0) + 1;
}

function sumRows(rows) {
    const t = { ...emptyAgg(), capacity: 0 };
    for (const r of rows) {
        t.planned += r.agg.planned;
        t.qty += r.agg.qty;
        t.commit += r.agg.commit;
        t.capacity += r.capacity ?? 0;
        for (const [s, n] of Object.entries(r.agg.counts)) t.counts[s] = (t.counts[s] ?? 0) + n;
    }
    return t;
}

// ── presentational bits ──────────────────────────────────────────────────
function UtilizationCell({ pct }) {
    if (pct == null) return <span className="text-xs opacity-50">no capacity</span>;
    return (
        <div className="flex items-center gap-2">
            <progress
                className={clsx("progress w-16", pct > 100 ? "progress-error" : pct >= 90 ? "progress-warning" : "progress-success")}
                value={Math.min(pct, 100)}
                max="100"
            />
            <span className="text-xs tabular-nums">{pct.toFixed(0)}%</span>
        </div>
    );
}

const BORDER = "border-l border-base-content/20";

function StatusCells({ counts, statusCols }) {
    return statusCols.map(({ status, borderLeft }) => {
        const n = counts[status] ?? 0;
        return (
            <td
                key={status}
                className={clsx(
                    "text-center tabular-nums",
                    n === 0 ? "bg-base-content/10 text-base-content/30" : "font-medium",
                    borderLeft && BORDER,
                )}
            >
                {n}
            </td>
        );
    });
}

const SummaryRow = memo(function SummaryRow({ label, badge, capacity, agg, loading, statusCols, showUtil, highlight, onJump, jumpKey, variant = "row" }) {
    const isTotal = variant !== "row";
    const done = agg.counts.DONE ?? 0;
    const firstCell = clsx(
        "sticky left-0 whitespace-nowrap",
        isTotal ? "bg-base-200 font-semibold" : "bg-base-300 font-medium",
    );

    return (
        <tr className={clsx(isTotal && "bg-base-200 font-semibold", highlight && "bg-warning/10")}>
            <td className={firstCell}>
                <div className="flex items-center gap-1">
                    {onJump && (
                        <button
                            type="button"
                            className="btn btn-ghost btn-xs btn-square"
                            title={`Jump to ${label}`}
                            aria-label={`Jump to ${label}`}
                            onClick={() => onJump(jumpKey)}
                        >
                            ↗
                        </button>
                    )}
                    <span>{label}</span>
                    {badge && <span className="badge badge-xs badge-ghost ml-1">{badge}</span>}
                </div>
            </td>
            <td className="text-right tabular-nums">
                {loading ? <span className="loading loading-spinner loading-xs" /> : capacity ? capacity.toLocaleString() : "—"}
            </td>
            <td className="text-right tabular-nums">{agg.qty.toLocaleString()}</td>
            <td className="text-right tabular-nums">{agg.planned}</td>
            <StatusCells counts={agg.counts} statusCols={statusCols} />
            <td className={clsx("text-right tabular-nums", BORDER)}>{fmtPct(done, agg.planned)}</td>
            <td className="text-right tabular-nums">{agg.commit.toLocaleString()}</td>
            {showUtil && (
                <td>
                    {loading ? null : <UtilizationCell pct={capacity ? (agg.commit / capacity) * 100 : null} />}
                </td>
            )}
        </tr>
    );
});

function SummaryTable({ sections, grand, grandLabel, statusCols, loading, showUtil, onJump }) {
    const colCount = 1 + 3 + statusCols.length + 2 + (showUtil ? 1 : 0);

    return (
        <table className="table table-xs table-pin-rows">
            <thead>
                <tr>
                    <th className="sticky left-0 z-[2] bg-base-300">Machine</th>
                    <th className="text-right">Capacity</th>
                    <th className="text-right">Quantity</th>
                    <th className="text-right">Planned</th>
                    {statusCols.map(({ status, borderLeft }) => (
                        <th
                            key={status}
                            className={clsx("text-center whitespace-normal leading-tight min-w-16 text-[10px]", borderLeft && BORDER)}
                        >
                            {status}
                        </th>
                    ))}
                    <th className={clsx("text-right", BORDER)}>Percentage</th>
                    <th className="text-right">Commit</th>
                    {showUtil && <th className="w-32">Utilization</th>}
                </tr>
            </thead>

            <tbody>
                {sections.map((section) => (
                    <Fragment key={section.label ?? "all"}>
                        {section.label && (
                            <tr>
                                <td colSpan={colCount} className="bg-base-100 py-2">
                                    <div className="sticky left-2 w-fit text-xs font-bold uppercase tracking-wide">
                                        {section.label}
                                    </div>
                                </td>
                            </tr>
                        )}
                        {section.rows.map((r, i) => (
                            <SummaryRow
                                key={`${r.key}-${i}`}
                                label={r.label}
                                badge={r.kind === "non-machine" ? "non-machine" : null}
                                onJump={r.kind !== "manual" ? onJump : undefined}
                                jumpKey={r.key}
                                capacity={r.capacity}
                                agg={r.agg}
                                loading={loading && r.kind === "machine"}
                                statusCols={statusCols}
                                showUtil={showUtil}
                                highlight={!loading && r.kind === "machine" && r.capacity == null}
                            />
                        ))}
                        {section.total && (
                            <SummaryRow
                                label="Total"
                                capacity={section.total.capacity}
                                agg={section.total}
                                loading={loading}
                                statusCols={statusCols}
                                showUtil={showUtil}
                                variant="total"
                            />
                        )}
                    </Fragment>
                ))}
            </tbody>

            <tfoot>
                <SummaryRow
                    label={grandLabel}
                    capacity={grand.capacity}
                    agg={grand}
                    loading={loading}
                    statusCols={statusCols}
                    showUtil={showUtil}
                    variant="grand"
                />
            </tfoot>
        </table>
    );
}

// ── body (only mounted while the dialog is open) ─────────────────────────
function OverviewBody({ serverMachines, nonMachines, machineCapacity, dataRows, onJumpToMachine }) {
    const [tab, setTab] = useState("machines");
    const [hideEmptyStatuses, setHideEmptyStatuses] = useState(true);
    const loading = machineCapacity === undefined;

    const deferredRows = useDeferredValue(dataRows);

    // 1) one pass over the rows
    const { byMachine, extraStatuses } = useMemo(() => {
        const known = new Set([...serverMachines.map((m) => m.name), MACHINE_MANUAL, ...nonMachines.map((n) => n.key)]);
        const byMachine = new Map();
        const extra = new Set();

        for (const row of deferredRows ) {
            if (row.machine == null || !known.has(row.machine)) continue; // unassigned / grouped / orphan
            if (isBlockRow(row) || row.is_block) continue;

            const status = statusOf(row);
            if (!KNOWN_SET.has(status)) extra.add(status);

            let entry = byMachine.get(row.machine);
            if (!entry) byMachine.set(row.machine, (entry = { total: emptyAgg(), groups: new Map() }));
            addRow(entry.total, row, status);

            const g = resolveSummaryGroup(row.package_group, row.package_name);
            let ga = entry.groups.get(g);
            if (!ga) entry.groups.set(g, (ga = emptyAgg()));
            addRow(ga, row, status);
        }
        return { byMachine, extraStatuses: [...extra].sort() };
    }, [deferredRows , serverMachines, nonMachines]);

    // 2) rows / sections (re-runs when the deferred capacity arrives)
    const { simpleSections, groupedSections, grand } = useMemo(() => {
        const entities = [
            ...serverMachines.map((m) => ({ key: m.name, label: m.name, kind: "machine", platform: m.platform })),
            { key: MACHINE_MANUAL, label: MACHINE_MANUAL, kind: "manual" },
            ...nonMachines.map((n) => ({ key: n.key, label: n.name, kind: "non-machine" })),
        ];

        const rows = entities
            .filter((e) => e.kind !== "manual" || byMachine.has(e.key))
            .map((e) => {
                const cap = e.kind === "machine" ? Number(machineCapacity?.[e.key]?.capacity) : 0;
                return { ...e, capacity: cap > 0 ? cap : null, agg: byMachine.get(e.key)?.total ?? emptyAgg() };
            });

        const grouped = new Map();
        const push = (label, row) => {
            if (!grouped.has(label)) grouped.set(label, []);
            grouped.get(label).push(row);
        };
        for (const r of rows) {
            const entry = byMachine.get(r.key);
            if (entry) {
                for (const [label, agg] of entry.groups) push(label, { ...r, agg });
            } else if (r.kind !== "manual") {
                push(findSummaryGroup(r.platform) ?? IDLE_GROUP_LABEL, r); // idle: use platform if it maps
            }
        }

        const rank = (l) => {
            if (l === IDLE_GROUP_LABEL) return IDLE_RANK;
            const i = SUMMARY_GROUP_ORDER.indexOf(l);
            return i === -1 ? UNMAPPED_RANK : i;
        };

        return {
            simpleSections: [{ label: null, rows, total: null }],
            groupedSections: [...grouped.entries()]
                .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
                .map(([label, gRows]) => ({ label, rows: gRows, total: sumRows(gRows) })),
            grand: sumRows(rows), // machine-level, so a machine in several groups counts once
        };
    }, [byMachine, serverMachines, nonMachines, machineCapacity]);

    // 3) status columns
    const statusCols = useMemo(() => {
        const groups = STATUS_GROUPS.map((g) => g.statuses);
        if (extraStatuses.length) groups.push(extraStatuses);
        return groups.flatMap((list) =>
            list
                .filter((s) => !hideEmptyStatuses || (grand.counts[s] ?? 0) > 0)
                .map((status, i) => ({ status, borderLeft: i === 0 })),
        );
    }, [extraStatuses, hideEmptyStatuses, grand.counts]);

    const statusSummary = statusCols.filter(({ status }) => (grand.counts[status] ?? 0) > 0);

    const jump = useMemo(
        () => onJumpToMachine
            ? (key) => { closeModal(CAPACITY_OVERVIEW_MODAL_ID); onJumpToMachine(key); }
            : undefined,
        [onJumpToMachine],
    );

    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 className="font-bold text-lg">Commit / Capacity — All Machines</h3>
                <div className="flex items-center gap-4">
                    <label className="label cursor-pointer gap-2 text-xs">
                        <input
                            type="checkbox"
                            className="toggle toggle-xs"
                            checked={hideEmptyStatuses}
                            onChange={(e) => setHideEmptyStatuses(e.target.checked)}
                        />
                        Hide empty status columns
                    </label>
                    <div role="tablist" className="tabs tabs-box tabs-sm">
                        <button role="tab" className={clsx("tab", tab === "machines" && "tab-active")} onClick={() => setTab("machines")}>
                            Machines
                        </button>
                        <button role="tab" className={clsx("tab", tab === "packages" && "tab-active")} onClick={() => setTab("packages")}>
                            By package
                        </button>
                    </div>
                </div>
            </div>

            <div className="overflow-auto flex-1 min-h-0">
                {tab === "machines" ? (
                    <SummaryTable
                        sections={simpleSections}
                        grand={grand}
                        grandLabel="Grand total"
                        statusCols={statusCols}
                        loading={loading}
                        showUtil
                        onJump={jump}
                    />
                ) : (
                    <SummaryTable
                        sections={groupedSections}
                        grand={grand}
                        grandLabel="Grand total"
                        statusCols={statusCols}
                        loading={loading}
                        showUtil={false}
                        onJump={jump}
                    />
                )}
            </div>

            {tab === "packages" && (
                <p className="text-xs opacity-60 mt-2">
                    A machine running several package groups appears under each one (lot counts are split per group; capacity is
                    the full machine capacity). The grand total counts each machine once.
                </p>
            )}

            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-base-content/10">
                {statusSummary.map(({ status }) => (
                    <span key={status} className="badge badge-outline gap-1">
                        {status}
                        <b>{grand.counts[status]}</b>
                        <span className="opacity-60">{fmtPct(grand.counts[status], grand.planned, 2)}</span>
                    </span>
                ))}
                <span className="badge badge-neutral gap-1">
                    TOTAL <b>{grand.planned}</b>
                </span>
            </div>
        </>
    );
}

/** Commit vs capacity for every machine and non-machine. `machineCapacity` is a Deferred prop (undefined until loaded). */
export default function CapacityOverviewModal({ serverMachines, nonMachines, machineCapacity, dataRows, onJumpToMachine }) {
    const ref = useRef(null);
    const open = useDialogOpen(ref);

    return (
        <dialog ref={ref} id={CAPACITY_OVERVIEW_MODAL_ID} className="modal">
            <div className="modal-box bg-base-300 w-[96vw] max-w-[96vw] max-h-[85vh] flex flex-col">
                {open && (
                    <OverviewBody
                        serverMachines={serverMachines}
                        nonMachines={nonMachines}
                        machineCapacity={machineCapacity}
                        dataRows={dataRows}
                        onJumpToMachine={onJumpToMachine}
                    />
                )}
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