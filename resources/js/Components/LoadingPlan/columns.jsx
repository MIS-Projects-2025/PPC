import { LotIdCell } from "@/Components/LoadingPlan/LotIdCell";
import { StatusBadge } from "@/Components/LoadingPlan/StatusBadge.jsx";
import { SelectColumn } from "react-data-grid";
import { isBlockRow } from "../../Lib/LoadingPlan/helpers";
import { CellEditor } from "./CellEditor";
import { DoableCell } from "./DoableCell";
import { MachineHeaderCell } from "./MachineHeaderCell";
import { OvenHeaderCell } from "./OvenHeaderCell";
import { RowDropTargetCell } from "./RowDropTargetCell";

export const EDITABLE_COLUMNS = {
    accu_time: "integer",
    remarks: "string",
    time_start: "time",
};

// ---------------------------------------------------------------------
// Bake tab — column definitions (mirrors getActiveBake()'s select list)
// ---------------------------------------------------------------------
export const BAKE_COLUMNS = [
    { key: "lotid", editable: false, name: "Lot ID", width: 160 },       // b.lotid
    { key: "package", editable: false, name: "Package Name" },      // b.package
    { key: "partname", editable: false, name: "Part Name" },             // b.partname
    { key: "quantity", editable: false, name: "Qty" },                         // b.quantity
    { key: "date_time_in", editable: false, name: "Date/Time In", width: 150 },
    { key: "date_time_out", editable: false, name: "Date/Time Out", width: 150 },
    { key: "bake_time_temp", editable: false, name: "Bake Time Temp" },
    { key: "chamber", editable: false, name: "Chamber" },
    { key: "operator_in", editable: false, name: "Operator In" },
    { key: "operator_out", editable: false, name: "Operator Out" },
    { key: "cooldown_by", editable: false, name: "Cooldown By" },
    { key: "cooldown_end", editable: false, name: "Cooldown End" },
    { key: "temperature", editable: false, name: "Temperature" },
    { key: "added_by", editable: false, name: "Added By" },
    { key: "input_type", editable: false, name: "Input Type" },
    { key: "lot_status", editable: false, name: "Lot Status" },
    { key: "lot_type", editable: false, name: "Lot Type" },
    { key: "part_class", editable: false, name: "Part Class" },
    { key: "part_type", editable: false, name: "Part Type" },
    { key: "plant", editable: false, name: "Plant" },
    { key: "process_group", editable: false, name: "Process Group" },
    { key: "prod_area", editable: false, name: "Prod Area" },
    { key: "start_time", editable: false, name: "Start Time" },
    { key: "station", editable: false, name: "Station" },
    { key: "status", editable: false, name: "Bake Status" },             // b.bake_status
    { key: "approved_by", editable: false, name: "Approved By" },
    { key: "approved_status", editable: false, name: "Approved Status" },
    { key: "assy_site", editable: false, name: "Assy Site" },
    { key: "bake", editable: false, name: "Bake" },
    { key: "bake_count", editable: false, name: "Bake Count" },
    { key: "date_code", editable: false, name: "Date Code" },
    { key: "date_loaded", editable: false, name: "Date Loaded" },
    { key: "end_customer", editable: false, name: "End Customer" },
    { key: "factory", editable: false, name: "Factory" },
    { key: "focus_group", editable: false, name: "Focus Group" },
    { key: "hours", editable: false, name: "Hours" },
    { key: "id", editable: false, name: "id" },
    { key: "test_lot_id", editable: false, name: "Test Lot Id" },
    { key: "wip_id", editable: false, name: "WIP Id" },                   // wip.customer_data_id
];

export const DATA_COLUMNS = [
    { key: "id", editable: false, name: "id" },
    { key: "entry_id", editable: false, name: "Entry ID" },
    { key: "part_name", editable: false, name: "Part Name" },
    { key: "lead_count", editable: false, name: "Lead Count" },
    { key: "package_name", editable: false, name: "Package Name" },
    { key: "lot_id", editable: false, name: "Lot ID", width: 160 },
    { key: "status", editable: false, name: "Status" },
    { key: "station", editable: false, name: "Station" },
    { key: "qty", editable: false, name: "Qty" },
    { key: "doable", editable: false, name: "Doable" },
    { key: "capacity_uph", editable: false, name: "Capacity Uph" },
    { key: "accu_time", editable: true, name: "Accu Time" },
    { key: "time_start", editable: true, name: "Start", width: 130 },
    { key: "time_end", editable: false, name: "End", width: 130 },
    { key: "lot_type", editable: false, name: "Lot Type" },
    { key: "prod_area", editable: false, name: "Prod Area" }, // NEW — backend already returns this
    { key: "lot_status", editable: false, name: "Lot Status" },
    {
        key: "lot_entry_time_days",
        editable: false,
        name: "Lot Entry Time Days",
    },
    { key: "cr3", editable: false, name: "CR3" },
    { key: "be_osl_days", editable: false, name: "Be Osl Days" },
    { key: "ct", editable: false, name: "CT" },
    { key: "osl", editable: false, name: "OSL" },
    { key: "body_size", editable: false, name: "Body Size" },
    { key: "ramp_time", editable: false, name: "Ramp Time" },
    { key: "end_customer", editable: false, name: "End Customer" },
    { key: "bake", editable: false, name: "Bake" },
    { key: "bake_count", editable: false, name: "Bake Count" },
    { key: "test_lot_id", editable: false, name: "Test Lot Id" },
    { key: "backend_leadtime", editable: false, name: "Backend Leadtime" },
    { key: "date_loaded", editable: false, name: "Date Loaded" },
    { key: "be_starttime", editable: false, name: "Be Starttime" },
    { key: "start_time", editable: false, name: "Start Time" },
    { key: "part_type", editable: false, name: "Part Type" },
    { key: "auto_part", editable: false, name: "Auto Part" }, // NEW — needs backend fix (see below)
    { key: "part_class", editable: false, name: "Part Class" },
    { key: "date_code", editable: false, name: "Date Code" },
    { key: "focus_group", editable: false, name: "Focus Group" }, // NEW — backend already returns this
    { key: "process_group", editable: false, name: "Process Group" },
    { key: "bulk", editable: false, name: "Bulk" }, // NEW — needs backend fix (see below)
    { key: "required_time", editable: false, name: "Required Time" },
    { key: "lot_entry_time", editable: false, name: "Lot Entry Time" },
    { key: "stage", editable: false, name: "Stage" }, // NEW — backend already returns this
    { key: "stage_start_time", editable: false, name: "Stage Start Time" },
    { key: "ccd", editable: false, name: "CCD" }, // NEW — needs backend fix (see below)
    { key: "stage_run_days", editable: false, name: "Stage Run Days" }, // NEW — needs backend fix (see below)
    { key: "tray", editable: false, name: "Tray" }, // NEW — needs backend fix (see below)
    { key: "osl_days", editable: false, name: "OSL Days" }, // NEW — needs backend fix (see below)
    { key: "be_group", editable: false, name: "BE Group" }, // NEW — needs backend fix (see below)
    { key: "strategy_code", editable: false, name: "Strategy Code" }, // NEW — needs backend fix (see below)
    { key: "assy_site", editable: false, name: "Assy Site" },
    { key: "stock_position", editable: false, name: "Stock Position" }, // NEW — needs backend fix (see below)
    { key: "bake_time_temp", editable: false, name: "Bake Time Temp" },
    { key: "sequence_order", editable: false, name: "Seq" },
    { key: "doable_status", editable: false, name: "Doable Status" },
    { key: "remarks", editable: true, name: "Remarks" },
];

// dragHandle + all data columns; used for the header row's colSpan so it
// spans the whole grid width regardless of how many columns are defined.
export const NUM_COLUMNS = DATA_COLUMNS.length + 1;
// oven-header column + all bake columns, for the header row's colSpan
// (SelectColumn stays out of the span so checkboxes remain usable — same
// contract as NUM_COLUMNS/dragHandle above)
export const NUM_BAKE_COLUMNS = BAKE_COLUMNS.length + 1;

// Range 1: Part Name (index 2) to Qty (index 7)
const PARTNAME_TO_QTY_KEYS = new Set([
    "part_name",
    "lead_count",
    "package_name",
    "lot_id",
    "status",
    "qty",
]);

// Range 2: Part Name to Bake_Time_Temp (Bake Time/Temp equivalent in your dataset)
const PARTNAME_TO_BAKE_KEYS = new Set([
    "part_name", "lead_count", "package_name", "lot_id",
    "status", "qty", "doable", "capacity_uph", "accu_time",
    "time_start", "time_end", "lot_type", "lot_status",
    "lot_entry_time_days", "cr3", "be_osl_days", "ct",
    "osl", "body_size", "ramp_time"
]);

export function makeBakeColumns(highlightedMatch, onToggleCollapse) {
    return [
        SelectColumn,
        {
            key: "ovenHeader",
            name: "",
            width: 20,
            resizable: false,
            colSpan(args) {
                if (args.type === "ROW" && args.row.__type === "header") {
                    return NUM_BAKE_COLUMNS;
                }
                return undefined;
            },
            renderCell({ row }) {
                if (row.__type === "header") {
                    return (
                        <OvenHeaderCell
                            row={row}
                            rowCount={row.__rowCount}
                            onToggleCollapse={onToggleCollapse}
                        />
                    );
                }
                return null;
            },
        },
        ...BAKE_COLUMNS.map((col) => ({
            ...col,
            cellClass: (row) =>
                highlightedMatch?.rowId === row.id && highlightedMatch?.columnKey === col.key
                    ? "bg-warning/50 ring-2 ring-warning ring-inset"
                    : undefined,
            renderCell({ row }) {
                if (row.__type === "header") return null;
                if (col.key === "status") {
                    return <StatusBadge status={row.status} />;
                }
                return row[col.key];
            },
        })),
    ];
}

// NOTE: the original signature was
// makeColumns(hoveredRowId, isUpdating, onStatusClick, onToggleCollapse, highlightedMatch)
// — `hoveredRowId` was never referenced in the body (the drag-over row
// highlight is applied via `rowClass` in the parent, not per-column).
// Dropped here; update the call site accordingly.
export function makeColumns(isUpdating, onStatusClick, onToggleCollapse, highlightedMatch) {
    return [
        SelectColumn,
        {
            key: "dragHandle",
            name: "",
            width: 20,
            resizable: false,
            colSpan(args) {
                if (args.type === "ROW" && args.row.__type === "header") {
                    return NUM_COLUMNS;
                }
                return undefined;
            },
            renderCell({ row }) {
                if (row.__type === "header") {
                    return (
                        <MachineHeaderCell
                            row={row}
                            rowCount={row.__rowCount}
                            onToggleCollapse={onToggleCollapse}
                        />
                    );
                }
                return <RowDropTargetCell rowId={row.id} />;
            },
        },
        ...DATA_COLUMNS.map((col) => {
            const getDynamicCellClass = (row) => {
                if (row.__type === "header") return "";

                const classes = [];

                if (highlightedMatch?.rowId === row.id && highlightedMatch?.columnKey === col.key) {
                    classes.push("ring-5 ring-primary ring-inset");
                }

                // Rule 8 & 12: Color range from Part Name to Qty
                if (PARTNAME_TO_QTY_KEYS.has(col.key)) {
                    if (row.cycle_time_exceed) {
                        classes.push("bg-yellow-highlight");
                    }
                    if (row.cycle_time_exceed_residual || row.is_manual_expedite) {
                        classes.push("bg-amber-highlight");
                    }
                }

                // Rule 11: Color range from Part Name to Bake Time/Temp (Red Font)
                if (PARTNAME_TO_BAKE_KEYS.has(col.key) && row.is_for_bake) {
                    classes.push("text-red-highlight");
                }

                if (col.key === "cr3" && row.cr3 === "RES") {
                    classes.push("bg-red-res")
                }

                return classes.join(" ");
            };

            if (col.key === "status") {
                return {
                    ...col,
                    cellClass: (row) => getDynamicCellClass(row),
                    renderCell({ row }) {
                        if (row.__type === "header") return null;
                        return (
                            <button
                                type="button"
                                className="btn btn-ghost btn-xs px-1"
                                onClick={(e) => onStatusClick?.(e, row.entry_id)}
                                disabled={isUpdating}
                            >
                                <StatusBadge status={row.status} />
                            </button>
                        );
                    },
                };
            }

            if (col.key === "lot_id") {
                return {
                    ...col,
                    cellClass: (row) => getDynamicCellClass(row),
                    renderCell({ row }) {
                        console.log("HEHE ~ columns.jsx:264 ~ makeColumns ~ row:", row);
                        if (row.__type === "header") return null;
                        return (
                            <LotIdCell
                                lotId={row.lot_id}
                                splitInfo={row.split_info}
                                mergeInfo={row.merge_info}
                                isPlannedYesterday={row.is_leaked}
                            />
                        );
                    },
                };
            }

            if (col.key === "doable") {
                return {
                    ...col,
                    cellClass: (row) => getDynamicCellClass(row),
                    renderCell({ row }) {
                        if (row.__type === "header") return null;
                        return (
                            <DoableCell
                                value={row.doable}
                                status={row.doable_status}
                                recipeSource={row.doable_recipe_source}
                            />
                            // <LotIdCell
                            //     lotId={row.lot_id}
                            //     splitInfo={row.split_info}
                            //     mergeInfo={row.merge_info}
                            //     isPlannedYesterday={row.is_leaked}
                            // />
                        );
                    },
                };
            }

            return {
                ...col,
                frozen: col.frozen ?? false,
                width: col.width,
                cellClass: (row) => getDynamicCellClass(row),
                renderCell({ row }) {
                    if (row.__type === "header") return null;

                    if (isBlockRow(row)) {
                        if (col.key === "part_name") {
                            return (
                                <span className="font-semibold flex items-center gap-1.5 truncate">
                                    ▨ {row.block_label}
                                </span>
                            );
                        }
                        if (col.key === "lot_id") {
                            return (
                                <span className="font-semibold flex items-center gap-1.5 truncate">
                                    {row.block_label} ▨
                                </span>
                            );
                        }

                        if (["accu_time", "time_start", "time_end"].includes(col.key)) {
                            return row[col.key];
                        }

                        return null; // blank every other cell for a block row
                    }

                    return row[col.key];
                },
                ...(EDITABLE_COLUMNS[col.key] && {
                    renderEditCell: CellEditor,
                    editable: (row) =>
                        !isUpdating &&
                        row.__type !== "header" &&
                        !(isBlockRow(row) && col.key !== "accu_time"),
                }),
            };
        }),
    ];
}
