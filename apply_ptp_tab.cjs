#!/usr/bin/env node
/**
 * Adds the "PTP 95%" tab (view-only) as the FIRST package tab and removes the Capacity modal.
 *
 *   node apply-ptp-tab.cjs --dry-run     # check that every patch matches, writes nothing
 *   node apply-ptp-tab.cjs               # apply (run from the Laravel project root)
 *   node apply-ptp-tab.cjs path/to/root  # or pass the project root explicitly
 *
 * - All-or-nothing: if any patch fails to match, NOTHING is written.
 * - Matching ignores indentation / line endings (CRLF is preserved).
 * - Commit or stash first, so `git diff` shows exactly what changed.
 */
const fs = require("fs");
const path = require("path");

const r = String.raw;

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const ROOT = path.resolve(args.find((a) => !a.startsWith("--")) || process.cwd());

/* ========================================================================== */
/*  1. PATCHES TO EXISTING FILES                                              */
/*     find/replace are matched token-by-token (whitespace-insensitive).      */
/*     First line of each replacement inherits the original indentation.      */
/* ========================================================================== */
const EDITS = [
  // ---------------------------------------------------------------- tabs.js
  {
    file: "resources/js/Constants/LoadingPlan/tabs.js",
    replacements: [
      {
        find: r`export const ALL_PACKAGES_TAB = "ALL PACKAGE";`,
        replace: r`export const PTP_TAB = "PTP 95%";
export const ALL_PACKAGES_TAB = "ALL PACKAGE";`,
      },
      {
        find: r`export const NON_PACKAGE_TABS = [
    ALL_PACKAGES_TAB,`,
        replace: r`export const NON_PACKAGE_TABS = [
    PTP_TAB,
    ALL_PACKAGES_TAB,`,
      },
      {
        find: r`return [
        ...(readOnly ? [] : [UNASSIGNED_TAB]),`,
        replace: r`return [
        PTP_TAB,
        ...(readOnly ? [] : [UNASSIGNED_TAB]),`,
      },
    ],
  },

  // -------------------------------------------------------------- Deemo.jsx
  {
    file: "resources/js/Pages/Deemo.jsx",
    replacements: [
      // imports
      {
        find: r`import CapacityOverviewModal from "@/Components/LoadingPlan/CapacityOverviewModal";`,
        replace: r`import PtpOverview from "@/Components/LoadingPlan/PtpOverview";`,
      },
      {
        find: r`ORPHAN_TAB,
    PICKUP_POOL_TABS,`,
        replace: r`ORPHAN_TAB,
    PICKUP_POOL_TABS,
    PTP_TAB,`,
      },
      // flag
      {
        find: r`const onBake = activePackage === FOR_BAKE_TAB;`,
        replace: r`const onBake = activePackage === FOR_BAKE_TAB;
    const onPtp = activePackage === PTP_TAB;`,
      },
      // jump to machine from the PTP tab (switch to the machine tab first, jump once it rendered)
      {
        find: r`setCollapsedMachines, showAllMachines, setShowAllMachines, toast,
    });`,
        replace: r`setCollapsedMachines, showAllMachines, setShowAllMachines, toast,
    });

    // PTP tab -> machine: switch to the machine tab first, then jump once its rows have rendered
    const [pendingJump, setPendingJump] = useState(null);
    const jumpToMachineAnywhere = useCallback(
        (key) => {
            if (!onPtp) return jumpToMachine(key);
            setPendingJump(key);
            goToTab(ALL_PACKAGES_TAB);
        },
        [onPtp, jumpToMachine, goToTab],
    );
    useEffect(() => {
        if (pendingJump == null || onPtp || isTabSwitching) return;
        setPendingJump(null);
        jumpToMachine(pendingJump);
    }, [pendingJump, onPtp, isTabSwitching, jumpToMachine]);`,
      },
      // no grid on the PTP tab
      {
        find: r`const stickyMachine = useStickyGroupHeader(onBake ? EMPTY_ROWS : displayRows, gridRef, gridKey);`,
        replace: r`const stickyMachine = useStickyGroupHeader(onBake || onPtp ? EMPTY_ROWS : displayRows, gridRef, gridKey);`,
      },
      {
        find: r`const { armFlip } = useRowFlip({ containerRef, displayRows, enabled: !onBake });`,
        replace: r`const { armFlip } = useRowFlip({ containerRef, displayRows, enabled: !onBake && !onPtp });`,
      },
      // toolbar bits that make no sense on the PTP tab
      {
        find: r`activePackage !== UNASSIGNED_TAB && activePackage !== ORPHAN_TAB;`,
        replace: r`activePackage !== UNASSIGNED_TAB && activePackage !== ORPHAN_TAB && !onPtp;`,
      },
      {
        find: r`canToggleMachines={collapsibleMachineKeys.length > 0}`,
        replace: r`canToggleMachines={!onPtp && collapsibleMachineKeys.length > 0}`,
      },
      // render: PTP view in place of the grid
      {
        find: r`{onBake ? (`,
        replace: r`{onPtp ? (
                            <PtpOverview
                                serverMachines={serverMachines}
                                nonMachines={nonMachineList}
                                machineCapacity={machineCapacity}
                                dataRows={dataRows}
                                buckets={bucketList}
                                location={selectedLocation}
                                isF3={isF3}
                                isOtherLoc={isOtherLoc}
                                isParked={isParked}
                                labelOf={labelOfMachine}
                                onJumpToMachine={jumpToMachineAnywhere}
                            />
                        ) : onBake ? (`,
      },
      // capacity modal removed
      {
        find: r`<JumpToMachineModal entries={jumpEntries} currentLocation={selectedLocation} onJump={jumpToMachine} />
                        <CapacityOverviewModal
                            serverMachines={serverMachines}
                            nonMachines={nonMachineList}
                            machineCapacity={machineCapacity}
                            dataRows={dataRows}
                            onJumpToMachine={jumpToMachine}
                        />`,
        replace: r`<JumpToMachineModal entries={jumpEntries} currentLocation={selectedLocation} onJump={jumpToMachineAnywhere} />`,
      },
    ],
  },

  // ---------------------------------------------------------- PlanToolbar.jsx
  {
    file: "resources/js/Components/LoadingPlan/PlanToolbar.jsx",
    replacements: [
      {
        find: r`import { CAPACITY_OVERVIEW_MODAL_ID } from "./CapacityOverviewModal";`,
        replace: ``,
      },
      {
        find: r`<button className="btn btn-sm" onClick={() => showModal(CAPACITY_OVERVIEW_MODAL_ID)} title="Commit vs capacity for all machines">
                            Capacity
                        </button>`,
        replace: ``,
      },
    ],
  },

  // ------------------------------------------------- loadingPlanExcelExporter.js
  {
    file: "resources/js/Lib/LoadingPlan/loadingPlanExcelExporter.js",
    replacements: [
      {
        find: r`import {
    PACKAGE_SUMMARY_GROUPS,
    aggregateByMachine,
    buildOverviewSections,
    buildStatusCols,
    resolveSummaryGroup,
} from "@/Components/LoadingPlan/CapacityOverviewModal.jsx";`,
        replace: r`import {
    PACKAGE_SUMMARY_GROUPS,
    aggregateByMachine,
    buildOverviewSections,
    buildStatusCols,
    resolveSummaryGroup,
} from "@/Lib/LoadingPlan/capacityOverview";
import { PRE_TNR_STATUSES, STATUS_ORDER } from "@/Lib/LoadingPlan/ptpOverview";`,
      },
      {
        find: r`// Lots still before TNR. Every other status counts towards "TNR % Completion".
const PRE_TNR_STATUSES = ["RUNNING", "FOR PROCESS", "HOLD", "(blank)"];
// Display order for the status table. Anything else follows alphabetically.
const STATUS_ORDER = ["DONE", "FVI", "VISUAL (FVI)", "OQA", "BOXING", "BUY OFF", "BUY-OFF", ...PRE_TNR_STATUSES];`,
        replace: r`// PRE_TNR_STATUSES / STATUS_ORDER live in Lib/LoadingPlan/ptpOverview (shared with the PTP 95% tab).`,
      },
    ],
  },
];

/* ========================================================================== */
/*  2. NEW FILES                                                              */
/* ========================================================================== */
const NEW_FILES = [
  /* ---------------------------------------------------------------------- */
  {
    file: "resources/js/Lib/LoadingPlan/capacityOverview.js",
    content: r`// Pure builders for the machine capacity table (PTP 95% tab + Excel exporter).
// Moved out of the old CapacityOverviewModal.jsx, logic unchanged.
import { STATUS_GROUPS } from "@/Components/LoadingPlan/StatusMenu.jsx";
import { isBlockRow } from "./helpers";

/**
 * Groups used by the "By package" view of the capacity table.
 * ${"`"}members${"`"} are matched (case-insensitive) against a lot's package_group, then its package_name.
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
`,
  },

  /* ---------------------------------------------------------------------- */
  {
    file: "resources/js/Lib/LoadingPlan/ptpOverview.js",
    content: r`// Pure data builders for the package totals + status tables of the "PTP 95%" tab.
// Mirrors renderPtpSummaries() in loadingPlanExcelExporter.js.

// Lots still before TNR. Every other status counts towards "TNR % Completion".
export const PRE_TNR_STATUSES = ["RUNNING", "FOR PROCESS", "HOLD", "(blank)"];
// Display order for the status table. Anything else follows alphabetically.
export const STATUS_ORDER = ["DONE", "FVI", "VISUAL (FVI)", "OQA", "BOXING", "BUY OFF", "BUY-OFF", ...PRE_TNR_STATUSES];

const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/**
 * One entry per planned lot of the current location (placed on a machine, or grouped under a
 * machine's group). Same filter the Excel export uses for its PTP data sheet.
 */
export function buildPtpSummaryRows({ dataRows, buckets = [], isF3 = false, isBlock, isOtherLoc, isParked }) {
    const bucketMachine = new Map(buckets.map((b) => [b.id, b.machine ?? null]));
    const isPlanned = (r) => r.machine != null || (isParked(r) && bucketMachine.get(r.bucket_id) != null);

    return dataRows
        .filter((r) => !isBlock(r) && !isOtherLoc(r) && isPlanned(r))
        .map((r) => ({
            pkg: String((isF3 ? r.package_type : r.package_name) ?? "").trim() || "(blank)",
            status: String(r.status ?? "").trim().toUpperCase() || "(blank)",
            qty: toNum(r.qty),
            doable: toNum(r.doable),
            lotId: r.lot_id ?? "",
        }));
}

/** Package totals (PACKAGE | Sum of QTY | Sum of Doable | Count of Lot_Id) and the status table. */
export function buildPtpTables(summaryRows) {
    const byPkg = new Map();
    const counts = new Map();
    const packageTotal = { qty: 0, doable: 0, lots: 0 };

    for (const r of summaryRows) {
        let p = byPkg.get(r.pkg);
        if (!p) byPkg.set(r.pkg, (p = { pkg: r.pkg, qty: 0, doable: 0, lots: 0 }));
        p.qty += r.qty;
        p.doable += r.doable;
        packageTotal.qty += r.qty;
        packageTotal.doable += r.doable;
        if (r.lotId !== "") {
            p.lots += 1;
            packageTotal.lots += 1;
        }
        counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
    }

    const packages = [...byPkg.values()].sort((a, b) => a.pkg.localeCompare(b.pkg, undefined, { numeric: true }));

    const total = summaryRows.length;
    const rank = (s) => {
        const i = STATUS_ORDER.indexOf(s);
        return i === -1 ? STATUS_ORDER.length : i;
    };
    const statuses = [...counts.entries()]
        .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
        .map(([status, count]) => ({ status, count, pct: total ? count / total : 0 }));

    // TNR % Completion = every planned lot minus those still before TNR
    const preCount = PRE_TNR_STATUSES.reduce((s, k) => s + (counts.get(k) ?? 0), 0);
    const tnrCount = total - preCount;

    return {
        packages,
        packageTotal,
        statuses,
        total,
        tnr: { count: tnrCount, pct: total ? tnrCount / total : 0 },
    };
}
`,
  },

  /* ---------------------------------------------------------------------- */
  {
    file: "resources/js/Components/LoadingPlan/PtpOverview.jsx",
    content: r`import {
    aggregateByMachine,
    buildOverviewSections,
    buildStatusCols,
    fmtPct,
} from "@/Lib/LoadingPlan/capacityOverview";
import { isBlockRow } from "@/Lib/LoadingPlan/helpers";
import { buildPtpSummaryRows, buildPtpTables } from "@/Lib/LoadingPlan/ptpOverview";
import clsx from "clsx";
import { Fragment, memo, useDeferredValue, useMemo, useState } from "react";

/**
 * "PTP 95%" tab (view only). Shows what the "PTP 95%" sheet of the Excel export contains:
 *  - Commit / Capacity per machine, grouped by package group, with status counts
 *  - PACKAGE | Sum of QTY | Sum of Doable | Count of Lot_Id
 *  - status table with TNR % Completion
 * ${"`"}machineCapacity${"`"} is a Deferred prop (undefined until loaded).
 */

const PANEL_STYLE = { height: "80vh" };
const BORDER = "border-l border-base-content/20";
const num = (n) => Number(n || 0).toLocaleString();
const pctText = (v) => Math.round(v * 100) + "%";

// ── capacity table ───────────────────────────────────────────────────────
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
                            title={"Jump to " + label}
                            aria-label={"Jump to " + label}
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
                <td>{loading ? null : <UtilizationCell pct={capacity ? (agg.commit / capacity) * 100 : null} />}</td>
            )}
        </tr>
    );
});

function CapacityTable({ sections, grand, statusCols, loading, showUtil, onJump, labelOf }) {
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
                        {section.rows.map((row, i) => (
                            <SummaryRow
                                key={row.key + "-" + i}
                                label={labelOf ? labelOf(row.key) : row.label}
                                badge={row.kind === "non-machine" ? "non-machine" : row.kind === "orphan" ? "not active" : null}
                                onJump={row.kind === "machine" || row.kind === "non-machine" ? onJump : undefined}
                                jumpKey={row.key}
                                capacity={row.capacity}
                                agg={row.agg}
                                loading={loading && row.kind === "machine"}
                                statusCols={statusCols}
                                showUtil={showUtil}
                                highlight={!loading && row.kind === "machine" && row.capacity == null}
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
                    label="Grand total"
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

// ── package totals + status table ────────────────────────────────────────
function PackageTable({ tables }) {
    const { packages, packageTotal } = tables;
    return (
        <table className="table table-xs w-auto">
            <thead>
                <tr className="bg-base-300">
                    <th>PACKAGE</th>
                    <th className="text-right">Sum of QTY</th>
                    <th className="text-right">Sum of Doable</th>
                    <th className="text-right">Count of Lot_Id</th>
                </tr>
            </thead>
            <tbody>
                {packages.length === 0 && (
                    <tr>
                        <td colSpan={4} className="text-center text-base-content/40">No planned lots.</td>
                    </tr>
                )}
                {packages.map((p) => (
                    <tr key={p.pkg}>
                        <td>{p.pkg}</td>
                        <td className="text-right tabular-nums">{num(p.qty)}</td>
                        <td className="text-right tabular-nums">{num(p.doable)}</td>
                        <td className="text-right tabular-nums">{num(p.lots)}</td>
                    </tr>
                ))}
            </tbody>
            <tfoot>
                <tr className="bg-base-200 font-semibold">
                    <td>Grand Total</td>
                    <td className="text-right tabular-nums">{num(packageTotal.qty)}</td>
                    <td className="text-right tabular-nums">{num(packageTotal.doable)}</td>
                    <td className="text-right tabular-nums">{num(packageTotal.lots)}</td>
                </tr>
            </tfoot>
        </table>
    );
}

function StatusTable({ tables, location }) {
    const { statuses, total, tnr } = tables;
    return (
        <table className="table table-xs w-auto">
            <thead>
                <tr className="bg-base-300">
                    <th>{location ?? "All"}</th>
                    <th className="text-right">Number of Lots</th>
                    <th className="text-right">Percentage</th>
                </tr>
            </thead>
            <tbody>
                <tr className="font-bold">
                    <td>TNR % Completion</td>
                    <td className="text-right tabular-nums">{num(tnr.count)}</td>
                    <td className="text-right tabular-nums">{pctText(tnr.pct)}</td>
                </tr>
                <tr className="bg-base-200 font-bold">
                    <td colSpan={3}>REMARKS</td>
                </tr>
                {statuses.map((s) => (
                    <tr key={s.status}>
                        <td>{s.status}</td>
                        <td className="text-right tabular-nums">{num(s.count)}</td>
                        <td className="text-right tabular-nums">{pctText(s.pct)}</td>
                    </tr>
                ))}
            </tbody>
            <tfoot>
                <tr className="bg-base-200 font-semibold">
                    <td>TOTAL</td>
                    <td className="text-right tabular-nums">{num(total)}</td>
                    <td className="text-right tabular-nums">{total ? "100%" : "0%"}</td>
                </tr>
            </tfoot>
        </table>
    );
}

// ── tab body ─────────────────────────────────────────────────────────────
export default function PtpOverview({
    serverMachines,
    nonMachines,
    machineCapacity,
    dataRows,
    buckets,
    location,
    isF3,
    isOtherLoc,
    isParked,
    labelOf,
    onJumpToMachine,
}) {
    const [view, setView] = useState("packages"); // "packages" = same layout as the Excel sheet
    const [hideEmptyStatuses, setHideEmptyStatuses] = useState(true);
    const loading = machineCapacity === undefined;

    const deferredRows = useDeferredValue(dataRows);

    const { byMachine, extraStatuses, orphanMachines } = useMemo(
        () => aggregateByMachine({ dataRows: deferredRows, serverMachines, nonMachines }),
        [deferredRows, serverMachines, nonMachines],
    );

    const { simpleSections, groupedSections, grand } = useMemo(
        () => buildOverviewSections({ byMachine, serverMachines, nonMachines, machineCapacity, orphanMachines }),
        [byMachine, serverMachines, nonMachines, machineCapacity, orphanMachines],
    );

    const statusCols = useMemo(
        () => buildStatusCols({ extraStatuses, grand, hideEmpty: hideEmptyStatuses }),
        [extraStatuses, hideEmptyStatuses, grand],
    );

    const summaryRows = useMemo(
        () =>
            buildPtpSummaryRows({
                dataRows: deferredRows,
                buckets,
                isF3,
                isBlock: isBlockRow,
                isOtherLoc,
                isParked,
            }),
        [deferredRows, buckets, isF3, isOtherLoc, isParked],
    );
    const tables = useMemo(() => buildPtpTables(summaryRows), [summaryRows]);

    const byPackage = view === "packages";

    return (
        <div className="overflow-y-auto bg-base-100 px-1 pb-4" style={PANEL_STYLE}>
            <div className="flex flex-wrap items-center justify-between gap-2 py-2">
                <h3 className="font-bold text-lg">
                    Commit / Capacity — All Machines {byPackage ? "(By package)" : "(By machine)"}
                </h3>
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
                        <button role="tab" className={clsx("tab", byPackage && "tab-active")} onClick={() => setView("packages")}>
                            By package
                        </button>
                        <button role="tab" className={clsx("tab", !byPackage && "tab-active")} onClick={() => setView("machines")}>
                            Machines
                        </button>
                    </div>
                </div>
            </div>

            <div className="overflow-auto max-h-[55vh] rounded-box border border-base-content/10">
                <CapacityTable
                    sections={byPackage ? groupedSections : simpleSections}
                    grand={grand}
                    statusCols={statusCols}
                    loading={loading}
                    showUtil={!byPackage}
                    onJump={onJumpToMachine}
                    labelOf={labelOf}
                />
            </div>

            {byPackage && (
                <p className="text-xs opacity-60 mt-2">
                    A machine running several package groups appears under each one (lot counts are split per group; capacity is
                    the full machine capacity). The grand total counts each machine once.
                </p>
            )}

            <div className="mt-6 flex flex-wrap items-start gap-8">
                <PackageTable tables={tables} />
                <StatusTable tables={tables} location={location} />
            </div>
        </div>
    );
}
`,
  },
];

/* ========================================================================== */
/*  3. FILES TO DELETE                                                        */
/* ========================================================================== */
const DELETIONS = ["resources/js/Components/LoadingPlan/CapacityOverviewModal.jsx"];

/* ========================================================================== */
/*  Engine                                                                    */
/* ========================================================================== */
const escapeRe = (s) => s.replace(/[.*+?^$\{\}()|[\]\\]/g, "\\$&");

// whitespace-insensitive: tokens must appear in order, separated by any whitespace
const toRegex = (text) =>
  new RegExp(
    text
      .trim()
      .split(/\s+/)
      .map(escapeRe)
      .join("\\s+"),
    "g",
  );

const abs = (rel) => path.join(ROOT, ...rel.split("/"));
const errors = [];
const log = [];
const pending = []; // { abs, content }

function patch(src, { find, replace }) {
  const rep = replace.trim();
  // already applied?
  if (rep && [...src.matchAll(toRegex(rep))].length === 1) return { src, status: "already applied" };

  const matches = [...src.matchAll(toRegex(find))];
  if (matches.length !== 1) return { error: matches.length + " matches (expected exactly 1)" };

  const eol = src.includes("\r\n") ? "\r\n" : "\n";
  const m = matches[0];
  const out = src.slice(0, m.index) + rep.replace(/\r?\n/g, eol) + src.slice(m.index + m[0].length);
  return { src: out, status: "ok" };
}

if (!fs.existsSync(abs("resources/js/Pages/Deemo.jsx"))) {
  console.error("Run this from the project root (resources/js/Pages/Deemo.jsx not found in " + ROOT + ")");
  process.exit(1);
}

for (const { file, replacements } of EDITS) {
  if (!fs.existsSync(abs(file))) {
    errors.push(file + ": file not found");
    continue;
  }
  let src = fs.readFileSync(abs(file), "utf8");
  replacements.forEach((rp, i) => {
    const res = patch(src, rp);
    const tag = file + " #" + (i + 1) + " (" + rp.find.trim().split("\n")[0].slice(0, 60) + ")";
    if (res.error) errors.push(tag + ": " + res.error);
    else {
      src = res.src;
      log.push((res.status === "ok" ? "patched  " : "skipped  ") + tag + (res.status === "ok" ? "" : " - already applied"));
    }
  });
  pending.push({ abs: abs(file), content: src });
}

for (const { file, content } of NEW_FILES) {
  const exists = fs.existsSync(abs(file));
  pending.push({ abs: abs(file), content, mkdir: true });
  log.push((exists ? "overwrite " : "create    ") + file);
}

for (const file of DELETIONS) {
  if (fs.existsSync(abs(file))) log.push("delete    " + file);
}

console.log(log.join("\n"));

if (errors.length) {
  console.error("\nNOTHING WAS WRITTEN. Problems:\n - " + errors.join("\n - "));
  process.exit(1);
}

if (DRY) {
  console.log("\nDry run OK: every patch matched. Re-run without --dry-run to apply.");
  process.exit(0);
}

for (const f of pending) {
  if (f.mkdir) fs.mkdirSync(path.dirname(f.abs), { recursive: true });
  fs.writeFileSync(f.abs, f.content, "utf8");
}
for (const file of DELETIONS) {
  if (fs.existsSync(abs(file))) fs.unlinkSync(abs(file));
}

console.log("\nDone. Next: grep -rn \"CapacityOverviewModal\\|CAPACITY_OVERVIEW_MODAL_ID\" resources/js");
