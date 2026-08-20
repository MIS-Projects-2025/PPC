import { hasTimeline } from "@/Constants/machines.js";
import { formatTime, parseDatetime, parseTime } from "@/Lib/time.js";
import dayjs from "dayjs"; // or whatever date lib is already available

const GAP_LABEL = "Gap";

export function applyTimeStartEdit(
    rows,
    dndId,
    machine,
    newTimeStartStr, // still bare "HH:mm" from the edit control
    baseTimes,
    referenceDate, // the viewed scheduled_date — only used as the base for offset math
) {
    const machineRows = rows.filter((r) => r.machine === machine);
    const idx = machineRows.findIndex((r) => r._dndId === dndId);
    const idxOfAbove = idx - 1;

    const editedRow = machineRows[idx];
    const rowAbove = idxOfAbove >= 0 ? machineRows[idxOfAbove] : null;

    console.log(
        "LOG ~ loadingPlanSchedule.js:22 ~ applyTimeStartEdit ~ rowAbove:",
        rowAbove,
    );

    const referencePoint = rowAbove
        ? dayjs(referenceDate)
              .add(rowAbove.time_end_day_offset ?? 0, "day")
              .hour(Number(rowAbove.time_end.split(":")[0]))
              .minute(Number(rowAbove.time_end.split(":")[1]))
        : dayjs(baseTimes[machine]);

    // Anchor the user's typed "HH:mm" to the SAME calendar day the edited
    // row's own time_start currently falls on — not the page's viewed date.
    // This is what makes editing a leaked (yesterday) row interpret "22:00"
    // as yesterday's 22:00, not today's.
    const editedRowDayOffset = editedRow.time_start_day_offset ?? 0;
    const [h, m] = newTimeStartStr.split(":").map(Number);
    const newStart = dayjs(referenceDate)
        .add(editedRowDayOffset, "day")
        .hour(h)
        .minute(m);

    const isGapAbove =
        rowAbove?.is_block && rowAbove?.block_label === GAP_LABEL;

    let next = rows.slice();

    if (newStart.isSame(referencePoint)) {
        if (isGapAbove) {
            next = next.filter((r) => r._dndId !== rowAbove._dndId);
        }
        return { rows: next, error: null };
    }

    if (newStart.isBefore(referencePoint)) {
        return {
            rows: null,
            error: "Time can't be earlier than the previous lot's end time.",
        };
    }

    const gapDuration = newStart.diff(referencePoint, "minute");

    if (isGapAbove) {
        next = next.map((r) =>
            r._dndId === rowAbove._dndId
                ? { ...r, accu_time: r.accu_time + gapDuration }
                : r,
        );
    } else {
        const newBlock = {
            _dndId: `entry-${crypto.randomUUID()}`,
            is_block: true,
            entry_type: "block",
            block_label: GAP_LABEL,
            machine,
            accu_time: gapDuration,
            entry_id: null,
            lock_version: null,
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
export function recomputeMachine(rows, machine, baseTimes, referenceDate) {
    console.log("referenceDate:", referenceDate, typeof referenceDate);
    console.log("dayjs(referenceDate):", dayjs(referenceDate).format());

    const machineRows = rows.filter((r) => r.machine === machine);

    const baseDateTime = baseTimes[machine]
        ? dayjs(baseTimes[machine], "YYYY-MM-DD HH:mm:ss")
        : dayjs(`${referenceDate} 06:00:00`, "YYYY-MM-DD HH:mm:ss");

    console.log(
        "LOG ~ loadingPlanSchedule.js:105 ~ recomputeMachine ~ baseDateTime:",
        baseDateTime,
    );

    machineRows.reduce((cursor, row) => {
        const dur = Number(row.accu_time) || 0;

        const start = cursor;
        console.log("start.diff:", start.diff(dayjs(referenceDate), "day"));
        const end = cursor.add(dur, "minute");

        row.time_start = start.format("HH:mm");
        row.time_start_day_offset = start
            .startOf("day")
            .diff(dayjs(referenceDate).startOf("day"), "day");
        row.time_end = end.format("HH:mm");
        row.time_end_day_offset = end
            .startOf("day")
            .diff(dayjs(referenceDate).startOf("day"), "day");

        return end;
    }, baseDateTime);

    console.log(
        "LOG ~ loadingPlanSchedule.js:124 ~ recomputeMachine ~ machineRows:",
        machineRows,
    );
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
    while (beforeIdx >= 0 && !machineRows[beforeIdx].entry_id) beforeIdx--;
    let afterIdx = idx + 1;
    while (afterIdx < machineRows.length && !machineRows[afterIdx].entry_id)
        afterIdx++;

    return {
        beforeEntryId: machineRows[beforeIdx]?.entry_id ?? null,
        afterEntryId: machineRows[afterIdx]?.entry_id ?? null,
    };
}
