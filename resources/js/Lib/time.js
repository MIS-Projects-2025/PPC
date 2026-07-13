export function parseDatetime(str) {
    if (!str) return null;
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
}

export function formatTime(totalMinutes) {
    if (!isFinite(totalMinutes) || totalMinutes < 0) return "—";
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = Math.round(totalMinutes % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function parseTime(hhmm) {
    const [h, m] = (hhmm ?? "06:00").split(":").map(Number);
    return h * 60 + m;
}

/** accuTime (minutes) → "Xh Ymin" */
export function formatExpectedPT(accuTime) {
    const mins = Number(accuTime) || 0;
    if (mins <= 0) return "—";
    const totalHours = mins / 60;
    const h = Math.floor(totalHours);
    const m = Math.round((totalHours - h) * 60);
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
}
