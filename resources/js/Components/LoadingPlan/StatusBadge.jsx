const STATUS_STYLES = {
    DONE: "bg-success/20 text-green-600",
    RUNNING: "bg-info/20 text-info",
    HOLD: "bg-error/20 text-error",
    "FOR PROCESS": "bg-warning/20 text-warning",
    FVI: "bg-warning/20 text-warning",
    BOXING: "bg-base-content/10 text-base-content/70",
    NONE: "bg-base-content/10 text-base-content/70",
};

export function StatusBadge({ status }) {
    const cls =
        STATUS_STYLES[status] ?? "bg-base-content/10 text-base-content/50";
    return (
        <span
            className={`flex px-1 font-bold items-center text-left text-[12px] w-full h-full whitespace-nowrap ${cls}`}
        >
            {status}
        </span>
    );
}
