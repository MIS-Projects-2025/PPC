import { COL_WIDTHS } from "@/Components/LoadingPlan/columns.jsx";
import { formatExpectedPT } from "@/Lib/time.js";
import { CSS } from "@dnd-kit/utilities";
import { flexRender } from "@tanstack/react-table";
import clsx from "clsx";
import {
    createContext,
    memo,
    useCallback,
    useContext,
    useEffect,
    useRef,
} from "react";
import { GripIcon } from "./GripIcon";
import { TableInteractionContext } from "./MachineSectionBody";
import { StatusBadge } from "./StatusBadge";
import { TAGS, TagDot } from "./Tag";
import interactiveCursorClasses from "./interactiveCursorClasses";
/**
 * Editable columns and their input types.
 * accuTime replaces the old "duration" as the editable queue-time field.
 * Capacity_UPH is intentionally NOT here either — it's fully derived from
 * (Qty, the lot's current machine's platform) via CAPACITY_BANDS, so it's
 * a display column now, recomputed live on every render (see its
 * columnHelper.display definition below).
 */
export const EDITABLE_COLUMNS = {
    accuTime: "integer",
    Remarks: "string",
    timeStart: "time",
};

const RED_RANGE = new Set([
    "Part_Name",
    "Lead_Count",
    "Package_Name",
    "Lot_Id",
    "Station",
    "status",
    "Qty",
    "Capacity_UPH",
    "Lot_Type",
    "Lot_Status",
    "focusGroupStage",
    "Lot_Entry_Time_Days",
    "CR3",
    "BE_OSL_Days",
    "CT",
    "OSL",
    "Body_Size",
    "Ramp_Time",
    "Bake_Time_Temp", // Partname → Bake_Time_Temp
]);

const YELLOW_FILL = new Set([
    "Part_Name",
    "Lead_Count",
    "Package_Name",
    "Lot_Id",
    "Station",
    "status",
    "Qty",
]);

const AMBER_RANGE_RESIDUAL = new Set([
    "Lot_Entry_Time_Days", // Partname → Lot_Entry_Time_Days only
]);

function RowCheckbox({ checked, indeterminate, onChange, title }) {
    const ref = useRef(null);
    useEffect(() => {
        if (ref.current) ref.current.indeterminate = Boolean(indeterminate);
    }, [indeterminate]);
    return (
        <input
            ref={ref}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            title={title ?? "Select row"}
            className="checkbox checkbox-info cursor-pointer"
            onClick={(e) => e.stopPropagation()}
        />
    );
}

export const TableActionsContext = createContext(null);

const noop = () => {};

const RowContent = memo(
    function RowContent({
        row,
        orderedDndIds,
        setNodeRef,
        virtualIndex,
        transform,
        transition,
        isDragging,
        dragHandleProps,
        itemNumber,
        isSortable,
    }) {
        const {
            handleStatusClick = noop,
            handleCellClick = noop,
            selectedIds,
            handleRowSelect = noop,
            isUpdating,
        } = useContext(TableActionsContext);

        const { disableSelection, disableGripButton } = useContext(
            TableInteractionContext,
        );

        const isSelected = selectedIds?.has(row.original._dndId) ?? false;
        const tag = row.original.tag ?? null;
        const tagCfg = tag ? TAGS[tag] : null;

        const handleItemClick = useCallback(
            (e) => {
                e.stopPropagation();
                handleRowSelect(
                    row.original._dndId,
                    e.shiftKey,
                    e.ctrlKey || e.metaKey,
                    orderedDndIds,
                );
            },
            [row.original._dndId, handleRowSelect, orderedDndIds],
        );

        const handleCheckboxChange = useCallback(
            (e) => {
                handleRowSelect(
                    row.original._dndId,
                    e.nativeEvent.shiftKey,
                    e.nativeEvent.ctrlKey || e.nativeEvent.metaKey,
                    orderedDndIds,
                );
            },
            [row.original._dndId, handleRowSelect, orderedDndIds],
        );

        // ── Block row ────────────────────────────────────────────────────────
        if (row.original?.isBlock === true) {
            const r = row.original;
            return (
                <tr
                    ref={setNodeRef}
                    data-index={virtualIndex}
                    style={{
                        transform: CSS.Transform.toString(transform),
                        transition,
                        opacity: isDragging ? 0.3 : 1,
                        backgroundImage: isSelected
                            ? undefined
                            : "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23a6a6a6' fill-opacity='0.20' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E\")",
                        backgroundColor: isSelected
                            ? undefined
                            : "oklch(var(--bc) / 0.06)",
                    }}
                    className={`border-b border-base-300 last:border-0 border-l-2 ${
                        isSelected
                            ? "bg-info/10 border-l-info"
                            : tagCfg
                              ? `${tagCfg.bg} ${tagCfg.border}`
                              : "border-l-transparent"
                    }`}
                >
                    <td className="bg-base-100 sticky px-2 -left-4 text-center">
                        <div className="flex items-center gap-1">
                            {!disableSelection && (
                                <RowCheckbox
                                    checked={isSelected}
                                    onChange={handleCheckboxChange}
                                    title="Select row (Shift+click for range, Ctrl+click to add)"
                                />
                            )}
                            {!disableGripButton && (
                                <button
                                    className={clsx(
                                        "bg-base-100 btn btn-ghost px-1 text-base-content rounded",
                                        interactiveCursorClasses(
                                            !isSortable || isUpdating,
                                            { cursor: "grab" },
                                        ),
                                    )}
                                    {...dragHandleProps}
                                    disabled={!isSortable || isUpdating}
                                    tabIndex={-1}
                                    aria-label="Drag to reorder"
                                >
                                    <GripIcon />
                                </button>
                            )}
                        </div>
                    </td>
                    <td
                        style={{
                            width: COL_WIDTHS.item,
                            maxWidth: COL_WIDTHS.item,
                        }}
                        className="px-2.5 text-xs text-base-content/40"
                    >
                        <div className="flex items-center gap-1">
                            <TagDot tag={tag} />
                            {itemNumber}
                        </div>
                    </td>
                    <td
                        colSpan={4}
                        style={{
                            width:
                                COL_WIDTHS.Part_Name +
                                COL_WIDTHS.Lead_Count +
                                COL_WIDTHS.Package_Name +
                                COL_WIDTHS.Lot_Id,
                        }}
                        className="px-2.5 text-sm font-medium text-base-content whitespace-nowrap overflow-hidden text-ellipsis"
                    >
                        - - - - - - {r.blockLabel || "Time block"} - - - - - -
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
                        className="px-2.5 text-sm cursor-text hover:bg-info/10 hover:ring-1 hover:ring-info/30"
                        onClick={(e) =>
                            handleCellClick(e, r._dndId, "accuTime")
                        }
                    >
                        {(() => {
                            const v = Number(r.accuTime) || 0;
                            const h = Math.floor(v / 60);
                            const m = v % 60;
                            return h > 0 ? `${h}h ${m}m` : `${m}m`;
                        })()}
                    </td>
                    <td
                        style={{ width: COL_WIDTHS.timeStart }}
                        className="px-2.5 text-sm text-base-content"
                    >
                        {r.timeStartDayOffset > 0
                            ? `${r.timeStart} +${r.timeStartDayOffset}d`
                            : r.timeStart}
                    </td>
                    <td
                        style={{ width: COL_WIDTHS.timeEnd }}
                        className="px-2.5 text-sm text-base-content"
                    >
                        {r.timeEndDayOffset > 0
                            ? `${r.timeEnd} +${r.timeEndDayOffset}d`
                            : r.timeEnd}
                    </td>
                    <td
                        style={{ width: COL_WIDTHS.expectedPT }}
                        className="px-2.5 text-sm text-base-content"
                    >
                        {formatExpectedPT(r.accuTime)}
                    </td>
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
            );
        }

        // ── Normal lot row ───────────────────────────────────────────────────
        return (
            <tr
                ref={setNodeRef}
                data-index={virtualIndex}
                style={{
                    transform: CSS.Transform.toString(transform),
                    transition,
                    opacity: isDragging ? 0.3 : 1,
                }}
                className={`border-b border-base-300 last:border-0 transition-colors ${
                    isSelected
                        ? "bg-info/10 border-l-info"
                        : tagCfg
                          ? `${tagCfg.bg} ${tagCfg.border} hover:brightness-95`
                          : !row.original.Lot_Id
                            ? "bg-warning/10 border-l-warning/60 hover:bg-base-200"
                            : "border-l-transparent hover:bg-base-200"
                }`}
            >
                <td className="bg-base-100 sticky px-2 -left-4 text-center">
                    <div className="flex items-center gap-1">
                        {!disableSelection && (
                            <RowCheckbox
                                checked={isSelected}
                                onChange={handleCheckboxChange}
                                title="Select row (Shift+click for range, Ctrl+click to add)"
                            />
                        )}

                        {!disableGripButton && (
                            <button
                                className={clsx(
                                    "bg-base-100 btn btn-ghost px-1 text-base-content rounded",
                                    interactiveCursorClasses(
                                        !isSortable || isUpdating,
                                        { cursor: "grab" },
                                    ),
                                )}
                                {...dragHandleProps}
                                tabIndex={-1}
                                disabled={!isSortable || isUpdating}
                                aria-label="Drag to reorder or transfer"
                            >
                                <GripIcon />
                            </button>
                        )}
                    </div>
                </td>
                {row.getVisibleCells().map((cell) => {
                    if (cell.column.id === "drag") return null;

                    const colId = cell.column.id;
                    const isEditable = Boolean(EDITABLE_COLUMNS[colId]);

                    const isBake =
                        row.original.isBakeHighlight && RED_RANGE.has(colId);
                    const isCycleExceedResidual =
                        row.original.cycleTimeExceedResidual &&
                        AMBER_RANGE_RESIDUAL.has(colId);

                    const isCycleExceed =
                        row.original.cycleTimeExceed && YELLOW_FILL.has(colId);

                    if (cell.column.id === "item") {
                        return (
                            <td
                                key={cell.id}
                                style={{
                                    width: cell.column.getSize(),
                                    maxWidth: cell.column.getSize(),
                                }}
                                className="px-2.5 text-sm cursor-pointer select-none hover:text-info"
                                onClick={handleItemClick}
                                title="Click to select · Shift+click to range-select · Ctrl+click to add/remove"
                            >
                                <div className="flex items-center gap-1">
                                    <TagDot tag={tag} />
                                    <span
                                        className={`text-xs font-mono ${isSelected ? "text-info font-medium" : "text-base-content/40"}`}
                                    >
                                        {itemNumber}
                                    </span>
                                </div>
                            </td>
                        );
                    }

                    if (cell.column.id === "status") {
                        return (
                            <td
                                key={cell.id}
                                style={{
                                    width: cell.column.getSize(),
                                    maxWidth: cell.column.getSize(),
                                }}
                                // className="px-2.5 text-sm"
                                className={`px-2.5 text-sm ${
                                    isCycleExceed
                                        ? "bg-yellow-300 text-black"
                                        : ""
                                }`}
                            >
                                <button
                                    className="btn btn-ghost w-full px-0 justify-start items-center"
                                    onClick={(e) =>
                                        handleStatusClick(
                                            e,
                                            row.original._dndId,
                                        )
                                    }
                                >
                                    <StatusBadge
                                        status={
                                            row.original.status === null
                                                ? "NONE"
                                                : row.original.status
                                        }
                                    />
                                </button>
                            </td>
                        );
                    }

                    return (
                        <td
                            key={cell.id}
                            style={{
                                width: cell.column.getSize(),
                                maxWidth: cell.column.getSize(),
                            }}
                            className={`px-2.5 text-sm whitespace-nowrap overflow-hidden text-ellipsis ${
                                isEditable
                                    ? "cursor-text hover:bg-info/10 hover:ring-1 hover:ring-info/30"
                                    : ""
                            } ${colId === "Doable" ? "text-error" : ""} ${
                                isBake
                                    ? "text-error font-bold"
                                    : "text-base-content"
                            } ${isCycleExceedResidual ? "bg-amber-500 text-black" : ""} ${
                                isCycleExceed ? "bg-yellow-300 text-black" : ""
                            }`}
                            // className={`px-2.5 text-sm whitespace-nowrap overflow-hidden text-ellipsis text-base-content ${
                            //     isEditable
                            //         ? "cursor-text hover:bg-info/10 hover:ring-1 hover:ring-info/30"
                            //         : ""
                            // } ${colId === "Doable" ? "text-error" : ""}`}
                            // TODO: make a sign of the cell editable
                            title={
                                colId !== "Remarks" &&
                                (typeof cell.getValue() === "string" ||
                                    typeof cell.getValue() === "number")
                                    ? String(cell.getValue())
                                    : undefined
                            }
                            onClick={
                                isEditable
                                    ? (e) =>
                                          handleCellClick(
                                              e,
                                              row.original._dndId,
                                              colId,
                                          )
                                    : undefined
                            }
                        >
                            {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                            )}
                        </td>
                    );
                })}
            </tr>
        );
    },
    (prev, next) => {
        const po = prev.row.original;
        const no = next.row.original;
        return (
            po === no &&
            prev.orderedDndIds === next.orderedDndIds &&
            prev.isDragging === next.isDragging &&
            prev.virtualIndex === next.virtualIndex &&
            prev.transform?.x === next.transform?.x &&
            prev.transform?.y === next.transform?.y &&
            prev.transition === next.transition &&
            prev.isSortable === next.isSortable
        );
    },
);

export default RowContent;
