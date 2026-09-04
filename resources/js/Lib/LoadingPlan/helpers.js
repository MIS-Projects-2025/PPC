export const isBlockRow = (row) => row?.is_block === true;
export const isForBake = (row) => row?.is_for_bake === true;

export function coerceValue(value, type) {
    switch (type) {
        case "integer": {
            const n = parseInt(value, 10);
            return Number.isNaN(n) ? 0 : n;
        }
        case "decimal": {
            const n = parseFloat(value);
            return Number.isNaN(n) ? 0 : n;
        }
        default:
            return value;
    }
}

export function getInputType(type) {
    switch (type) {
        case "integer":
        case "decimal":
            return "number";
        case "time":
            return "time";
        case "date":
            return "date";
        default:
            return "text";
    }
}

// "machine-null" / "machine-MANUAL" / "machine-<name>" -> null / "MANUAL" / "<name>".
// Needed because dnd-kit ids are strings, so `machine-${row.machine}` coerces
// null to the literal text "null" on the way in.
export function droppableMachineFromToken(overId) {
    const raw = overId.replace("machine-", "");
    if (raw === "null" || raw === "undefined") return null;
    return raw;
}
