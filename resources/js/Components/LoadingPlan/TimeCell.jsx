import dayjs from "dayjs";

export default function TimeCell({ row, field }) {
    const value = row[field];
    if (!value) return null;

    const offset = row[`${field}_day_offset`] ?? 0;
    const at = row[`${field}_at`];

    let label = null;
    let tone = "";
    if (offset === -1) { label = "Yest"; tone = "badge-warning"; }
    else if (offset === 1) { label = "Tmrw"; tone = "badge-info"; }
    else if (offset !== 0) {
        label = at ? dayjs(at).format("MMM D") : `${offset > 0 ? "+" : ""}${offset}d`;
        tone = "badge-neutral";
    }

    return (
        <span className="flex items-center gap-1.5" title={at ? dayjs(at).format("ddd, MMM D HH:mm") : undefined}>
            <span>{value}</span>
            {label && <span className={`badge badge-xs badge-soft ${tone}`}>{label}</span>}
        </span>
    );
}