// Pure data builders for the package totals + status tables of the "PTP 95%" tab.
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
