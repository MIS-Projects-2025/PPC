import { forwardRef, useEffect, useState } from "react";
import { FaChevronLeft, FaChevronRight, FaClockRotateLeft } from "react-icons/fa6";

const CHANGE_TYPE_BADGE = {
    created: "badge-success",
    updated: "badge-info",
    deleted: "badge-error",
};

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/;

function formatValue(v) {
    if (v === null || v === undefined) return "—";
    if (typeof v === "boolean") return v ? "true" : "false";
 
    if (typeof v === "string" && ISO_DATE_RE.test(v)) {
        const date = new Date(v);
        if (!isNaN(date)) {
            // Date-only columns (scheduled_date) have no time component —
            // show just the date, not a misleading midnight timestamp.
            const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(v);
            return isDateOnly
                ? date.toLocaleDateString()
                : date.toLocaleString();
        }
    }
 
    return String(v);
}

function ChangeRow({ column, oldValue, newValue }) {
    return (
        <div className="flex items-center justify-between gap-2 py-1 border-b border-base-content/5 last:border-b-0">
            <span className="text-[11px] font-mono text-base-content/50">
                {column}
            </span>
            <span className="flex items-center gap-2 text-xs">
                <span className="text-base-content/60 line-through decoration-error/50">
                    {formatValue(oldValue)}
                </span>
                <span className="text-base-content/30">→</span>
                <span className="font-semibold text-primary">
                    {formatValue(newValue)}
                </span>
            </span>
        </div>
    );
}

function HistoryEntry({ record }) {
    const columns = record.changed_columns ?? [];
    const oldValues = record.old_values ?? {};
    const newValues = record.new_values ?? {};

    return (
        <div className="rounded-xl bg-base-100 border border-base-content/10 p-3">
            <div className="flex items-center justify-between mb-2">
                <span
                    className={`badge badge-sm ${
                        CHANGE_TYPE_BADGE[record.change_type] ?? "badge-ghost"
                    }`}
                >
                    {record.change_type}
                </span>
                <div className="text-right">
                    <div className="text-xs text-base-content/70">
                        {record.changed_by?.name ?? "System"}
                    </div>
                    <div className="text-[10px] text-base-content/40">
                        {new Date(record.changed_at).toLocaleString()}
                    </div>
                </div>
            </div>

            {record.change_type === "updated" ? (
                <div>
                    {columns.map((col) => (
                        <ChangeRow
                            key={col}
                            column={col}
                            oldValue={oldValues[col]}
                            newValue={newValues[col]}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-[11px] text-base-content/50 font-mono">
                    {columns.length} field{columns.length === 1 ? "" : "s"} recorded
                </div>
            )}
        </div>
    );
}

const EntryHistoryModal = forwardRef(function EntryHistoryModal(
    { entryId, onClose },
    ref,
) {
    const [page, setPage] = useState(1);
    const [records, setRecords] = useState([]);
    const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!entryId) return;
        setPage(1);
    }, [entryId]);

    useEffect(() => {
        if (!entryId) return;

        let cancelled = false;
        setLoading(true);
        setError(null);

        fetch(route("loading-plan.entries.history", entryId) + `?page=${page}`)
            .then((res) => {
                if (!res.ok) throw new Error(`Request failed (${res.status})`);
                return res.json();
            })
            .then((data) => {
                if (cancelled) return;
                setRecords(data.data ?? []);
                setMeta({
                    current_page: data.current_page ?? 1,
                    last_page: data.last_page ?? 1,
                    total: data.total ?? 0,
                });
            })
            .catch((err) => {
                if (!cancelled) setError(err.message);
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [entryId, page]);

    const canPrev = meta.current_page > 1;
    const canNext = meta.current_page < meta.last_page;

    return (
        <dialog ref={ref} id="history_modal" className="modal">
            <div className="modal-box bg-base-300 w-11/12 max-w-lg">
                <h3 className="font-bold text-lg mb-1 flex items-center gap-2">
                    <FaClockRotateLeft size={16} /> Entry History
                </h3>
                <p className="text-xs text-base-content/50 mb-5">
                    {meta.total > 0
                        ? `${meta.total} change${meta.total === 1 ? "" : "s"} recorded`
                        : "Change history for this entry"}
                </p>

                {loading && (
                    <div className="flex justify-center py-8">
                        <span className="loading loading-spinner loading-sm" />
                    </div>
                )}

                {!loading && error && (
                    <p className="text-error text-xs">Failed to load history: {error}</p>
                )}

                {!loading && !error && records.length === 0 && (
                    <p className="text-base-content/50 text-xs">
                        No changes recorded yet.
                    </p>
                )}

                {!loading && !error && records.length > 0 && (
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                        {records.map((record) => (
                            <HistoryEntry key={record.id} record={record} />
                        ))}
                    </div>
                )}

                {!loading && !error && meta.last_page > 1 && (
                    <div className="join flex justify-center mt-4">
                        <button
                            className="join-item btn btn-xs"
                            disabled={!canPrev}
                            onClick={() => setPage((p) => p - 1)}
                        >
                            <FaChevronLeft size={10} />
                        </button>
                        <button className="join-item btn btn-xs btn-disabled !text-base-content">
                            {meta.current_page} / {meta.last_page}
                        </button>
                        <button
                            className="join-item btn btn-xs"
                            disabled={!canNext}
                            onClick={() => setPage((p) => p + 1)}
                        >
                            <FaChevronRight size={10} />
                        </button>
                    </div>
                )}

                <div className="modal-action mt-6">
                    <button className="btn btn-ghost cursor-pointer" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>

            <form method="dialog" className="modal-backdrop">
                <button onClick={onClose}>close</button>
            </form>
        </dialog>
    );
});

export default EntryHistoryModal;