export function fmt2dp(val) {
    if (val === null || val === undefined || !isFinite(val)) return "—";
    return val.toFixed(2);
}
