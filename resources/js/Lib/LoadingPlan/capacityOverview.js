// Pure builders for the machine capacity table (PTP 95% tab + Excel exporter).
// Moved out of the old CapacityOverviewModal.jsx, logic unchanged.
import { STATUS_GROUPS } from "@/Components/LoadingPlan/StatusMenu.jsx";
import { isBlockRow } from "./helpers";

/**
 * Groups used by the "By package" view of the capacity table.
 * `members` are matched (case-insensitive) against a lot's package_group, then its package_name.
 * Unmapped packages appear under their own name, after these groups.
 * Display order = order of this array.
 */
export const PACKAGE_SUMMARY_GROUPS = [
    // { label: "TSOT", members: ["TSOT"] },
    // { label: "SOT", members: ["SOT", "SC70"] },
    { label: "DFN", members: ["DFN", "QDN"] },
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

export const fmtPct = (n, d, digits = 0) => (d > 0 ? ((n / d) * 100).toFixed(digits) + "%" : "—");

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

export function aggregateByMachine({ dataRows, serverMachines, nonMachines }) {
    const known = new Set([...serverMachines.map((m) => m.name), ...nonMachines.map((n) => n.key)]);
    const byMachine = new Map();
    const extra = new Set();
    const orphans = new Set();

    for (const row of dataRows) {
        if (row.machine == null) continue; // unassigned / grouped
        if (isBlockRow(row) || row.is_block) continue;
        if (!known.has(row.machine)) orphans.add(row.machine);

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
    return { byMachine, extraStatuses: [...extra].sort(), orphanMachines: [...orphans].sort() };
}

export function buildOverviewSections({ byMachine, serverMachines, nonMachines, machineCapacity, orphanMachines = [] }) {
    const entities = [
        ...serverMachines.map((m) => ({ key: m.name, label: m.name, kind: "machine", platform: m.platform })),
        ...nonMachines.map((n) => ({ key: n.key, label: n.name, kind: "non-machine" })),
        ...orphanMachines.map((m) => ({ key: m, label: m, kind: "orphan" })),
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
}

export function buildStatusCols({ extraStatuses, grand, hideEmpty = true }) {
    const groups = STATUS_GROUPS.map((g) => g.statuses);
    if (extraStatuses.length) groups.push(extraStatuses);
    return groups.flatMap((list) =>
        list
            .filter((s) => !hideEmpty || (grand.counts[s] ?? 0) > 0)
            .map((status, i) => ({ status, borderLeft: i === 0 })),
    );
}
