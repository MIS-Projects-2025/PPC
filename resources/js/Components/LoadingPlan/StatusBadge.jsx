import { memo } from "react";

const TONE = {
    neutral: "bg-base-content/10 text-base-content/80 border-base-content/50",
    progress: "bg-info/50 text-base-content border-info",
    queued: "bg-warning/50 text-base-content border-warning",
    done: "bg-success/50 text-base-content border-success",
    shipped: "bg-success text-success-content border-success",
    postTnr: "bg-secondary/50 text-base-content border-secondary",
    handling: "bg-accent/50 text-base-content border-accent",
    hold: "bg-error/50 text-base-content border-error",
    rework: "bg-orange-500/50 text-base-content border-orange-500",
};

export const STATUS_TONE = {
    NONE: "neutral",

    RUNNING: "progress", 
    "ON BAKE": "progress", 
    "ON SORT": "progress", 
    "ON BRAND": "progress",
    "ON LPI": "progress", 
    "ON LLI": "progress", 
    "ON LEADCON": "progress",
    HANDLER: "progress", 
    DETAPE: "progress", 
    
    "FOR DO": "queued", 
    "FOR PROCESS": "queued", 
    "FOR BAKE": "queued", 
    "FOR SORT": "queued",
    "FOR BRAND": "queued", 
    "FOR LPI": "queued", 
    "FOR LLI": "queued", 
    "FOR LEADCON": "queued",
    
    // PRE-TNR
    IQA: "queued", 
    
    DONE: "done", 
    "DONE DETAPE": "done",
    "FINAL SHIP": "shipped",
    
    // POST-TNR
    OQA: "postTnr", 
    FVI: "postTnr", 
    "VISUAL (FVI)": "postTnr", 
    "BUY-OFF": "postTnr",
    BOXING: "postTnr",
    
    // all considered "HOLD" on the loading plan exported excel
    // HOLD* is to be used in formulas to sum them all up in summary sheets.
    HOLD: "hold", 
    "HOLD (IQA)": "hold", 
    "HOLD (TNR)": "hold", 
    "HOLD (PACK LABEL)": "hold", 
    "HOLD (FINAL QA)": "hold",
    
    // REWORK: "rework",
};

const STATUS_STYLES = Object.fromEntries(
    Object.entries(STATUS_TONE).map(([status, tone]) => [status, TONE[tone]]),
);
STATUS_STYLES["FINAL SHIP"] += " font-extrabold";

export const StatusBadge = memo(function StatusBadge({ status }) {
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
});