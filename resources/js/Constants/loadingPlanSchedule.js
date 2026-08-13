import { hasTimeline } from "@/Constants/machines.js";
import { formatTime, parseDatetime, parseTime } from "@/Lib/time.js";

const GAP_LABEL = "Gap";

export function applyTimeStartEdit(
    rows,
    dndId,
    machine,
    newTimeStartStr,
    baseTimes,
) {
    const machineRows = rows.filter((r) => r.machine === machine);
    const idx = machineRows.findIndex((r) => r._dndId === dndId);
    const idxOfAbove = idx - 1;

    const rowAbove = idxOfAbove >= 0 ? machineRows[idxOfAbove] : null;
    const referencePointStr = rowAbove ? rowAbove.timeEnd : baseTimes[machine];

    const referenceMinutes = parseTime(referencePointStr);
    const newStartMinutes = parseTime(newTimeStartStr);

    console.log("🚀 ~ applyTimeStartEdit ~ rowAbove:", rowAbove);
    const isGapAbove = rowAbove?.isBlock && rowAbove?.blockLabel === GAP_LABEL;

    let next = rows.slice();

    if (newStartMinutes === referenceMinutes) {
        if (isGapAbove) {
            next = next.filter((r) => r._dndId !== rowAbove._dndId);
        }
        return { rows: next, error: null };
    }

    if (newStartMinutes < referenceMinutes) {
        return {
            rows: null,
            error: "Time can't be earlier than the previous lot's end time.",
        };
    }

    const gapDuration = newStartMinutes - referenceMinutes;

    if (isGapAbove) {
        next = next.map((r) => {
            return r._dndId === rowAbove._dndId
                ? { ...r, accuTime: r.accuTime + gapDuration }
                : r;
        });
    } else {
        const newBlock = {
            _dndId: `entry-${crypto.randomUUID()}`, // TODO:
            isBlock: true,
            entryType: "block",
            blockLabel: GAP_LABEL,
            machine,
            accuTime: gapDuration,
            entryId: null,
            lockVersion: null,
        };

        const insertAt = next.findIndex((r) => r._dndId === dndId);
        next.splice(insertAt, 0, newBlock);
    }

    return { rows: next, error: null };
}

/**
 * Computes ONE continuous timeline for `machine`, in true row order,
 * regardless of Package_Name. A machine (or the MANUAL pseudo-machine,
 * which has its own independent timeline the same way) can only process
 * one lot at a time, so there is exactly one schedule per bucket —
 * package tabs are a pure view filter on top of this, never a separate
 * parallel schedule.
 *
 * Truly unassigned lots (`machine === null`) have NO timeline at all —
 * order there is purely cosmetic, so this clears timeStart/timeEnd
 * instead of computing anything.
 */
export function recomputeMachine(rows, machine, baseTimes) {
    const machineRows = rows.filter((r) => r.machine === machine);

    // if (!hasTimeline(machine)) {
    //     machineRows.forEach((row) => {
    //         row.timeStart = null;
    //         row.timeEnd = null;
    //         row.timeStartDayOffset = 0;
    //         row.timeEndDayOffset = 0;
    //     });
    //     return;
    // }

    const baseTime = baseTimes[machine] ?? "06:00";
    machineRows.reduce((prevEnd, row) => {
        const dur = Number(row.accuTime) || 0;

        const start = formatTime(prevEnd);
        const end = formatTime(prevEnd + dur);

        row.timeStart = start.time;
        row.timeStartDayOffset = start.dayOffset;
        row.timeEnd = end.time;
        row.timeEndDayOffset = end.dayOffset;

        return prevEnd + dur;
    }, parseTime(baseTime));
}

/** CT = Date_Loaded - BE_Starttime in days, 2 dp */
export function computeCT(row) {
    const loaded = parseDatetime(row.Date_Loaded);
    const beStart = parseDatetime(row.BE_Starttime);
    if (!loaded || !beStart) return null;
    const diffMs = loaded - beStart;
    return parseFloat((diffMs / (1000 * 60 * 60 * 24)).toFixed(2));
}

/** OSL = CT - Backend_Leadtime, 2 dp */
export function computeOSL(ct, backendLeadtime) {
    if (ct === null || backendLeadtime == null) return null;
    return parseFloat((ct - Number(backendLeadtime)).toFixed(2));
}

/** Given the full data array (post-move) and a row's _dndId, find the
 *  entryId of its immediate same-machine neighbors — what moveLot/moveBlock
 *  need to compute the new sequence_order server-side. Works for both lot
 *  and block rows, since sequence_order is a property of the row's
 *  position, not its type. */
export function findMachineNeighbors(rows, dndId, machine) {
    const machineRows = rows.filter((r) => r.machine === machine);

    const idx = machineRows.findIndex((r) => r._dndId === dndId);
    if (idx === -1) return { beforeEntryId: null, afterEntryId: null };

    // Skip neighbors that don't have a server-side id yet (a row just
    // added locally via handleAddRow/handleAddBlock and not yet
    // persisted) — walk outward to the nearest neighbor that does.
    let beforeIdx = idx - 1;
    while (beforeIdx >= 0 && !machineRows[beforeIdx].entryId) beforeIdx--;
    let afterIdx = idx + 1;
    while (afterIdx < machineRows.length && !machineRows[afterIdx].entryId)
        afterIdx++;

    return {
        beforeEntryId: machineRows[beforeIdx]?.entryId ?? null,
        afterEntryId: machineRows[afterIdx]?.entryId ?? null,
    };
}
