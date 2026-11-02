import { LotIdCell } from "@/Components/LoadingPlan/LotIdCell";
import { StatusBadge } from "@/Components/LoadingPlan/StatusBadge.jsx";
import {
    BAKE_COLUMNS,
    DATA_COLUMNS,
    EDITABLE_COLUMNS,
    NUM_BAKE_COLUMNS,
    NUM_COLUMNS,
    PARTNAME_TO_BAKE_KEYS,
    PARTNAME_TO_QTY_KEYS,
    fmtHours,
} from "@/Lib/LoadingPlan/columnConfig";
import { isBlockRow } from "@/Lib/LoadingPlan/helpers";
import { useContext } from "react";
import { SelectColumn } from "react-data-grid";
import { BucketHeaderCell } from "./BucketHeaderBar";
import { AccuTimeEditor, CellEditor, TimeStartEditor } from "./CellEditor";
import { DoableCell } from "./DoableCell";
import { MachineHeaderCell } from "./MachineHeaderCell";
import { OvenHeaderCell } from "./OvenHeaderCell";
import { PartNameCell } from "./PartNameCell";
import { RowDropTargetCell } from "./RowDropTargetCell";
import { TableActionsContext } from "./TableActionsContext";
import TimeCell from "./TimeCell";
import { WithBakeIndicator } from "./BakingBadge";
// Re-exports so existing `import { ... } from ".../columns"` keep working.
export { AccuTimeEditor, TimeStartEditor } from "./CellEditor";
export { TableActionsContext } from "./TableActionsContext";
export {
    BAKE_COLUMNS,
    DATA_COLUMNS,
    EDITABLE_COLUMNS,
    NUM_BAKE_COLUMNS,
    NUM_COLUMNS,
    PARTNAME_TO_BAKE_KEYS,
    PARTNAME_TO_QTY_KEYS,
    fmtHours,
} from "@/Lib/LoadingPlan/columnConfig";

const CUSTOM_EDITORS = { accu_time: AccuTimeEditor, time_start: TimeStartEditor };

/** Only the grid's built-in checkbox column is dropped in read-only mode (the drag-handle column also renders the machine headers). */
const READONLY_STRIP_KEYS = new Set(["select-row"]);

const compact = (c) => ({
    ...c,
    cellClass: (row) =>
        [typeof c.cellClass === "function" ? c.cellClass(row) : c.cellClass, "!p-0"].filter(Boolean).join(" "),
    headerCellClass: [c.headerCellClass, "!p-0"].filter(Boolean).join(" "),
});

export function toReadOnlyColumns(columns) {
    return columns
        .filter((col) => !READONLY_STRIP_KEYS.has(col.key))
        .map(({ renderEditCell, ...rest }) => ({ ...rest, editable: false }));
}

// ---------------------------------------------------------------------
// Row-kind helpers
// ---------------------------------------------------------------------
const isBlock = (row) => isBlockRow(row) || row.entry_type === "block";

function BlockLabel({ children }) {
    return <span className="font-semibold flex items-center gap-1.5 truncate">{children}</span>;
}

function StatusButton({ row, onStatusClick }) {
    const { isUpdating } = useContext(TableActionsContext);
    return (
        <button
            type="button"
            className="btn btn-ghost btn-xs px-1 btn-block flex-1"
            onClick={(e) => onStatusClick?.(e, row.id)}
            disabled={isUpdating}
        >
            <StatusBadge status={row.status} />
        </button>
    );
}

// ---------------------------------------------------------------------
// Bake tab
// ---------------------------------------------------------------------
export function makeBakeColumns(highlightedMatch, onToggleCollapse) {
    return [
        compact(SelectColumn),
        {
            key: "ovenHeader",
            name: "",
            width: 20,
            resizable: false,
            colSpan: (args) => (args.type === "ROW" && args.row.__type === "header" ? NUM_BAKE_COLUMNS : undefined),
            renderCell: ({ row }) =>
                row.__type === "header" ? (
                    <OvenHeaderCell row={row} rowCount={row.__rowCount} onToggleCollapse={onToggleCollapse} />
                ) : null,
        },
        ...BAKE_COLUMNS.map((col) => ({
            ...col,
            cellClass: (row) =>
                highlightedMatch?.rowId === row.id && highlightedMatch?.columnKey === col.key
                    ? "bg-warning/50 ring-2 ring-warning ring-inset"
                    : undefined,
            renderCell({ row }) {
                if (row.__type === "header") return null;
                return col.key === "status" ? <StatusBadge status={row.status} /> : row[col.key];
            },
        })),
    ];
}

// ---------------------------------------------------------------------
// Machine tab
// ---------------------------------------------------------------------
function renderCollapsedCell(key, row) {
    if (key === "package_name") {
        const isLoc = row.__kind === "location";
        const names = isLoc ? row.__locations : row.__packages;
        return (
            <span className="truncate" title={names.join(", ")}>
                {row.__count === 1 ? "1 entry" : `+ ${row.__count} entries`}
                {isLoc && ` · ${names.join("/")}`}
            </span>
        );
    }
    if (key === "time_start" || key === "time_end") return row[key];
    return null;
}

function renderBlockCell(row, key) {
    switch (key) {
        case "part_name":
        case "package_name":
            return <BlockLabel>▨ {row.block_label}</BlockLabel>;
        case "accu_time":
            return fmtHours(row.accu_time);
        case "time_start":
        case "time_end":
            return <TimeCell row={row} field={key} />;
        default:
            return null; // blank every other cell of a block row
    }
}

function renderDefaultCell(row, key) {
    if (isBlockRow(row)) return renderBlockCell(row, key);

    switch (key) {
        case "machine":
            return row.machine_label ?? row.machine ?? "Unassigned";
        case "time_start":
        case "time_end":
            return <TimeCell row={row} field={key} />;
        case "accu_time":
            return fmtHours(row.accu_time);
        case "part_name":
            return <PartNameCell partName={row.part_name} isBosch={row.is_bosch} />;
        default:
            return row[key];
    }
}

/** Columns with their own rendering (everything else uses renderDefaultCell). */
function createCellRenderers({ onStatusClick, selectedLocation, onEditDoable }) {
    return {
        status: (row) => {
            if (isBlock(row)) return <BlockLabel>▨ {row.block_label}</BlockLabel>;

            let content;
            if (row.machine === null && row.bucket_id != null) content = row.status; // grouped rows: plain text
            else if (!onStatusClick) content = <StatusBadge status={row.status} />;
            else content = <StatusButton row={row} onStatusClick={onStatusClick} />;

            return <WithBakeIndicator row={row}>{content}</WithBakeIndicator>;
        },

        lot_id: (row) => {
            if (isBlock(row)) return row.lot_id;
            return (
                <div className="flex items-center gap-1">
                    <LotIdCell
                        lotId={row.lot_id}
                        source={row.source}
                        isPickup={row.is_pickup}
                        splitInfo={row.split_info}
                        mergeInfo={row.merge_info}
                        isPlannedYesterday={row.is_leaked}
                        isRework={row.is_rework}
                        reworkSeq={row.rework_seq}
                        otherLocation={row.location && row.location !== selectedLocation ? row.location : null}
                    />
                </div>
            );
        },

        doable: (row) =>
            isBlock(row) ? null : (
                <DoableCell
                    value={row.doable}
                    status={row.doable_status}
                    recipeSource={row.doable_recipe_source}
                    overridden={row.doable_overridden}
                    onEdit={onEditDoable ? () => onEditDoable(row) : undefined}
                />
            ),
    };
}

function cellClassFor(key, highlightedMatch) {
    return (row) => {
        if (row.__type === "header") return "";
        if (row.__type === "collapsed") return "bg-base-200 italic text-base-content/60";

        const classes = [];

        if (highlightedMatch?.rowId === row.id && highlightedMatch?.columnKey === key) {
            classes.push("ring-5 ring-primary ring-inset");
        }

        // Part Name..Status: cycle-time / expedite colouring
        if (PARTNAME_TO_QTY_KEYS.has(key) && !row.is_scm) {
            if (row.cycle_time_exceed_residual) classes.push("bg-light-yellow-highlight");
            else if (row.cycle_time_exceed) classes.push("bg-yellow-highlight");

            if (row.is_manual_expedite) classes.push("bg-amber-highlight");
        }

        if (row.is_scm === true) classes.push("bg-red");

        // Part Name..Ramp Time: red font for lots going for bake
        if (PARTNAME_TO_BAKE_KEYS.has(key) && row.is_for_bake) classes.push("text-red-highlight");

        if (key === "cr3" && row.cr3 === "RES") classes.push("bg-red-res");

        return classes.join(" ");
    };
}

function canEditCell(row, key, isLocked) {
    if (isLocked()) return false;
    if (row.__type === "collapsed" || row.__type === "header") return false;
    if (row.machine === null && row.bucket_id != null) return false; // grouped rows
    if (row.machine === null && key !== "remarks") return false; // unassigned rows: remarks only
    if (isBlockRow(row) && key === "remarks") return false;
    return true;
}

function dragHandleColumn({ onToggleCollapse, readOnly }) {
    return {
        key: "dragHandle",
        name: "",
        width: 20,
        resizable: false,
        colSpan: (args) => (args.type === "ROW" && args.row.__type === "header" ? NUM_COLUMNS : undefined),
        renderCell({ row }) {
            if (row.__type === "header") {
                return row.__headerKind === "bucket" ? (
                    <BucketHeaderCell row={row} onToggleCollapse={onToggleCollapse} />
                ) : (
                    <MachineHeaderCell
                        row={row}
                        rowCount={row.__rowCount}
                        lotCount={row.__lotCount}
                        onToggleCollapse={onToggleCollapse}
                    />
                );
            }
            if (readOnly) return null; // no useDroppable per row
            return <RowDropTargetCell rowId={row.id} />;
        },
    };
}

export function makeColumns(
    isLocked,
    onStatusClick,
    onToggleCollapse,
    highlightedMatch,
    selectedLocation,
    onEditDoable,
    readOnly = false,
) {
    const renderers = createCellRenderers({ onStatusClick, selectedLocation, onEditDoable });

    return [
        compact(SelectColumn),
        dragHandleColumn({ onToggleCollapse, readOnly }),
        ...DATA_COLUMNS.map((col) => {
            const column = {
                ...col,
                cellClass: cellClassFor(col.key, highlightedMatch),
                renderCell({ row }) {
                    if (row.__type === "header") return null;
                    if (row.__type === "collapsed") return renderCollapsedCell(col.key, row);
                    return (renderers[col.key] ?? renderDefaultCell)(row, col.key);
                },
            };

            if (!EDITABLE_COLUMNS[col.key]) return column;

            return {
                ...column,
                renderEditCell: CUSTOM_EDITORS[col.key] ?? CellEditor,
                editable: (row) => canEditCell(row, col.key, isLocked),
            };
        }),
    ];
}