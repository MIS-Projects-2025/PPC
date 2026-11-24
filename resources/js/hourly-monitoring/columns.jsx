import { HOUR_KEY, fmt, hourLabel, pct, rowStats } from './cellUtils';

/**
 * ctx = {
 *   codeIdx: Map<string, DowntimeCode>,
 *   config: HmConfig,
 *   editors: { text, code, emp },
 *   onDelete: (row) => void,
 * }
 */

function ValueCell({ value, ctx }) {
    if (!value) return null;
    const code = ctx.codeIdx.get(String(value).toUpperCase());
    if (code) {
        // Downtime-coded cell: show the code with its background color.
        return (
            <div className="hm-code" style={{ background: code.bg_color ?? undefined, color: code.text_color }} title={code.code}>
                {code.code}
            </div>
        );
    }
    return <div className="hm-qty">{fmt(Number(value))}</div>;
}

const text = (ctx, key, name, width, extra = {}) => ({
    key,
    name,
    width,
    resizable: true,
    renderEditCell: ctx.editors.text,
    ...extra,
});

const integer = (ctx, key, name, width) => text(ctx, key, name, width, { cellClass: 'hm-int' });

const calc = (key, name, width, render) => ({
    key,
    name,
    width,
    editable: false,
    cellClass: 'hm-calc',
    renderCell: ({ row }) => <>{render(row)}</>,
});

const count = (ctx) => ({
    key: 'count',
    name: 'COUNT',
    width: 74,
    frozen: true,
    editable: false,
    renderCell: ({ row, rowIdx }) => (
        <div className="hm-count">
            <span>{rowIdx + 1}</span>
            <button type="button" className="hm-del" title="Delete row" onClick={() => ctx.onDelete(row)}>
                ×
            </button>
        </div>
    ),
});

const employee = (ctx, shift) => [
    {
        key: `${shift}_emp_id`,
        name: 'Employee #',
        width: 110,
        resizable: true,
        renderEditCell: ctx.editors.emp,
    },
    // Name is read-only: it is the server-side snapshot taken when the ID was set.
    { key: `${shift}_emp_name`, name: 'Employee Name', width: 190, resizable: true, editable: false },
];

const hours = (ctx, list, shift) =>
    list.map((hour) => {
        const key = HOUR_KEY(hour);
        return {
            key,
            name: hourLabel(hour),
            width: 96,
            resizable: true,
            headerCellClass: `hm-head-${shift}`,
            renderEditCell: ctx.editors.code,
            renderCell: ({ row }) => <ValueCell value={row[key]} ctx={ctx} />,
        };
    });

export function buildColumns(type, ctx) {
    const { config, codeIdx } = ctx;
    const stats = (row) => rowStats(row, codeIdx, config);
    const capHr = (row) => (Number(row.capacity) || 0) / config.cap_divisor;
    const safeDiv = (a, b) => (b ? a / b : 0); // IFERROR(a / b, 0)

    if (type === 'fvi') {
        return [
            count(ctx),
            {
                name: 'DAY SHIFT',
                headerCellClass: 'hm-group-day',
                children: [
                    ...employee(ctx, 'day'),
                    // FUTURE: designation may become a reference table too.
                    text(ctx, 'day_designation', 'Designation', 130),
                    ...hours(ctx, config.day_hours, 'day'),
                    calc('day_outs', 'DAY SHIFT OUTS', 120, (r) => fmt(stats(r).day)),
                    integer(ctx, 'day_lots', 'TOTAL # of lots', 110),
                ],
            },
            {
                name: 'NIGHT SHIFT',
                headerCellClass: 'hm-group-night',
                children: [
                    ...employee(ctx, 'night'),
                    // FUTURE: designation may become a reference table too.
                    text(ctx, 'night_designation', 'Designation', 130),
                    ...hours(ctx, config.night_hours, 'night'),
                    calc('night_outs', 'NIGHT SHIFT OUTS', 130, (r) => fmt(stats(r).night)),
                    integer(ctx, 'night_lots', 'TOTAL # of lots', 110),
                ],
            },
            {
                name: 'OVERALL',
                headerCellClass: 'hm-group-total',
                children: [
                    calc('overall_outs', 'Overall Total Outs', 140, (r) => fmt(stats(r).all)),
                    calc('overall_lots', 'Overall Total # of lots', 160, (r) => fmt((Number(r.day_lots) || 0) + (Number(r.night_lots) || 0))),
                ],
            },
        ];
    }

    return [
        count(ctx),
        // FUTURE: MACHINE will reference qdn_db.machine_list and become a dropdown.
        text(ctx, 'machine', 'MACHINE', 120, { frozen: true }),
        // FUTURE: CAPACITY will reference qdn_db.machine_capacies and become a dropdown.
        integer(ctx, 'capacity', 'CAPACITY', 100),
        calc('cap_hr', 'CAP/HOUR', 100, (r) => fmt(Math.round(capHr(r)))),
        integer(ctx, 'plan', 'PLAN', 90),
        text(ctx, 'package_type', 'Package Type', 120),
        text(ctx, 'setup', 'SET-UP', 110),
        {
            name: 'DAY SHIFT',
            headerCellClass: 'hm-group-day',
            children: [
                ...employee(ctx, 'day'),
                ...hours(ctx, config.day_hours, 'day'),
                calc('day_outs', 'DAY SHIFT OUTS', 120, (r) => fmt(stats(r).day)),
                integer(ctx, 'day_lots', 'TOTAL # of lots', 110),
            ],
        },
        {
            name: 'NIGHT SHIFT',
            headerCellClass: 'hm-group-night',
            children: [
                ...employee(ctx, 'night'),
                ...hours(ctx, config.night_hours, 'night'),
                calc('night_outs', 'NIGHT SHIFT OUTS', 130, (r) => fmt(stats(r).night)),
                integer(ctx, 'night_lots', 'TOTAL # of lots', 110),
            ],
        },
        {
            name: 'ATTAINMENT',
            headerCellClass: 'hm-group-total',
            children: [
                calc('all_total', 'ALL SHIFT TOTAL', 130, (r) => fmt(stats(r).all)),
                calc('delta', 'Delta to Plan', 120, (r) => fmt(stats(r).all - (Number(r.plan) || 0))),
                calc('att_plan', '% Attainment Outs vs Plan', 170, (r) => pct(safeDiv(stats(r).all, Number(r.plan) || 0))),
                calc('att_cap', '% Attainment Outs vs Cap', 170, (r) => pct(safeDiv(stats(r).all, Number(r.capacity) || 0))),
            ],
        },
        {
            name: 'DOWNTIME & ACTIONS',
            headerCellClass: 'hm-group-action',
            children: [
                calc('total_dt', 'Total Downtime', 120, (r) => `${stats(r).downtime} h`),
                text(ctx, 'reason', 'Reason', 180),
                calc('cap_loss', 'Cap loss (Cap/hr * Total DT)', 190, (r) => fmt(Math.round(capHr(r) * stats(r).downtime))),
                text(ctx, 'action', 'Action', 180),
                text(ctx, 'who', 'Who', 120),
                text(ctx, 'when_at', 'When', 120),
                text(ctx, 'status', 'Status', 120),
            ],
        },
    ];
}
