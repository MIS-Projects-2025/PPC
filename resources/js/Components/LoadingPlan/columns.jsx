import { fmt2dp } from "@/Lib/format.js";
import { formatExpectedPT } from "@/Lib/time.js";
import { createColumnHelper } from "@tanstack/react-table";
import { DoableCell } from "./DoableCell";
import { LotIdCell } from "./LotIdCell";
import RemarksCell from "./RemarksCell";
import { StatusBadge } from "./StatusBadge";

const columnHelper = createColumnHelper();

export const COLUMNS = [
    // ── Drag handle (display only) ──────────────────────────────────────────
    columnHelper.display({
        id: "drag",
        size: 50,
        enableSorting: false,
        header: () => null,
        cell: () => null,
    }),

    // ── # (item / queue position) ───────────────────────────────────────────
    columnHelper.display({
        id: "item",
        header: "#",
        size: 50,
    }),

    // ── Read-only data columns ──────────────────────────────────────────────
    columnHelper.accessor("part_name", {
        header: "Part Name",
        size: 200,
        cell: (info) => (
            <span className="font-mono text-xs">{info.getValue() ?? "—"}</span>
        ),
    }),

    columnHelper.accessor("lead_count", {
        header: "Leads",
        size: 55,
        cell: (info) => info.getValue() ?? "—",
    }),

    columnHelper.accessor("package_name", {
        header: "Package",
        size: 150,
        // Rendering for normal rows is special-cased in RowContent (clickable,
        // opens the package dropdown) — this default cell is only used as a
        // fallback (e.g. DragGhostRow reads Package_Name directly, not via
        // this columnDef).
        cell: (info) => info.getValue() ?? "—",
    }),

    columnHelper.accessor("lot_id", {
        header: "Lot ID",
        size: 220,
        cell: (info) => (
            <LotIdCell
                lotId={info.getValue()}
                splitInfo={info.row.original.split_info}
                mergeInfo={info.row.original.merge_info}
                isPlannedYesterday={info.row.original.is_leaked}
            />
        ),
    }),

    columnHelper.accessor("status", {
        header: "Status",
        size: 110,
        cell: (info) => (
            <StatusBadge
                status={info.getValue() === null ? "NONE" : info.getValue()}
            />
        ),
    }),

    // ── Editable free-text ──────────────────────────────────────────────────
    columnHelper.accessor("remarks", {
        header: "Remarks",
        size: 160,
        cell: (info) => <RemarksCell value={info.getValue()} />,
    }),

    columnHelper.accessor("station", {
        header: "Station",
        size: 120,
    }),

    columnHelper.accessor("qty", {
        header: "Qty",
        size: 80,
        cell: (info) => info.getValue()?.toLocaleString() ?? "—",
    }),

    // ── Editable columns ────────────────────────────────────────────────────
    columnHelper.accessor("doable", {
        header: "Doable",
        size: 80,
        cell: (info) => (
            <DoableCell
                value={info.getValue()}
                status={info.row.original.doable_status}
                recipeSource={info.row.original.doable_recipe_source}
            />
        ),
    }),

    // ── Derived: capacity_uph (from Qty + current machine's platform) ──────
    columnHelper.accessor("capacity_uph", {
        header: "Capacity UPH",
        size: 140,
        enableSorting: false,
        cell: (info) => info.getValue()?.toLocaleString() ?? "—",
    }),

    columnHelper.accessor("accu_time", {
        header: "Accu. Time",
        size: 85,
        cell: (info) => {
            const v = info.getValue();
            if (!v && v !== 0) return "—";
            const h = Math.floor(v / 60);
            const m = v % 60;
            return h > 0 ? `${h}h ${m}m` : `${m}m`;
        },
    }),

    // ── Derived time columns ────────────────────────────────────────────────
    columnHelper.accessor("time_start", {
        header: "Time Start",
        size: 120,
        enableSorting: false,
        cell: (info) => {
            const row = info.row.original;
            const offset = row.time_start_day_offset;
            if (!offset) return info.getValue();
            return `${info.getValue()} ${offset > 0 ? "+" : ""}${offset}d`;
        },
    }),

    columnHelper.accessor("time_end", {
        header: "Time End",
        size: 120,
        enableSorting: false,
        cell: (info) => {
            const row = info.row.original;
            const offset = row.time_end_day_offset;
            if (!offset) return info.getValue();
            return `${info.getValue()} ${offset > 0 ? "+" : ""}${offset}d`;
        },
    }),

    columnHelper.display({
        id: "expectedPT",
        header: "Expected PT",
        size: 120,
        enableSorting: false,
        cell: (info) => formatExpectedPT(info.row.original.accu_time),
    }),

    // ── More read-only data columns ─────────────────────────────────────────
    columnHelper.accessor("lot_type", {
        header: "Lot Type",
        size: 95,
    }),

    columnHelper.accessor("lot_status", {
        header: "Lot Status",
        size: 90,
    }),

    columnHelper.display({
        id: "focusGroupStage",
        header: "Focus Group / Stage",
        size: 140,
        cell: (info) => {
            const r = info.row.original;
            const fg = r.focus_group ?? "";
            const st = r.stage ?? "";
            if (!fg && !st) return "—";
            if (!st) return fg;
            if (!fg) return st;
            return `${fg} / ${st}`;
        },
    }),

    columnHelper.accessor("lot_entry_time_days", {
        header: "Entry Days",
        size: 95,
        cell: (info) => fmt2dp(info.getValue()),
    }),

    columnHelper.accessor("cr3", {
        header: "CR3",
        size: 65,
        cell: (info) => info.getValue() ?? "—",
    }),

    columnHelper.accessor("be_osl_days", {
        header: "BE OSL Days",
        size: 125,
        cell: (info) => fmt2dp(info.getValue()),
    }),

    columnHelper.display({
        id: "ct",
        header: "CT",
        size: 100,
        enableSorting: false,
        cell: (info) => info.row.original.CT?.toLocaleString() ?? "—",
    }),

    columnHelper.display({
        id: "osl",
        header: "OSL",
        size: 100,
        enableSorting: false,
        cell: (info) => info.row.original.OSL?.toLocaleString() ?? "—",
    }),

    // ── More read-only data columns ─────────────────────────────────────────
    columnHelper.accessor("body_size", {
        header: "Body Size",
        size: 145,
        cell: (info) => info.getValue() ?? "—",
    }),

    columnHelper.accessor("ramp_time", {
        header: "Ramp Time",
        size: 80,
        cell: (info) => info.getValue() ?? "—",
    }),
];

export const TOTAL_MIN_WIDTH = COLUMNS.reduce((s, c) => s + (c.size ?? 100), 0);

export const COL_WIDTHS = Object.fromEntries(
    COLUMNS.map((c) => [c.accessorKey ?? c.id, c.size ?? 100]),
);
