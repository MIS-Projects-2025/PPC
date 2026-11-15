/** "56G6L" -> "G6L056", "10VITROX" -> "VTRX010", "01HSI250" -> "HSI250001". No leading number: null. */
export function formatF3Machine(name) {
    const m = /^(\d+)(.+)$/.exec(String(name ?? "").trim());
    if (!m) return null;
    return `${m[2].replace(/VITROX/i, "VTRX")}${m[1].padStart(3, "0")}`;
}

export const isF3Row = (r) => r?.source === "f3";