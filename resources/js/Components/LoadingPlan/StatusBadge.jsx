const STATUS_STYLES = {
    DONE: "bg-success/20 text-success",
    RUNNING: "bg-info/20 text-info",
    "FOR PROCESS": "bg-warning/20 text-warning",
    FVI: "bg-warning/20 text-warning",
    BOXING: "bg-base-content/10 text-base-content/60",
    LWAIT: "bg-base-content/10 text-base-content/60",
    NONE: "bg-base-content/10 text-base-content/60",
};

export function StatusBadge({ status }) {
    const cls =
        STATUS_STYLES[status] ?? "bg-base-content/10 text-base-content/50";
    return (
        <span
            className={`flex px-1 rounded-lg items-center text-left text-[11px] font-medium w-full h-full whitespace-nowrap ${cls}`}
        >
            {status}
        </span>
    );
}
