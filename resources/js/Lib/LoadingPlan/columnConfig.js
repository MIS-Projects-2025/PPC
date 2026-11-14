// Pure column data: no JSX, no imports from components.

export const EDITABLE_COLUMNS = {
    accu_time: "integer",
    remarks: "string",
    time_start: "time",
};

export const fmtHours = (m) => (m == null || m === "" ? "" : (Number(m) / 60).toFixed(2));

/** [key, header, width?] -> react-data-grid column */
const defineColumns = (defs, editable = {}) =>
    defs.map(([key, name, width]) => ({
        key,
        name,
        editable: key in editable,
        ...(width && { width }),
    }));

export const PACKAGE_TYPE_KEY = "package_type";

export const BAKE_COLUMNS = defineColumns([
    ["lotid", "Lot ID", 160],
    ["package", "Package Name"],
    ["partname", "Part Name"],
    ["quantity", "Qty"],
    ["date_time_in", "Date/Time In", 150],
    ["date_time_out", "Date/Time Out", 150],
    ["bake_time_temp", "Bake Time Temp"],
    ["chamber", "Chamber"],
    ["operator_in", "Operator In"],
    ["operator_out", "Operator Out"],
    ["cooldown_by", "Cooldown By"],
    ["cooldown_end", "Cooldown End"],
    ["temperature", "Temperature"],
    ["added_by", "Added By"],
    ["input_type", "Input Type"],
    ["lot_status", "Lot Status"],
    ["lot_type", "Lot Type"],
    ["part_class", "Part Class"],
    ["part_type", "Part Type"],
    ["plant", "Plant"],
    ["process_group", "Process Group"],
    ["prod_area", "Prod Area"],
    ["start_time", "Start Time"],
    ["station", "Station"],
    ["status", "Bake Status"],
    ["approved_by", "Approved By"],
    ["approved_status", "Approved Status"],
    ["assy_site", "Assy Site"],
    ["bake", "Bake"],
    ["bake_count", "Bake Count"],
    ["date_code", "Date Code"],
    ["date_loaded", "Date Loaded"],
    ["end_customer", "End Customer"],
    ["factory", "Factory"],
    ["focus_group", "Focus Group"],
    ["hours", "Hours"],
    ["id", "id"],
    ["test_lot_id", "Test Lot Id"],
    ["wip_id", "WIP Id"],
]);

export const DATA_COLUMNS = defineColumns(
    [
        ["machine", "Machine", 110],
        ["part_name", "Part Name"],
        ["lead_count", "Lead Count"],
        [PACKAGE_TYPE_KEY, "Package"],
        ["package_name", "Package Name"],
        ["lot_id", "Lot ID", 160],
        ["status", "Status"],
        ["station", "Station"],
        ["qty", "Qty"],
        ["doable", "Doable"],
        ["capacity_uph", "Capacity Uph"],
        ["accu_time", "Accu Time"],
        ["time_start", "Start", 130],
        ["time_end", "End", 130],
        ["lot_type", "Lot Type"],
        ["prod_area", "Prod Area"],
        ["lot_status", "Lot Status"],
        ["lot_entry_time_days", "Lot Entry Time Days"],
        ["cr3", "CR3"],
        ["be_osl_days", "Be Osl Days"],
        ["ct", "CT"],
        ["osl", "OSL"],
        ["body_size", "Body Size"],
        ["ramp_time", "Ramp Time"],
        ["end_customer", "End Customer"],
        ["bake", "Bake"],
        ["bake_count", "Bake Count"],
        ["test_lot_id", "Test Lot Id"],
        ["backend_leadtime", "Backend Leadtime"],
        ["date_loaded", "Date Loaded"],
        ["be_starttime", "Be Starttime"],
        ["start_time", "Start Time"],
        ["part_type", "Part Type"],
        ["auto_part", "Auto Part"],
        ["part_class", "Part Class"],
        ["date_code", "Date Code"],
        ["focus_group", "Focus Group"],
        ["process_group", "Process Group"],
        ["bulk", "Bulk"],
        ["required_time", "Required Time"],
        ["lot_entry_time", "Lot Entry Time"],
        ["stage", "Stage"],
        ["stage_start_time", "Stage Start Time"],
        ["ccd", "CCD"],
        ["stage_run_days", "Stage Run Days"],
        ["tray", "Tray"],
        ["osl_days", "OSL Days"],
        ["be_group", "BE Group"],
        ["strategy_code", "Strategy Code"],
        ["assy_site", "Assy Site"],
        ["stock_position", "Stock Position"],
        ["bake_time_temp", "Bake Time Temp"],
        ["remarks", "Remarks"],
    ],
    EDITABLE_COLUMNS,
);

export const DATA_COLUMN_KEYS = new Set(DATA_COLUMNS.map((c) => c.key));

// header rows span: drag-handle / oven-header column + every data column
export const NUM_COLUMNS = DATA_COLUMNS.length + 1;
export const NUM_BAKE_COLUMNS = BAKE_COLUMNS.length + 1;

/** Highlight range: Part Name .. Status (cycle-time / expedite colouring). */
export const PARTNAME_TO_QTY_KEYS = new Set([
    "part_name", "lead_count", "package_name", "lot_id", "status", "qty", "package_type"
]);

/** Red-font range for rows that are going for bake: Part Name .. Ramp Time. */
export const PARTNAME_TO_BAKE_KEYS = new Set([
    "part_name", "lead_count", "package_name", "lot_id",
    "status", "qty", "doable", "capacity_uph", "accu_time",
    "time_start", "time_end", "lot_type", "lot_status",
    "lot_entry_time_days", "cr3", "be_osl_days", "ct",
    "osl", "body_size", "ramp_time", "package_type"
]);