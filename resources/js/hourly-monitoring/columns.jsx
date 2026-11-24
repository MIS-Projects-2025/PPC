import { HOUR_KEY, LOT_KEY, fmt, fmtCell, hourLabel, pct, rangeLabel, rowStats, sumLots, sumOutputs } from './cellUtils';

/**
 * ctx = {
 *   codeIdx: Map<string, DowntimeCode>,
 *   config: HmConfig,
 *   editors: { text, code, emp, pkg },
 *   onDelete: (row) => void,
 *   shift?: 'day' | 'night'   // boxing tables only
 *   collapsed?: { day: boolean, night: boolean }   // a collapsed shift keeps only its totals columns
 * }
 * Rows with __kind ('subtotal' | 'grand') are read-only totals: never editable.
 */

const editable = (row) => !row.__kind;

function ValueCell({ value, ctx }) {
    if (!value) return null;
    const code = ctx.codeIdx.get(String(value).toUpperCase());
    if (code) {
        // Downtime-coded cell: the code is centered (both axes, see .hm-code), on its background color.
        return (
            <div className="hm-code" style={{ background: code.bg_color ?? undefined, color: code.text_color }} title={code.code}>
                <span>{code.code}</span>
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
    editable,
    renderEditCell: ctx.editors.text,
    ...extra,
});

// Whole numbers are shown with thousands separators; the editor still shows the raw digits.
const integer = (ctx, key, name, width) =>
    text(ctx, key, name, width, { cellClass: 'hm-int', renderCell: ({ row }) => fmtCell(row[key]) });

const calc = (key, name, width, render) => ({
    key,
    name,
    width,
    editable: false,
    cellClass: 'hm-calc',
    renderCell: ({ row }) => <>{render(row)}</>,
    exportValue: render, // the Excel export reads the same text and turns it back into a number
});

const count = (ctx) => ({
    key: 'count',
    name: 'COUNT',
    width: 74,
    frozen: true,
    editable: false,
    renderCell: ({ row, rowIdx }) =>
        row.__kind ? null : (
            <div className="hm-count">
                <span>{row.__n ?? rowIdx + 1}</span>
                <button type="button" className="hm-del" title="Delete row" onClick={() => ctx.onDelete(row)}>
                    ×
                </button>
            </div>
        ),
});

/** prefix 'day' | 'night' => day_emp_id / day_emp_name; '' => emp_id / emp_name (boxing). */
const employee = (ctx, prefix) => {
    const idKey = prefix ? `${prefix}_emp_id` : 'emp_id';
    return [
        { key: idKey, name: 'Employee #', width: 110, resizable: true, editable, renderEditCell: ctx.editors.emp },
        // Name is read-only: it is the server-side snapshot taken when the ID was set.
        { key: idKey.replace('_id', '_name'), name: 'Employee Name', width: 190, resizable: true, editable: false },
    ];
};

const hours = (ctx, list, shift, { label = hourLabel, lots = false } = {}) =>
    list.flatMap((hour) => {
        const key = HOUR_KEY(hour);
        const cols = [
            {
                key,
                name: label(hour),
                width: 96,
                resizable: true,
                editable,
                headerCellClass: `hm-head-${shift}`,
                renderEditCell: ctx.editors.code,
                renderCell: ({ row }) => <ValueCell value={row[key]} ctx={ctx} />,
            },
        ];
        if (lots) {
            cols.push({
                key: LOT_KEY(hour),
                name: 'No of lots',
                width: 84,
                resizable: true,
                editable,
                cellClass: 'hm-int',
                headerCellClass: `hm-head-${shift}`,
                renderEditCell: ctx.editors.text,
                renderCell: ({ row }) => fmtCell(row[LOT_KEY(hour)]),
            });
        }
        return cols;
    });

/**
 * A DAY / NIGHT SHIFT column group. Clicking its header (handled by the grid) collapses the shift to `summary`
 * (its totals); expanded it shows `detail` + `summary`. The is-collapsed class drives the ▸ / ▾ caret in the CSS.
 */
const shiftGroup = (ctx, shift, name, detail, summary) => {
    const collapsed = Boolean(ctx.collapsed?.[shift]);

    return {
        name,
        headerCellClass: `hm-group-${shift}${collapsed ? ' is-collapsed' : ''}`,
        children: collapsed ? summary : [...detail, ...summary],
    };
};

export function buildColumns(type, ctx) {
    const { config, codeIdx } = ctx;
    const stats = (row) => rowStats(row, codeIdx, config);
    const capHr = (row) => (Number(row.capacity) || 0) / config.cap_divisor;
    const safeDiv = (a, b) => (b ? a / b : 0); // IFERROR(a / b, 0)

    if (type === 'boxing') {
        const night = ctx.shift === 'night';
        const list = night ? config.night_hours : config.day_hours;
        const shift = night ? 'night' : 'day';

        return [
            count(ctx),
            shiftGroup(
                ctx,
                shift,
                night ? 'NIGHT SHIFT' : 'DAY SHIFT',
                [...employee(ctx, ''), ...hours(ctx, list, shift, { label: rangeLabel, lots: true })],
                [
                    calc('total_out', 'TOTAL', 110, (r) => fmt(sumOutputs(r, list))),
                    calc('total_lots', 'TOTAL # OF LOTS', 140, (r) => fmt(sumLots(r, list))),
                ],
            ),
        ];
    }

    if (type === 'fvi') {
        return [
            count(ctx),
            shiftGroup(
                ctx,
                'day',
                'DAY SHIFT',
                [
                    ...employee(ctx, 'day'),
                    // FUTURE: designation may become a reference table too.
                    text(ctx, 'day_designation', 'Designation', 130),
                    ...hours(ctx, config.day_hours, 'day'),
                ],
                [
                    calc('day_outs', 'DAY SHIFT OUTS', 120, (r) => fmt(stats(r).day)),
                    integer(ctx, 'day_lots', 'TOTAL # of lots', 110),
                ],
            ),
            shiftGroup(
                ctx,
                'night',
                'NIGHT SHIFT',
                [
                    ...employee(ctx, 'night'),
                    // FUTURE: designation may become a reference table too.
                    text(ctx, 'night_designation', 'Designation', 130),
                    ...hours(ctx, config.night_hours, 'night'),
                ],
                [
                    calc('night_outs', 'NIGHT SHIFT OUTS', 130, (r) => fmt(stats(r).night)),
                    integer(ctx, 'night_lots', 'TOTAL # of lots', 110),
                ],
            ),
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
        // Subtotal rows show nothing here; the grand-total row shows "Grand Total".
        text(ctx, 'machine', 'MACHINE', 120, { frozen: true }),
        // FUTURE: CAPACITY will reference qdn_db.machine_capacies and become a dropdown.
        integer(ctx, 'capacity', 'CAPACITY', 100),
        calc('cap_hr', 'CAP/HOUR', 100, (r) => fmt(Math.round(capHr(r)))),
        integer(ctx, 'plan', 'PLAN', 90),
        // Suggests the package types that already exist; subtotal rows copy the group's package type here.
        text(ctx, 'package_type', 'Package Type', 130, { renderEditCell: ctx.editors.pkg }),
        text(ctx, 'setup', 'SET-UP', 110),
        shiftGroup(
            ctx,
            'day',
            'DAY SHIFT',
            [...employee(ctx, 'day'), ...hours(ctx, config.day_hours, 'day')],
            [
                calc('day_outs', 'DAY SHIFT OUTS', 120, (r) => fmt(stats(r).day)),
                integer(ctx, 'day_lots', 'TOTAL # of lots', 110),
            ],
        ),
        shiftGroup(
            ctx,
            'night',
            'NIGHT SHIFT',
            [text(ctx, 'night_setup', 'SET-UP', 110), ...employee(ctx, 'night'), ...hours(ctx, config.night_hours, 'night')],
            [
                calc('night_outs', 'NIGHT SHIFT OUTS', 130, (r) => fmt(stats(r).night)),
                integer(ctx, 'night_lots', 'TOTAL # of lots', 110),
            ],
        ),
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
                // Totals rows add up the per-row losses (Cap/hr differs per row), not capacity * total downtime.
                calc('cap_loss', 'Cap loss (Cap/hr * Total DT)', 190, (r) =>
                    fmt(Math.round(r.__capLoss ?? capHr(r) * stats(r).downtime)),
                ),
                text(ctx, 'action', 'Action', 180),
                text(ctx, 'who', 'Who', 120),
                text(ctx, 'when_at', 'When', 120),
                text(ctx, 'status', 'Status', 120),
            ],
        },
    ];
}
