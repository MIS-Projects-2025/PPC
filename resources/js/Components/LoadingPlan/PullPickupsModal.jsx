import clsx from "clsx";
import dayjs from "dayjs";

export const PULL_PICKUPS_MODAL_ID = "pull_pickups_modal";

const DAY_OPTIONS = [7, 14, 30];

/** Presentational: all state lives in usePickupPool. */
export default function PullPickupsModal({ pool, date, location, disabled }) {
    const { candidates, loading, loadFailed, pulling, selected, allSelected, days } = pool;

    const busy = disabled || pulling;
    const count = selected.size;

    // the hook already toasts failures; the modal just stays open
    const handleAdd = () => pool.pull().catch(() => {});

    return (
        // closing drops the loaded list and selection, so reopening always starts fresh
        <dialog id={PULL_PICKUPS_MODAL_ID} className="modal" onClose={pool.reset}>
            <div className="modal-box bg-base-300 w-11/12 max-w-4xl h-[85vh] flex flex-col">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <h3 className="font-bold text-lg">Earlier pickups</h3>

                    <div className="flex items-center gap-2 text-xs">
                        <span className="opacity-70">Picked up in the last</span>
                        <div className="join">
                            {DAY_OPTIONS.map((d) => (
                                <button
                                    key={d}
                                    type="button"
                                    disabled={loading || busy}
                                    onClick={() => pool.changeDays(d)}
                                    className={clsx("btn btn-xs join-item", days === d ? "btn-primary" : "btn-ghost border border-base-content/20")}
                                >
                                    {d} days
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <p className="text-xs opacity-60 mb-3">
                    Adds the selected {location} pickups to Unassigned on {dayjs(date).format("MMM D, YYYY")}. Lots that are already
                    placed on any date, or already on this date, aren't listed.
                </p>

                <div className="flex-1 min-h-0 overflow-auto border border-base-content/10 rounded-md bg-base-100">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <span className="loading loading-spinner loading-md text-base-content/40" />
                        </div>
                    ) : loadFailed ? (
                        <div className="flex flex-col items-center gap-2 py-12 text-sm">
                            <span className="text-error">Couldn't load the pickups.</span>
                            <button type="button" className="btn btn-sm" onClick={() => pool.load()}>
                                Retry
                            </button>
                        </div>
                    ) : !candidates ? null : candidates.length === 0 ? (
                        <div className="text-center text-xs opacity-50 py-12">
                            No earlier {location} pickups to bring in for the last {days} days.
                        </div>
                    ) : (
                        <table className="table table-xs table-pin-rows">
                            <thead>
                                <tr>
                                    <th className="w-8">
                                        <input
                                            type="checkbox"
                                            className="checkbox checkbox-xs"
                                            checked={allSelected}
                                            onChange={pool.toggleAll}
                                            disabled={busy}
                                            aria-label="Select all"
                                        />
                                    </th>
                                    <th>Lot ID</th>
                                    <th>Part Name</th>
                                    <th>Package</th>
                                    <th className="text-right">LC</th>
                                    <th className="text-right">Qty</th>
                                    <th>Picked up</th>
                                </tr>
                            </thead>
                            <tbody>
                                {candidates.map((c) => {
                                    const checked = selected.has(c.id_pickup);
                                    return (
                                        <tr
                                            key={c.id_pickup}
                                            className={clsx("cursor-pointer hover:bg-base-200", checked && "bg-primary/10")}
                                            onClick={() => !busy && pool.toggle(c.id_pickup)}
                                        >
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    className="checkbox checkbox-xs"
                                                    checked={checked}
                                                    disabled={busy}
                                                    onChange={() => pool.toggle(c.id_pickup)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    aria-label={`Select ${c.lot_id}`}
                                                />
                                            </td>
                                            <td className="font-mono">{c.lot_id}</td>
                                            <td>
                                                {c.part_name}
                                                {c.part_missing && (
                                                    <span
                                                        className="badge badge-warning badge-xs ml-2"
                                                        title="Not in package_list: it will show under Missing parts"
                                                    >
                                                        not in part list
                                                    </span>
                                                )}
                                            </td>
                                            <td>{c.package_name}</td>
                                            <td className="text-right tabular-nums">{c.lead_count ?? "—"}</td>
                                            <td className="text-right tabular-nums">{c.qty.toLocaleString()}</td>
                                            <td className="whitespace-nowrap">{dayjs(c.picked_up_at).format("MMM D HH:mm")}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="modal-action items-center">
                    <span className="mr-auto text-xs opacity-60">
                        {candidates ? `${count} of ${candidates.length} selected` : ""}
                    </span>
                    <form method="dialog">
                        <button className="btn btn-ghost" disabled={pulling}>Close</button>
                    </form>
                    <button className="btn btn-primary" disabled={busy || count === 0} onClick={handleAdd}>
                        {pulling && <span className="loading loading-spinner loading-sm" />}
                        Add {count > 0 ? count : ""} to Unassigned
                    </button>
                </div>
            </div>
            <form method="dialog" className="modal-backdrop"><button>close</button></form>
        </dialog>
    );
}