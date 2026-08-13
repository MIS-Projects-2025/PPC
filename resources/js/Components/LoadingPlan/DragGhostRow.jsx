import { COLUMNS } from "@/Components/LoadingPlan/columns";
import { GripIcon } from "@/Components/LoadingPlan/GripIcon";
import { StatusBadge } from "@/Components/LoadingPlan/StatusBadge";
import { computeCT, computeOSL } from "@/Constants/loadingPlanSchedule";
import { fmt2dp } from "@/Lib/format";
import { formatExpectedPT } from "@/Lib/time";

// ---------------------------------------------------------------------------
// DragGhostRow
// ---------------------------------------------------------------------------
export function DragGhostRow({ row }) {
    return (
        <div
            className="rounded-lg border border-info/40 bg-base-100 shadow-xl opacity-95 overflow-hidden"
            style={{ minWidth: 500 }}
        >
            <table style={{ tableLayout: "fixed", width: "100%" }}>
                <colgroup>
                    {COLUMNS.map((col) => (
                        <col
                            key={col.id ?? col.accessorKey}
                            style={{ width: col.size ?? 100 }}
                        />
                    ))}
                </colgroup>
                <tbody>
                    <tr className="bg-info/10">
                        <td className="w-9 px-1 text-center">
                            <div className="flex items-center gap-1">
                                <input className="checkbox checkbox-info cursor-none" />
                                <button
                                    className="btn btn-ghost cursor-none pointer-events-none text-base-content/20 hover:text-base-content/50 active:cursor-grabbing p-1 rounded"
                                    tabIndex={-1}
                                    aria-label="Drag to reorder or transfer"
                                >
                                    <GripIcon />
                                </button>
                            </div>
                        </td>

                        {COLUMNS.filter(
                            (c) => (c.id ?? c.accessorKey) !== "drag",
                        ).map((col) => {
                            const key = col.accessorKey ?? col.id;
                            const value = row[key];
                            let display;

                            if (key === "status") {
                                display = (
                                    <StatusBadge
                                        status={value === null ? "NONE" : value}
                                    />
                                );
                            } else if (key === "item") {
                                display = (
                                    <span className="text-xs text-base-content/40">
                                        {value}
                                    </span>
                                );
                            } else if (key === "accuTime") {
                                const v = Number(value) || 0;
                                const h = Math.floor(v / 60);
                                const m = v % 60;
                                display = h > 0 ? `${h}h ${m}m` : `${m}m`;
                            } else if (key === "expectedPT") {
                                display = formatExpectedPT(row.accuTime);
                            } else if (key === "CT") {
                                display = fmt2dp(computeCT(row));
                            } else if (key === "OSL") {
                                const ct = computeCT(row);
                                display = fmt2dp(
                                    computeOSL(ct, row.Backend_Leadtime),
                                );
                            } else if (key === "focusGroupStage") {
                                const fg = row.Focus_Group ?? "";
                                const st = row.Stage ?? "";
                                display =
                                    fg && st
                                        ? `${fg} / ${st}`
                                        : fg || st || "—";
                            } else {
                                display = value ?? "—";
                            }

                            return (
                                <td
                                    key={key}
                                    style={{
                                        width: col.size ?? 100,
                                        maxWidth: col.size ?? 100,
                                    }}
                                    className="px-2.5 py-2 text-sm whitespace-nowrap overflow-hidden text-ellipsis text-base-content"
                                >
                                    {display}
                                </td>
                            );
                        })}
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
