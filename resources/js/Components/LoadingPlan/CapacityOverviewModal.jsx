import clsx from "clsx";
import { useMemo } from "react";

export const CAPACITY_OVERVIEW_MODAL_ID = "capacity_overview_modal";

function UtilizationCell({ pct }) {
    if (pct == null) return <span className="text-xs opacity-50">no capacity</span>;

    return (
        <div className="flex items-center gap-2">
            <progress
                className={clsx("progress w-20", pct > 100 ? "progress-error" : pct >= 90 ? "progress-warning" : "progress-success")}
                value={Math.min(pct, 100)}
                max="100"
            />
            <span className="text-xs tabular-nums">{pct.toFixed(0)}%</span>
        </div>
    );
}

/** Commit vs capacity for every machine. `machineCapacity` is a Deferred prop (undefined until loaded). */
export default function CapacityOverviewModal({ serverMachines, machineCapacity, machineTotalDoable, machineTotalQuantity }) {
    const loading = machineCapacity === undefined;

    const rows = useMemo(
        () =>
            serverMachines.map((m) => {
                const commit = machineTotalDoable[m.name] ?? 0;
                const cap = machineCapacity?.[m.name];
                const capacity = Number(cap?.capacity) > 0 ? Number(cap.capacity) : null;
                return {
                    name: m.name,
                    commit,
                    capacity,
                    effectiveFrom: cap?.effective_from?.split("T")[0] ?? null,
                    qty: machineTotalQuantity[m.name] ?? 0,
                    pct: capacity ? (commit / capacity) * 100 : null,
                };
            }),
        [serverMachines, machineTotalDoable, machineTotalQuantity, machineCapacity],
    );

    const totals = useMemo(
        () => rows.reduce((t, r) => ({ commit: t.commit + r.commit, capacity: t.capacity + (r.capacity ?? 0) }), { commit: 0, capacity: 0 }),
        [rows],
    );

    return (
        <dialog id={CAPACITY_OVERVIEW_MODAL_ID} className="modal">
            <div className="modal-box bg-base-300 w-11/12 max-w-4xl max-h-[80vh] flex flex-col">
                <h3 className="font-bold text-lg mb-3">Commit / Capacity — All Machines</h3>

                <div className="overflow-y-auto">
                    <table className="table table-sm table-pin-rows">
                        <thead>
                            <tr>
                                <th>Machine</th>
                                <th className="text-right">Commit</th>
                                <th className="text-right">Capacity</th>
                                <th className="text-right">Qty</th>
                                <th>Effective</th>
                                <th className="w-40">Utilization</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r) => (
                                <tr key={r.name} className={!loading && r.capacity == null ? "bg-warning/10" : undefined}>
                                    <td className="font-medium">{r.name}</td>
                                    <td className="text-right">{r.commit.toLocaleString()}</td>
                                    <td className="text-right">
                                        {loading ? (
                                            <span className="loading loading-spinner loading-xs" />
                                        ) : (
                                            r.capacity?.toLocaleString() ?? "—"
                                        )}
                                    </td>
                                    <td className="text-right">{r.qty.toLocaleString()}</td>
                                    <td className="text-xs opacity-60">{r.effectiveFrom ?? ""}</td>
                                    <td>{loading ? null : <UtilizationCell pct={r.pct} />}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="font-semibold">
                                <td>Total</td>
                                <td className="text-right">{totals.commit.toLocaleString()}</td>
                                <td className="text-right">{totals.capacity.toLocaleString()}</td>
                                <td />
                                <td />
                                <td className="text-xs tabular-nums">
                                    {totals.capacity ? `${((totals.commit / totals.capacity) * 100).toFixed(0)}%` : ""}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="modal-action">
                    <form method="dialog"><button className="btn btn-ghost btn-sm">Close</button></form>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop"><button>close</button></form>
        </dialog>
    );
}