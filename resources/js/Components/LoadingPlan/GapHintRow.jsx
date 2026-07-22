import { COL_WIDTHS } from "@/Components/LoadingPlan/columns.jsx";
import { formatExpectedPT } from "@/Lib/time.js";
import {
    arrow,
    autoUpdate,
    flip,
    FloatingArrow,
    FloatingPortal,
    offset,
    shift,
    size,
    useDismiss,
    useFloating,
    useHover,
    useInteractions,
    useRole,
} from "@floating-ui/react";
import React from "react";

const ARROW_SIZE = 8;

function GapHintRow({ segments, gapStart, gapEnd }) {
    const [open, setOpen] = React.useState(false);
    const arrowRef = React.useRef(null);

    const floating = useFloating({
        open,
        onOpenChange: setOpen,
        placement: "bottom",
        middleware: [
            offset(ARROW_SIZE + 4),
            flip(),
            shift({ padding: 8 }),
            size({
                padding: 8,
                apply({ availableHeight, elements }) {
                    elements.floating.style.maxHeight = `${Math.max(
                        availableHeight,
                        100,
                    )}px`;
                },
            }),
            arrow({ element: arrowRef, padding: 8 }),
        ],
        whileElementsMounted: autoUpdate,
    });

    const hover = useHover(floating.context, {
        delay: { open: 100, close: 100 },
    });
    const dismiss = useDismiss(floating.context);
    const role = useRole(floating.context, { role: "tooltip" });

    const { getReferenceProps, getFloatingProps } = useInteractions([
        hover,
        dismiss,
        role,
    ]);

    const totalMinutes = segments.reduce((s, seg) => s + seg.minutes, 0);
    const totalH = Math.floor(totalMinutes / 60);
    const totalM = totalMinutes % 60;
    const totalDur = totalH > 0 ? `${totalH}h ${totalM}m` : `${totalM}m`;

    return (
        <>
            <tr
                ref={floating.refs.setReference}
                {...getReferenceProps()}
                className={`border-b h-8 border-base-300 last:border-0 border-l-2 border-l-transparent cursor-default transition-colors ${
                    open ? "bg-base-200" : "bg-base-300/50"
                }`}
            >
                {/* sticky checkbox/grip column, matches block/lot rows */}
                <td className="bg-base-100 sticky px-2 -left-4" />

                <td
                    style={{
                        width: COL_WIDTHS.item,
                        maxWidth: COL_WIDTHS.item,
                    }}
                    className="px-2.5 text-xs text-base-content/30"
                />

                <td
                    colSpan={4}
                    style={{
                        width:
                            COL_WIDTHS.Part_Name +
                            COL_WIDTHS.Lead_Count +
                            COL_WIDTHS.Package_Name +
                            COL_WIDTHS.Lot_Id,
                    }}
                    className="px-2.5 text-[11px] italic text-base-content/40"
                >
                    <span className="sticky left-12">— elapsed —</span>
                </td>

                <td style={{ width: COL_WIDTHS.status }} />
                <td style={{ width: COL_WIDTHS.Remarks }} />
                <td style={{ width: COL_WIDTHS.Station }} />
                <td style={{ width: COL_WIDTHS.Qty }} />
                <td style={{ width: COL_WIDTHS.Doable }} />
                <td style={{ width: COL_WIDTHS.Capacity_UPH }} />

                <td
                    style={{
                        width: COL_WIDTHS.accuTime,
                        maxWidth: COL_WIDTHS.accuTime,
                    }}
                    className="px-2.5 text-sm text-base-content/50"
                >
                    {totalDur}
                </td>

                <td
                    style={{ width: COL_WIDTHS.timeStart }}
                    className="px-2.5 text-sm text-base-content/50"
                >
                    {gapStart
                        ? gapStart.timeStartDayOffset > 0
                            ? `${gapStart.time} +${gapStart.timeStartDayOffset}d`
                            : gapStart.time
                        : "—"}
                </td>
                <td
                    style={{ width: COL_WIDTHS.timeEnd }}
                    className="px-2.5 text-sm text-base-content/50"
                >
                    {gapEnd.timeEndDayOffset > 0
                        ? `${gapEnd.time} +${gapEnd.timeEndDayOffset}d`
                        : gapEnd.time}
                </td>

                <td style={{ width: COL_WIDTHS.expectedPT }} />
                <td style={{ width: COL_WIDTHS.Lot_Type }} />
                <td style={{ width: COL_WIDTHS.Lot_Status }} />
                <td style={{ width: COL_WIDTHS.focusGroupStage }} />
                <td style={{ width: COL_WIDTHS.Lot_Entry_Time_Days }} />
                <td style={{ width: COL_WIDTHS.CR3 }} />
                <td style={{ width: COL_WIDTHS.BE_OSL_Days }} />
                <td style={{ width: COL_WIDTHS.CT }} />
                <td style={{ width: COL_WIDTHS.OSL }} />
                <td style={{ width: COL_WIDTHS.Body_Size }} />
                <td style={{ width: COL_WIDTHS.Ramp_Time }} />
            </tr>

            {open && (
                <FloatingPortal>
                    <div
                        ref={floating.refs.setFloating}
                        style={floating.floatingStyles}
                        className="z-50 bg-base-100 border border-base-300 rounded-lg shadow-lg min-w-[180px] flex flex-col overflow-visible text-base-content"
                        {...getFloatingProps()}
                    >
                        <FloatingArrow
                            ref={arrowRef}
                            context={floating.context}
                            width={ARROW_SIZE * 10}
                            height={ARROW_SIZE}
                            fill="var(--color-base-300)"
                            stroke="var(--color-base-300)"
                        />
                        <div className="p-2.5 overflow-y-auto overflow-x-hidden rounded-lg min-h-0 not-italic">
                            <div className="flex flex-col gap-2">
                                {segments.map((seg, i) => (
                                    <div
                                        key={i}
                                        className="flex flex-col gap-1"
                                    >
                                        <div className="flex items-center justify-between gap-3 text-xs">
                                            <span
                                                className={`font-medium px-1.5 py-0.5 rounded-full ${
                                                    seg.kind === "block"
                                                        ? "bg-base-content/10 text-base-content/60"
                                                        : "bg-info/10 text-info"
                                                }`}
                                            >
                                                {seg.label}
                                            </span>
                                            <span className="text-base-content/60 font-mono">
                                                {formatExpectedPT(seg.minutes)}
                                            </span>
                                        </div>

                                        {seg.lots?.length > 0 && (
                                            <div className="pl-2 border-l border-base-300 flex flex-col gap-0.5">
                                                {seg.lots.map((lot, li) => (
                                                    <div
                                                        key={`${lot.Lot_Id}-${li}`}
                                                        className="flex items-center justify-between gap-3 text-[10px] text-base-content/50"
                                                    >
                                                        <span className="font-mono">
                                                            {lot.Lot_Id}
                                                        </span>
                                                        <span className="font-mono">
                                                            {lot.timeStart}
                                                            {lot.timeStartDayOffset >
                                                            0
                                                                ? ` +${lot.timeStartDayOffset}d`
                                                                : ""}
                                                            {" – "}
                                                            {lot.timeEnd}
                                                            {lot.timeEndDayOffset >
                                                            0
                                                                ? ` +${lot.timeEndDayOffset}d`
                                                                : ""}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </FloatingPortal>
            )}
        </>
    );
}

export default GapHintRow;
