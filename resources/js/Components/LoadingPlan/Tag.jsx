// ---------------------------------------------------------------------------
// Tag config
// ---------------------------------------------------------------------------

export const TAGS = {
    expedite: {
        label: "Expedite",
        border: "border-l-orange-400",
        bg: "bg-orange-400/10",
        dot: "bg-orange-400",
        toolbar: "bg-orange-400/20 text-orange-400 hover:bg-orange-400/30",
    },
    hold: {
        label: "Hold",
        border: "border-l-red-400",
        bg: "bg-red-400/10",
        dot: "bg-red-400",
        toolbar: "bg-red-400/20 text-red-400 hover:bg-red-400/30",
    },
    flag: {
        label: "Flag",
        border: "border-l-yellow-400",
        bg: "bg-yellow-400/10",
        dot: "bg-yellow-400",
        toolbar: "bg-yellow-400/20 text-yellow-400 hover:bg-yellow-400/30",
    },
};

export function TagDot({ tag }) {
    if (!tag || !TAGS[tag]) return null;
    return (
        <span
            className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${TAGS[tag].dot}`}
            title={TAGS[tag].label}
        />
    );
}
