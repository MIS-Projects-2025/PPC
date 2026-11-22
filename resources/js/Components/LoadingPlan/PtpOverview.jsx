import {
    aggregateByMachine,
    buildOverviewSections,
    buildStatusCols,
    completedCount,
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
 * `machineCapacity` is a Deferred prop (undefined until loaded).
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
    // Percentage = (DONE + post-TNR) / Planned
    const done = completedCount(agg.counts);
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
