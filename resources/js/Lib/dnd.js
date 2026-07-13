const UNASSIGNED_DROPPABLE_TOKEN = "__unassigned__";

/** machine value -> stable string id usable in dnd-kit droppable/over ids.
 *  null (Unassigned) needs an explicit token — string-coercing null gives
 *  the literal text "null", which would round-trip back as a string, not
 *  the actual null value, corrupting machine assignment on drop. */
export function machineToDroppableToken(machine) {
    return machine === null ? UNASSIGNED_DROPPABLE_TOKEN : machine;
}

/** Inverse of machineToDroppableToken(). */
export function droppableTokenToMachine(token) {
    return token === UNASSIGNED_DROPPABLE_TOKEN ? null : token;
}

export function mergeRefs(...refs) {
    return (node) => {
        refs.forEach((ref) => {
            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;
        });
    };
}
