export function parseDatetime(str) {
    if (!str) return null;
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
}

export function formatTime(totalMinutes) {
    if (!isFinite(totalMinutes) || totalMinutes < 0)
        return { time: "—", dayOffset: 0 };
    const dayOffset = Math.floor(totalMinutes / 1440);
    const m = ((totalMinutes % 1440) + 1440) % 1440; // safe mod for negatives too
    const hh = String(Math.floor(m / 60)).padStart(2, "0");
    const mm = String(m % 60).padStart(2, "0");
    return { time: `${hh}:${mm}`, dayOffset };
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
