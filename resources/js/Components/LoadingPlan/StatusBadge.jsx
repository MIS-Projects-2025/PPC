const TONE = {
    neutral: "bg-base-content/10 text-base-content/80 border-base-content/50",
    progress: "bg-info/50 text-base-content border-info",
    queued: "bg-warning/50 text-base-content border-warning",
    done: "bg-success/50 text-base-content border-success",
    shipped: "bg-success text-success-content border-success",
    qa: "bg-secondary/50 text-base-content border-secondary",
    handling: "bg-accent/50 text-base-content border-accent",
    hold: "bg-error/50 text-base-content border-error",
    rework: "bg-orange-500/50 text-base-content border-orange-500",
};

const STATUS_STYLES = {
    NONE: TONE.neutral,

    RUNNING: TONE.progress,
    "ON BAKE": TONE.progress,
    "ON SORT": TONE.progress,
    "ON BRAND": TONE.progress,
    "ON LPI": TONE.progress,
    "ON LLI": TONE.progress,
    "ON LEADCON": TONE.progress,

    "FOR DO": TONE.queued,
    "FOR PROCESS": TONE.queued,
    "FOR BAKE": TONE.queued,
    "FOR SORT": TONE.queued,
    "FOR BRAND": TONE.queued,
    "FOR LPI": TONE.queued,
    "FOR LLI": TONE.queued,
    "FOR LEADCON": TONE.queued,

    DONE: TONE.done,
    "DONE DETAPE": TONE.done,
    "FINAL SHIP": `${TONE.shipped} font-extrabold`,

    IQA: TONE.qa,
    OQA: TONE.qa,
    FVI: TONE.qa,
    "VISUAL (FVI)": TONE.qa,
    "BUY-OFF": TONE.qa,

    HANDLER: TONE.handling,
    DETAPE: TONE.handling,
    BOXING: TONE.handling,

    HOLD: TONE.hold,
    "IQA HOLD": TONE.hold,
    "TNR HOLD": TONE.hold,
    "PACK LABEL HOLD": TONE.hold,
    "FINAL QA HOLD": TONE.hold,

    REWORK: TONE.rework,
};

export function StatusBadge({ status }) {
    const cls =
        STATUS_STYLES[status] ??
        "bg-base-content/10 text-base-content/60 border-base-content/50";
    return (
        <span
            className={`flex px-1.5 font-bold items-center text-left text-[12px] w-full h-full whitespace-nowrap border-l-8 ${cls}`}
        >
            {status}
        </span>
    );
}