// Full literal class names so Tailwind/daisyUI can see them.
const PALETTE = [
    "badge-info",
    "badge-secondary",
    "badge-accent",
    "badge-success",
    "badge-warning",
    "badge-primary",
    "badge-error",
];

const hash = (s) => {
    let h = 0;
    for (const c of String(s).toUpperCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return h;
};

/** Same badge name -> same colour everywhere (grid + settings). */
export const badgeClass = (name) => PALETTE[hash(name) % PALETTE.length];