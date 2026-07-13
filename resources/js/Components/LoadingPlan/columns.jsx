import { computeCT, computeOSL } from "@/Constants/loadingPlanSchedule.js";
import { lookupCapacityUPH, platformOf } from "@/Constants/machines.js";
import { fmt2dp } from "@/Lib/format.js";
import { formatExpectedPT } from "@/Lib/time.js";
import { createColumnHelper } from "@tanstack/react-table";
import { StatusBadge } from "./StatusBadge";

const columnHelper = createColumnHelper();

export const COLUMNS = [
    // ── Drag handle (display only) ──────────────────────────────────────────
    columnHelper.display({
        id: "drag",
        size: 36,
        enableSorting: false,
        header: () => null,
        cell: () => null,
    }),

    // ── # (item / queue position) ───────────────────────────────────────────
    columnHelper.display({
        id: "item",
        header: "#",
        size: 40,
    }),

    // ── Read-only data columns ──────────────────────────────────────────────
    columnHelper.accessor("Part_Name", {
        header: "Part Name",
        size: 200,
        cell: (info) => (
            <span className="font-mono text-xs">{info.getValue() ?? "—"}</span>
        ),
    }),

    columnHelper.accessor("Lead_Count", {
        header: "Leads",
        size: 55,
        cell: (info) => info.getValue() ?? "—",
    }),

    columnHelper.accessor("Package_Name", {
        header: "Package",
        size: 100,
        // Rendering for normal rows is special-cased in RowContent (clickable,
        // opens the package dropdown) — this default cell is only used as a
        // fallback (e.g. DragGhostRow reads Package_Name directly, not via
        // this columnDef).
        cell: (info) => info.getValue() ?? "—",
    }),

    columnHelper.accessor("Lot_Id", {
        header: "Lot ID",
        size: 120,
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

    columnHelper.accessor("Station", {
        header: "Station",
        size: 120,
    }),

    columnHelper.accessor("Qty", {
        header: "Qty",
        size: 80,
        cell: (info) => info.getValue()?.toLocaleString() ?? "—",
    }),

    // ── Editable columns ────────────────────────────────────────────────────
    columnHelper.accessor("Doable", {
        header: "Doable",
        size: 80,
        cell: (info) =>
            info.getValue() > 0 ? info.getValue().toLocaleString() : "—",
    }),

    // ── Derived: Capacity_UPH (from Qty + current machine's platform) ──────
    columnHelper.display({
        id: "Capacity_UPH",
        header: "Capacity UPH",
        size: 90,
        enableSorting: false,
        cell: (info) => {
            const r = info.row.original;
            const uph = lookupCapacityUPH(r.Qty, platformOf(r.machine));
            return uph != null ? uph.toLocaleString() : "—";
        },
    }),

    columnHelper.accessor("accuTime", {
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
    columnHelper.accessor("timeStart", {
        header: "Time Start",
        size: 75,
        enableSorting: false,
    }),

    columnHelper.accessor("timeEnd", {
        header: "Time End",
        size: 75,
        enableSorting: false,
    }),

    columnHelper.display({
        id: "expectedPT",
        header: "Expected PT",
        size: 85,
        enableSorting: false,
        cell: (info) => formatExpectedPT(info.row.original.accuTime),
    }),

    // ── More read-only data columns ─────────────────────────────────────────
    columnHelper.accessor("Lot_Type", {
        header: "Lot Type",
        size: 65,
    }),

    columnHelper.accessor("Lot_Status", {
        header: "Lot Status",
        size: 90,
    }),

    columnHelper.display({
        id: "focusGroupStage",
        header: "Focus Group / Stage",
        size: 140,
        cell: (info) => {
            const r = info.row.original;
            const fg = r.Focus_Group ?? "";
            const st = r.Stage ?? "";
            if (!fg && !st) return "—";
            if (!st) return fg;
            if (!fg) return st;
            return `${fg} / ${st}`;
        },
    }),

    columnHelper.accessor("Lot_Entry_Time_Days", {
        header: "Entry Days",
        size: 75,
        cell: (info) => fmt2dp(info.getValue()),
    }),

    columnHelper.accessor("CR3", {
        header: "CR3",
        size: 65,
        cell: (info) => info.getValue() ?? "—",
    }),

    columnHelper.accessor("BE_OSL_Days", {
        header: "BE OSL Days",
        size: 85,
        cell: (info) => fmt2dp(info.getValue()),
    }),

    // ── Derived CT / OSL ────────────────────────────────────────────────────
    columnHelper.display({
        id: "CT",
        header: "CT",
        size: 65,
        enableSorting: false,
        cell: (info) => {
            const ct = computeCT(info.row.original);
            return fmt2dp(ct);
        },
    }),

    columnHelper.display({
        id: "OSL",
        header: "OSL",
        size: 65,
        enableSorting: false,
        cell: (info) => {
            const ct = computeCT(info.row.original);
            const osl = computeOSL(ct, info.row.original.Backend_Leadtime);
            return fmt2dp(osl);
        },
    }),

    // ── More read-only data columns ─────────────────────────────────────────
    columnHelper.accessor("Body_Size", {
        header: "Body Size",
        size: 75,
        cell: (info) => info.getValue() ?? "—",
    }),

    columnHelper.accessor("Ramp_Time", {
        header: "Ramp Time",
        size: 80,
        cell: (info) => info.getValue() ?? "—",
    }),

    // ── Editable free-text ──────────────────────────────────────────────────
    columnHelper.accessor("Remarks", {
        header: "Remarks",
        size: 160,
        cell: (info) => (
            <span className="text-xs text-base-content/60 italic">
                {info.getValue() || ""}
            </span>
        ),
    }),
];

export const TOTAL_MIN_WIDTH = COLUMNS.reduce((s, c) => s + (c.size ?? 100), 0);

export const COL_WIDTHS = Object.fromEntries(
    COLUMNS.map((c) => [c.accessorKey ?? c.id, c.size ?? 100]),
);
